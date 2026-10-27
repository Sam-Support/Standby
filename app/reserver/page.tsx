import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { PageHead } from "@/components/ui";
import { requireCompany } from "@/lib/auth/session";
import { dateRange, longDate } from "@/lib/format";

export const metadata = { title: "Réserver une équipe" };

export default async function Page() {
  const company = await requireCompany("/reserver");
  const db = await getDb();
  const drafts = await db
    .select({ b: s.bookings, e: s.events })
    .from(s.bookings)
    .leftJoin(s.events, eq(s.events.id, s.bookings.eventId))
    .where(and(eq(s.bookings.companyId, company.id), eq(s.bookings.status, "brouillon")))
    .orderBy(desc(s.bookings.createdAt))
    .limit(10);
  return (
    <>
      <PageHead
        label="Réservation exposant"
        title="Réserver une équipe de stand"
        actions={
          <Link className="clay btn" href="/reserver/nouveau" prefetch={false}>
            Nouvelle réservation
          </Link>
        }
      >
        Cinq étapes. L’estimation se met à jour à chaque choix, le total définitif apparaît au récapitulatif.
      </PageHead>
      <section className="clay panel">
        <h2>Réservations en cours de saisie</h2>
        {drafts.length === 0 && <p className="muted">Aucun brouillon. Lancez une nouvelle réservation pour choisir votre salon.</p>}
        {drafts.map(({ b, e }) => (
          <div key={b.id} className="brow">
            <div>
              <b>{e?.name ?? "Événement à choisir"}</b>
              <div className="muted small">
                {e ? `${e.city} · ${dateRange(e.startsOn, e.endsOn)} · ` : ""}commencée le {longDate(b.createdAt)} · réf. {b.ref}
              </div>
            </div>
            <Link className="clay s btn sm" href={`/reserver/${b.id}/evenement`}>
              Reprendre
            </Link>
          </div>
        ))}
      </section>
    </>
  );
}
