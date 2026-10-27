import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { HoursRow } from "@/components/hours-row";
import { AssignmentStatus, Avatar, BackLink, BookingStatus, FileLink, Status } from "@/components/ui";
import { requireCompany } from "@/lib/auth/session";
import { OUTFITS, ROLES, type OutfitKey, type RoleKey } from "@/lib/domain";
import { dateRange, dayLabel, euros, hourly } from "@/lib/format";
import { getCompanyBooking, loadBookingContext } from "@/lib/services/booking";
import { companyDashboard } from "@/lib/services/company-views";
import { bookingLeads, templateColumns } from "@/lib/services/leads";
import { fileUrl } from "@/lib/storage";
import { cancel } from "@/app/reserver/actions";
import { cancellationSchedule } from "@/lib/cancellation";
import type { CancellationRecord } from "@/lib/services/billing";
import { CANCELLABLE, cancellationTerms } from "@/lib/services/cancellation";
import { getPricing } from "@/lib/settings";
import { ReviewForm } from "./review-form";

export const metadata = { title: "Réservation" };

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ annulee?: string }> }) {
  const { id } = await params;
  const { annulee } = await searchParams;
  const company = await requireCompany(`/entreprise/reservations/${id}`);
  const db = await getDb();
  const booking = await getCompanyBooking(db, id, company.id);
  if (!booking) notFound();
  const ctx = await loadBookingContext(db, booking);
  const row = (await companyDashboard(db, company.id)).find((r) => r.booking.id === id);
  const leads = await bookingLeads(db, id);
  const tpl = await templateColumns(db, booking, company);
  const [payment] = await db.select().from(s.payments).where(eq(s.payments.bookingId, id));
  const quote = (booking.quote as typeof ctx.quote | null) ?? ctx.quote;
  const team = ctx.assignments.filter((a) => a.status !== "selectionne");
  const canCancel = CANCELLABLE.includes(booking.status);
  const terms = canCancel ? await cancellationTerms(db, booking) : null;
  const schedule = cancellationSchedule((await getPricing(db, booking.confirmedAt ?? new Date())).cancellation);
  const cancelled = booking.status === "annulee" ? (booking.cancellation as CancellationRecord | null) : null;
  const canReview = ["validee", "payee"].includes(booking.status);
  const reviews = canReview ? await db.select().from(s.reviews).where(eq(s.reviews.bookingId, id)) : [];

  return (
    <>
      <BackLink href="/entreprise">Espace entreprise</BackLink>
      {annulee && <p className="note">Réservation annulée. Les commerciaux ont été prévenus.</p>}
      <div className="head">
        <div>
          <span className="lab">Réservation {booking.ref}</span>
          <h1>{ctx.event?.name ?? "Brouillon"}</h1>
          <p>
            {ctx.event ? `${ctx.event.city} · ${dateRange(ctx.event.startsOn, ctx.event.endsOn, true)}` : ""}
            {booking.stand ? ` · stand ${booking.stand}` : ""}
          </p>
        </div>
        <div className="inline">
          <BookingStatus status={booking.status} />
          {booking.status === "brouillon" && (
            <Link className="clay btn sm" href={`/reserver/${id}/evenement`}>Reprendre la saisie</Link>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" }}>
        <div style={{ flex: "1.25 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="clay panel">
            <h2>Équipe</h2>
            {team.length === 0 && <p className="muted">Aucun profil proposé pour l’instant.</p>}
            {team.map((a) => (
              <div key={a.id} className="brow">
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Avatar first={a.firstName} last={a.lastName} color={a.avatarColor} />
                  <span>
                    <b>{a.firstName} {a.lastName}</b>
                    <br />
                    <span className="muted small">
                      {ROLES[a.role as RoleKey]?.short} · {hourly(a.hourlyRateCents)}
                      {a.status === "acceptee" && a.phone ? ` · ${a.phone}` : ""}
                      {a.topSize ? ` · tenue ${a.topSize} / ${a.pantsSize ?? "?"} / P. ${a.shoeSize ?? "?"}` : ""}
                    </span>
                  </span>
                </div>
                <AssignmentStatus status={a.status} />
              </div>
            ))}
          </section>

          {canReview && (
            <section className="clay panel" id="avis">
              <h2>Noter votre équipe</h2>
              <p className="muted small">Vos notes guident le matching des prochains exposants. Un seul avis par personne et par événement.</p>
              {team
                .filter((a) => a.status === "acceptee")
                .map((a) => {
                  const r = reviews.find((x) => x.freelancerId === a.freelancerId);
                  return <ReviewForm key={a.id} a={a} given={r ? { rating: r.rating, comment: r.comment } : undefined} />;
                })}
            </section>
          )}

          {booking.status === "heures_a_valider" && row && (
            <section className="clay panel">
              <h2>Heures à valider</h2>
              <div className="stack">
                {row.hours.map((h) => (
                  <HoursRow key={h.id} a={h} />
                ))}
              </div>
              <p className="muted small">Ajustez si besoin, puis validez. La paie part le lundi suivant.</p>
            </section>
          )}

          <section className="clay panel" id="leads">
            <div className="row-between">
              <h2>Leads reçus ({leads.length})</h2>
              {leads.length > 0 && <a className="clay s btn xs" href={`/entreprise/leads/${id}/export`}>Exporter (.xlsx)</a>}
            </div>
            <p className="muted small">Format : {tpl.name}. Les cellules complétées par l’équipe Standby sont signalées.</p>
            {leads.length === 0 ? (
              <p className="muted">Aucun lead reçu pour cette réservation.</p>
            ) : (
              <div className="tblwrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      {tpl.columns.map((c) => (
                        <th key={c} scope="col">{c}</th>
                      ))}
                      <th scope="col">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.slice(0, 200).map((l) => {
                      const data = l.data as Record<string, string>;
                      return (
                        <tr key={l.id}>
                          {tpl.columns.map((c) => (
                            <td key={c}>{data[c]}</td>
                          ))}
                          <td>{l.source === "cartes" ? "Carte de visite" : "Excel"}{l.completed ? " · complété" : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div style={{ flex: "1 1 360px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="clay panel">
            <h2>Détails</h2>
            <dl>
              <div className="kv"><dt>Jours</dt><dd>{booking.days.map((d) => dayLabel(d)).join(", ")}</dd></div>
              <div className="kv"><dt>Horaires</dt><dd>{booking.startTime} – {booking.endTime}</dd></div>
              <div className="kv"><dt>Langues</dt><dd>{booking.languages.join(", ")}</dd></div>
              <div className="kv"><dt>Tenue</dt><dd>{OUTFITS[booking.outfit as OutfitKey]}</dd></div>
              <div className="kv"><dt>Référent</dt><dd>{ctx.referent?.name ?? booking.referentOtherName ?? "—"}</dd></div>
              {booking.brochureName && <div className="kv"><dt>Plaquette</dt><dd><FileLink href={fileUrl(booking.brochurePath)} name={booking.brochureName} /></dd></div>}
              {booking.brief && <div className="kv"><dt>Brief</dt><dd style={{ fontWeight: 500 }}>{booking.brief}</dd></div>}
            </dl>
          </section>
          <section className="clay panel">
            <h2>Montant</h2>
            {quote.lines.map((l) => (
              <div key={l.role} className="dev"><span>{l.label}</span><b>{euros(l.totalCents)}</b></div>
            ))}
            <div className="dev"><span>Frais de service</span><b>{euros(quote.serviceFeeCents)}</b></div>
            <div className="ttc"><span>Total TTC {row?.invoice ? "facturé" : "estimé"}</span><span className="disp">{euros(row?.invoice?.totalTtcCents ?? quote.totalTtcCents)}</span></div>
            {row?.invoice && (
              <Link className="clay s btn sm ghost" href={`/entreprise/factures/${row.invoice.id}`}>Voir la facture {row.invoice.number}</Link>
            )}
            {payment && (
              <p className="small">
                Paiement :{" "}
                <Status tone={payment.status === "reussi" ? "ok" : payment.status === "echoue" ? "warn" : "info"}>
                  {{ en_attente: "en attente", en_cours: "en cours", reussi: "réglé", echoue: "échec" }[payment.status]}
                </Status>
                {payment.error ? ` · ${payment.error}` : ""}
              </p>
            )}
          </section>
          {canCancel && terms && (
            <section className="clay panel">
              <h2>Annuler</h2>
              <div className="stack" style={{ gap: 6 }}>
                {schedule.map((r) => (
                  <div key={r.when} className="dev">
                    <span>{r.when}</span>
                    <b>{r.bps === 0 ? "gratuit" : `${r.bps / 100} %`}</b>
                  </div>
                ))}
              </div>
              <p className="muted small">
                Le pourcentage s’applique à la rémunération prévue des commerciaux qui ont déjà accepté, frais de service et TVA en sus ; ils reçoivent
                la même part en indemnité. Voir les <Link href="/cgv">CGV</Link>.
              </p>
              <p className={`note${terms.totalHtCents > 0 ? "" : " ok"}`}>
                Annulation aujourd’hui ({terms.label}) :{" "}
                {terms.totalHtCents > 0 ? `${euros(terms.totalHtCents)} HT, soit ${euros(terms.totalTtcCents)} TTC (${terms.bps / 100} %)` : "sans frais"}
              </p>
              <ActionForm action={cancel.bind(null, id)} className="stack">
                {terms.totalHtCents > 0 && (
                  <label className="check">
                    <input type="checkbox" name="accept" required />
                    J’accepte les frais d’annulation de {euros(terms.totalTtcCents)} TTC.
                  </label>
                )}
                <Submit className="clay s btn sm danger" pending="Annulation…">Annuler la réservation</Submit>
              </ActionForm>
            </section>
          )}
          {cancelled && (
            <section className="clay panel">
              <h2>Annulation</h2>
              <p className="small">
                Annulée {cancelled.label}
                {cancelled.waived ? " · frais offerts" : cancelled.totalHtCents > 0 ? ` · frais de ${euros(cancelled.totalTtcCents)} TTC (${cancelled.bps / 100} %)` : " · sans frais"}
              </p>
            </section>
          )}
          <Link className="small" href={`/contact?ref=${booking.ref}`}>Une question sur cette réservation ?</Link>
        </div>
      </div>
    </>
  );
}
