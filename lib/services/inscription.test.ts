import { desc, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import {
  companyIdentity,
  companyLeadFormat,
  companyReferents,
  companyWeb,
  confirmCompanySiret,
  freelancerIdentity,
  freelancerProfile,
  freelancerSizes,
  freelancerStatusStep,
  registerAccount,
  uploadFreelancerDocument,
} from "./accounts";
import type { SiretLookup } from "./compliance";
import { sendSignupReminders, SIGNUP_REMINDER_MAX_AGE_DAYS } from "./signup-reminders";

// Suivi de l'inscription : accusé de réception « en cours de traitement », relances des comptes restés en chemin.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const SIRET = "73282932000074"; // clé de Luhn valide
const file = { data: Buffer.from("%PDF-1.4 test"), name: "doc.pdf" };
const billing = { billingAddress: "8 rue des Lilas, 75011 Paris", vatRegime: "franchise", vatNumber: "", acceptMandate: true };
const sameName: SiretLookup = async () => ({ found: true, active: true, name: "LUCAS MOREAU" });
const otherName: SiretLookup = async () => ({ found: true, active: true, name: "MICHELIN" });

let db: Db;
let adminId: string;

beforeAll(async () => {
  db = await createPgliteDb(null, true);
  const [admin] = await db.select().from(s.profiles).where(eq(s.profiles.role, "admin"));
  adminId = admin.id;
}, 60_000);

const mails = async (to: string) => db.select().from(s.emailOutbox).where(eq(s.emailOutbox.to, to)).orderBy(desc(s.emailOutbox.createdAt));
const subjects = async (to: string) => (await mails(to)).map((m) => m.subject);
const profileOf = async (id: string) => (await db.select().from(s.profiles).where(eq(s.profiles.id, id)))[0];
const freelancerOf = async (userId: string) => (await db.select().from(s.freelancers).where(eq(s.freelancers.userId, userId)))[0];
const companyOf = async (ownerId: string) => (await db.select().from(s.companies).where(eq(s.companies.ownerId, ownerId)))[0];

async function account(email: string, role: "exposant" | "commercial", locale: "fr" | "en" | "es" = "fr") {
  const p = await registerAccount(db, { email, password: "motdepasse-test", role, firstName: "Lucas", lastName: "Moreau", locale });
  return { ...p, at: (days: number, hours = 0) => new Date(p.createdAt.getTime() + days * DAY + hours * HOUR) };
}

describe("relances des inscriptions arrêtées en route", () => {
  it("relance à J+1, J+3 et J+7, puis s'arrête", async () => {
    const p = await account("pause@relance.test", "commercial");
    await freelancerIdentity(db, p.id, { firstName: "Lucas", lastName: "Moreau", phone: "", city: "Paris", bio: "" });

    expect(await sendSignupReminders(db, p.at(0, 12))).toBe(0);
    expect(await sendSignupReminders(db, p.at(1, 1))).toBe(1);
    const [first] = await mails(p.email);
    expect(first.subject).toBe("Votre inscription Stand-By n’est pas terminée");
    expect(first.text).toContain("il vous reste 3 étapes sur 4"); // étape 1 faite
    expect(first.text).toContain("recevoir vos premières missions");
    expect(first.text).not.toContain("dernier rappel");
    expect(first.link).toContain("/connexion?next=%2Finscription%2Fcommercial");
    expect(first.category).toBe("compte");

    // pas de doublon au passage suivant (toutes les 15 minutes)
    expect(await sendSignupReminders(db, p.at(1, 2))).toBe(0);
    expect(await sendSignupReminders(db, p.at(3, 1))).toBe(1);
    expect(await sendSignupReminders(db, p.at(7, 1))).toBe(1);
    expect((await mails(p.email))[0].text).toContain("dernier rappel");
    expect(await sendSignupReminders(db, p.at(10))).toBe(0);
    expect((await subjects(p.email)).filter((x) => x.startsWith("Votre inscription"))).toHaveLength(3);
    expect(await profileOf(p.id)).toMatchObject({ signupRemindersSent: 3 });
  });

  it("espace les relances en retard et abandonne après 14 jours", async () => {
    const p = await account("retard@relance.test", "exposant");
    // tâches planifiées en panne pendant 8 jours : une seule relance par passage, pas trois d'un coup
    expect(await sendSignupReminders(db, p.at(8))).toBe(1);
    expect(await sendSignupReminders(db, p.at(8, 1))).toBe(0);
    expect(await sendSignupReminders(db, p.at(9))).toBe(1);
    const [mail] = await mails(p.email);
    expect(mail.text).toContain("il vous reste 4 étapes sur 4"); // compte créé, fiche entreprise jamais enregistrée
    expect(mail.text).toContain("réserver votre équipe");
    expect(mail.link).toContain("%2Finscription%2Fentreprise");
    expect(await sendSignupReminders(db, p.at(SIGNUP_REMINDER_MAX_AGE_DAYS, 1))).toBe(0);
    expect(await profileOf(p.id)).toMatchObject({ signupRemindersSent: 2 });
  });

  it("renvoie le lien de confirmation quand seule l'adresse manque, dans la langue du compte", async () => {
    const p = await account("verify@relance.test", "commercial", "en");
    await freelancerIdentity(db, p.id, { firstName: "Lucas", lastName: "Moreau", phone: "", city: "Paris", bio: "" });
    await db.update(s.freelancers).set({ onboardingStep: 5 }).where(eq(s.freelancers.userId, p.id));

    expect(await sendSignupReminders(db, p.at(1, 1))).toBe(1);
    const [mail] = await mails(p.email);
    expect(mail.subject).toBe("Reminder: confirm your Stand-By e-mail address");
    expect(mail.link).toMatch(/\/en\/verifier-email\/.+/);

    // adresse confirmée et inscription terminée : plus rien
    await db.update(s.profiles).set({ emailVerifiedAt: new Date() }).where(eq(s.profiles.id, p.id));
    expect(await sendSignupReminders(db, p.at(3, 1))).toBe(0);
  });

  it("n'écrit ni aux comptes terminés, ni aux adresses en échec, ni aux administrateurs", async () => {
    const bounced = await account("rebond@relance.test", "commercial");
    await db.update(s.profiles).set({ emailUndeliverableAt: new Date(), emailUndeliverableReason: "rebond" }).where(eq(s.profiles.id, bounced.id));
    const before = (await db.select().from(s.emailOutbox)).length;
    // les comptes de démonstration (terminés et confirmés) et l'admin ne reçoivent rien
    expect(await sendSignupReminders(db, bounced.at(2))).toBe(0);
    expect((await db.select().from(s.emailOutbox)).length).toBe(before);
    expect(await profileOf(adminId)).toMatchObject({ signupRemindersSent: 0 });
  });
});

describe("compte en cours de traitement", () => {
  it("commercial : accusé de réception à l'envoi du dossier, une seule fois", async () => {
    const p = await account("dossier@suivi.test", "commercial");
    await db.update(s.profiles).set({ emailVerifiedAt: new Date() }).where(eq(s.profiles.id, p.id));
    await freelancerIdentity(db, p.id, { firstName: "Lucas", lastName: "Moreau", phone: "", city: "Paris", bio: "" });
    await freelancerProfile(db, await freelancerOf(p.id), { roles: ["commercial"], specialties: ["Retail"], languages: ["Français"], hourlyRateCents: 2800 });
    await freelancerSizes(db, await freelancerOf(p.id), { top: "M", pants: "40", shoe: "42" });
    const today = new Date().toISOString().slice(0, 10);
    for (const t of ["identite", "rib"] as const) await uploadFreelancerDocument(db, await freelancerOf(p.id), t, file);
    await uploadFreelancerDocument(db, await freelancerOf(p.id), "urssaf", file, today, today);
    await freelancerStatusStep(db, await freelancerOf(p.id), { siret: SIRET, legalStatus: "", ...billing }, sameName);

    expect(await freelancerOf(p.id)).toMatchObject({ status: "en_revue", onboardingStep: 5 });
    const title = "Dossier reçu : votre profil est en cours de vérification";
    expect(await subjects(p.email)).toContain(title);
    const notes = await db.select().from(s.notifications).where(eq(s.notifications.userId, p.id));
    expect(notes.filter((n) => n.title === title)).toHaveLength(1);
    expect(notes.find((n) => n.title === title)?.link).toBe("/commercial");

    // le dossier renvoyé pendant la vérification ne redéclenche pas l'accusé de réception
    await freelancerStatusStep(db, await freelancerOf(p.id), { siret: SIRET, legalStatus: "", ...billing }, sameName);
    expect((await subjects(p.email)).filter((x) => x === title)).toHaveLength(1);
    // inscription terminée et adresse confirmée : pas de relance
    expect(await sendSignupReminders(db, p.at(2))).toBe(0);
  });

  it("entreprise : bienvenue avec vérification en cours, puis confirmation de l'équipe", async () => {
    const p = await account("societe@suivi.test", "exposant");
    await companyIdentity(db, p.id, { name: "Recette Suivi", siret: "42462288400015", sector: "", size: "", billingAddress: "12 rue de la Paix, 75002 Paris", vatNumber: "" }, otherName);
    await companyWeb(db, await companyOf(p.id), { website: "", linkedin: "" });
    await companyReferents(db, await companyOf(p.id), [{ name: "Claire Dubois", title: "", phone: "" }]);
    expect(await subjects(p.email)).not.toContain("Bienvenue sur Stand-By, Recette Suivi");
    await companyLeadFormat(db, await companyOf(p.id), { mode: "standard", columns: [] });

    expect(await companyOf(p.id)).toMatchObject({ onboardingStep: 5, siretVerified: false });
    const [welcome] = (await mails(p.email)).filter((m) => m.subject === "Bienvenue sur Stand-By, Recette Suivi");
    expect(welcome.text).toContain("vérifie l’identité de votre entreprise");

    // modifier ensuite le format des leads n'est pas une nouvelle inscription
    await companyLeadFormat(db, await companyOf(p.id), { mode: "standard", columns: [] });
    expect((await subjects(p.email)).filter((x) => x.startsWith("Bienvenue"))).toHaveLength(1);

    const company = await companyOf(p.id);
    await confirmCompanySiret(db, adminId, company.id);
    expect(await subjects(p.email)).toContain("Votre entreprise est vérifiée");
    await confirmCompanySiret(db, adminId, company.id);
    expect((await subjects(p.email)).filter((x) => x === "Votre entreprise est vérifiée")).toHaveLength(1);
  });
});
