import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { BackLink } from "@/components/ui";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { dateRange, eurosPrecise, longDate, percent } from "@/lib/format";
import { assertInvoiceAccess, type InvoiceLine } from "@/lib/services/billing";
import { formatSiret } from "@/lib/siret";
import { PrintButton } from "./print";

export const metadata = { title: "Facture" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(undefined, `/entreprise/factures/${id}`);
  const user = await getCurrentUser();
  const db = await getDb();
  const [company] = user!.role === "admin" ? [null] : await db.select().from(s.companies).where(eq(s.companies.ownerId, user!.id));
  let row;
  try {
    row = await assertInvoiceAccess(db, id, user!.role === "admin" ? null : (company?.id ?? "none"));
  } catch {
    notFound();
  }
  const { invoice, booking } = row;
  const [client] = await db.select().from(s.companies).where(eq(s.companies.id, booking.companyId));
  const [event] = booking.eventId ? await db.select().from(s.events).where(eq(s.events.id, booking.eventId)) : [];
  const lines = invoice.lines as InvoiceLine[];
  const vatBps = invoice.totalHtCents ? Math.round((invoice.vatCents / invoice.totalHtCents) * 10000) : 2000;

  return (
    <>
      <div className="row-between noprint">
        <BackLink href={user!.role === "admin" ? "/admin/finances" : `/entreprise/reservations/${booking.id}`}>Retour</BackLink>
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
            <h1 className="disp" style={{ fontSize: 30 }}>Facture</h1>
            <p><b>{invoice.number}</b></p>
            <p className="small">Émise le {longDate(invoice.issuedAt)}</p>
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
          Prestation : équipe de stand · {event?.name} · {event ? `${event.city} · ${dateRange(event.startsOn, event.endsOn, true)}` : ""} · réf. {booking.ref}
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
              {lines.map((l) => (
                <tr key={l.label}>
                  <td>{l.label}</td>
                  <td>{l.detail}</td>
                  <td style={{ textAlign: "right" }}>{eurosPrecise(l.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginLeft: "auto", minWidth: 280, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="dev"><span>Total HT</span><b>{eurosPrecise(invoice.totalHtCents)}</b></div>
          <div className="dev"><span>TVA {percent(vatBps)}</span><b>{eurosPrecise(invoice.vatCents)}</b></div>
          <div className="ttc"><span>Total TTC</span><span className="disp">{eurosPrecise(invoice.totalTtcCents)}</span></div>
        </div>
        <p className="muted small">
          Règlement par prélèvement sur le moyen de paiement enregistré. Pénalités de retard : <span className="todo">[taux]</span> ; indemnité forfaitaire
          de recouvrement : 40 € (art. D. 441-5 du Code de commerce).
        </p>
      </article>
    </>
  );
}
