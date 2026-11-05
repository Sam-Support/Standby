import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { addDays } from "@/lib/format";
import { freelancerIdentity, freelancerProfile, freelancerSizes, freelancerStatusStep, registerAccount, reviewDocument, uploadFreelancerDocument } from "./accounts";
import { createDraft, findCandidates, getCompanyBooking } from "./booking";
import { applyStripeVerification, checkCompliance, siretNameMatches, stripeVerification, urssafValidUntil, type SiretLookup } from "./compliance";

const TODAY = "2026-10-27";
const SIRET = "73282932000074"; // clé de Luhn valide
const active: SiretLookup = async () => ({ found: true, active: true, name: "LUCAS MOREAU" });
const closed: SiretLookup = async () => ({ found: true, active: false, name: "LUCAS MOREAU" });
const missing: SiretLookup = async () => ({ found: false });
const file = { data: Buffer.from("%PDF-1.4 test"), name: "doc.pdf" };
const billing = { billingAddress: "8 rue des Lilas, 75011 Paris", vatRegime: "franchise", vatNumber: "", acceptMandate: true };

let db: Db;
beforeAll(async () => {
  db = await createPgliteDb(null, true);
});

describe("règles", () => {
  it("calcule l'échéance de l'attestation URSSAF (6 mois)", () => {
    expect(urssafValidUntil("2026-10-15")).toBe("2027-04-15");
    expect(urssafValidUntil("2026-08-31")).toBe("2027-02-28");
  });

  it("rapproche le nom SIRENE du nom du compte", () => {
    expect(siretNameMatches("KARIM BENALI", "Karim", "Benali")).toBe(true);
    expect(siretNameMatches("BENALI KARIM (BENALI CONSEIL)", "Karim", "Benali")).toBe(true);
    expect(siretNameMatches("CHLOE VIDAL", "Chloé", "Vidal")).toBe(true);
    expect(siretNameMatches("MARTIN DUPONT", "Karim", "Benali")).toBe(false);
    expect(siretNameMatches(null, "Karim", "Benali")).toBe(false);
  });

  it("lit les vérifications d'un compte Stripe", () => {
    const acct = { individual: { verification: { status: "verified" } }, payouts_enabled: true, external_accounts: { data: [{}] } } as unknown as Stripe.Account;
    expect(stripeVerification(acct)).toEqual({ identity: true, bank: true });
    expect(stripeVerification({ ...acct, payouts_enabled: false, individual: undefined } as Stripe.Account)).toEqual({ identity: false, bank: false });
  });
});

async function newFreelancer(email: string) {
  const p = await registerAccount(db, { email, password: "motdepasse-test", role: "commercial", firstName: "Lucas", lastName: "Moreau" });
  await db.update(s.profiles).set({ emailVerifiedAt: new Date() }).where(eq(s.profiles.id, p.id));
  await freelancerIdentity(db, p.id, { firstName: "Lucas", lastName: "Moreau", phone: "", city: "Paris", bio: "" });
  const get = async () => (await db.select().from(s.freelancers).where(eq(s.freelancers.userId, p.id)))[0];
  await freelancerProfile(db, await get(), { roles: ["commercial"], specialties: ["Agro & restauration"], languages: ["Français"], hourlyRateCents: 2800 });
  await freelancerSizes(db, await get(), { top: "M", pants: "40", shoe: "42" });
  return get;
}

describe("validation des commerciaux", () => {
  it("refuse un SIRET introuvable ou fermé dans SIRENE", async () => {
    const get = await newFreelancer("siret-ko@e2e.test");
    for (const t of ["identite", "rib"] as const) await uploadFreelancerDocument(db, await get(), t, file);
    await uploadFreelancerDocument(db, await get(), "urssaf", file, "2026-10-01", TODAY);
    await expect(freelancerStatusStep(db, await get(), { siret: SIRET, legalStatus: "", ...billing }, missing)).rejects.toThrow(/introuvable/);
    await expect(freelancerStatusStep(db, await get(), { siret: SIRET, legalStatus: "", ...billing }, closed)).rejects.toThrow(/fermé/);
  });

  it("refuse une attestation de plus de 6 mois ou sans date", async () => {
    const get = await newFreelancer("urssaf-ko@e2e.test");
    await expect(uploadFreelancerDocument(db, await get(), "urssaf", file, "2026-03-01", TODAY)).rejects.toThrow(/plus de 6 mois/);
    await expect(uploadFreelancerDocument(db, await get(), "urssaf", file, null, TODAY)).rejects.toThrow(/date de délivrance/);
  });

  it("valide via Stripe et l'URSSAF, relance, retire puis réintègre au matching", async () => {
    const get = await newFreelancer("cycle@e2e.test");
    const [admin] = await db.select().from(s.profiles).where(eq(s.profiles.role, "admin"));
    for (const t of ["identite", "rib"] as const) await uploadFreelancerDocument(db, await get(), t, file);
    await uploadFreelancerDocument(db, await get(), "urssaf", file, "2026-10-01", TODAY);
    await freelancerStatusStep(db, await get(), { siret: SIRET, legalStatus: "Auto-entrepreneur", ...billing }, active);
    expect((await get()).status).toBe("en_revue");
    expect((await get()).siretStatus).toBe("actif");

    // Stripe a vérifié l'identité et le compte bancaire : il ne reste que l'URSSAF à contrôler
    expect(await applyStripeVerification(db, (await get()).id, { identity: true, bank: true })).toEqual(["identite", "rib"]);
    expect((await get()).status).toBe("en_revue");
    const mine = (await db.select().from(s.freelancerDocuments).where(eq(s.freelancerDocuments.freelancerId, (await get()).id))).find((d) => d.type === "urssaf")!;
    await reviewDocument(db, mine.id, admin.id, "valide", "", null, TODAY);
    expect((await get()).status).toBe("valide");
    const validUntil = urssafValidUntil("2026-10-01");

    // présent dans le matching
    const [company] = await db.select().from(s.companies).where(eq(s.companies.name, "Maison Lumen"));
    const draft = await createDraft(db, company.id, "equiphotel-2026");
    const me = (await get()).id;
    const inMatching = async () => (await findCandidates(db, (await getCompanyBooking(db, draft.id, company.id))!, "commercial")).some((c) => c.id === me);
    expect(await inMatching()).toBe(true);

    // relances à 30 et 7 jours, une seule fois chacune
    expect((await checkCompliance(db, addDays(validUntil, -20), active)).reminders).toBe(1);
    expect((await checkCompliance(db, addDays(validUntil, -20), active)).reminders).toBe(0);
    expect((await checkCompliance(db, addDays(validUntil, -5), active)).reminders).toBe(1);

    // échéance passée : retiré du matching
    await checkCompliance(db, addDays(validUntil, 1), active);
    expect((await get()).blockedReason).toMatch(/Attestation URSSAF expirée/);
    expect(await inMatching()).toBe(false);

    // nouvelle attestation validée : réintégré
    await uploadFreelancerDocument(db, await get(), "urssaf", file, validUntil, addDays(validUntil, 1));
    await reviewDocument(db, mine.id, admin.id, "valide", "", null, addDays(validUntil, 1));
    expect((await get()).blockedReason).toBeNull();

    // établissement fermé lors du contrôle SIRENE mensuel
    await db.update(s.freelancers).set({ siretCheckedAt: new Date("2026-01-01T00:00:00Z") }).where(eq(s.freelancers.id, (await get()).id));
    await checkCompliance(db, addDays(validUntil, 2), closed);
    expect((await get()).siretStatus).toBe("ferme");
    expect((await get()).blockedReason).toMatch(/fermé/);
    expect(await inMatching()).toBe(false);
  });
});
