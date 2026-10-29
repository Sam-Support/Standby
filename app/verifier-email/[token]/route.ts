import { NextResponse, type NextRequest } from "next/server";
import { getLang } from "@/lib/i18n/server";
import { localizePath } from "@/lib/i18n/config";
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
    return NextResponse.redirect(new URL(localizePath(target, await getLang()), req.url));
  } catch {
    return NextResponse.redirect(new URL(localizePath("/connexion?email=invalide", await getLang()), req.url));
  }
}
