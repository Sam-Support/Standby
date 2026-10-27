import { count } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createPgliteDb } from "./index";
import * as s from "./schema";

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
});
