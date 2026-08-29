import { candidateScore, shouldInvestigate } from "../src/discovery/prefilter.js";

describe("prefilter", () => {
  describe("candidateScore", () => {
    it("scores pricing highly", () => {
      expect(candidateScore("OpenAI API pricing update")).toBeGreaterThanOrEqual(4);
    });

    it("scores free tier highly", () => {
      expect(candidateScore("New free tier announced")).toBeGreaterThanOrEqual(4);
    });

    it("penalizes tutorials", () => {
      expect(candidateScore("Tutorial: How to use the API")).toBeLessThan(0);
    });

    it("penalizes reviews", () => {
      expect(candidateScore("My review of the new model")).toBeLessThan(0);
    });

    it("combines positive and negative signals", () => {
      const score = candidateScore("Pricing tutorial for AI API");
      // pricing (+4) + tutorial (-4) = 0
      expect(score).toBe(0);
    });
  });

  describe("shouldInvestigate", () => {
    it("flags pricing news", () => {
      expect(shouldInvestigate("OpenAI cuts API pricing by 50%")).toBe(true);
    });

    it("flags free tier announcements", () => {
      expect(shouldInvestigate("New free tier for Claude API")).toBe(true);
    });

    it("rejects tutorials", () => {
      expect(shouldInvestigate("Tutorial: Getting started with GPT-4")).toBe(false);
    });

    it("rejects stock price news", () => {
      expect(shouldInvestigate("OpenAI stock price surges")).toBe(false);
    });
  });
});
