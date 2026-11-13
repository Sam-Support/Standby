import { count, sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPgliteDb } from "./index";
import * as s from "./schema";
import { demoEvents } from "./seed";

describe("migrations et seed", () => {
  it("applique les migrations et peuple la base de démonstration", async () => {
    const db = await createPgliteDb(null, true);
    const [{ n: events }] = await db.select({ n: count() }).from(s.events);
    const [{ n: freelancers }] = await db.select({ n: count() }).from(s.freelancers);
    const [{ n: settings }] = await db.select({ n: count() }).from(s.pricingSettings);
    expect(events).toBeGreaterThanOrEqual(8);
    expect(freelancers).toBeGreaterThanOrEqual(30);
    expect(settings).toBeGreaterThanOrEqual(10);
  }, 60_000);

  it("active RLS sur chaque table : l'API publique de Supabase ne lit rien", async () => {
    const db = await createPgliteDb(null, false);
    // base PGlite : le résultat brut a la forme { rows }, pas celle de postgres-js que décrit le type Db
    const { rows } = (await db.execute(
      sql`select c.relname as "table" from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity order by 1`,
    )) as unknown as { rows: { table: string }[] };
    // une nouvelle table doit être créée avec RLS (ALTER TABLE … ENABLE ROW LEVEL SECURITY dans sa migration)
    expect(rows.map((r) => r.table)).toEqual([]);
  }, 60_000);
});

describe("calendrier de démonstration", () => {
  afterEach(() => vi.unstubAllEnvs());
  const equiphotel = (today: string) => demoEvents(today).find((e) => e.slug === "equiphotel-2026")!;

  it("garde ses dates d'origine par défaut (tests unitaires)", () => {
    expect(equiphotel("2027-06-01")).toMatchObject({ startsOn: "2026-11-02", endsOn: "2026-11-05", setupOn: "2026-11-01" });
  });

  it("suit la date du jour pour les tests de bout en bout, sans jamais reculer", () => {
    vi.stubEnv("DEMO_DATES_SLIDE", "1");
    expect(equiphotel("2026-11-09")).toMatchObject({ startsOn: "2026-11-12", endsOn: "2026-11-15", setupOn: "2026-11-11" });
    expect(equiphotel("2027-02-28")).toMatchObject({ startsOn: "2027-03-03", setupOn: "2027-03-02" }); // toujours dans 3 jours
    expect(equiphotel("2026-10-01").startsOn).toBe("2026-11-02");
    expect(demoEvents("2026-11-09").find((e) => e.slug === "mapic-2026")?.setupOn).toBeNull();
  });
});
