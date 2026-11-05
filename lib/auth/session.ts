import { eq } from "drizzle-orm";
import { getLang } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, schema as s } from "@/db";
import { signToken, verifyToken } from "@/lib/crypto";

export const SESSION_COOKIE = "standby_session";
const TTL = 60 * 60 * 24 * 30;

export type Role = "exposant" | "commercial" | "admin";
// v : version de session du profil au moment de la connexion (voir profiles.sessionVersion)
type SessionPayload = { uid: string; role: Role; v?: number };

export async function startSession(userId: string, role: Role, version = 0) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signToken("session", { uid: userId, role, v: version }, TTL), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "1",
    path: "/",
    maxAge: TTL,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifyToken<SessionPayload>(token, "session");
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const db = await getDb();
  const [profile] = await db.select().from(s.profiles).where(eq(s.profiles.id, session.uid));
  // mot de passe changé depuis l'ouverture de cette session : elle n'est plus valable
  if (!profile || profile.sessionVersion !== (session.v ?? 0)) return null;
  return profile;
});

export const getCurrentCompany = cache(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "exposant") return null;
  const db = await getDb();
  const [company] = await db.select().from(s.companies).where(eq(s.companies.ownerId, user.id));
  return company ?? null;
});

export const getCurrentFreelancer = cache(async () => {
  const user = await getCurrentUser();
  if (!user || user.role !== "commercial") return null;
  const db = await getDb();
  const [freelancer] = await db.select().from(s.freelancers).where(eq(s.freelancers.userId, user.id));
  return freelancer ?? null;
});

export async function requireUser(role?: Role, next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(localizePath(`/connexion${next ? `?next=${encodeURIComponent(next)}` : ""}`, await getLang()));
  if (role && user.role !== role && user.role !== "admin") redirect(localizePath("/comptes?erreur=role", await getLang()));
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect(localizePath("/connexion?next=/admin", await getLang()));
  if (user.role !== "admin") redirect(localizePath("/", await getLang()));
  return user;
}

/** Entreprise de l'utilisateur connecté ; renvoie vers l'inscription si elle n'est pas terminée. */
export async function requireCompany(next?: string) {
  await requireUser("exposant", next);
  const company = await getCurrentCompany();
  if (!company) redirect(localizePath("/inscription/entreprise", await getLang()));
  if (company.onboardingStep <= 4) redirect(localizePath(`/inscription/entreprise?etape=${company.onboardingStep}`, await getLang()));
  return company;
}

export async function requireFreelancer(next?: string) {
  await requireUser("commercial", next);
  const freelancer = await getCurrentFreelancer();
  if (!freelancer) redirect(localizePath("/inscription/commercial", await getLang()));
  if (freelancer.onboardingStep <= 4) redirect(localizePath(`/inscription/commercial?etape=${freelancer.onboardingStep}`, await getLang()));
  return freelancer;
}
