import { getDb } from "@/db";
import { getCurrentFreelancer } from "@/lib/auth/session";
import { csvAmount, selfBillsFor, toCsv } from "@/lib/services/self-billing";

const STATUS = { transfere: "versé", planifie: "programmé", echoue: "en échec" } as const;

/** Export des factures de l'année (une ligne par facture), pour la comptabilité du commercial. */
export async function GET(_: Request, { params }: { params: Promise<{ annee: string }> }) {
  const { annee } = await params;
  const f = await getCurrentFreelancer();
  if (!f) return new Response("Non autorisé", { status: 401 });
  if (!/^20\d{2}$/.test(annee)) return new Response("Année invalide", { status: 400 });
  const rows = (await selfBillsFor(await getDb(), f.id, Number(annee))).reverse();
  const csv = toCsv([
    ["Facture", "Émise le", "Désignation", "Détail", "Virement le", "Statut", "HT", "TVA", "TTC", "Commission", "Net versé"],
    ...rows.map(({ inv, p }) => [
      inv.number,
      inv.issuedAt.toISOString().slice(0, 10),
      inv.label,
      inv.detail,
      p.scheduledFor,
      STATUS[p.status],
      csvAmount(inv.amountHtCents),
      csvAmount(inv.vatCents),
      csvAmount(inv.totalTtcCents),
      csvAmount(inv.commissionCents),
      csvAmount(inv.netCents),
    ]),
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="standby-factures-${annee}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
