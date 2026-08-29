export type QueryMetrics = {
  paidRuns: number;
  usefulHits: number;
  freshnessNeed: number;     // 0..1
  commercialValue: number;   // 0..1+
  hoursSinceRun: number;
  minIntervalHours: number;
  estimatedCredits?: number;
};

export function queryPriority(m: QueryMetrics): number {
  if (m.hoursSinceRun < m.minIntervalHours) return 0;
  const yieldRate = m.paidRuns === 0 ? 0.15 : m.usefulHits / m.paidRuns;
  const staleness = Math.min(3, m.hoursSinceRun / Math.max(1, m.minIntervalHours));
  const cost = Math.max(1, m.estimatedCredits ?? 1);

  return (yieldRate * m.freshnessNeed * m.commercialValue * staleness) / cost;
}
