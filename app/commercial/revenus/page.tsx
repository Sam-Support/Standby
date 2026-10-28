import Link from "next/link";
import { getDb } from "@/db";
import { BackLink, PageHead, Status } from "@/components/ui";
import { requireFreelancer } from "@/lib/auth/session";
import { eurosPrecise, longDate, monthLabel } from "@/lib/format";
import { payoutMonth, selfBillsFor, totals, type SelfBillRow } from "@/lib/services/self-billing";

export const metadata = { title: "Factures et relevés" };

export default async function Page({ searchParams }: { searchParams: Promise<{ annee?: string }> }) {
  const { annee } = await searchParams;
  const f = await requireFreelancer("/commercial/revenus");
  const rows = await selfBillsFor(await getDb(), f.id);
  const years = [...new Set(rows.map((r) => r.p.scheduledFor.slice(0, 4)))].sort().reverse();
  const year = annee && years.includes(annee) ? annee : (years[0] ?? String(new Date().getFullYear()));
  const mine = rows.filter((r) => r.p.scheduledFor.startsWith(year));
  const months = new Map<string, SelfBillRow[]>();
  for (const r of mine) months.set(payoutMonth(r), [...(months.get(payoutMonth(r)) ?? []), r]);
  const all = totals(mine);

  return (
    <>
      <BackLink href="/commercial">Espace commercial</BackLink>
      <PageHead label="Espace commercial" title="Factures et relevés">
        Standby établit une facture à votre nom pour chaque virement, en vertu de votre <Link href="/mandat-facturation">mandat de facturation</Link>.
        Les relevés sont classés par mois de virement.
      </PageHead>
      {!f.billingMandateAcceptedAt && (
        <p className="note err">
          Mandat de facturation non accepté : vos factures seront émises dès son acceptation. <Link href="/commercial/profil#facturation">Accepter le mandat</Link>
        </p>
      )}
      {years.length > 1 && (
        <div className="inline" style={{ gap: 6 }}>
          {years.map((y) => (
            <Link key={y} className={`clay s btn xs ${y === year ? "" : "ghost"}`} href={`/commercial/revenus?annee=${y}`} aria-current={y === year ? "page" : undefined}>
              {y}
            </Link>
          ))}
        </div>
      )}
      <section className="clay panel">
        <div className="row-between">
          <h2>Année {year}</h2>
          {mine.length > 0 && (
            <span className="inline">
              <Link className="clay s btn xs ghost" href={`/commercial/recapitulatif/${year}`}>Récapitulatif annuel</Link>
              <a className="clay s btn xs" href={`/commercial/recapitulatif/${year}/export`}>Exporter (.csv)</a>
            </span>
          )}
        </div>
        {mine.length === 0 ? (
          <p className="muted">Aucune facture pour l’instant : elles apparaissent ici dès le premier virement programmé.</p>
        ) : (
          <>
            <div className="dev"><span>{all.count} facture{all.count > 1 ? "s" : ""} · total HT</span><b>{eurosPrecise(all.htCents)}</b></div>
            {all.vatCents > 0 && <div className="dev"><span>TVA facturée</span><b>{eurosPrecise(all.vatCents)}</b></div>}
            {all.commissionCents > 0 && <div className="dev"><span>Commission plateforme retenue</span><b>{eurosPrecise(-all.commissionCents)}</b></div>}
            <div className="dev"><span>Net viré ou programmé</span><b>{eurosPrecise(all.netCents)}</b></div>
          </>
        )}
      </section>
      {[...months].map(([month, list]) => (
        <section key={month} className="clay panel">
          <div className="row-between">
            <h2 style={{ textTransform: "capitalize" }}>{monthLabel(month)}</h2>
            <Link className="clay s btn xs ghost" href={`/commercial/releves/${month}`}>Relevé du mois</Link>
          </div>
          <div className="tblwrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th scope="col">Facture</th>
                  <th scope="col">Mission</th>
                  <th scope="col">Virement</th>
                  <th scope="col" style={{ textAlign: "right" }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {list.map(({ inv, p }) => (
                  <tr key={inv.id}>
                    <td><Link href={`/commercial/factures/${inv.id}`}>{inv.number}</Link></td>
                    <td>{inv.label}</td>
                    <td>
                      {longDate(p.scheduledFor)}{" "}
                      <Status tone={p.status === "transfere" ? "ok" : p.status === "echoue" ? "warn" : "info"}>
                        {p.status === "transfere" ? "versé" : p.status === "echoue" ? "en échec" : "programmé"}
                      </Status>
                    </td>
                    <td style={{ textAlign: "right" }}>{eurosPrecise(inv.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
