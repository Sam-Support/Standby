import { desc, eq, isNotNull } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { featuredFreelancer } from "@/lib/queries";
import { AdminError, setFeaturedFreelancer } from "./admin";

// « Notre top commercial » de la page d'accueil : un seul profil, choisi par l'admin, sans jamais le nom complet.

let db: Db;
let adminId: string;

beforeAll(async () => {
  db = await createPgliteDb(null, true);
  const [admin] = await db.select().from(s.profiles).where(eq(s.profiles.role, "admin"));
  adminId = admin.id;
}, 60_000);

async function freelancer(first: string, last: string) {
  const [row] = await db
    .select({ id: s.freelancers.id, userId: s.freelancers.userId })
    .from(s.freelancers)
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .where(eq(s.profiles.email, `${first}.${last}@standby.test`.toLowerCase()));
  return row;
}

const featuredIds = async () => (await db.select({ id: s.freelancers.id }).from(s.freelancers).where(isNotNull(s.freelancers.featuredSince))).map((r) => r.id);

describe("top commercial de la page d'accueil", () => {
  it("montre le profil de démonstration, avec l'initiale du nom seulement", async () => {
    const top = await featuredFreelancer(db);
    expect(top).toMatchObject({ firstName: "Karim", lastInitial: "B", city: "Paris", role: "commercial", missionsCount: 87, ratingX10: 49 });
    expect(JSON.stringify(top)).not.toContain("Benali");
  });

  it("remplace le profil à l'honneur (un seul à la fois) et prévient le commercial", async () => {
    const karim = await freelancer("Karim", "Benali");
    const sarah = await freelancer("Sarah", "Benhamou");
    await setFeaturedFreelancer(db, adminId, sarah.id, true);

    expect(await featuredIds()).toEqual([sarah.id]);
    expect(await featuredFreelancer(db)).toMatchObject({ firstName: "Sarah", lastInitial: "B" });
    const [notice] = await db.select().from(s.notifications).where(eq(s.notifications.userId, sarah.userId)).orderBy(desc(s.notifications.createdAt)).limit(1);
    expect(notice.title).toBe("Vous êtes notre top commercial");
    const [log] = await db.select().from(s.auditLog).where(eq(s.auditLog.action, "freelancer.featured"));
    expect(log).toMatchObject({ actorId: adminId, entityId: sarah.id });
    // remettre le même profil ne renvoie pas de notification
    await setFeaturedFreelancer(db, adminId, sarah.id, true);
    expect((await db.select().from(s.notifications).where(eq(s.notifications.userId, sarah.userId))).filter((n) => n.title === notice.title)).toHaveLength(1);
    expect(await featuredIds()).not.toContain(karim.id);
  });

  it("disparaît de l'accueil si le profil est suspendu ou retiré du matching", async () => {
    const sarah = await freelancer("Sarah", "Benhamou");
    await db.update(s.freelancers).set({ status: "refuse" }).where(eq(s.freelancers.id, sarah.id));
    expect(await featuredFreelancer(db)).toBeNull();
    await db.update(s.freelancers).set({ status: "valide", blockedReason: "Attestation URSSAF expirée" }).where(eq(s.freelancers.id, sarah.id));
    expect(await featuredFreelancer(db)).toBeNull();
    await db.update(s.freelancers).set({ blockedReason: null }).where(eq(s.freelancers.id, sarah.id));
    expect(await featuredFreelancer(db)).toMatchObject({ firstName: "Sarah" });
  });

  it("refuse un profil non validé et sait retirer l'honneur", async () => {
    const hugo = await freelancer("Hugo", "Perrin");
    await db.update(s.freelancers).set({ status: "en_revue" }).where(eq(s.freelancers.id, hugo.id));
    await expect(setFeaturedFreelancer(db, adminId, hugo.id, true)).rejects.toBeInstanceOf(AdminError);
    await expect(setFeaturedFreelancer(db, adminId, "00000000-0000-0000-0000-000000000000", true)).rejects.toBeInstanceOf(AdminError);

    const sarah = await freelancer("Sarah", "Benhamou");
    await setFeaturedFreelancer(db, adminId, sarah.id, false);
    expect(await featuredIds()).toEqual([]);
    expect(await featuredFreelancer(db)).toBeNull();
  });
});
