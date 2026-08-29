import { canonicalRequest, requestHash } from "../src/search/canonical-request.js";
import type { SearchRequest } from "../src/search/types.js";

describe("canonicalRequest", () => {
  it("normalizes whitespace", () => {
    const req: SearchRequest = {
      engine: "google_light",
      q: "  multiple   spaces   here  ",
    };
    const result = JSON.parse(canonicalRequest(req));
    expect(result.q).toBe("multiple spaces here");
  });

  it("sorts params deterministically", () => {
    const req: SearchRequest = {
      engine: "google_light",
      q: "test",
      params: { z: "1", a: "2", m: "3" },
    };
    const result = JSON.parse(canonicalRequest(req));
    expect(Object.keys(result.params)).toEqual(["a", "m", "z"]);
  });

  it("produces same hash for equivalent requests", () => {
    const req1: SearchRequest = {
      engine: "google_light",
      q: "test query",
      params: { hl: "en" },
    };
    const req2: SearchRequest = {
      engine: "google_light",
      q: "  test  query  ",
      params: { hl: "en" },
    };
    expect(requestHash(req1)).toBe(requestHash(req2));
  });

  it("produces different hash for different engines", () => {
    const req1: SearchRequest = { engine: "google_light", q: "test" };
    const req2: SearchRequest = { engine: "google_news_light", q: "test" };
    expect(requestHash(req1)).not.toBe(requestHash(req2));
  });
});
