import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { getCurrentCompany, getCurrentUser } from "@/lib/auth/session";
import { createDraft } from "@/lib/services/booking";

/** Crée un brouillon de réservation (éventuellement sur un salon) puis ouvre l'étape 1. */
export async function GET(req: NextRequest) {
  const salon = req.nextUrl.searchParams.get("salon");
  const here = `/reserver/nouveau${salon ? `?salon=${encodeURIComponent(salon)}` : ""}`;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(`/connexion?next=${encodeURIComponent(here)}`, req.url));
  if (user.role !== "exposant") return NextResponse.redirect(new URL("/comptes?erreur=role", req.url));
  const company = await getCurrentCompany();
  if (!company || company.onboardingStep <= 4) return NextResponse.redirect(new URL("/inscription/entreprise", req.url));
  const draft = await createDraft(await getDb(), company.id, salon);
  return NextResponse.redirect(new URL(`/reserver/${draft.id}/${draft.eventId ? "equipe" : "evenement"}`, req.url));
}
