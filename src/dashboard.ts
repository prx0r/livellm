/**
 * SPEC: Generate dashboard HTML with live data.
 * This creates a static HTML file with the current state embedded.
 */

import { materializeState, type MaterializedModel } from "./facts/materialize.js";
import { FactRepo } from "./db/facts.js";
import { openDb } from "./db/open.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export async function generateDashboard(dbPath?: string): Promise<string> {
  const state = await materializeState(dbPath);
  const factRepo = new FactRepo();
  const changes = await factRepo.getRecentChanges(20);

  // Get actual pipeline stats from DB
  const db = await openDb(dbPath);
  const queryCount = db.exec("SELECT COUNT(*) FROM discovery_queries");
  const searchCount = db.exec("SELECT COUNT(*) FROM search_runs");
  const candidateCount = db.exec("SELECT COUNT(*) FROM candidates");
  const assetCount = db.exec("SELECT COUNT(*) FROM asset_store");

  const pipelineStats = {
    queries: queryCount.length ? queryCount[0].values[0][0] : 0,
    searches: searchCount.length ? searchCount[0].values[0][0] : 0,
    candidates: candidateCount.length ? candidateCount[0].values[0][0] : 0,
    assets: assetCount.length ? assetCount[0].values[0][0] : 0,
  };

  const templatePath = resolve(
    import.meta.dirname ?? process.cwd(),
    "../src/dashboard.html"
  );

  let html = readFileSync(templatePath, "utf8");

  // Inject data
  const dataScript = `
    <script>
      const DATA = ${JSON.stringify({ ...state, changes, _pipelineStats: pipelineStats }, null, 2)};

      document.getElementById('entities').textContent = DATA.stats.total_entities;
      document.getElementById('facts').textContent = DATA.stats.total_facts;
      document.getElementById('changeEvents').textContent = DATA.stats.total_changes;
      document.getElementById('generated').textContent = DATA.generated_at;

      // Market table
      const tbody = document.getElementById('marketBody');
      DATA.models.forEach(m => {
        const row = document.createElement('tr');
        row.innerHTML = \`
          <td>\${m.provider}</td>
          <td>\${m.name}</td>
          <td>\${m.pricing.input_per_1m ? '$' + m.pricing.input_per_1m + '/1M' : '—'}</td>
          <td>\${m.pricing.output_per_1m ? '$' + m.pricing.output_per_1m + '/1M' : '—'}</td>
          <td>\${m.free_tier ? m.free_tier.quota + ' ' + (m.free_tier.period || '') : '—'}</td>
          <td class="timestamp">\${m.last_changed_at || '—'}</td>
        \`;
        tbody.appendChild(row);
      });

      // Changes table
      const changesBody = document.getElementById('changesBody');
      if (DATA.changes && DATA.changes.length > 0) {
        DATA.changes.forEach(c => {
          const row = document.createElement('tr');
          row.innerHTML = \`
            <td class="timestamp">\${c.detected_at}</td>
            <td>\${c.entity_id}</td>
            <td>\${c.field}</td>
            <td>\${c.before_json}</td>
            <td class="stat-value green">\${c.after_json}</td>
          \`;
          changesBody.appendChild(row);
        });
      } else {
        changesBody.innerHTML = '<tr><td colspan="5" style="color:#666">No changes yet</td></tr>';
      }

      // Pipeline stats (from DB)
      document.getElementById('queries').textContent = DATA._pipelineStats.queries;
      document.getElementById('hits').textContent = DATA._pipelineStats.searches;
      document.getElementById('newUrls').textContent = DATA._pipelineStats.assets;
      document.getElementById('candidates').textContent = DATA._pipelineStats.candidates;
      document.getElementById('changes').textContent = DATA.stats.total_changes;
    </script>
  `;

  // Replace the placeholder script
  html = html.replace(/<script>.*?<\/script>/s, dataScript);

  return html;
}
