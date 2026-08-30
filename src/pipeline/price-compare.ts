/**
 * SPEC: Price comparison — compares current vs historical prices.
 *
 * When we have multiple observations of the same entity:
 * 1. Compare current fact vs previous fact
 * 2. Detect price changes
 * 3. Calculate magnitude of change
 * 4. Track when change occurred
 */

import { openDb, saveDb } from "../db/open.js";

export type PriceComparison = {
  entity: string;
  field: string;
  previousValue: any;
  currentValue: any;
  changePct: number;
  changedAt: string;
  previousObservedAt: string;
  currentObservedAt: string;
};

export class PriceComparator {
  private db: any = null;

  private async getDb() {
    if (!this.db) this.db = await openDb();
    return this.db;
  }

  /**
   * Compare current vs previous facts for all entities.
   */
  async compareAll(): Promise<PriceComparison[]> {
    const db = await this.getDb();
    const comparisons: PriceComparison[] = [];

    // Get all current facts
    const currentFacts = db.exec(
      `SELECT entity_id, field, value_json, valid_from
       FROM facts WHERE valid_to IS NULL`
    );

    if (!currentFacts.length) return [];

    for (const row of currentFacts[0].values) {
      const [entityId, field, valueJson, validFrom] = row as [string, string, string, string];
      const currentValue = JSON.parse(valueJson);

      // Get previous fact for this entity+field
      const previousFact = db.exec(
        `SELECT value_json, valid_to
         FROM facts
         WHERE entity_id = ? AND field = ? AND valid_to IS NOT NULL
         ORDER BY valid_to DESC LIMIT 1`,
        [entityId, field]
      );

      if (previousFact.length && previousFact[0].values.length) {
        const [prevValueJson, prevValidTo] = previousFact[0].values[0] as [string, string];
        const previousValue = JSON.parse(prevValueJson);

        if (typeof currentValue === "number" && typeof previousValue === "number" && previousValue > 0) {
          const changePct = ((currentValue - previousValue) / previousValue) * 100;

          comparisons.push({
            entity: entityId,
            field,
            previousValue,
            currentValue,
            changePct,
            changedAt: prevValidTo,
            previousObservedAt: prevValidTo,
            currentObservedAt: validFrom,
          });
        }
      }
    }

    return comparisons;
  }

  /**
   * Get recent price changes (last N days).
   */
  async getRecentChanges(days = 7): Promise<PriceComparison[]> {
    const all = await this.compareAll();
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return all.filter((c) => new Date(c.changedAt) > cutoff);
  }

  /**
   * Detect significant changes (greater than threshold).
   */
  async getSignificantChanges(thresholdPct = 5): Promise<PriceComparison[]> {
    const all = await this.compareAll();
    return all.filter((c) => Math.abs(c.changePct) > thresholdPct);
  }
}
