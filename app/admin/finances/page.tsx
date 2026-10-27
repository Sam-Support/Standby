import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead, Status } from "@/components/ui";
import { euros, longDate } from "@/lib/format";
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
