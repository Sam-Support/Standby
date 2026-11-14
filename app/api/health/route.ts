import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/**
 * Vivacité : répond sans toucher à la base. « ?db=1 » vérifie aussi la base (supervision externe, à appeler
 * toutes les minutes avec une alerte après deux échecs).
 */
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("db") !== "1") return Response.json({ ok: true, service: "standby-salons" });
  try {
    await (await getDb()).execute(sql`select 1`);
    return Response.json({ ok: true, service: "standby-salons", db: "ok" });
  } catch {
    return Response.json({ ok: false, service: "standby-salons", db: "erreur" }, { status: 503 });
  }
}
