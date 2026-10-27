import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getFile, mimeFor } from "@/lib/storage";

const UUID = /^[0-9a-f-]{36}$/;

/**
 * Fichiers servis avec contrôle d'accès :
 * public/…                     tout le monde (logos autorisés)
 * private/companies/<id>/…     l'entreprise + les commerciaux qui ont une mission chez elle
 * private/bookings/<id>/…      l'entreprise + l'équipe (leads et cartes : seulement leur auteur)
 * private/freelancers/<id>/…   le commercial lui-même
 * L'admin voit tout.
 */
export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  const path = key.map(decodeURIComponent).join("/");
  if (key.some((p) => p === ".." || p === "")) return new Response("Introuvable", { status: 404 });
  if (key[0] !== "public" && !(await canRead(key))) return new Response("Accès refusé", { status: 403 });
  const data = await getFile(path);
  if (!data) return new Response("Introuvable", { status: 404 });
  const name = key.at(-1)!;
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mimeFor(name),
      "Content-Disposition": `${/\.(png|jpe?g|webp|svg|pdf)$/i.test(name) ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": key[0] === "public" ? "public, max-age=3600" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(name.endsWith(".svg") ? { "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } : {}),
    },
  });
}

async function canRead(key: string[]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  if (user.role === "admin") return true;
  const [, scope, id] = key;
  if (!id || !UUID.test(id)) return false;
  const db = await getDb();
  const [freelancer] = user.role === "commercial" ? await db.select().from(s.freelancers).where(eq(s.freelancers.userId, user.id)) : [];
  const [company] = user.role === "exposant" ? await db.select().from(s.companies).where(eq(s.companies.ownerId, user.id)) : [];

  if (scope === "freelancers") return freelancer?.id === id;

  if (scope === "companies") {
    if (company?.id === id) return true;
    if (!freelancer) return false;
    const rows = await db
      .select({ id: s.assignments.id })
      .from(s.assignments)
      .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
      .where(and(eq(s.bookings.companyId, id), eq(s.assignments.freelancerId, freelancer.id), inArray(s.assignments.status, ["proposee", "acceptee"])));
    return rows.length > 0;
  }

  if (scope === "bookings") {
    const [b] = await db.select().from(s.bookings).where(eq(s.bookings.id, id));
    if (!b) return false;
    if (company?.id === b.companyId) return true;
    if (!freelancer) return false;
    const mine = await db
      .select()
      .from(s.assignments)
      .where(and(eq(s.assignments.bookingId, id), eq(s.assignments.freelancerId, freelancer.id), inArray(s.assignments.status, ["proposee", "acceptee"])));
    if (mine.length === 0) return false;
    const kind = key[3];
    if (kind === "leads") return mine.some((a) => key[4]?.startsWith(a.id));
    if (kind === "cartes") {
      const [batch] = UUID.test(key[4] ?? "") ? await db.select().from(s.leadBatches).where(eq(s.leadBatches.id, key[4])) : [];
      return Boolean(batch && mine.some((a) => a.id === batch.assignmentId));
    }
    return true; // plaquette de l'événement
  }
  return false;
}
