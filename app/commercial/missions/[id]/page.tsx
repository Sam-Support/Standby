import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { AssignmentStatus, BackLink, FileLink } from "@/components/ui";
import { requireFreelancer } from "@/lib/auth/session";
import { OUTFITS, ROLES, type OutfitKey, type RoleKey } from "@/lib/domain";
import { dateRange, dayLabel, daysUntil, euros, hourly, hoursLabel, longDateTime, todayIso } from "@/lib/format";
import { WITHDRAWABLE } from "@/lib/services/booking";
import { freelancerMissions } from "@/lib/services/freelancer-views";
import { ADJUSTMENT_WINDOW_HOURS } from "@/lib/services/hours";
import { templateColumns } from "@/lib/services/leads";
import { fileUrl } from "@/lib/storage";
import { answerAdjustment, declare, respond, withdraw } from "../../actions";

const DAY_STATUS = { valide: "validées", ajuste: "retenues par l’exposant", conteste: "contestées" } as const;

export const metadata = { title: "Mission" };

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
  const adjusting = m.timesheets.some((t) => t.status === "ajuste");
  const disputed = m.timesheets.some((t) => t.status === "conteste");
  const declaredTotal = m.timesheets.reduce((n, t) => n + t.minutesDeclared, 0);
  const retainedTotal = m.timesheets.reduce((n, t) => n + (t.minutesValidated ?? t.minutesDeclared), 0);
  const deadline = m.a.hoursAdjustedAt ? new Date(m.a.hoursAdjustedAt.getTime() + ADJUSTMENT_WINDOW_HOURS * 3600_000) : null;
  const pastDays = m.days.filter((d) => d <= today);
  const editable = pastDays.some((d) => (m.timesheets.find((x) => x.day === d)?.status ?? "declare") === "declare");
  const brochure = m.b.brochurePath ? { path: m.b.brochurePath, name: m.b.brochureName! } : m.c.brochurePath ? { path: m.c.brochurePath, name: m.c.brochureName! } : null;

  return (
    <>
      <BackLink href="/commercial">Espace commercial</BackLink>
      <div className="head">
        <div>
          <span className="lab">Mission · {ROLES[m.a.role as RoleKey]?.label}</span>
          <h1>{m.e?.name}</h1>
          <p>
            {m.c.name} · {m.e?.city} · {dateRange(m.first, m.last, true)}
            {m.b.stand ? ` · stand ${m.b.stand}` : ""}
          </p>
        </div>
        <AssignmentStatus status={m.a.status} />
      </div>
      <div className="layout">
        <section className="clay main">
          {m.a.status === "proposee" && (
            <div className="sunk row-between" style={{ borderRadius: 20, padding: "16px 18px" }}>
              <span>
                <b>{hourly(m.a.hourlyRateCents)}</b> · {hoursLabel(m.minutesPerDay)} × {m.days.length} jour{m.days.length > 1 ? "s" : ""} · ≈ <b>{euros(m.estimatedCents)}</b>
              </span>
              <div className="inline">
                <ActionForm action={respond.bind(null, m.a.id, false)}>
                  <Submit className="clay s btn sm ghost" pending="…">Refuser</Submit>
                </ActionForm>
                <ActionForm action={respond.bind(null, m.a.id, true)}>
                  <Submit className="clay s btn sm ok" pending="…">Accepter la mission</Submit>
                </ActionForm>
              </div>
            </div>
          )}
          <h2 className="ptitle">Brief de l’exposant</h2>
          <dl>
            <div className="kv"><dt>Jours</dt><dd>{m.days.map((d) => dayLabel(d)).join(", ")}</dd></div>
            <div className="kv"><dt>Horaires</dt><dd>{m.b.startTime} – {m.b.endTime} · {hoursLabel(m.minutesPerDay)} facturées/jour</dd></div>
            <div className="kv"><dt>Tenue</dt><dd>{OUTFITS[m.b.outfit as OutfitKey]}</dd></div>
            <div className="kv"><dt>Langues</dt><dd>{m.b.languages.join(", ")}</dd></div>
            {m.b.highlights && <div className="kv"><dt>À mettre en avant</dt><dd>{m.b.highlights}</dd></div>}
            {m.b.brief && <div className="kv"><dt>Brief</dt><dd style={{ fontWeight: 500 }}>{m.b.brief}</dd></div>}
            <div className="kv"><dt>Leads</dt><dd>{tpl.name} · {m.b.leadFrequency === "quotidien" ? "à déposer chaque soir" : "à déposer en fin d’événement"}</dd></div>
          </dl>
          <div className="chips" style={{ gap: 6 }}>
            {tpl.columns.map((c) => (
              <span key={c} className="colc">{c}</span>
            ))}
          </div>

          {canDeclare && (
            <>
              <h2 className="ptitle">Mes heures</h2>
              {adjusting && (
                <div className="stack" aria-labelledby="adj-title">
                  <p className="note" id="adj-title">
                    L’exposant a retenu <b>{hoursLabel(retainedTotal)}</b> au lieu des {hoursLabel(declaredTotal)} déclarées
                    {m.a.hoursAdjustmentNote ? ` : « ${m.a.hoursAdjustmentNote} »` : ""}.
                    {deadline ? ` Répondez avant le ${longDateTime(deadline)} ; sans réponse, l’ajustement est retenu.` : ""}
                  </p>
                  <div className="inline" style={{ alignItems: "flex-start", gap: 14 }}>
                    <ActionForm action={answerAdjustment.bind(null, m.a.id, true)}>
                      <Submit className="clay s btn sm ok" pending="…">Accepter l’ajustement</Submit>
                    </ActionForm>
                    <ActionForm action={answerAdjustment.bind(null, m.a.id, false)} className="stack" style={{ flex: "1 1 320px" }}>
                      <label className="field">
                        Ce qui ne va pas (transmis à l’équipe Standby et à l’exposant)
                        <textarea className="input" name="reason" rows={3} minLength={10} maxLength={1000} required />
                      </label>
                      <div>
                        <Submit className="clay s btn sm ghost" pending="Envoi…">Contester</Submit>
                      </div>
                    </ActionForm>
                  </div>
                </div>
              )}
              {disputed && (
                <p className="note info">
                  Vous contestez l’ajustement ({hoursLabel(declaredTotal)} déclarées, {hoursLabel(retainedTotal)} retenues) : l’équipe Standby arbitre
                  avec vous et l’exposant. Votre motif : « {m.a.hoursDisputeNote} »
                </p>
              )}
              <ActionForm action={declare.bind(null, m.a.id)} className="stack">
                {pastDays.map((d) => {
                  const t = m.timesheets.find((x) => x.day === d);
                  return (
                    <div key={d} className="brow">
                      <input type="hidden" name="day" value={d} />
                      <label htmlFor={`h_${d}`}>
                        <b>{dayLabel(d, true)}</b>
                      </label>
                      {t && t.status !== "declare" ? (
                        <span className={`st ${t.status === "valide" ? "ok" : "warn"}`}>
                          {hoursLabel(t.minutesValidated ?? t.minutesDeclared)} {DAY_STATUS[t.status]}
                        </span>
                      ) : (
                        <span className="inline" style={{ gap: 6 }}>
                          <input
                            id={`h_${d}`}
                            className="input"
                            name={`h_${d}`}
                            defaultValue={((t?.minutesDeclared ?? m.minutesPerDay) / 60).toLocaleString("fr-FR")}
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
                    <Submit className="clay s btn sm">Déclarer mes heures</Submit>
                  </div>
                )}
              </ActionForm>
            </>
          )}

          {canWithdraw && (
            <>
              <h2 className="ptitle">Se désister</h2>
              <p className="muted small">
                Un empêchement ? Prévenez le plus tôt possible : la mission est aussitôt proposée à un remplaçant et l’exposant est informé. Un
                désistement compte comme un refus dans votre taux d’acceptation, qui pèse dans le matching.
              </p>
              {daysLeft <= 2 && (
                <p className="note err">L’événement commence dans {daysLeft} jour{daysLeft > 1 ? "s" : ""} : appelez aussi l’équipe Standby pour qu’elle organise votre remplacement.</p>
              )}
              <ActionForm action={withdraw.bind(null, m.a.id)} className="stack">
                <label className="field">
                  Motif (transmis uniquement à l’équipe Standby)
                  <textarea className="input" name="reason" rows={3} minLength={10} maxLength={1000} required />
                </label>
                <label className="check">
                  <input type="checkbox" name="confirm" required />
                  Je confirme me désister de cette mission.
                </label>
                <div>
                  <Submit className="clay s btn sm danger" pending="Envoi…">Me désister</Submit>
                </div>
              </ActionForm>
            </>
          )}
        </section>
        <aside className="clay aside">
          <span className="lab">Exposant</span>
          <b>{m.c.name}</b>
          <div className="facts">
            {m.c.website && <a href={m.c.website} target="_blank" rel="noopener noreferrer">Site web</a>}
            {m.c.linkedin && <a href={m.c.linkedin} target="_blank" rel="noopener noreferrer">Page LinkedIn</a>}
            {brochure && <FileLink href={fileUrl(brochure.path)} name={brochure.name} hint="plaquette" />}
          </div>
          <span className="lab">Référent sur place</span>
          {accepted ? (
            <p>
              <b>{referent?.name ?? m.b.referentOtherName}</b>
              <br />
              <span className="muted small">{[referent?.title, referent?.phone ?? m.b.referentOtherPhone].filter(Boolean).join(" · ")}</span>
            </p>
          ) : (
            <p className="muted small">Communiqué après acceptation de la mission.</p>
          )}
          <div className="sunk est">
            <span className="lab">Rémunération estimée</span>
            <b>{euros(m.estimatedCents)}</b>
            <p className="muted" style={{ fontSize: 12 }}>{hourly(m.a.hourlyRateCents)} · virement le lundi suivant la validation</p>
          </div>
          {accepted && m.started && (
            <Link className="clay btn sm" href={`/commercial/leads/${m.a.id}`}>Déposer mes leads</Link>
          )}
        </aside>
      </div>
    </>
  );
}
