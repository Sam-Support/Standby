import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { longDate } from "@/lib/format";
import { frVatNumber } from "@/lib/siret";
import { companyIdentity, confirmCompanySiret, freelancerIdentity, registerAccount } from "./accounts";
import { invoiceClient, type InvoiceClient } from "./billing";
import { confirmationIssues, createDraft, loadAssignments, saveTeamStep, startDraft } from "./booking";
import { checkCompliance, companyNameMatches, maybeValidateFreelancer, type SiretLookup } from "./compliance";
import { validateAssignmentHours } from "./hours";

// Corrections issues de la recette du 28 octobre 2026

let db: Db;
let adminId: string;

beforeAll(async () => {
  db = await createPgliteDb(null, true);
  const [admin] = await db.select().from(s.profiles).where(eq(s.profiles.role, "admin"));
  adminId = admin.id;
});

const michelin: SiretLookup = async () => ({ found: true, active: true, name: "MICHELIN" });
const adminTitles = async () => (await db.select().from(s.notifications).where(eq(s.notifications.userId, adminId))).map((n) => n.title);

describe("identité des entreprises", () => {
  it("rapproche raison sociale et nom SIRENE", () => {
    expect(companyNameMatches("MAISON LUMEN", "Maison Lumen")).toBe(true);
    expect(companyNameMatches("MAISON LUMEN SAS", "Maison Lumen")).toBe(true);
    expect(companyNameMatches("SOCIETE DES EAUX DE PARIS", "Eaux de Paris")).toBe(true);
    expect(companyNameMatches("MICHELIN", "Recette QA")).toBe(false);
    expect(companyNameMatches(null, "Recette QA")).toBe(false);
  });

  it("calcule le numéro de TVA intracommunautaire français", () => {
    // numéros publiés d'EDF et d'Engie
    expect(frVatNumber("552 081 317 00000")).toBe("FR03552081317");
    expect(frVatNumber("542107651")).toBe("FR13542107651");
  });

  it("n'affiche « vérifiée » que si le nom concorde ; l'équipe peut confirmer", async () => {
    const p = await registerAccount(db, { email: "fausse@e2e.test", password: "motdepasse-123", role: "exposant", firstName: "Inès", lastName: "Test" });
    const input = { name: "Recette QA", siret: "42462288400015", sector: "", size: "", billingAddress: "12 rue de la Paix, 75002 Paris", vatNumber: "" };
    await expect(companyIdentity(db, p.id, { ...input, billingAddress: "Paris" }, michelin)).rejects.toThrow(/adresse/);
    const id = await companyIdentity(db, p.id, input, michelin);
    let [c] = await db.select().from(s.companies).where(eq(s.companies.id, id));
    expect(c).toMatchObject({ siretVerified: false, siretName: "MICHELIN", billingAddress: "12 rue de la Paix, 75002 Paris", vatNumber: frVatNumber(input.siret) });
    expect(await adminTitles()).toContain("Entreprise à vérifier");

    await confirmCompanySiret(db, adminId, id);
    await companyIdentity(db, p.id, { ...input, sector: "Industrie" }, michelin); // même nom, même SIRET : confirmation conservée
    [c] = await db.select().from(s.companies).where(eq(s.companies.id, id));
    expect(c.siretVerified).toBe(true);
    await companyIdentity(db, p.id, { ...input, name: "Autre nom" }, michelin);
    [c] = await db.select().from(s.companies).where(eq(s.companies.id, id));
    expect(c.siretVerified).toBe(false);
  });

  it("laisse modifier le profil quand le SIRET déjà enregistré n'est pas retrouvé", async () => {
    const [lumen] = await db.select().from(s.companies).where(eq(s.companies.name, "Maison Lumen"));
    const input = { name: lumen.name, siret: lumen.siret, sector: "Éclairage", size: "", billingAddress: lumen.billingAddress!, vatNumber: "" };
    const notFound: SiretLookup = async () => ({ found: false });
    await companyIdentity(db, lumen.ownerId, input, notFound);
    const [after] = await db.select().from(s.companies).where(eq(s.companies.id, lumen.id));
    expect(after).toMatchObject({ sector: "Éclairage", siretVerified: true });
    await expect(companyIdentity(db, lumen.ownerId, { ...input, siret: "42462288400015" }, notFound)).rejects.toThrow(/introuvable/);
  });

  it("exige l'adresse de facturation avant de réserver et la fige sur la facture", async () => {
    const [lumen] = await db.select().from(s.companies).where(eq(s.companies.name, "Maison Lumen"));
    const draft = await createDraft(db, lumen.id, "equiphotel-2026");
    await db.update(s.companies).set({ billingAddress: null }).where(eq(s.companies.id, lumen.id));
    expect((await confirmationIssues(db, draft)).join(" ")).toMatch(/adresse de facturation/);
    await db.update(s.companies).set({ billingAddress: "18 rue de la Lumière, 69002 Lyon" }).where(eq(s.companies.id, lumen.id));
    expect((await confirmationIssues(db, draft)).join(" ")).not.toMatch(/adresse de facturation/);

    // facture émise : coordonnées du client figées
    const [b] = await db.select().from(s.bookings).where(eq(s.bookings.ref, "SB-1004-2210"));
    for (const a of await loadAssignments(db, b.id)) await validateAssignmentHours(db, a.id, lumen.id, lumen.ownerId);
    const [invoice] = await db.select().from(s.invoices).where(eq(s.invoices.bookingId, b.id));
    expect(invoice.client).toEqual(invoiceClient({ ...lumen, billingAddress: "18 rue de la Lumière, 69002 Lyon" }));
    await db.update(s.companies).set({ billingAddress: "1 place Neuve, 13001 Marseille" }).where(eq(s.companies.id, lumen.id));
    const [again] = await db.select().from(s.invoices).where(eq(s.invoices.id, invoice.id));
    expect((again.client as InvoiceClient).address).toBe("18 rue de la Lumière, 69002 Lyon");
  });
});

describe("validation des commerciaux", () => {
  it("ne valide pas automatiquement un SIRET au nom d'un tiers, et signale un SIRET devenu introuvable", async () => {
    const p = await registerAccount(db, { email: "nora@e2e.test", password: "motdepasse-123", role: "commercial", firstName: "Nora", lastName: "Recette" });
    await freelancerIdentity(db, p.id, { firstName: "Nora", lastName: "Recette", phone: "", city: "Lyon", bio: "" });
    const [f] = await db.select().from(s.freelancers).where(eq(s.freelancers.userId, p.id));
    // documents validés, attestation à jour, SIRET actif mais au nom de MICHELIN
    await db.update(s.freelancers).set({ onboardingStep: 5, status: "en_revue", siret: "42462288400015", siretStatus: "actif", siretName: "MICHELIN" }).where(eq(s.freelancers.id, f.id));
    for (const type of ["identite", "rib"] as const) await db.insert(s.freelancerDocuments).values({ freelancerId: f.id, type, path: null, filename: "doc.pdf", status: "valide" });
    await db.insert(s.freelancerDocuments).values({ freelancerId: f.id, type: "urssaf", path: null, filename: "u.pdf", status: "valide", issuedOn: "2026-10-01", validUntil: "2027-04-01" });

    expect(await maybeValidateFreelancer(db, f.id, "2026-10-28")).toBe(false);
    expect(await adminTitles()).toContain("Profil à valider manuellement");
    await db.update(s.freelancers).set({ siretName: "NORA RECETTE" }).where(eq(s.freelancers.id, f.id));
    expect(await maybeValidateFreelancer(db, f.id, "2026-10-28")).toBe(true);

    await db.update(s.freelancers).set({ siretCheckedAt: new Date("2026-01-01T00:00:00Z") }).where(eq(s.freelancers.id, f.id));
    await checkCompliance(db, "2026-10-28", async () => ({ found: false }));
    expect(await adminTitles()).toContain("SIRET introuvable au recontrôle");
    const [after] = await db.select().from(s.freelancers).where(eq(s.freelancers.id, f.id));
    expect(after.blockedReason).toBeNull(); // vérification humaine, pas de retrait automatique
  });
});

describe("brouillons de réservation", () => {
  it("reprend le dernier brouillon vide au lieu d'en créer un à chaque visite", async () => {
    const [lumen] = await db.select().from(s.companies).where(eq(s.companies.name, "Maison Lumen"));
    const first = await startDraft(db, lumen.id, "equiphotel-2026");
    expect((await startDraft(db, lumen.id, "equiphotel-2026")).id).toBe(first.id);
    const [mapic] = await db.select().from(s.events).where(eq(s.events.slug, "mapic-2026"));
    const switched = await startDraft(db, lumen.id, "mapic-2026"); // brouillon vide : le salon est remplacé
    expect(switched).toMatchObject({ id: first.id, eventId: mapic.id });
    await saveTeamStep(db, switched, { positions: { commercial: 1 }, languages: ["Français"], outfit: "exposant" });
    expect((await startDraft(db, lumen.id, "mapic-2026")).id).not.toBe(first.id); // brouillon commencé : on n'y touche pas
  });
});

describe("présentation", () => {
  it("écrit le premier du mois « 1er »", () => {
    expect(longDate("2026-12-01")).toBe("1er décembre 2026");
    expect(longDate("2026-12-11")).toBe("11 décembre 2026");
  });
});
