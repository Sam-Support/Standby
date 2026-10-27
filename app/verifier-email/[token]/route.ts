import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { confirmEmail } from "@/lib/services/accounts";

const HOME = { exposant: "/entreprise", commercial: "/commercial", admin: "/admin" } as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const profile = await confirmEmail(await getDb(), token);
    const viewer = await getCurrentUser();
    const target = viewer?.id === profile.id ? `${HOME[profile.role]}?email=confirme` : "/connexion?email=confirme";
    return NextResponse.redirect(new URL(target, req.url));
  } catch {
    return NextResponse.redirect(new URL("/connexion?email=invalide", req.url));
  }
}
