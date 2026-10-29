import Link from "@/components/link";
import { ActionForm, Submit } from "@/components/action-form";
import { AssignmentStatus, Avatar, Status } from "@/components/ui";
import { getCurrentUser, requireFreelancer } from "@/lib/auth/session";
import { todayIso } from "@/lib/format";
import { getDb } from "@/db";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { freelancer as messages } from "@/lib/i18n/messages/freelancer";
import { getFmt, getMessages, sayParts } from "@/lib/i18n/server";
import { freelancerEarnings, freelancerMissions } from "@/lib/services/freelancer-views";
import { logoutAction } from "../connexion/actions";
import { respond, stripeSetupAction } from "./actions";

export async function generateMetadata() {
  return { title: (await getMessages(messages)).area };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ bienvenue?: string; email?: string }> }) {
  const { bienvenue, email } = await searchParams;
  const f = await requireFreelancer("/commercial");
  const user = (await getCurrentUser())!;
  const db = await getDb();
  const missions = await freelancerMissions(db, f.id);
  const earn = await freelancerEarnings(db, f.id);
  const today = todayIso();
  const proposed = missions.filter((m) => m.a.status === "proposee");
  const accepted = missions.filter((m) => m.a.status === "acceptee" && !["payee", "annulee"].includes(m.b.status));
  const past = missions.filter((m) => m.a.status !== "proposee" && !accepted.includes(m)).slice(0, 10);
  const max = Math.max(...earn.byWeek, 1);
  const t = (await getMessages(messages)).dash;
  const fm = await getFmt();
  const dl = domainLabels(fm.lang);

  return (
    <>
      {bienvenue && <p className="note ok">{t.welcome}</p>}
      {email === "confirme" && <p className="note ok">{t.emailConfirmed}</p>}
      {f.blockedReason && (
        <p className="note err">
          {t.blocked(await sayParts(f.blockedReason))}
          <Link href="/commercial/profil">{t.updateDocs}</Link>
        </p>
      )}
      {accepted.some((m) => m.timesheets.some((x) => x.status === "ajuste")) && <p className="note">{t.adjusted}</p>}
      {!f.billingMandateAcceptedAt && (
        <p className="note err">
          {t.noMandate}
          <Link href="/commercial/profil#facturation">{t.acceptMandate}</Link>
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 22, alignItems: "flex-start" }}>
        <aside style={{ flex: "1 1 320px", maxWidth: 380, display: "flex", flexDirection: "column", gap: 22 }}>
          <div className="clay" style={{ borderRadius: 22, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
            <Avatar first={user.firstName} last={user.lastName} color={f.avatarColor} size={96} />
            <h1 style={{ font: "800 19px var(--sans)" }}>
              {user.firstName} {user.lastName}
            </h1>
            <p className="muted" style={{ fontSize: 14 }}>
              {f.roles[0] ? dl.role(f.roles[0]).label : t.defaultRole}
              {f.ratingX10 ? ` · ★ ${fm.rating(f.ratingX10)}` : ""}
              {f.topSize ? t.outfit(f.topSize, f.pantsSize, f.shoeSize) : ""}
            </p>
            {f.status !== "valide" && <Status tone="warn">{f.status === "refuse" ? t.refused : t.checking}</Status>}
            <div className="inline" style={{ justifyContent: "center" }}>
              <Link className="clay s btn xs ghost" href="/commercial/profil">
                {t.myProfile}
              </Link>
              <Link className="clay s btn xs ghost" href="/compte">
                {t.myAccount}
              </Link>
              <form action={logoutAction}>
                <button className="clay s btn xs ghost">{t.logout}</button>
              </form>
            </div>
          </div>
          <div className="clay" style={{ borderRadius: 22, padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="lab">{t.earnings}</span>
            <div className="disp" style={{ fontSize: 40, lineHeight: 1 }}>
              {fm.euros(earn.upcoming)} <span className="muted" style={{ font: "500 14px var(--sans)" }}>{t.toReceive}</span>
            </div>
            <div className="sunk bars" role="img" aria-label={t.chart(earn.byWeek.map((c) => fm.euros(c)).join(", "))}>
              {earn.byWeek.map((c, i) => (
                <span key={earn.weeks[i]} className={`clay s${i === 5 ? " now" : ""}`} style={{ height: `${Math.max(6, (c / max) * 100)}%` }}></span>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 14 }}>{t.nextPayout(fm.longDate(earn.nextPayout))}</p>
            <Link className="small" href="/commercial/revenus">
              {t.invoicesLink}
            </Link>
            {!f.payoutsEnabled && (
              <ActionForm action={stripeSetupAction}>
                <Submit className="clay s btn sm butter">{t.enablePayouts}</Submit>
              </ActionForm>
            )}
          </div>
        </aside>

        <div style={{ flex: "999 1 640px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="clay panel">
            <h2>{t.proposed}</h2>
            {proposed.length === 0 && <p className="muted">{t.noProposed}</p>}
            {proposed.map((m) => (
              <div key={m.a.id} className="brow">
                <div>
                  <Link className="title" href={`/commercial/missions/${m.a.id}`}>
                    <b>{m.e?.name}</b>
                  </Link>
                  <div className="muted small">
                    {dl.role(m.a.role).short} · {m.e?.city} · {fm.dateRange(m.first, m.last)} · {fm.hourly(m.a.hourlyRateCents)} · ≈ {fm.euros(m.estimatedCents)}
                  </div>
                </div>
                <div className="inline">
                  <ActionForm action={respond.bind(null, m.a.id, false)}>
                    <Submit className="clay s btn xs ghost" pending="…">
                      {t.decline}
                    </Submit>
                  </ActionForm>
                  <ActionForm action={respond.bind(null, m.a.id, true)}>
                    <Submit className="clay s btn xs ok" pending="…">
                      {t.accept}
                    </Submit>
                  </ActionForm>
                </div>
              </div>
            ))}
          </section>

          <section className="clay panel">
            <h2>{t.mine}</h2>
            {accepted.length === 0 && <p className="muted">{t.noMine}</p>}
            {accepted.map((m) => {
              const needHours = m.started && m.declaredDays < m.pastDays && ["en_cours", "heures_a_valider"].includes(m.b.status);
              const adjusted = m.timesheets.some((x) => x.status === "ajuste");
              const disputed = m.timesheets.some((x) => x.status === "conteste");
              return (
                <div key={m.a.id} className="brow">
                  <div>
                    <Link className="title" href={`/commercial/missions/${m.a.id}`}>
                      <b>{m.e?.name}</b>
                    </Link>
                    <div className="muted small">
                      {m.c.name} · {m.e?.city} · {fm.dateRange(m.first, m.last)}
                      {m.leadsSent ? t.leadsSent(m.leadsSent) : ""}
                    </div>
                  </div>
                  <div className="inline">
                    {needHours && <Status tone="warn">{t.hoursToDeclare}</Status>}
                    {adjusted && (
                      <Link className="clay s btn xs butter" href={`/commercial/missions/${m.a.id}`}>
                        {t.hoursAdjusted}
                      </Link>
                    )}
                    {disputed && <Status tone="info">{t.hoursDisputed}</Status>}
                    {m.started && (
                      <Link className="clay s btn xs" href={`/commercial/leads/${m.a.id}`}>
                        {t.uploadLeads}
                      </Link>
                    )}
                    {!m.started && <Status tone="info">{m.first > today ? t.starts(fm.longDate(m.first)) : t.ongoing}</Status>}
                  </div>
                </div>
              );
            })}
          </section>

          {past.length > 0 && (
            <section className="clay panel">
              <h2>{t.history}</h2>
              {past.map((m) => (
                <div key={m.a.id} className="brow">
                  <span>
                    <b>{m.e?.name}</b> <span className="muted small">· {fm.dateRange(m.first, m.last, true)}</span>
                  </span>
                  <AssignmentStatus status={m.b.status === "payee" && m.a.status === "acceptee" ? "acceptee" : m.a.status} />
                </div>
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
