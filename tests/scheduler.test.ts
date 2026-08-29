import { queryPriority } from "../src/polling/scheduler.js";

describe("scheduler", () => {
  it("returns 0 when not yet due", () => {
    const result = queryPriority({
      paidRuns: 10,
      usefulHits: 5,
      freshnessNeed: 1.0,
      commercialValue: 1.0,
      hoursSinceRun: 12,
      minIntervalHours: 24,
    });
    expect(result).toBe(0);
  });

  it("prioritizes high-yield queries", () => {
    const high = queryPriority({
      paidRuns: 10,
      usefulHits: 8,
      freshnessNeed: 1.0,
      commercialValue: 1.0,
      hoursSinceRun: 30,
      minIntervalHours: 24,
    });
    const low = queryPriority({
      paidRuns: 10,
      usefulHits: 1,
      freshnessNeed: 1.0,
      commercialValue: 1.0,
      hoursSinceRun: 30,
      minIntervalHours: 24,
    });
    expect(high).toBeGreaterThan(low);
  });

  it("prioritizes stale queries", () => {
    const fresh = queryPriority({
      paidRuns: 5,
      usefulHits: 3,
      freshnessNeed: 1.0,
      commercialValue: 1.0,
      hoursSinceRun: 25,
      minIntervalHours: 24,
    });
    const stale = queryPriority({
      paidRuns: 5,
      usefulHits: 3,
      freshnessNeed: 1.0,
      commercialValue: 1.0,
      hoursSinceRun: 72,
      minIntervalHours: 24,
    });
    expect(stale).toBeGreaterThan(fresh);
  });

  it("uses prior for new queries", () => {
    const result = queryPriority({
      paidRuns: 0,
      usefulHits: 0,
      freshnessNeed: 1.0,
      commercialValue: 1.0,
      hoursSinceRun: 30,
      minIntervalHours: 24,
    });
    expect(result).toBeGreaterThan(0);
  });
});
