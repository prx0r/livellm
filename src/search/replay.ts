import fs from "node:fs/promises";
import path from "node:path";
import type { SearchProvider, SearchRequest, SearchResponse } from "./types";
import { requestHash } from "./canonical-request";

export class ReplaySearchProvider implements SearchProvider {
  constructor(private fixtureDir: string) {}

  async search(request: SearchRequest): Promise<SearchResponse> {
    const file = path.join(this.fixtureDir, `${requestHash(request)}.json`);
    const text = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(text) as SearchResponse;
    return { ...parsed, fromCache: true };
  }
}
