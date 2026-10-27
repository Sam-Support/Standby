import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { AssignmentStatus, BackLink, FileLink } from "@/components/ui";
import { requireFreelancer } from "@/lib/auth/session";
import { OUTFITS, ROLES, type OutfitKey, type RoleKey } from "@/lib/domain";
import { dateRange, dayLabel, euros, hourly, hoursLabel, todayIso } from "@/lib/format";
import { freelancerMissions } from "@/lib/services/freelancer-views";
import { templateColumns } from "@/lib/services/leads";
import { fileUrl } from "@/lib/storage";
import { declare, respond } from "../../actions";

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
              <ActionForm action={declare.bind(null, m.a.id)} className="stack">
                {m.days
                  .filter((d) => d <= today)
                  .map((d) => {
                    const t = m.timesheets.find((x) => x.day === d);
                    return (
                      <div key={d} className="brow">
                        <input type="hidden" name="day" value={d} />
                        <label htmlFor={`h_${d}`}>
                          <b>{dayLabel(d, true)}</b>
                        </label>
                        {t?.status === "valide" ? (
                          <span className="st ok">{hoursLabel(t.minutesValidated ?? t.minutesDeclared)} validées</span>
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
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Submit className="clay s btn sm">Déclarer mes heures</Submit>
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
