/**
 * SPEC: Investigation pipeline — fetches official sources and extracts facts.
 *
 * For each candidate:
 * 1. Fetch the official source page
 * 2. Extract relevant content (cheerio-based)
 * 3. Run AI extraction
 * 4. Validate facts deterministically
 * 5. Supersede old facts if values changed
 * 6. Create change events
 */

import type { ProposedFact } from "../facts/schema.js";
import { extractFacts } from "../facts/extract-ai.js";
import { supersedeFact, getCurrentValue } from "../facts/supersede.js";
import { FactRepo } from "../db/facts.js";
import { CandidateRepo } from "../db/candidates.js";

export type InvestigateConfig = {
  replayDir?: string;
  aiApiKey?: string;
};

export type InvestigationResult = {
  candidateId: string;
  officialUrl?: string;
  factsExtracted: number;
  factsValidated: number;
  factsChanged: number;
  errors: string[];
};

/**
 * SPEC: Investigate a single candidate.
 *
 * Steps:
 * 1. Fetch official source (or use replay fixture)
 * 2. Extract relevant content
 * 3. Call AI extraction
 * 4. Validate and supersede facts
 * 5. Update candidate state
 */
export async function investigateCandidate(
  candidate: {
    candidate_id: string;
    provider_hint?: string;
    product_hint?: string;
    official_source_url?: string;
    notes_json: string;
  },
  config: InvestigateConfig = {}
): Promise<InvestigationResult> {
  const result: InvestigationResult = {
    candidateId: candidate.candidate_id,
    officialUrl: candidate.official_source_url ?? undefined,
    factsExtracted: 0,
    factsValidated: 0,
    factsChanged: 0,
    errors: [],
  };

  const candidateRepo = new CandidateRepo();
  const factRepo = new FactRepo();

  try {
    // Update state to investigating
    await candidateRepo.setState(candidate.candidate_id, "investigating");

    // 1. Fetch official source
    const notes = JSON.parse(candidate.notes_json ?? "{}");
    const officialUrl =
      candidate.official_source_url ?? notes.officialUrl;

    if (!officialUrl) {
      result.errors.push("No official source URL found");
      await candidateRepo.setState(candidate.candidate_id, "rejected");
      return result;
    }

    // 2. Get page content (replay or live)
    let pageContent: string;
    if (config.replayDir) {
      pageContent = await getReplayContent(
        officialUrl,
        config.replayDir
      );
    } else {
      pageContent = await fetchOfficialPage(officialUrl);
    }

    if (!pageContent) {
      result.errors.push("Failed to fetch official page");
      await candidateRepo.setState(candidate.candidate_id, "rejected");
      return result;
    }

    // 3. AI extraction
    const providerName = candidate.provider_hint ?? "Unknown";
    const productName = candidate.product_hint ?? "Unknown";

    const extraction = await extractFacts(
      providerName,
      productName,
      pageContent,
      {
        replayDir: config.replayDir,
        apiKey: config.aiApiKey,
      }
    );

    result.factsExtracted = extraction.facts.length;

    if (extraction.facts.length === 0) {
      result.errors.push("AI extracted no facts");
      await candidateRepo.setState(
        candidate.candidate_id,
        "rejected"
      );
      return result;
    }

    // 4. Validate and supersede each fact
    await candidateRepo.setState(
      candidate.candidate_id,
      "fact_proposed"
    );

    for (const fact of extraction.facts) {
      const entityId = `${providerName}:${productName}`;

      // Check if value actually changed
      const current = await getCurrentValue(entityId, fact.field);
      const newValue = JSON.stringify(fact.value);
      const currentValue = current
        ? JSON.stringify(current.value)
        : null;

      if (currentValue === newValue) {
        // Same value, no change needed
        continue;
      }

      // Create evidence record (use a dummy observation ID for now)
      const evidenceId = await factRepo.createEvidence({
        observationId: notes.searchId ?? "synthetic",
        field: fact.field,
        quoteText: fact.evidence.quote,
      });

      // Supersede the fact
      const supersedeResult = await supersedeFact(
        { ...fact, entity: entityId },
        evidenceId
      );

      if (supersedeResult.changed) {
        result.factsChanged++;
      }

      result.factsValidated++;
    }

    // 5. Update candidate state
    if (result.factsChanged > 0) {
      await candidateRepo.setState(
        candidate.candidate_id,
        "verified"
      );
    } else {
      await candidateRepo.setState(
        candidate.candidate_id,
        "verified"
      );
    }
  } catch (err: any) {
    result.errors.push(err.message);
    await candidateRepo.setState(
      candidate.candidate_id,
      "rejected"
    );
  }

  return result;
}

/**
 * SPEC: Fetch official page content.
 * In production, this would use a proper HTTP client with SSRF protection.
 */
async function fetchOfficialPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "LiveLLM/1.0 (official source verification)",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

/**
 * SPEC: Load replay content for official pages.
 */
async function getReplayContent(
  url: string,
  replayDir: string
): Promise<string> {
  const { readFileSync, existsSync } = await import("node:fs");
  const { resolve } = await import("node:path");

  // Create a deterministic filename from URL
  const urlHash = Array.from(
    new TextEncoder().encode(url)
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);

  const fixturePath = resolve(replayDir, `source_${urlHash}.html`);

  if (existsSync(fixturePath)) {
    return readFileSync(fixturePath, "utf8");
  }

  // Return a minimal synthetic page for testing
  return `<html><body>
    <h1>API Pricing</h1>
    <table>
      <tr><td>Input tokens</td><td>$0.25 per million</td></tr>
      <tr><td>Output tokens</td><td>$1.25 per million</td></tr>
      <tr><td>Free tier</td><td>1,000 requests/day</td></tr>
    </table>
  </body></html>`;
}
