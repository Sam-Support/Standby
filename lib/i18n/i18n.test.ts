import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { cancellationSchedule } from "@/lib/cancellation";
import { legalContent } from "@/lib/content";
import { fmt } from "@/lib/format";
import { notify } from "@/lib/notify";
import { localizePath, negotiateLang, splitLang } from "./config";
import { account } from "./messages/account";
import { booking } from "./messages/booking";
import { common } from "./messages/common";
import { company } from "./messages/company";
import { domainLabels } from "./messages/domain";
import { translateFeedback } from "./messages/feedback";
import { freelancer } from "./messages/freelancer";
import { home } from "./messages/home";
import { translateInvoiceText } from "./messages/invoice";
import { notices } from "./messages/notices";
import { pages } from "./messages/pages";
import { signup } from "./messages/signup";

describe("adresses localisées", () => {
  it("sépare le préfixe de langue", () => {
    expect(splitLang("/en/entreprise")).toEqual({ lang: "en", path: "/entreprise" });
    expect(splitLang("/es")).toEqual({ lang: "es", path: "/" });
    expect(splitLang("/entreprise")).toEqual({ lang: null, path: "/entreprise" });
    expect(splitLang("/english")).toEqual({ lang: null, path: "/english" });
  });

  it("préfixe les liens internes, jamais l'API ni les adresses externes", () => {
    expect(localizePath("/reserver/nouveau", "en")).toBe("/en/reserver/nouveau");
    expect(localizePath("/", "es")).toBe("/es");
    expect(localizePath("/?compte=supprime", "en")).toBe("/en?compte=supprime");
    expect(localizePath("/en/aide", "fr")).toBe("/aide");
    expect(localizePath("/en/aide", "es")).toBe("/es/aide");
    expect(localizePath("/api/stripe", "en")).toBe("/api/stripe");
    expect(localizePath("https://checkout.stripe.com/x", "en")).toBe("https://checkout.stripe.com/x");
    expect(localizePath("//evil.example", "en")).toBe("//evil.example");
  });

  it("choisit la langue du navigateur, français par défaut", () => {
    expect(negotiateLang("es-ES,es;q=0.9,en;q=0.8")).toBe("es");
    expect(negotiateLang("de-DE,en;q=0.7")).toBe("en");
    expect(negotiateLang("de-DE")).toBe("fr");
    expect(negotiateLang(null)).toBe("fr");
  });
});

describe("formats", () => {
  it("montants, dates et heures selon la langue", () => {
    expect(fmt("fr").longDate("2026-11-01")).toBe("1er novembre 2026");
    expect(fmt("en").longDate("2026-11-01")).toMatch(/1 November 2026/);
    expect(fmt("es").longDate("2026-11-01")).toMatch(/1 de noviembre de 2026/);
    expect(fmt("fr").euros(123450)).toMatch(/1\s234,50\s€|1\s235\s€/);
    expect(fmt("en").euros(123450)).toMatch(/^€1,23[45]/);
  });

  it("barème d'annulation traduit", () => {
    const p = { freeDays: 30, tier1Days: 14, tier1Bps: 2500, tier2Days: 7, tier2Bps: 5000, lastBps: 10000 };
    expect(cancellationSchedule(p)[0].when).toBe("30 jours ou plus avant le premier jour");
    expect(cancellationSchedule(p, "en")[0].when).toBe("30 days or more before the first day");
    expect(cancellationSchedule(p, "es")[3].when).toBe("Menos de 7 días antes, o evento ya iniciado");
  });
});

describe("dictionnaires", () => {
  // même forme dans les trois langues (le typage l'impose déjà ; ce test attrape les chaînes vides)
  const empty = (v: unknown, path: string): string[] =>
    typeof v === "string" ? (v.trim() || path.endsWith("frenchPrevails") ? [] : [path]) : Array.isArray(v) || (v && typeof v === "object") ? Object.entries(v as object).flatMap(([k, x]) => empty(x, `${path}.${k}`)) : [];

  it.each(Object.entries({ account, booking, common, company, freelancer, home, pages, signup }))("%s : aucune traduction vide", (_, m) => {
    expect([...empty(m.en, "en"), ...empty(m.es, "es")]).toEqual([]);
  });

  it("libellés métier traduits, valeurs françaises conservées sinon", () => {
    expect(domainLabels("en").role("accueil").label).toBe("Booth host");
    expect(domainLabels("es").language("Anglais")).toBe("Inglés");
    expect(domainLabels("en").specialty("Spécialité inconnue")).toBe("Spécialité inconnue");
    expect(domainLabels("fr").language("Anglais")).toBe("Anglais");
  });

  it("textes légaux : mêmes sections dans les trois langues", () => {
    for (const key of ["MENTIONS", "CGU", "CONFIDENTIALITE", "ACCESSIBILITE", "MANDAT_FACTURATION", "FAQ"] as const) {
      expect(legalContent("en")[key]).toHaveLength(legalContent("fr")[key].length);
      expect(legalContent("es")[key]).toHaveLength(legalContent("fr")[key].length);
    }
    expect(legalContent("en").cgv("15 %", ["a", "b"])).toHaveLength(legalContent("fr").cgv("15 %", ["a", "b"]).length);
  });
});

describe("messages du serveur", () => {
  it("traduit les messages fixes et les gabarits, garde le français en français", () => {
    expect(translateFeedback("Adresse e-mail invalide.", "en")).toBe("Invalid e-mail address.");
    expect(translateFeedback("Adresse e-mail invalide.", "fr")).toBe("Adresse e-mail invalide.");
    expect(translateFeedback("Les 2 places « Accueil » sont prises : retirez d’abord un profil.", "en")).toBe("All 2 “Host” places are taken: remove a profile first.");
    expect(translateFeedback("Trop de tentatives. Réessayez dans 1 minute.", "es")).toBe("Demasiados intentos. Vuelva a intentarlo dentro de 1 minuto.");
    expect(translateFeedback("Message inconnu.", "en")).toBe("Message inconnu.");
  });

  it("traduit les lignes de facture enregistrées en français", () => {
    expect(translateInvoiceText("2 × Accueil", "en")).toBe("2 × Host");
    expect(translateInvoiceText("Frais de service (15 %)", "es")).toBe("Gastos de servicio (15 %)");
    expect(translateInvoiceText("2 × Accueil", "fr")).toBeNull();
  });

  // tout message d'erreur levé par les services publics doit avoir sa traduction anglaise
  it("chaque erreur des services a une traduction", () => {
    const dir = join(import.meta.dirname, "../services");
    const adminOnly = new Set(["admin.ts", "credit-notes.ts"]);
    const missing: string[] = [];
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !adminOnly.has(f))) {
      const src = readFileSync(join(dir, file), "utf8");
      for (const m of src.matchAll(/throw new (?:Account|Booking)Error\("([^"]+)"\)/g)) {
        if (translateFeedback(m[1], "en") === m[1]) missing.push(`${file} : ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("notifications dans la langue du destinataire", () => {
  let db: Db;
  beforeAll(async () => {
    db = await createPgliteDb(null, true);
  });

  it("écrit la notification et l'e-mail dans la langue du compte, lien préfixé", async () => {
    const [p] = await db.select().from(s.profiles).where(eq(s.profiles.role, "commercial")).limit(1);
    await db.update(s.profiles).set({ locale: "es" }).where(eq(s.profiles.id, p.id));
    await notify(db, p.id, { t: (n) => n.declareHours({ ref: "SB-TEST" }), link: "/commercial/missions/x" });
    const [n] = await db.select().from(s.notifications).where(eq(s.notifications.userId, p.id)).orderBy(s.notifications.createdAt);
    const last = (await db.select().from(s.notifications).where(eq(s.notifications.userId, p.id))).at(-1)!;
    expect(n).toBeDefined();
    expect(last.title).toBe(notices("es").declareHours({ ref: "SB-TEST" }).title);
    expect(last.link).toBe("/commercial/missions/x");
    const mail = (await db.select().from(s.emailOutbox).where(eq(s.emailOutbox.to, p.email))).at(-1)!;
    expect(mail.subject).toBe("Declare sus horas");
    expect(mail.link).toMatch(/\/es\/commercial\/missions\/x$/);
  });

  it("reste en français par défaut", async () => {
    const [p] = await db.select().from(s.profiles).where(eq(s.profiles.role, "exposant")).limit(1);
    await notify(db, p.id, { t: (n) => n.rateTeam({ ref: "SB-TEST" }), link: "/entreprise", email: false });
    const last = (await db.select().from(s.notifications).where(eq(s.notifications.userId, p.id))).at(-1)!;
    expect(last.title).toBe("Notez votre équipe");
  });
});
