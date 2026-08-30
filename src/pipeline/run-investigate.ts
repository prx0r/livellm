/**
 * SPEC: Run investigation on all unverified candidates.
 */

import { CandidateRepo } from "../db/candidates.js";
import { investigateCandidate } from "./investigate.js";

export type InvestigateConfig = {
  dbPath: string;
  replayDir?: string;
};

export async function investigateCandidates(
  config: InvestigateConfig
): Promise<void> {
  const candidateRepo = new CandidateRepo();
  const candidates = await candidateRepo.getUnverified();

  console.log(`\n[investigate] Found ${candidates.length} unverified candidates\n`);

  let totalExtracted = 0;
  let totalValidated = 0;
  let totalChanged = 0;

  for (const candidate of candidates) {
    console.log(
      `→ ${candidate.provider_hint ?? "?"}:${candidate.product_hint ?? "?"} (${candidate.change_type ?? "?"})`
    );

    const result = await investigateCandidate(
      {
        candidate_id: candidate.candidate_id,
        provider_hint: candidate.provider_hint ?? undefined,
        product_hint: candidate.product_hint ?? undefined,
        official_source_url: candidate.official_source_url ?? undefined,
        notes_json: candidate.notes_json,
      },
      { replayDir: config.replayDir }
    );

    totalExtracted += result.factsExtracted;
    totalValidated += result.factsValidated;
    totalChanged += result.factsChanged;

    if (result.errors.length) {
      console.log(`  ✗ ${result.errors.join(", ")}`);
    } else {
      console.log(
        `  ✓ ${result.factsExtracted} extracted, ${result.factsValidated} validated, ${result.factsChanged} changed`
      );
    }
  }

  console.log(
    `\n[investigate] Complete: ${candidates.length} investigated, ` +
    `${totalExtracted} extracted, ${totalValidated} validated, ${totalChanged} changed`
  );
}
