import { canonicalUrl } from "../src/discovery/url.js";

describe("canonicalUrl", () => {
  it("removes www prefix", () => {
    expect(canonicalUrl("https://www.example.com/path")).toBe("https://example.com/path");
  });

  it("removes tracking params", () => {
    const url = canonicalUrl("https://example.com/page?ref=home&fbclid=abc&utm_source=twitter");
    expect(url).not.toContain("ref=");
    expect(url).not.toContain("fbclid=");
    expect(url).not.toContain("utm_source=");
  });

  it("removes hash", () => {
    expect(canonicalUrl("https://example.com/page#section")).toBe("https://example.com/page");
  });

  it("sorts remaining params", () => {
    const url = canonicalUrl("https://example.com/page?z=1&a=2&m=3");
    expect(url).toContain("a=2");
    expect(url).toContain("m=3");
    expect(url).toContain("z=1");
  });

  it("removes trailing slash", () => {
    expect(canonicalUrl("https://example.com/path/")).toBe("https://example.com/path");
  });

  it("preserves root path", () => {
    expect(canonicalUrl("https://example.com/")).toBe("https://example.com/");
  });
});
