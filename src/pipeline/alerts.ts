/**
 * SPEC: Alert generator — creates alerts for market changes.
 *
 * Alert types:
 * - PRICE_CHANGE: price increased/decreased
 * - PROMOTION_STARTED: new promotion detected
 * - PROMOTION_EXPIRING: promotion ending soon
 * - FREE_TIER_CHANGED: free tier modified
 * - NEW_PROVIDER: new provider discovered
 */

import { openDb, saveDb } from "../db/open.js";
import { PromotionDetector, type Promotion } from "./promotions.js";
import { PriceComparator, type PriceComparison } from "./price-compare.js";

export type Alert = {
  alert_id: string;
  alert_type: "price_change" | "promotion_started" | "promotion_expiring" | "free_tier_changed" | "new_provider";
  entity: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  data: any;
  created_at: string;
  acknowledged: boolean;
};

export class AlertGenerator {
  private db: any = null;

  private async getDb() {
    if (!this.db) this.db = await openDb();
    return this.db;
  }

  /**
   * Generate all alerts from current state.
   */
  async generateAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    // Check for price changes
    const comparator = new PriceComparator();
    const changes = await comparator.getSignificantChanges(5);
    for (const change of changes) {
      alerts.push({
        alert_id: crypto.randomUUID(),
        alert_type: "price_change",
        entity: change.entity,
        severity: Math.abs(change.changePct) > 20 ? "critical" : "warning",
        title: `${change.field} changed`,
        message: `${change.previousValue} → ${change.currentValue} (${change.changePct > 0 ? "+" : ""}${change.changePct.toFixed(1)}%)`,
        data: change,
        created_at: new Date().toISOString(),
        acknowledged: false,
      });
    }

    // Check for promotions
    const promoDetector = new PromotionDetector();
    const promotions = await promoDetector.getActivePromotions();
    for (const promo of promotions) {
      if (promo.endsAt) {
        const daysLeft = Math.ceil(
          (new Date(promo.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 7) {
          alerts.push({
            alert_id: crypto.randomUUID(),
            alert_type: "promotion_expiring",
            entity: promo.entity,
            severity: daysLeft <= 2 ? "critical" : "warning",
            title: `Promotion expiring`,
            message: `${promo.type} ends in ${daysLeft} days`,
            data: promo,
            created_at: new Date().toISOString(),
            acknowledged: false,
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Store alerts in database.
   */
  async storeAlerts(alerts: Alert[]): Promise<void> {
    const db = await this.getDb();
    for (const alert of alerts) {
      db.run(
        `INSERT OR IGNORE INTO alerts
          (alert_id, alert_type, entity, severity, title, message, data_json, created_at, acknowledged)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          alert.alert_id,
          alert.alert_type,
          alert.entity,
          alert.severity,
          alert.title,
          alert.message,
          JSON.stringify(alert.data),
          alert.created_at,
          alert.acknowledged ? 1 : 0,
        ]
      );
    }
    saveDb();
  }

  /**
   * Get unacknowledged alerts.
   */
  async getUnacknowledged(): Promise<Alert[]> {
    const db = await this.getDb();
    const rows = db.exec(
      `SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC`
    );

    if (!rows.length) return [];

    const cols = rows[0].columns;
    return rows[0].values.map((vals: any[]) => {
      const obj: any = {};
      cols.forEach((c: string, i: number) => {
        obj[c] = c === "data_json" ? JSON.parse(vals[i]) : vals[i];
      });
      return obj as Alert;
    });
  }
}
