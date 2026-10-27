import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import { check, hit, RateLimitError, reset } from "./rate-limit";

let db: Db;
beforeAll(async () => {
  db = await createPgliteDb(null, false);
});

describe("limitation des tentatives", () => {
  const limit = { max: 3, windowSeconds: 60 };

  it("bloque au-delà du maximum puis rouvre après la fenêtre", async () => {
    const t0 = new Date("2026-10-27T10:00:00Z");
    for (let i = 0; i < 3; i++) await hit(db, "k1", limit, t0);
    await expect(hit(db, "k1", limit, t0)).rejects.toBeInstanceOf(RateLimitError);
    await expect(check(db, "k1", limit, t0)).rejects.toThrow(/Trop de tentatives/);
    const t1 = new Date(t0.getTime() + 61_000);
    await expect(check(db, "k1", limit, t1)).resolves.toBeUndefined();
    await expect(hit(db, "k1", limit, t1)).resolves.toBeUndefined();
  });

  it("ne compte pas lors d'une simple vérification et se réinitialise", async () => {
    const t0 = new Date("2026-10-27T10:00:00Z");
    for (let i = 0; i < 5; i++) await check(db, "k2", limit, t0);
    await hit(db, "k2", limit, t0);
    await hit(db, "k2", limit, t0);
    await hit(db, "k2", limit, t0);
    await reset(db, "k2");
    await expect(hit(db, "k2", limit, t0)).resolves.toBeUndefined();
  });
});
