import { desc, lte } from "drizzle-orm";
import type { Db } from "@/db";
import { pricingSettings } from "@/db/schema";
import type { CancellationPolicy } from "./cancellation";
import { PRICING_DEFAULTS, type RoleKey } from "./domain";

export type Pricing = {
  serviceFeeBps: number;
  freelancerCommissionBps: number;
  vatBps: number;
  outfitStandbyCents: number;
  floors: Record<RoleKey, number>;
  cancellation: CancellationPolicy;
  leadsRetentionDays: number;
  raw: Record<string, number>;
};

/** Valeurs en vigueur : pour chaque clé, la ligne la plus récente dont la date d'effet est passée. */
export async function getPricing(db: Db, at = new Date()): Promise<Pricing> {
  const rows = await db
    .select()
    .from(pricingSettings)
    .where(lte(pricingSettings.effectiveFrom, at))
    .orderBy(desc(pricingSettings.effectiveFrom), desc(pricingSettings.createdAt));
  const raw: Record<string, number> = Object.fromEntries(Object.entries(PRICING_DEFAULTS).map(([k, v]) => [k, v.value]));
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.key)) continue;
    seen.add(r.key);
    raw[r.key] = r.value;
  }
  return {
    serviceFeeBps: raw.service_fee_bps,
    freelancerCommissionBps: raw.freelancer_commission_bps,
    vatBps: raw.vat_bps,
    outfitStandbyCents: raw.outfit_standby_cents,
    floors: {
      commercial: raw["floor:commercial"],
      accueil: raw["floor:accueil"],
      interprete: raw["floor:interprete"],
      chef: raw["floor:chef"],
      animateur: raw["floor:animateur"],
      demonstrateur: raw["floor:demonstrateur"],
    },
    cancellation: {
      freeDays: raw.cancel_free_days,
      tier1Days: raw.cancel_tier1_days,
      tier1Bps: raw.cancel_tier1_bps,
      tier2Days: raw.cancel_tier2_days,
      tier2Bps: raw.cancel_tier2_bps,
      lastBps: raw.cancel_last_bps,
    },
    leadsRetentionDays: raw.leads_retention_days,
    raw,
  };
}
