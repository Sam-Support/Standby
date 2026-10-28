import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { BackLink } from "@/components/ui";
import { getCurrentUser, requireFreelancer } from "@/lib/auth/session";
import { eurosPrecise, longDate, monthLabel } from "@/lib/format";
import { payoutMonth, selfBillsFor, totals } from "@/lib/services/self-billing";
import { formatSiret } from "@/lib/siret";
import { PrintButton } from "@/app/entreprise/factures/[id]/print";

export const metadata = { title: "Relevé de paie" };

const STATUS = { transfere: "versé", planifie: "programmé", echoue: "en échec" } as const;

export default async function Page({ params }: { params: Promise<{ mois: string }> }) {
  const { mois } = await params;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mois)) notFound();
  const f = await requireFreelancer(`/commercial/releves/${mois}`);
  const user = (await getCurrentUser())!;
  const rows = (await selfBillsFor(await getDb(), f.id, Number(mois.slice(0, 4)))).filter((r) => payoutMonth(r) === mois).reverse();
  const t = totals(rows);

  return (
    <>
      <div className="row-between noprint">
        <BackLink href={`/commercial/revenus?annee=${mois.slice(0, 4)}`}>Factures et relevés</BackLink>
        <PrintButton />
      </div>
      <article className="invoice clay">
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="logo disp">standby</p>
            <p className="small" style={{ marginTop: 8 }}>
              <b>{user.firstName} {user.lastName}</b>
              <br />
              {f.billingAddress}
              <br />
              SIRET {f.siret ? formatSiret(f.siret) : "—"}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 className="disp" style={{ fontSize: 30 }}>Relevé de paie</h1>
            <p style={{ textTransform: "capitalize" }}><b>{monthLabel(mois)}</b></p>
            <p className="small">Édité le {longDate(new Date())}</p>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="muted">Aucun virement ce mois-ci.</p>
        ) : (
          <div className="tblwrap">
            <table className="tbl" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th scope="col">Virement</th>
                  <th scope="col">Facture</th>
                  <th scope="col">Mission</th>
                  <th scope="col" style={{ textAlign: "right" }}>HT</th>
                  <th scope="col" style={{ textAlign: "right" }}>TVA</th>
                  <th scope="col" style={{ textAlign: "right" }}>Commission</th>
                  <th scope="col" style={{ textAlign: "right" }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ inv, p }) => (
                  <tr key={inv.id}>
                    <td>{longDate(p.scheduledFor)} · {STATUS[p.status]}</td>
                    <td><Link href={`/commercial/factures/${inv.id}`}>{inv.number}</Link></td>
                    <td>{inv.label}</td>
                    <td style={{ textAlign: "right" }}>{eurosPrecise(inv.amountHtCents)}</td>
                    <td style={{ textAlign: "right" }}>{eurosPrecise(inv.vatCents)}</td>
                    <td style={{ textAlign: "right" }}>{eurosPrecise(-inv.commissionCents)}</td>
                    <td style={{ textAlign: "right" }}>{eurosPrecise(inv.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginLeft: "auto", minWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="dev"><span>Total HT</span><b>{eurosPrecise(t.htCents)}</b></div>
          <div className="dev"><span>TVA</span><b>{eurosPrecise(t.vatCents)}</b></div>
          <div className="dev"><span>Commission plateforme</span><b>{eurosPrecise(-t.commissionCents)}</b></div>
          <div className="ttc"><span>Net</span><span className="disp">{eurosPrecise(t.netCents)}</span></div>
        </div>
        <p className="muted small">
          Virements sur le compte bancaire enregistré auprès de Stripe, chaque lundi pour les missions validées et réglées par l’exposant. Ce relevé
          récapitule les factures émises à votre nom ; il ne remplace pas votre comptabilité.
        </p>
      </article>
    </>
  );
}
