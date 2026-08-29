import { normalizeResponse } from "../src/search/serpapi-normalize.js";

describe("serpapi-normalize", () => {
  it("handles source as string (news_light)", () => {
    const raw = {
      news_results: [
        { position: 1, title: "Test", link: "https://example.com", source: "TechCrunch" },
      ],
    };
    const envelope = normalizeResponse(raw, "google_news_light", "test");
    expect(envelope.results[0].source?.name).toBe("TechCrunch");
  });

  it("handles source as object (full news)", () => {
    const raw = {
      news_results: [
        {
          position: 1,
          title: "Test",
          link: "https://example.com",
          source: { name: "TechCrunch", authors: ["John"], icon: "https://icon.png" },
        },
      ],
    };
    const envelope = normalizeResponse(raw, "google_news", "test");
    expect(envelope.results[0].source?.name).toBe("TechCrunch");
    expect(envelope.results[0].source?.authors).toEqual(["John"]);
  });

  it("normalizes iso_date to publishedAt", () => {
    const raw = {
      news_results: [
        { position: 1, title: "T", link: "https://e.com", iso_date: "2026-08-29T10:00:00Z", date: "Aug 29" },
      ],
    };
    const envelope = normalizeResponse(raw, "google_news", "test");
    expect(envelope.results[0].publishedAt).toBe("2026-08-29T10:00:00Z");
    expect(envelope.results[0].publishedAtRaw).toBe("Aug 29");
  });

  it("extracts related questions from google_light", () => {
    const raw = {
      organic_results: [{ position: 1, title: "T", link: "https://e.com" }],
      related_questions: [{ question: "What is X?", snippet: "It is Y", link: "https://e.com/x" }],
    };
    const envelope = normalizeResponse(raw, "google_light", "test");
    expect(envelope.relatedQuestions).toHaveLength(1);
    expect(envelope.relatedQuestions![0].question).toBe("What is X?");
  });

  it("filters results without link or title", () => {
    const raw = {
      organic_results: [
        { position: 1, title: "Good", link: "https://example.com" },
        { position: 2, title: "No Link" },
        { position: 3, link: "https://example.com/no-title" },
      ],
    };
    const envelope = normalizeResponse(raw, "google_light", "test");
    expect(envelope.results).toHaveLength(1);
  });

  it("includes metadata", () => {
    const raw = {
      search_metadata: { id: "abc123", status: "Success" },
      organic_results: [],
    };
    const envelope = normalizeResponse(raw, "google_light", "test query");
    expect(envelope.metadata.searchId).toBe("abc123");
    expect(envelope.metadata.engine).toBe("google_light");
    expect(envelope.metadata.query).toBe("test query");
  });
});
