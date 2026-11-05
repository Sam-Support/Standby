import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/**
 * Vivacité (sonde Docker) : répond sans toucher à la base, pour ne pas redémarrer le conteneur à la moindre
 * coupure de Postgres. « ?db=1 » vérifie aussi la base (supervision externe).
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
