import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, schema as s } from "@/db";
import { signToken, verifyToken } from "@/lib/crypto";

export const SESSION_COOKIE = "standby_session";
const TTL = 60 * 60 * 24 * 30;

export type Role = "exposant" | "commercial" | "admin";
type SessionPayload = { uid: string; role: Role };

export async function startSession(userId: string, role: Role) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signToken({ uid: userId, role }, TTL), {
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
  return verifyToken<SessionPayload>(token);
});

export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const db = await getDb();
  const [profile] = await db.select().from(s.profiles).where(eq(s.profiles.id, session.uid));
  return profile ?? null;
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
  if (!user) redirect(`/connexion${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  if (role && user.role !== role && user.role !== "admin") redirect("/comptes?erreur=role");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion?next=/admin");
  if (user.role !== "admin") redirect("/");
  return user;
}

/** Entreprise de l'utilisateur connecté ; renvoie vers l'inscription si elle n'est pas terminée. */
export async function requireCompany(next?: string) {
  await requireUser("exposant", next);
  const company = await getCurrentCompany();
  if (!company) redirect("/inscription/entreprise");
  if (company.onboardingStep <= 4) redirect(`/inscription/entreprise?etape=${company.onboardingStep}`);
  return company;
}

export async function requireFreelancer(next?: string) {
  await requireUser("commercial", next);
  const freelancer = await getCurrentFreelancer();
  if (!freelancer) redirect("/inscription/commercial");
  if (freelancer.onboardingStep <= 4) redirect(`/inscription/commercial?etape=${freelancer.onboardingStep}`);
  return freelancer;
}
