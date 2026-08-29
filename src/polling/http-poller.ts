import { observationHashes } from "./hash.js";

export type SourceState = {
  url: string;
  etag?: string;
  lastModified?: string;
  rawHash?: string;
  normalizedHash?: string;
  relevantHash?: string;
};

export type PollResult =
  | { kind: "not_modified"; status: number; etag?: string; lastModified?: string }
  | {
      kind: "fetched";
      status: number;
      raw: string;
      rawHash: string;
      normalizedHash: string;
      relevantHash: string;
      materiallyChanged: boolean;
      etag?: string;
      lastModified?: string;
    };

export async function pollHttpSource(state: SourceState): Promise<PollResult> {
  const headers: Record<string, string> = {};
  if (state.etag) headers["If-None-Match"] = state.etag;
  if (state.lastModified) headers["If-Modified-Since"] = state.lastModified;

  const res = await fetch(state.url, { headers, redirect: "follow" });
  if (res.status === 304) {
    return {
      kind: "not_modified",
      status: 304,
      etag: res.headers.get("etag") ?? state.etag,
      lastModified: res.headers.get("last-modified") ?? state.lastModified,
    };
  }

  const raw = await res.text();
  // MVP: use normalized full page. Later add source-specific relevant extractors.
  const hashes = observationHashes(raw);

  return {
    kind: "fetched",
    status: res.status,
    raw,
    ...hashes,
    materiallyChanged: state.relevantHash
      ? hashes.relevantHash !== state.relevantHash
      : true,
    etag: res.headers.get("etag") ?? undefined,
    lastModified: res.headers.get("last-modified") ?? undefined,
  };
}
