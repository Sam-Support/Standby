import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead, Status } from "@/components/ui";
import { euros, longDate } from "@/lib/format";
import { REFUND_LABELS } from "@/lib/services/credit-notes";
import { retryPaymentAction, runJobsAction } from "../actions";

export const metadata = { title: "Finances" };

export default async function Page() {
  const db = await getDb();
  const invoices = await db
    .select({ i: s.invoices, b: s.bookings, c: s.companies })
    .from(s.invoices)
    .innerJoin(s.bookings, eq(s.bookings.id, s.invoices.bookingId))
    .innerJoin(s.companies, eq(s.companies.id, s.bookings.companyId))
    .orderBy(desc(s.invoices.issuedAt))
    .limit(100);
  const credits = await db
    .select({ n: s.creditNotes, i: s.invoices, b: s.bookings, c: s.companies })
    .from(s.creditNotes)
    .innerJoin(s.invoices, eq(s.invoices.id, s.creditNotes.invoiceId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.invoices.bookingId))
    .innerJoin(s.companies, eq(s.companies.id, s.bookings.companyId))
    .orderBy(desc(s.creditNotes.issuedAt))
    .limit(100);
  const selfBills = await db
    .select({ inv: s.freelancerInvoices, p: s.payouts, pr: s.profiles })
    .from(s.freelancerInvoices)
    .innerJoin(s.payouts, eq(s.payouts.id, s.freelancerInvoices.payoutId))
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.freelancerInvoices.freelancerId))
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .orderBy(desc(s.freelancerInvoices.issuedAt))
    .limit(100);
  const years = [...new Set([new Date().getFullYear(), ...selfBills.map((x) => Number(x.p.scheduledFor.slice(0, 4)))])].sort().reverse();
  const payments = await db
    .select({ p: s.payments, b: s.bookings })
    .from(s.payments)
    .innerJoin(s.bookings, eq(s.bookings.id, s.payments.bookingId))
    .orderBy(desc(s.payments.createdAt))
    .limit(100);
  const payouts = await db
    .select({ p: s.payouts, pr: s.profiles })
    .from(s.payouts)
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.payouts.freelancerId))
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .orderBy(desc(s.payouts.createdAt))
    .limit(100);

  return (
    <>
      <PageHead
        label="Administration"
        title="Finances"
        actions={
          <ActionForm action={runJobsAction}>
            <Submit className="clay s btn sm ghost">Exécuter les virements dus</Submit>
          </ActionForm>
        }
      >
        Factures émises, encaissements des exposants et virements aux commerciaux.
      </PageHead>
      <section className="clay panel">
        <h2>Factures</h2>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr><th scope="col">N°</th><th scope="col">Entreprise</th><th scope="col">Réf.</th><th scope="col">HT</th><th scope="col">Commission</th><th scope="col">TTC</th><th scope="col">Émise</th></tr>
            </thead>
            <tbody>
              {invoices.map(({ i, b, c }) => (
                <tr key={i.id}>
                  <td><Link href={`/entreprise/factures/${i.id}`}>{i.number}</Link></td>
                  <td>{c.name}</td>
                  <td><Link href={`/admin/reservations/${b.id}`}>{b.ref}</Link></td>
                  <td>{euros(i.totalHtCents)}</td>
                  <td>{euros(i.serviceFeeCents)}</td>
                  <td>{euros(i.totalTtcCents)}</td>
                  <td>{longDate(i.issuedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {invoices.length === 0 && <p className="muted small">Aucune facture.</p>}
      </section>
      <section className="clay panel">
        <h2>Avoirs</h2>
        <p className="muted small">Émis depuis la fiche d’une réservation. À la charge de la plateforme : la paie des commerciaux n’est pas modifiée.</p>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr><th scope="col">N°</th><th scope="col">Facture</th><th scope="col">Entreprise</th><th scope="col">Motif</th><th scope="col">TTC</th><th scope="col">Remboursement</th><th scope="col">Émis</th></tr>
            </thead>
            <tbody>
              {credits.map(({ n, i, b, c }) => (
                <tr key={n.id}>
                  <td><Link href={`/entreprise/avoirs/${n.id}`}>{n.number}</Link></td>
                  <td><Link href={`/admin/reservations/${b.id}`}>{i.number}</Link></td>
                  <td>{c.name}</td>
                  <td>{n.reason}</td>
                  <td>{euros(n.totalTtcCents)}</td>
                  <td><Status tone={REFUND_LABELS[n.refundStatus].tone}>{REFUND_LABELS[n.refundStatus].label}</Status></td>
                  <td>{longDate(n.issuedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {credits.length === 0 && <p className="muted small">Aucun avoir.</p>}
      </section>
      <section className="clay panel">
        <div className="row-between">
          <h2>Autofactures des commerciaux</h2>
          <span className="inline">
            {years.map((y) => (
              <a key={y} className="clay s btn xs ghost" href={`/admin/finances/dac7/${y}`}>Sommes versées {y} (DAC7, .csv)</a>
            ))}
          </span>
        </div>
        <p className="muted small">Émises au nom des commerciaux en vertu de leur mandat de facturation, une par virement.</p>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr><th scope="col">N°</th><th scope="col">Commercial</th><th scope="col">Désignation</th><th scope="col">HT</th><th scope="col">TVA</th><th scope="col">Net viré</th><th scope="col">Virement</th></tr>
            </thead>
            <tbody>
              {selfBills.map(({ inv, p, pr }) => (
                <tr key={inv.id}>
                  <td><Link href={`/commercial/factures/${inv.id}`}>{inv.number}</Link></td>
                  <td>{pr.firstName} {pr.lastName}</td>
                  <td>{inv.label}</td>
                  <td>{euros(inv.amountHtCents)}</td>
                  <td>{inv.vatBps ? euros(inv.vatCents) : "franchise"}</td>
                  <td>{euros(inv.netCents)}</td>
                  <td>{longDate(p.scheduledFor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selfBills.length === 0 && <p className="muted small">Aucune autofacture.</p>}
      </section>
      <div className="grid2">
        <section className="clay panel">
          <h2>Encaissements</h2>
          {payments.map(({ p, b }) => (
            <div key={p.id} className="brow">
              <span>
                {b.ref} · {euros(p.amountCents)} <Status tone={p.status === "reussi" ? "ok" : p.status === "echoue" ? "warn" : "info"}>{p.status.replace("_", " ")}</Status>
                {p.error && <span className="muted small"> · {p.error}</span>}
              </span>
              {p.status === "echoue" && (
                <ActionForm action={retryPaymentAction.bind(null, p.id)}>
                  <Submit className="clay s btn xs">Relancer</Submit>
                </ActionForm>
              )}
            </div>
          ))}
          {payments.length === 0 && <p className="muted small">Aucun encaissement.</p>}
        </section>
        <section className="clay panel">
          <h2>Virements aux commerciaux</h2>
          {payouts.map(({ p, pr }) => (
            <div key={p.id} className="dev">
              <span>
                {pr.firstName} {pr.lastName} · {euros(p.amountCents)}
              </span>
              <span>
                <Status tone={p.status === "transfere" ? "ok" : p.status === "echoue" ? "warn" : "info"}>{p.status}</Status> <span className="muted small">{longDate(p.scheduledFor)}</span>
              </span>
            </div>
          ))}
          {payouts.length === 0 && <p className="muted small">Aucun virement.</p>}
        </section>
      </div>
    </>
  );
}
