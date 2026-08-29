import { sha256, normalizeText, observationHashes } from "../src/polling/hash.js";

describe("hash", () => {
  it("sha256 produces consistent hash", () => {
    const h1 = sha256("hello world");
    const h2 = sha256("hello world");
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(64);
  });

  it("sha256 produces different hash for different input", () => {
    expect(sha256("hello")).not.toBe(sha256("world"));
  });

  it("normalizeText strips HTML", () => {
    const html = "<p>Hello <b>world</b></p><script>evil()</script>";
    expect(normalizeText(html)).toBe("Hello world");
  });

  it("normalizeText collapses whitespace", () => {
    expect(normalizeText("  multiple   spaces  ")).toBe("multiple spaces");
  });

  it("observationHashes returns three hashes", () => {
    const result = observationHashes("<html>test</html>");
    expect(result.rawHash).toHaveLength(64);
    expect(result.normalizedHash).toHaveLength(64);
    expect(result.relevantHash).toHaveLength(64);
  });

  it("normalized hash differs from raw for HTML", () => {
    const result = observationHashes("<html><body>test</body></html>");
    expect(result.rawHash).not.toBe(result.normalizedHash);
  });
});
