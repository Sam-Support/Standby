import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { confirmEmailChange } from "@/lib/services/accounts";

/** Lien envoyé à la nouvelle adresse : elle devient l'identifiant du compte. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const viewer = await getCurrentUser();
    const profile = await confirmEmailChange(await getDb(), token);
    return NextResponse.redirect(new URL(viewer?.id === profile.id ? "/compte?email=modifie" : "/connexion?email=modifie", req.url));
  } catch {
    return NextResponse.redirect(new URL("/connexion?email=lien-invalide", req.url));
  }
}
