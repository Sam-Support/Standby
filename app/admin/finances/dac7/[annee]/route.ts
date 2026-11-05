import { eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { getCurrentUser } from "@/lib/auth/session";
import { VAT_REGIMES, type VatRegime } from "@/lib/domain";
import { csvAmount, toCsv, yearSummary, type SelfBillRow } from "@/lib/services/self-billing";

/**
 * Sommes versées aux commerciaux sur l'année, par trimestre de virement : base de la déclaration DAC7 de la
 * plateforme (montant crédité, commissions retenues, nombre de prestations). Les champs DAC7 non collectés
 * (date de naissance, numéro fiscal) restent à compléter.
 */
export async function GET(_: Request, { params }: { params: Promise<{ annee: string }> }) {
  const { annee } = await params;
  const user = await getCurrentUser();
  if (user?.role !== "admin") return new Response("Non autorisé", { status: 401 });
  if (!/^20\d{2}$/.test(annee)) return new Response("Année invalide", { status: 400 });
  const rows = await (await getDb())
    .select({ inv: s.freelancerInvoices, p: s.payouts, f: s.freelancers, pr: s.profiles })
    .from(s.freelancerInvoices)
    .innerJoin(s.payouts, eq(s.payouts.id, s.freelancerInvoices.payoutId))
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.freelancerInvoices.freelancerId))
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId));
  const byFreelancer = new Map<string, { f: typeof s.freelancers.$inferSelect; pr: typeof s.profiles.$inferSelect; list: SelfBillRow[] }>();
  for (const r of rows.filter((x) => x.p.scheduledFor.startsWith(annee))) {
    const cur = byFreelancer.get(r.f.id) ?? { f: r.f, pr: r.pr, list: [] };
    cur.list.push({ inv: r.inv, p: r.p });
    byFreelancer.set(r.f.id, cur);
  }
  const header = ["Nom", "Prénom", "E-mail", "SIRET", "Adresse", "Statut", "Régime de TVA", "N° de TVA"];
  for (const q of [1, 2, 3, 4]) header.push(`T${q} montant crédité TTC`, `T${q} commissions`, `T${q} prestations`);
  header.push("Total crédité TTC", "Total commissions", "Total prestations");
  const lines = [...byFreelancer.values()].map(({ f, pr, list }) => {
    const sum = yearSummary(list);
    return [
      pr.lastName,
      pr.firstName,
      pr.email,
      f.siret,
      f.billingAddress,
      f.legalStatus,
      VAT_REGIMES[f.vatRegime as VatRegime] ?? f.vatRegime,
      f.vatNumber,
      ...sum.quarters.flatMap((q) => [csvAmount(q.ttcCents), csvAmount(q.commissionCents), q.count]),
      csvAmount(sum.all.ttcCents),
      csvAmount(sum.all.commissionCents),
      sum.all.count,
    ];
  });
  return new Response(toCsv([header, ...lines]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="standby-dac7-${annee}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
