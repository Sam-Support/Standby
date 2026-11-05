import { getDb } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { exportUserData } from "@/lib/services/privacy";

/** Téléchargement de toutes les données du compte connecté (JSON). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Non autorisé", { status: 401 });
  const data = await exportUserData(await getDb(), user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="standby-mes-donnees-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
