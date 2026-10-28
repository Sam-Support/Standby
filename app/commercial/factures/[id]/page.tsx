import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { BackLink } from "@/components/ui";
import { getCurrentFreelancer, requireUser } from "@/lib/auth/session";
import { eurosPrecise, longDate, percent } from "@/lib/format";
import { assertSelfBillAccess, type Supplier } from "@/lib/services/self-billing";
import { formatSiret } from "@/lib/siret";
import { PrintButton } from "@/app/entreprise/factures/[id]/print";

export const metadata = { title: "Facture (autofacturation)" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(undefined, `/commercial/factures/${id}`);
  const f = user.role === "admin" ? null : await getCurrentFreelancer();
  if (user.role !== "admin" && !f) notFound();
  let row;
  try {
    row = await assertSelfBillAccess(await getDb(), id, f?.id ?? null);
  } catch {
    notFound();
  }
  const { inv, p } = row;
  const sup = inv.supplier as Supplier;

  return (
    <>
      <div className="row-between noprint">
        <BackLink href={user.role === "admin" ? "/admin/finances" : "/commercial/revenus"}>Retour</BackLink>
        <PrintButton />
      </div>
      <article className="invoice clay">
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <span className="lab">Prestataire</span>
            <p>
              <b>{sup.name}</b>
              <br />
              {sup.address}
              <br />
              {sup.legalStatus ?? "Entrepreneur individuel"} · SIRET {sup.siret ? formatSiret(sup.siret) : "—"}
              {sup.vatNumber ? (
                <>
                  <br />
                  TVA {sup.vatNumber}
                </>
              ) : null}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 className="disp" style={{ fontSize: 30 }}>Facture</h1>
            <p><b>{inv.number}</b></p>
            <p className="small">Émise le {longDate(inv.issuedAt)}</p>
            <p className="small"><b>Autofacturation</b></p>
          </div>
        </div>
        <div>
          <span className="lab">Client</span>
          <p className="small">
            <span className="todo">[raison sociale de l’éditeur de standby]</span> · <span className="todo">[adresse]</span>
            <br />
            SIRET <span className="todo">[14 chiffres]</span> · TVA <span className="todo">[numéro]</span>
          </p>
        </div>
        <p className="small">
          Facture établie par <span className="todo">[raison sociale]</span> au nom et pour le compte de {sup.name}, en application du{" "}
          <Link href="/mandat-facturation">mandat de facturation</Link>
          {sup.mandateAcceptedAt ? ` accepté le ${longDate(sup.mandateAcceptedAt)}` : ""} (art. 289 I-2 du CGI).
        </p>
        <div className="tblwrap">
          <table className="tbl" style={{ fontSize: 14 }}>
            <thead>
              <tr>
                <th scope="col">Désignation</th>
                <th scope="col">Détail</th>
                <th scope="col" style={{ textAlign: "right" }}>Montant HT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{inv.label}</td>
                <td>{inv.detail}</td>
                <td style={{ textAlign: "right" }}>{eurosPrecise(inv.amountHtCents)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginLeft: "auto", minWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="dev"><span>Total HT</span><b>{eurosPrecise(inv.amountHtCents)}</b></div>
          {inv.vatBps > 0 ? (
            <div className="dev"><span>TVA {percent(inv.vatBps)}</span><b>{eurosPrecise(inv.vatCents)}</b></div>
          ) : (
            <div className="dev"><span>TVA non applicable, art. 293 B du CGI</span><b>{eurosPrecise(0)}</b></div>
          )}
          <div className="ttc"><span>Total TTC</span><span className="disp">{eurosPrecise(inv.totalTtcCents)}</span></div>
        </div>
        <p className="muted small">
          Règlement par virement de {eurosPrecise(inv.netCents)}
          {p.status === "transfere" ? `, effectué le ${longDate(p.scheduledFor)}` : `, prévu le lundi ${longDate(p.scheduledFor)}`}
          {inv.commissionCents > 0 ? `, après retenue de la commission de la plateforme (${eurosPrecise(inv.commissionCents)}), facturée séparément` : ""}.
          Pénalités de retard : <span className="todo">[taux]</span> ; indemnité forfaitaire de recouvrement : 40 € (art. D. 441-5 du Code de commerce).
        </p>
        <p className="muted small noprint">
          Une erreur sur cette facture ? <Link href={`/contact?ref=${inv.number}`}>Signalez-la</Link> sous 15 jours, comme prévu par le mandat.
        </p>
      </article>
    </>
  );
}
