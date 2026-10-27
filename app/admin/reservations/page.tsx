import Link from "next/link";
import { PageHead, BookingStatus } from "@/components/ui";
import { getDb } from "@/db";
import { BOOKING_STATUS_LABELS } from "@/lib/domain";
import { dateRange, euros, longDate } from "@/lib/format";
import { bookingsWithStatus } from "@/lib/services/admin";

export const metadata = { title: "Réservations" };

export default async function Page({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const rows = await bookingsWithStatus(await getDb(), statut && statut in BOOKING_STATUS_LABELS ? [statut] : []);
  return (
    <>
      <PageHead label="Administration" title="Réservations">
        Suivi de toutes les réservations, arbitrage des heures et annulations.
      </PageHead>
      <div className="inline" style={{ gap: 6 }}>
        <Link className={`clay s btn xs ${statut ? "ghost" : ""}`} href="/admin/reservations">Toutes</Link>
        {Object.entries(BOOKING_STATUS_LABELS).map(([k]) => (
          <Link key={k} className={`clay s btn xs ${statut === k ? "" : "ghost"}`} href={`/admin/reservations?statut=${k}`}>
            {k.replace(/_/g, " ")}
          </Link>
        ))}
      </div>
      <section className="clay panel">
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Réf.</th>
                <th scope="col">Entreprise</th>
                <th scope="col">Événement</th>
                <th scope="col">Dates</th>
                <th scope="col">Statut</th>
                <th scope="col">Total HT</th>
                <th scope="col">Créée le</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ b, e, c }) => (
                <tr key={b.id}>
                  <td><Link href={`/admin/reservations/${b.id}`}>{b.ref}</Link></td>
                  <td>{c.name}</td>
                  <td>{e?.name ?? "—"}</td>
                  <td>{e ? dateRange(e.startsOn, e.endsOn, true) : "—"}</td>
                  <td><BookingStatus status={b.status} /></td>
                  <td>{b.totalHtCents ? euros(b.totalHtCents) : "—"}</td>
                  <td>{longDate(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="muted">Aucune réservation.</p>}
      </section>
    </>
  );
}
