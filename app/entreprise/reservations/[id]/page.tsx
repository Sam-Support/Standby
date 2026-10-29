import Link from "@/components/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { HoursRow } from "@/components/hours-row";
import { AssignmentStatus, Avatar, BackLink, BookingStatus, FileLink, Status } from "@/components/ui";
import { requireCompany } from "@/lib/auth/session";
import { booking as bookingMessages } from "@/lib/i18n/messages/booking";
import { company as messages } from "@/lib/i18n/messages/company";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { getFmt, getMessages, say } from "@/lib/i18n/server";
import { getCompanyBooking, loadBookingContext } from "@/lib/services/booking";
import { companyDashboard } from "@/lib/services/company-views";
import { bookingLeads, templateColumns } from "@/lib/services/leads";
import { fileUrl } from "@/lib/storage";
import { cancel } from "@/app/reserver/actions";
import { cancellationSchedule } from "@/lib/cancellation";
import type { CancellationRecord } from "@/lib/services/billing";
import { CANCELLABLE, cancellationTerms } from "@/lib/services/cancellation";
import { creditNotesFor, REFUND_LABELS } from "@/lib/services/credit-notes";
import { getPricing } from "@/lib/settings";
import { ReviewForm } from "./review-form";

export async function generateMetadata() {
  return { title: (await getMessages(messages)).booking.title };
}

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
  const m = await getMessages(messages);
  const t = m.booking;
  const lf = (await getMessages(bookingMessages)).leadFormats;
  const f = await getFmt();
  const dl = domainLabels(f.lang);
  const schedule = cancellationSchedule((await getPricing(db, booking.confirmedAt ?? new Date())).cancellation, f.lang);
  const cancelled = booking.status === "annulee" ? (booking.cancellation as CancellationRecord | null) : null;
  const canReview = ["validee", "payee"].includes(booking.status);
  const reviews = canReview ? await db.select().from(s.reviews).where(eq(s.reviews.bookingId, id)) : [];
  const credits = await creditNotesFor(db, row?.invoice ? [row.invoice.id] : []);
  const tplName = company.leadMode === "crm" ? lf.crm(company.crmProvider ?? "CRM") : tpl.name === "Fiche standard Standby" ? lf.standard : tpl.name;
  const columnLabel = (c: string) => (tpl.name === "Fiche standard Standby" ? dl.leadColumn(c) : c);

  return (
    <>
      <BackLink href="/entreprise">{m.area}</BackLink>
      {annulee && <p className="note">{t.cancelledNote}</p>}
      <div className="head">
        <div>
          <span className="lab">{t.label(booking.ref)}</span>
          <h1>{ctx.event?.name ?? t.draft}</h1>
          <p>
            {ctx.event ? `${ctx.event.city} · ${f.dateRange(ctx.event.startsOn, ctx.event.endsOn, true)}` : ""}
            {booking.stand ? t.stand(booking.stand) : ""}
          </p>
        </div>
        <div className="inline">
          <BookingStatus status={booking.status} />
          {booking.status === "brouillon" && (
            <Link className="clay btn sm" href={`/reserver/${id}/evenement`}>
              {t.resume}
            </Link>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" }}>
        <div style={{ flex: "1.25 1 520px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="clay panel">
            <h2>{t.team}</h2>
            {team.length === 0 && <p className="muted">{t.noTeam}</p>}
            {team.map((a) => (
              <div key={a.id} className="brow">
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Avatar first={a.firstName} last={a.lastName} color={a.avatarColor} />
                  <span>
                    <b>{a.firstName} {a.lastName}</b>
                    <br />
                    <span className="muted small">
                      {dl.role(a.role).short} · {f.hourly(a.hourlyRateCents)}
                      {a.status === "acceptee" && a.phone ? ` · ${a.phone}` : ""}
                      {a.topSize ? t.outfit(a.topSize, a.pantsSize, a.shoeSize) : ""}
                    </span>
                  </span>
                </div>
                <AssignmentStatus status={a.status} />
              </div>
            ))}
          </section>

          {canReview && (
            <section className="clay panel" id="avis">
              <h2>{t.rate}</h2>
              <p className="muted small">{t.rateHelp}</p>
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
              <h2>{m.dash.hoursTitle}</h2>
              <div className="stack">
                {row.hours.map((h) => (
                  <HoursRow key={h.id} a={h} />
                ))}
              </div>
              <p className="muted small">{t.hoursHelp}</p>
            </section>
          )}

          <section className="clay panel" id="leads">
            <div className="row-between">
              <h2>{t.leads(leads.length)}</h2>
              {leads.length > 0 && (
                <a className="clay s btn xs" href={`/entreprise/leads/${id}/export`}>
                  {m.dash.export}
                </a>
              )}
            </div>
            <p className="muted small">{t.format(tplName)}</p>
            {leads.length === 0 ? (
              <p className="muted">{t.noLeads}</p>
            ) : (
              <div className="tblwrap">
                <table className="tbl">
                  <thead>
                    <tr>
                      {tpl.columns.map((c) => (
                        <th key={c} scope="col">{columnLabel(c)}</th>
                      ))}
                      <th scope="col">{t.source}</th>
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
                          <td>
                            {l.source === "cartes" ? t.card : "Excel"}
                            {l.completed ? t.completed : ""}
                          </td>
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
            <h2>{t.details}</h2>
            <dl>
              <div className="kv"><dt>{t.days}</dt><dd>{booking.days.map((d) => f.dayLabel(d)).join(", ")}</dd></div>
              <div className="kv"><dt>{t.hours}</dt><dd>{f.timeLabel(booking.startTime)} – {f.timeLabel(booking.endTime)}</dd></div>
              <div className="kv"><dt>{t.languages}</dt><dd>{booking.languages.map(dl.language).join(", ")}</dd></div>
              <div className="kv"><dt>{t.outfitLabel}</dt><dd>{dl.outfit(booking.outfit)}</dd></div>
              <div className="kv"><dt>{t.referent}</dt><dd>{ctx.referent?.name ?? booking.referentOtherName ?? "—"}</dd></div>
              {booking.brochureName && <div className="kv"><dt>{t.brochure}</dt><dd><FileLink href={fileUrl(booking.brochurePath)} name={booking.brochureName} /></dd></div>}
              {booking.brief && <div className="kv"><dt>{t.brief}</dt><dd style={{ fontWeight: 500 }}>{booking.brief}</dd></div>}
            </dl>
          </section>
          <section className="clay panel">
            <h2>{t.amount}</h2>
            {quote.lines.map((l) => (
              <div key={l.role} className="dev">
                <span>
                  {l.qty} × {dl.role(l.role).short}
                </span>
                <b>{f.euros(l.totalCents)}</b>
              </div>
            ))}
            <div className="dev"><span>{t.fees}</span><b>{f.euros(quote.serviceFeeCents)}</b></div>
            <div className="ttc"><span>{t.total(Boolean(row?.invoice))}</span><span className="disp">{f.euros(row?.invoice?.totalTtcCents ?? quote.totalTtcCents)}</span></div>
            {row?.invoice && (
              <Link className="clay s btn sm ghost" href={`/entreprise/factures/${row.invoice.id}`}>
                {t.seeInvoice(row.invoice.number)}
              </Link>
            )}
            {credits.map((n) => (
              <div key={n.id} className="dev">
                <Link href={`/entreprise/avoirs/${n.id}`}>{t.creditNote(n.number)}</Link>
                <span>
                  <b>
                    −{f.euros(n.totalTtcCents)} {t.ttc}
                  </b>{" "}
                  <Status tone={REFUND_LABELS[n.refundStatus].tone}>{t.refund[n.refundStatus]}</Status>
                </span>
              </div>
            ))}
            {payment && (
              <p className="small">
                {t.payment}{" "}
                <Status tone={payment.status === "reussi" ? "ok" : payment.status === "echoue" ? "warn" : "info"}>{t.paymentStatus[payment.status]}</Status>
                {payment.error ? ` · ${await say(payment.error)}` : ""}
              </p>
            )}
          </section>
          {canCancel && terms && (
            <section className="clay panel">
              <h2>{t.cancel}</h2>
              <div className="stack" style={{ gap: 6 }}>
                {schedule.map((r) => (
                  <div key={r.when} className="dev">
                    <span>{r.when}</span>
                    <b>{r.bps === 0 ? t.free : f.percent(r.bps)}</b>
                  </div>
                ))}
              </div>
              <p className="muted small">
                {t.cancelHelpBefore}
                <Link href="/cgv">{t.cgv}</Link>.
              </p>
              <p className={`note${terms.totalHtCents > 0 ? "" : " ok"}`}>
                {t.today(await say(terms.label))}
                {terms.totalHtCents > 0 ? t.fee(f.euros(terms.totalHtCents), f.euros(terms.totalTtcCents), terms.bps / 100) : t.noFee}
              </p>
              <ActionForm action={cancel.bind(null, id)} className="stack">
                <label className="check">
                  <input type="checkbox" name="accept" required />
                  {terms.totalHtCents > 0 ? t.acceptFee(f.euros(terms.totalTtcCents)) : t.confirmCancel}
                </label>
                <Submit className="clay s btn sm danger" pending={t.cancelling}>
                  {t.cancelBooking}
                </Submit>
              </ActionForm>
            </section>
          )}
          {cancelled && (
            <section className="clay panel">
              <h2>{t.cancellation}</h2>
              <p className="small">
                {t.cancelledOn(await say(cancelled.label))}
                {cancelled.waived ? t.waived : cancelled.totalHtCents > 0 ? t.feeOf(f.euros(cancelled.totalTtcCents), cancelled.bps / 100) : ` · ${t.noFee}`}
              </p>
            </section>
          )}
          <Link className="small" href={`/contact?ref=${booking.ref}`}>
            {t.question}
          </Link>
        </div>
      </div>
    </>
  );
}
