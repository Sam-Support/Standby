import { randomUUID } from "node:crypto";
import { count, isNull } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { PRICING_DEFAULTS, STANDARD_LEAD_COLUMNS, AVATAR_COLORS, type RoleKey } from "@/lib/domain";
import { computeQuote } from "@/lib/pricing";
import type { Db } from "./index";
import * as s from "./schema";

/** Données indispensables, en production comme en démo. Idempotent. */
export async function seedEssentials(db: Db) {
  const [{ n }] = await db.select({ n: count() }).from(s.pricingSettings);
  if (n === 0) {
    await db.insert(s.pricingSettings).values(
      Object.entries(PRICING_DEFAULTS).map(([key, v]) => ({
        key,
        value: v.value,
        effectiveFrom: new Date("2026-01-01T00:00:00Z"),
      })),
    );
  }
  const standard = await db.select({ id: s.leadTemplates.id }).from(s.leadTemplates).where(isNull(s.leadTemplates.companyId));
  if (standard.length === 0) {
    await db.insert(s.leadTemplates).values({ name: "Fiche standard Standby", columns: STANDARD_LEAD_COLUMNS });
  }
}

// Mot de passe des comptes de démonstration (base locale uniquement), documenté dans le README.
export const DEMO_PASSWORD = "standby-demo";

export async function seedIfEmpty(db: Db) {
  await seedEssentials(db);
  const [{ n }] = await db.select({ n: count() }).from(s.profiles);
  if (n > 0) return;
  await seedDemo(db);
}

type FreelancerSeed = {
  first: string;
  last: string;
  city: string;
  roles: RoleKey[];
  rate: number;
  rating: number;
  missions: number;
  specialties: string[];
  languages: string[];
  sizes: [string, string, string];
};

const MAIN_FREELANCERS: FreelancerSeed[] = [
  { first: "Karim", last: "Benali", city: "Paris", roles: ["commercial"], rate: 31, rating: 49, missions: 87, specialties: ["Tech & SaaS", "Retail"], languages: ["Français", "Anglais", "Arabe"], sizes: ["L", "42", "43"] },
  { first: "Sarah", last: "Benhamou", city: "Paris", roles: ["commercial"], rate: 30, rating: 48, missions: 46, specialties: ["Mode & luxe", "Retail"], languages: ["Français", "Anglais", "Espagnol"], sizes: ["S", "36", "38"] },
  { first: "Hugo", last: "Perrin", city: "Lyon", roles: ["commercial"], rate: 29, rating: 48, missions: 54, specialties: ["Industrie", "Secteur public"], languages: ["Français", "Anglais", "Allemand"], sizes: ["M", "40", "42"] },
  { first: "Chloé", last: "Vidal", city: "Paris", roles: ["accueil"], rate: 20, rating: 48, missions: 38, specialties: ["Agro & restauration", "Maison & grand public"], languages: ["Français", "Anglais", "Italien"], sizes: ["M", "38", "39"] },
];

const FIRST = ["Léa", "Thomas", "Inès", "Lucas", "Manon", "Yanis", "Camille", "Nathan", "Sofia", "Hugo", "Emma", "Rayan", "Jade", "Louis", "Nora", "Adam", "Alice", "Mehdi", "Zoé", "Paul"];
const LAST = ["Martin", "Bernard", "Petit", "Robert", "Richard", "Durand", "Moreau", "Laurent", "Simon", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier", "Morel", "Girard", "André", "Mercier"];
const CITIES = ["Paris", "Lyon", "Cannes", "Marseille", "Lille", "Bordeaux"];
const SPECS = ["Tech & SaaS", "Retail", "Industrie", "Agro & restauration", "Immobilier & bâtiment", "Santé", "Mode & luxe", "Mobilité & logistique", "Secteur public", "Maison & grand public"];
const LANGS = ["Anglais", "Espagnol", "Allemand", "Italien", "Mandarin", "Arabe"];
const ROLE_RATES: Record<RoleKey, number> = { commercial: 27, accueil: 19, interprete: 34, chef: 36, animateur: 23, demonstrateur: 25 };
const ROLE_CYCLE: RoleKey[] = ["commercial", "accueil", "commercial", "interprete", "accueil", "chef", "animateur", "demonstrateur", "commercial", "accueil"];

function generatedFreelancers(): FreelancerSeed[] {
  return Array.from({ length: 30 }, (_, i) => {
    const role = ROLE_CYCLE[i % ROLE_CYCLE.length];
    return {
      first: FIRST[i % FIRST.length],
      last: LAST[(i * 7 + Math.floor(i / FIRST.length) * 3) % LAST.length],
      city: CITIES[i % CITIES.length],
      roles: [role],
      rate: ROLE_RATES[role] + (i % 5),
      rating: 42 + (i % 8),
      missions: 6 + ((i * 13) % 70),
      specialties: [SPECS[i % SPECS.length], SPECS[(i + 3) % SPECS.length]],
      languages: ["Français", LANGS[i % LANGS.length], ...(i % 3 === 0 ? [LANGS[(i + 2) % LANGS.length]] : [])],
      sizes: [["S", "M", "L", "XL"][i % 4], String(36 + (i % 5) * 2), String(37 + (i % 7))],
    };
  });
}

const EVENTS = [
  { slug: "equiphotel-2026", name: "EquipHotel", kind: "salon", city: "Paris", startsOn: "2026-11-02", endsOn: "2026-11-05", setupOn: "2026-11-01", sector: "Hôtellerie et restauration", specialty: "Agro & restauration", color: "#FFCD4A", siteUrl: "https://www.equiphotel.com" },
  { slug: "mapic-2026", name: "MAPIC", kind: "salon", city: "Cannes", startsOn: "2026-11-03", endsOn: "2026-11-04", setupOn: null, sector: "Immobilier commercial", specialty: "Immobilier & bâtiment", color: "#B39BFF", siteUrl: null },
  { slug: "rent-paris-2026", name: "RENT Paris", kind: "salon", city: "Paris", startsOn: "2026-11-04", endsOn: "2026-11-05", setupOn: null, sector: "Immobilier et technologies", specialty: "Tech & SaaS", color: "#82C9FF", siteUrl: null },
  { slug: "mif-expo-2026", name: "MIF Expo", kind: "salon", city: "Paris", startsOn: "2026-11-12", endsOn: "2026-11-15", setupOn: null, sector: "Fabrication française", specialty: "Industrie", color: "#68D1A4", siteUrl: null },
  { slug: "salon-des-maires-2026", name: "Salon des maires et des collectivités locales", kind: "salon", city: "Paris", startsOn: "2026-11-24", endsOn: "2026-11-26", setupOn: null, sector: "Collectivités locales", specialty: "Secteur public", color: "#FF8CB6", siteUrl: null },
  { slug: "supply-chain-event-2026", name: "Supply Chain Event", kind: "salon", city: "Paris", startsOn: "2026-12-01", endsOn: "2026-12-02", setupOn: null, sector: "Logistique", specialty: "Mobilité & logistique", color: "#82C9FF", siteUrl: null },
  { slug: "salons-solutions-2026", name: "Les Salons Solutions", kind: "salon", city: "Paris", startsOn: "2026-10-14", endsOn: "2026-10-15", setupOn: null, sector: "Solutions de gestion", specialty: "Tech & SaaS", color: "#B39BFF", siteUrl: null },
  { slug: "foire-printemps-demo-2027", name: "Foire de printemps (démo)", kind: "foire", city: "Lyon", startsOn: "2027-03-27", endsOn: "2027-04-05", setupOn: "2027-03-26", sector: "Maison et grand public", specialty: "Maison & grand public", color: "#FF9F55", siteUrl: null },
] as const;

function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = new Date(`${start}T00:00:00Z`); d <= new Date(`${end}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

async function seedDemo(db: Db) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = async (email: string, role: "exposant" | "commercial" | "admin", firstName: string, lastName: string, phone?: string) => {
    const userId = randomUUID();
    await db.insert(s.profiles).values({ id: userId, email, role, firstName, lastName, phone });
    await db.insert(s.credentials).values({ userId, passwordHash });
    return userId;
  };

  await user("admin@standby.test", "admin", "Équipe", "Standby");

  // Entreprise de démonstration
  const claire = await user("claire@maison-lumen.test", "exposant", "Claire", "Dubois", "06 12 34 56 78");
  const [company] = await db
    .insert(s.companies)
    .values({
      ownerId: claire,
      name: "Maison Lumen",
      siret: "83452190700021",
      sector: "Industrie",
      size: "50–249 salariés",
      website: "https://www.maison-lumen.example",
      linkedin: "https://www.linkedin.com/company/maison-lumen-demo",
      leadMode: "excel",
      onboardingStep: 5,
    })
    .returning();
  const [refClaire] = await db
    .insert(s.companyReferents)
    .values([
      { companyId: company.id, name: "Claire Dubois", title: "Responsable événementiel", phone: "06 12 34 56 78" },
      { companyId: company.id, name: "Julien Mercier", title: "Directeur commercial", phone: "06 98 76 54 32" },
    ])
    .returning();
  const [template] = await db
    .insert(s.leadTemplates)
    .values({
      companyId: company.id,
      name: "Template Excel Maison Lumen",
      columns: ["Nom", "Prénom", "Société", "Fonction", "Email", "Téléphone", "Produit d’intérêt", "Note", "Date du contact"],
    })
    .returning();

  // Commerciaux
  const freelancerIds: Record<string, { id: string; rate: number }> = {};
  const all = [...MAIN_FREELANCERS, ...generatedFreelancers()];
  for (const [i, f] of all.entries()) {
    const email = `${f.first}.${f.last}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + (i >= MAIN_FREELANCERS.length ? i : "") + "@standby.test";
    const userId = await user(email, "commercial", f.first, f.last, "06 00 00 00 " + String(10 + i).padStart(2, "0"));
    const [row] = await db
      .insert(s.freelancers)
      .values({
        userId,
        city: f.city,
        roles: f.roles,
        specialties: f.specialties,
        languages: f.languages,
        hourlyRateCents: f.rate * 100,
        topSize: f.sizes[0],
        pantsSize: f.sizes[1],
        shoeSize: f.sizes[2],
        siret: "00000000000000",
        legalStatus: "Auto-entrepreneur",
        status: "valide",
        payoutsEnabled: true,
        ratingX10: f.rating,
        ratingsCount: Math.max(3, Math.round(f.missions / 3)),
        missionsCount: f.missions,
        avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
        onboardingStep: 5,
      })
      .returning();
    freelancerIds[`${f.first} ${f.last}`] = { id: row.id, rate: f.rate * 100 };
  }
  const karim = freelancerIds["Karim Benali"];
  const sarah = freelancerIds["Sarah Benhamou"];
  const chloe = freelancerIds["Chloé Vidal"];
  await db.insert(s.favorites).values({ companyId: company.id, freelancerId: karim.id });

  const eventRows = await db
    .insert(s.events)
    .values(EVENTS.map((e) => ({ ...e, kind: e.kind as "salon" | "foire" })))
    .returning();
  const ev = (slug: string) => eventRows.find((e) => e.slug === slug)!;

  const team = [
    { f: karim, role: "commercial" },
    { f: sarah, role: "commercial" },
    { f: chloe, role: "accueil" },
  ];
  const makeBooking = async (
    ref: string,
    slug: string,
    people: typeof team,
    status: "partielle" | "confirmee" | "heures_a_valider",
    accepted: (i: number) => boolean,
  ) => {
    const e = ev(slug);
    const days = daysBetween(e.startsOn, e.endsOn);
    const byRole = new Map<RoleKey, number[]>();
    people.forEach((p) => byRole.set(p.role as RoleKey, [...(byRole.get(p.role as RoleKey) ?? []), p.f.rate]));
    const quote = computeQuote({
      positions: [...byRole].map(([role, rates]) => ({ role, rates })),
      days: days.length,
      billableMinutesPerDay: 480,
      serviceFeeBps: 1200,
      vatBps: 2000,
    });
    const [b] = await db
      .insert(s.bookings)
      .values({
        ref,
        companyId: company.id,
        eventId: e.id,
        status,
        days,
        stand: "B41",
        languages: ["Français", "Anglais"],
        referentId: refClaire.id,
        leadTemplateId: template.id,
        quote,
        totalHtCents: quote.totalHtCents,
        totalTtcCents: quote.totalTtcCents,
        cgvAcceptedAt: new Date(),
        confirmedAt: new Date(),
      })
      .returning();
    const roles = new Map<string, number>();
    people.forEach((p) => roles.set(p.role, (roles.get(p.role) ?? 0) + 1));
    await db.insert(s.bookingPositions).values([...roles].map(([role, qty]) => ({ bookingId: b.id, role, qty })));
    const asg = await db
      .insert(s.assignments)
      .values(
        people.map((p, i) => ({
          bookingId: b.id,
          freelancerId: p.f.id,
          role: p.role,
          hourlyRateCents: p.f.rate,
          matchScore: 90,
          status: accepted(i) ? ("acceptee" as const) : ("proposee" as const),
          proposedAt: new Date(),
          respondedAt: accepted(i) ? new Date() : null,
        })),
      )
      .returning();
    return { booking: b, assignments: asg, days };
  };

  await makeBooking("SB-4417-2026", "salon-des-maires-2026", team, "partielle", (i) => i > 0);
  await makeBooking("SB-0918-1022", "supply-chain-event-2026", team.slice(0, 2), "confirmee", () => true);
  const past = await makeBooking("SB-1004-2210", "salons-solutions-2026", team, "heures_a_valider", () => true);
  for (const a of past.assignments) {
    await db.insert(s.timesheets).values(
      past.days.map((day) => ({ assignmentId: a.id, day, minutesDeclared: a.freelancerId === chloe.id ? 450 : 480 })),
    );
  }
}
