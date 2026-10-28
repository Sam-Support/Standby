import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { BackLink } from "@/components/ui";
import { getCurrentUser, requireFreelancer } from "@/lib/auth/session";
import { eurosPrecise, longDate } from "@/lib/format";
import { selfBillsFor, yearSummary } from "@/lib/services/self-billing";
import { formatSiret } from "@/lib/siret";
import { PrintButton } from "@/app/entreprise/factures/[id]/print";

export const metadata = { title: "Récapitulatif annuel" };

const QUARTERS = ["1er trimestre (janv.-mars)", "2e trimestre (avr.-juin)", "3e trimestre (juil.-sept.)", "4e trimestre (oct.-déc.)"];

export default async function Page({ params }: { params: Promise<{ annee: string }> }) {
  const { annee } = await params;
  if (!/^20\d{2}$/.test(annee)) notFound();
  const f = await requireFreelancer(`/commercial/recapitulatif/${annee}`);
  const user = (await getCurrentUser())!;
  const sum = yearSummary(await selfBillsFor(await getDb(), f.id, Number(annee)));

  return (
    <>
      <div className="row-between noprint">
        <BackLink href={`/commercial/revenus?annee=${annee}`}>Factures et relevés</BackLink>
        <span className="inline">
          <a className="clay s btn sm ghost" href={`/commercial/recapitulatif/${annee}/export`}>Exporter (.csv)</a>
          <PrintButton />
        </span>
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
            <h1 className="disp" style={{ fontSize: 30 }}>Récapitulatif {annee}</h1>
            <p className="small">Édité le {longDate(new Date())}</p>
          </div>
        </div>
        <div className="tblwrap">
          <table className="tbl" style={{ fontSize: 13 }}>
            <thead>
              <tr>
                <th scope="col">Période de virement</th>
                <th scope="col" style={{ textAlign: "right" }}>Factures</th>
                <th scope="col" style={{ textAlign: "right" }}>HT</th>
                <th scope="col" style={{ textAlign: "right" }}>TVA</th>
                <th scope="col" style={{ textAlign: "right" }}>Commission</th>
                <th scope="col" style={{ textAlign: "right" }}>Net</th>
              </tr>
            </thead>
            <tbody>
              {sum.quarters.map((q) => (
                <tr key={q.quarter}>
                  <td>{QUARTERS[q.quarter - 1]}</td>
                  <td style={{ textAlign: "right" }}>{q.count}</td>
                  <td style={{ textAlign: "right" }}>{eurosPrecise(q.htCents)}</td>
                  <td style={{ textAlign: "right" }}>{eurosPrecise(q.vatCents)}</td>
                  <td style={{ textAlign: "right" }}>{eurosPrecise(-q.commissionCents)}</td>
                  <td style={{ textAlign: "right" }}>{eurosPrecise(q.netCents)}</td>
                </tr>
              ))}
              <tr>
                <th scope="row">Total {annee}</th>
                <td style={{ textAlign: "right" }}><b>{sum.all.count}</b></td>
                <td style={{ textAlign: "right" }}><b>{eurosPrecise(sum.all.htCents)}</b></td>
                <td style={{ textAlign: "right" }}><b>{eurosPrecise(sum.all.vatCents)}</b></td>
                <td style={{ textAlign: "right" }}><b>{eurosPrecise(-sum.all.commissionCents)}</b></td>
                <td style={{ textAlign: "right" }}><b>{eurosPrecise(sum.all.netCents)}</b></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginLeft: "auto", minWidth: 300, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="dev"><span>Déjà versé (HT)</span><b>{eurosPrecise(sum.paid.htCents)}</b></div>
          {sum.pending.count > 0 && <div className="dev"><span>Programmé, pas encore versé (HT)</span><b>{eurosPrecise(sum.pending.htCents)}</b></div>}
        </div>
        <p className="muted small">
          Montants classés par date de virement. Le chiffre d’affaires à déclarer dépend de votre régime (micro-entreprise : recettes encaissées) :
          vérifiez-le avec l’URSSAF ou votre comptable. Standby transmet chaque année à l’administration fiscale les sommes versées par trimestre
          (obligation DAC7 des plateformes). <span className="todo">[À confirmer par l’expert-comptable.]</span>
        </p>
      </article>
    </>
  );
}
