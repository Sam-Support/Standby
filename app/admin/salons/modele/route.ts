import { requireAdmin } from "@/lib/auth/session";
import { buildEventsTemplate } from "@/lib/services/events-template";

/** Modèle Excel du calendrier des salons et foires (voir lib/services/events-template.ts). Réservé aux administrateurs. */
export async function GET() {
  await requireAdmin();
  const file = await buildEventsTemplate();
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="modele-salons-et-foires.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}
