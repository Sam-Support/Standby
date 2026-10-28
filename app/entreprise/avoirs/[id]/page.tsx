import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { BackLink } from "@/components/ui";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { eurosPrecise, longDate, percent } from "@/lib/format";
import { assertCreditNoteAccess } from "@/lib/services/credit-notes";
import { formatSiret } from "@/lib/siret";
import { PrintButton } from "../../factures/[id]/print";

export const metadata = { title: "Avoir" };

const REFUND_TEXT = {
  aucun: "Montant déduit du prélèvement de la facture.",
  en_cours: "Remboursement en cours sur le moyen de paiement utilisé pour la facture.",
  rembourse: "Remboursé sur le moyen de paiement utilisé pour la facture.",
  echoue: "Remboursement en cours de traitement par l’équipe Standby.",
} as const;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(undefined, `/entreprise/avoirs/${id}`);
  const user = (await getCurrentUser())!;
  const db = await getDb();
  const [company] = user.role === "admin" ? [null] : await db.select().from(s.companies).where(eq(s.companies.ownerId, user.id));
  let row;
  try {
    row = await assertCreditNoteAccess(db, id, user.role === "admin" ? null : (company?.id ?? "none"));
  } catch {
    notFound();
  }
  const { note, invoice, booking } = row;
  const [client] = await db.select().from(s.companies).where(eq(s.companies.id, booking.companyId));
  const vatBps = note.totalHtCents ? Math.round((note.vatCents / note.totalHtCents) * 10000) : 2000;

  return (
    <>
      <div className="row-between noprint">
        <BackLink href={user.role === "admin" ? `/admin/reservations/${booking.id}` : `/entreprise/reservations/${booking.id}`}>Retour</BackLink>
        <PrintButton />
      </div>
      <article className="invoice clay">
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="logo disp">standby</p>
            <p className="small" style={{ marginTop: 8 }}>
              <span className="todo">[raison sociale]</span> · <span className="todo">[adresse]</span>
              <br />
              SIRET <span className="todo">[14 chiffres]</span> · TVA <span className="todo">[numéro]</span>
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 className="disp" style={{ fontSize: 30 }}>Avoir</h1>
            <p><b>{note.number}</b></p>
            <p className="small">Émis le {longDate(note.issuedAt)}</p>
          </div>
        </div>
        <div>
          <span className="lab">Client</span>
          <p>
            <b>{client.name}</b>
            <br />
            SIRET {formatSiret(client.siret)}
          </p>
        </div>
        <p>
          Avoir sur la facture <Link href={`/entreprise/factures/${invoice.id}`}>{invoice.number}</Link> du {longDate(invoice.issuedAt)} · réf.{" "}
          {booking.ref}
        </p>
        <div className="tblwrap">
          <table className="tbl" style={{ fontSize: 14 }}>
            <thead>
              <tr>
                <th scope="col">Désignation</th>
                <th scope="col">Motif</th>
                <th scope="col" style={{ textAlign: "right" }}>Montant HT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Avoir sur facture {invoice.number}</td>
                <td>{note.reason}</td>
                <td style={{ textAlign: "right" }}>{eurosPrecise(-note.totalHtCents)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginLeft: "auto", minWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="dev"><span>Total HT</span><b>{eurosPrecise(-note.totalHtCents)}</b></div>
          <div className="dev"><span>TVA {percent(vatBps)}</span><b>{eurosPrecise(-note.vatCents)}</b></div>
          <div className="ttc"><span>Total TTC</span><span className="disp">{eurosPrecise(-note.totalTtcCents)}</span></div>
        </div>
        <p className="muted small">{REFUND_TEXT[note.refundStatus]}</p>
      </article>
    </>
  );
}
