import Link from "@/components/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { AssignmentStatus, BackLink, FileLink } from "@/components/ui";
import { requireFreelancer } from "@/lib/auth/session";
import { daysUntil, todayIso } from "@/lib/format";
import { booking as bookingMessages } from "@/lib/i18n/messages/booking";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { freelancer as messages } from "@/lib/i18n/messages/freelancer";
import { getFmt, getMessages } from "@/lib/i18n/server";
import { WITHDRAWABLE } from "@/lib/services/booking";
import { freelancerMissions } from "@/lib/services/freelancer-views";
import { ADJUSTMENT_WINDOW_HOURS } from "@/lib/services/hours";
import { templateColumns } from "@/lib/services/leads";
import { fileUrl } from "@/lib/storage";
import { answerAdjustment, declare, respond, withdraw } from "../../actions";

export async function generateMetadata() {
  return { title: (await getMessages(messages)).mission.title };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await requireFreelancer(`/commercial/missions/${id}`);
  const db = await getDb();
  const m = (await freelancerMissions(db, f.id)).find((x) => x.a.id === id);
  if (!m) notFound();
  const accepted = m.a.status === "acceptee";
  const [referent] = m.b.referentId ? await db.select().from(s.companyReferents).where(eq(s.companyReferents.id, m.b.referentId)) : [];
  const tpl = await templateColumns(db, m.b, m.c);
  const today = todayIso();
  const canDeclare = accepted && ["en_cours", "heures_a_valider"].includes(m.b.status);
  const canWithdraw = accepted && WITHDRAWABLE.includes(m.b.status) && m.first > today;
  const daysLeft = daysUntil(m.first, today);
  const adjusting = m.timesheets.some((x) => x.status === "ajuste");
  const disputed = m.timesheets.some((x) => x.status === "conteste");
  const declaredTotal = m.timesheets.reduce((n, x) => n + x.minutesDeclared, 0);
  const retainedTotal = m.timesheets.reduce((n, x) => n + (x.minutesValidated ?? x.minutesDeclared), 0);
  const deadline = m.a.hoursAdjustedAt ? new Date(m.a.hoursAdjustedAt.getTime() + ADJUSTMENT_WINDOW_HOURS * 3600_000) : null;
  const pastDays = m.days.filter((d) => d <= today);
  const editable = pastDays.some((d) => (m.timesheets.find((x) => x.day === d)?.status ?? "declare") === "declare");
  const brochure = m.b.brochurePath ? { path: m.b.brochurePath, name: m.b.brochureName! } : m.c.brochurePath ? { path: m.c.brochurePath, name: m.c.brochureName! } : null;
  const t = (await getMessages(messages)).mission;
  const lf = (await getMessages(bookingMessages)).leadFormats;
  const fm = await getFmt();
  const dl = domainLabels(fm.lang);
  const standard = tpl.name === "Fiche standard Standby";
  const tplName = m.c.leadMode === "crm" ? lf.crm(m.c.crmProvider ?? "CRM") : standard ? lf.standard : tpl.name;
  const adjusted = t.adjusted(fm.hoursLabel(retainedTotal), fm.hoursLabel(declaredTotal));

  return (
    <>
      <BackLink href="/commercial">{(await getMessages(messages)).area}</BackLink>
      <div className="head">
        <div>
          <span className="lab">{t.label(dl.role(m.a.role).label)}</span>
          <h1>{m.e?.name}</h1>
          <p>
            {m.c.name} · {m.e?.city} · {fm.dateRange(m.first, m.last, true)}
            {m.b.stand ? t.stand(m.b.stand) : ""}
          </p>
        </div>
        <AssignmentStatus status={m.a.status} />
      </div>
      <div className="layout">
        <section className="clay main">
          {m.a.status === "proposee" && (
            <div className="sunk row-between" style={{ borderRadius: 20, padding: "16px 18px" }}>
              <span>
                <b>{fm.hourly(m.a.hourlyRateCents)}</b> · {fm.hoursLabel(m.minutesPerDay)} × {t.days(m.days.length)} · ≈ <b>{fm.euros(m.estimatedCents)}</b>
              </span>
              <div className="inline">
                <ActionForm action={respond.bind(null, m.a.id, false)}>
                  <Submit className="clay s btn sm ghost" pending="…">
                    {t.decline}
                  </Submit>
                </ActionForm>
                <ActionForm action={respond.bind(null, m.a.id, true)}>
                  <Submit className="clay s btn sm ok" pending="…">
                    {t.accept}
                  </Submit>
                </ActionForm>
              </div>
            </div>
          )}
          <h2 className="ptitle">{t.brief}</h2>
          <dl>
            <div className="kv"><dt>{t.daysLabel}</dt><dd>{m.days.map((d) => fm.dayLabel(d)).join(", ")}</dd></div>
            <div className="kv"><dt>{t.hours}</dt><dd>{fm.timeLabel(m.b.startTime)} – {fm.timeLabel(m.b.endTime)} · {t.billed(fm.hoursLabel(m.minutesPerDay))}</dd></div>
            <div className="kv"><dt>{t.outfit}</dt><dd>{dl.outfit(m.b.outfit)}</dd></div>
            <div className="kv"><dt>{t.languages}</dt><dd>{m.b.languages.map(dl.language).join(", ")}</dd></div>
            {m.b.highlights && <div className="kv"><dt>{t.highlights}</dt><dd>{m.b.highlights}</dd></div>}
            {m.b.brief && <div className="kv"><dt>{t.briefLabel}</dt><dd style={{ fontWeight: 500 }}>{m.b.brief}</dd></div>}
            <div className="kv"><dt>{t.leads}</dt><dd>{tplName} · {m.b.leadFrequency === "quotidien" ? t.daily : t.end}</dd></div>
          </dl>
          <div className="chips" style={{ gap: 6 }}>
            {tpl.columns.map((c) => (
              <span key={c} className="colc">{standard ? dl.leadColumn(c) : c}</span>
            ))}
          </div>

          {canDeclare && (
            <>
              <h2 className="ptitle">{t.myHours}</h2>
              {adjusting && (
                <div className="stack" aria-labelledby="adj-title">
                  <p className="note" id="adj-title">
                    {adjusted.before}
                    <b>{adjusted.retained}</b>
                    {adjusted.after}
                    {m.a.hoursAdjustmentNote ? ` : « ${m.a.hoursAdjustmentNote} »` : ""}.
                    {deadline ? t.deadline(fm.longDateTime(deadline)) : ""}
                  </p>
                  <div className="inline" style={{ alignItems: "flex-start", gap: 14 }}>
                    <ActionForm action={answerAdjustment.bind(null, m.a.id, true)}>
                      <Submit className="clay s btn sm ok" pending="…">
                        {t.acceptAdjustment}
                      </Submit>
                    </ActionForm>
                    <ActionForm action={answerAdjustment.bind(null, m.a.id, false)} className="stack" style={{ flex: "1 1 320px" }}>
                      <label className="field">
                        {t.whatsWrong}
                        <textarea className="input" name="reason" rows={3} minLength={10} maxLength={1000} required />
                      </label>
                      <div>
                        <Submit className="clay s btn sm ghost" pending={t.sending}>
                          {t.dispute}
                        </Submit>
                      </div>
                    </ActionForm>
                  </div>
                </div>
              )}
              {disputed && <p className="note info">{t.disputed(fm.hoursLabel(declaredTotal), fm.hoursLabel(retainedTotal), m.a.hoursDisputeNote)}</p>}
              <ActionForm action={declare.bind(null, m.a.id)} className="stack">
                {pastDays.map((d) => {
                  const ts = m.timesheets.find((x) => x.day === d);
                  return (
                    <div key={d} className="brow">
                      <input type="hidden" name="day" value={d} />
                      <label htmlFor={`h_${d}`}>
                        <b>{fm.dayLabel(d, true)}</b>
                      </label>
                      {ts && ts.status !== "declare" ? (
                        <span className={`st ${ts.status === "valide" ? "ok" : "warn"}`}>
                          {fm.hoursLabel(ts.minutesValidated ?? ts.minutesDeclared)} {t.dayStatus[ts.status]}
                        </span>
                      ) : (
                        <span className="inline" style={{ gap: 6 }}>
                          <input
                            id={`h_${d}`}
                            className="input"
                            name={`h_${d}`}
                            defaultValue={((ts?.minutesDeclared ?? m.minutesPerDay) / 60).toLocaleString(fm.locale)}
                            style={{ width: 90, minHeight: 40, padding: "8px 12px", fontWeight: 800 }}
                            inputMode="decimal"
                          />
                          <span className="muted small">h</span>
                        </span>
                      )}
                    </div>
                  );
                })}
                {editable && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Submit className="clay s btn sm">{t.declare}</Submit>
                  </div>
                )}
              </ActionForm>
            </>
          )}

          {canWithdraw && (
            <>
              <h2 className="ptitle">{t.withdraw}</h2>
              <p className="muted small">{t.withdrawHelp}</p>
              {daysLeft <= 2 && <p className="note err">{t.soon(daysLeft)}</p>}
              <ActionForm action={withdraw.bind(null, m.a.id)} className="stack">
                <label className="field">
                  {t.reason}
                  <textarea className="input" name="reason" rows={3} minLength={10} maxLength={1000} required />
                </label>
                <label className="check">
                  <input type="checkbox" name="confirm" required />
                  {t.confirm}
                </label>
                <div>
                  <Submit className="clay s btn sm danger" pending={t.sending}>
                    {t.withdrawButton}
                  </Submit>
                </div>
              </ActionForm>
            </>
          )}
        </section>
        <aside className="clay aside">
          <span className="lab">{t.exhibitor}</span>
          <b>{m.c.name}</b>
          <div className="facts">
            {m.c.website && (
              <a href={m.c.website} target="_blank" rel="noopener noreferrer">
                {t.website}
              </a>
            )}
            {m.c.linkedin && (
              <a href={m.c.linkedin} target="_blank" rel="noopener noreferrer">
                {t.linkedin}
              </a>
            )}
            {brochure && <FileLink href={fileUrl(brochure.path)} name={brochure.name} hint={t.brochure} />}
          </div>
          <span className="lab">{t.referent}</span>
          {accepted ? (
            <p>
              <b>{referent?.name ?? m.b.referentOtherName}</b>
              <br />
              <span className="muted small">{[referent?.title, referent?.phone ?? m.b.referentOtherPhone].filter(Boolean).join(" · ")}</span>
            </p>
          ) : (
            <p className="muted small">{t.afterAccept}</p>
          )}
          <div className="sunk est">
            <span className="lab">{t.estimated}</span>
            <b>{fm.euros(m.estimatedCents)}</b>
            <p className="muted" style={{ fontSize: 12 }}>{t.payoutHint(fm.hourly(m.a.hourlyRateCents))}</p>
          </div>
          {accepted && m.started && (
            <Link className="clay btn sm" href={`/commercial/leads/${m.a.id}`}>
              {(await getMessages(messages)).dash.uploadLeads}
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
