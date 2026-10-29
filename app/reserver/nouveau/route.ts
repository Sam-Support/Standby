import { NextResponse, type NextRequest } from "next/server";
import { getLang } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
import { getDb } from "@/db";
import { getCurrentCompany, getCurrentUser } from "@/lib/auth/session";
import { startDraft } from "@/lib/services/booking";

/** Ouvre un brouillon de réservation (le dernier resté vide, sinon un nouveau), éventuellement sur un salon. */
export async function GET(req: NextRequest) {
  const salon = req.nextUrl.searchParams.get("salon");
  const here = `/reserver/nouveau${salon ? `?salon=${encodeURIComponent(salon)}` : ""}`;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(localizePath(`/connexion?next=${encodeURIComponent(here)}`, await getLang()), req.url));
  if (user.role !== "exposant") return NextResponse.redirect(new URL(localizePath("/comptes?erreur=role", await getLang()), req.url));
  const company = await getCurrentCompany();
  if (!company || company.onboardingStep <= 4) return NextResponse.redirect(new URL(localizePath("/inscription/entreprise", await getLang()), req.url));
  const draft = await startDraft(await getDb(), company.id, salon);
  return NextResponse.redirect(new URL(localizePath(`/reserver/${draft.id}/${draft.eventId ? "equipe" : "evenement"}`, await getLang()), req.url));
}
