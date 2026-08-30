/**
 * SPEC: Promotion detector — detects pricing promotions automatically.
 *
 * Detects:
 * - Price discounts (strikethrough prices)
 * - Usage multipliers ("2× usage")
 * - Free tier changes
 * - Subscription changes
 */

import { openDb, saveDb } from "../db/open.js";

export type Promotion = {
  entity: string;
  type: "price_discount" | "usage_multiplier" | "free_tier" | "subscription";
  value: number;
  unit: string;
  listPrice?: number;
  currentPrice?: number;
  discountPct?: number;
  endsAt?: string;
  detectedAt: string;
  source: string;
};

export class PromotionDetector {
  private db: any = null;

  private async getDb() {
    if (!this.db) this.db = await openDb();
    return this.db;
  }

  /**
   * Detect promotions by comparing list vs current prices.
   */
  async detectPromotions(): Promise<Promotion[]> {
    const db = await this.getDb();
    const promotions: Promotion[] = [];

    // Find entities with both list and current prices
    const entities = db.exec(
      `SELECT DISTINCT entity_id FROM facts WHERE valid_to IS NULL`
    );

    if (!entities.length) return [];

    for (const row of entities[0].values) {
      const entityId = row[0] as string;

      // Get list price
      const listPrice = db.exec(
        `SELECT value_json FROM facts
         WHERE entity_id = ? AND field = 'list_input_price_usd_per_million'
         AND valid_to IS NULL`,
        [entityId]
      );

      // Get current price
      const currentPrice = db.exec(
        `SELECT value_json FROM facts
         WHERE entity_id = ? AND field = 'input_price_usd_per_million'
         AND valid_to IS NULL`,
        [entityId]
      );

      if (listPrice.length && currentPrice.length &&
          listPrice[0].values.length && currentPrice[0].values.length) {
        const list = JSON.parse(listPrice[0].values[0][0] as string);
        const current = JSON.parse(currentPrice[0].values[0][0] as string);

        if (list > current && current > 0) {
          const discountPct = ((list - current) / list) * 100;
          promotions.push({
            entity: entityId,
            type: "price_discount",
            value: discountPct,
            unit: "percent",
            listPrice: list,
            currentPrice: current,
            discountPct,
            detectedAt: new Date().toISOString(),
            source: "price_comparison",
          });
        }
      }

      // Check for promotion_multiplier
      const promoMult = db.exec(
        `SELECT value_json, unit FROM facts
         WHERE entity_id = ? AND field = 'promotion_multiplier'
         AND valid_to IS NULL`,
        [entityId]
      );

      if (promoMult.length && promoMult[0].values.length) {
        const mult = JSON.parse(promoMult[0].values[0][0] as string);
        const promoEnd = db.exec(
          `SELECT value_json FROM facts
           WHERE entity_id = ? AND field = 'promotion_end_at'
           AND valid_to IS NULL`,
          [entityId]
        );
        const endsAt = promoEnd.length && promoEnd[0].values.length
          ? JSON.parse(promoEnd[0].values[0][0] as string)
          : undefined;

        promotions.push({
          entity: entityId,
          type: "usage_multiplier",
          value: mult,
          unit: "x",
          endsAt,
          detectedAt: new Date().toISOString(),
          source: "promotion_field",
        });
      }
    }

    return promotions;
  }

  /**
   * Get active promotions (not expired).
   */
  async getActivePromotions(): Promise<Promotion[]> {
    const all = await this.detectPromotions();
    const now = new Date();

    return all.filter((p) => {
      if (!p.endsAt) return true; // No end date = still active
      return new Date(p.endsAt) > now;
    });
  }
}
