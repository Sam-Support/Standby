import Link from "next/link";
import { ActionForm, Submit } from "@/components/action-form";
import { AssignmentStatus, Avatar, Status } from "@/components/ui";
import { getCurrentUser, requireFreelancer } from "@/lib/auth/session";
import { ROLES, type RoleKey } from "@/lib/domain";
import { dateRange, euros, hourly, longDate, rating, todayIso } from "@/lib/format";
import { getDb } from "@/db";
import { freelancerEarnings, freelancerMissions } from "@/lib/services/freelancer-views";
import { logoutAction } from "../connexion/actions";
import { respond, stripeSetupAction } from "./actions";

export const metadata = { title: "Espace commercial" };

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
  const role = ROLES[f.roles[0] as RoleKey];

  return (
    <>
      {bienvenue && <p className="note ok">Profil envoyé. Nous vérifions vos documents : vous recevrez vos premières missions dès la validation.</p>}
      {email === "confirme" && <p className="note ok">Adresse e-mail confirmée.</p>}
      {f.blockedReason && (
        <p className="note err">
          Vous ne recevez plus de nouvelles missions : {f.blockedReason}. <Link href="/commercial/profil">Mettre à jour mes documents</Link>
        </p>
      )}
      {!f.billingMandateAcceptedAt && (
        <p className="note err">
          Vous ne recevez pas de missions tant que le mandat de facturation n’est pas accepté. <Link href="/commercial/profil#facturation">Accepter le mandat</Link>
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
              {role?.label ?? "Commercial·e"}
              {f.ratingX10 ? ` · ★ ${rating(f.ratingX10)}` : ""}
              {f.topSize ? ` · tenue ${f.topSize} / ${f.pantsSize} / P. ${f.shoeSize}` : ""}
            </p>
            {f.status !== "valide" && <Status tone="warn">{f.status === "refuse" ? "Profil refusé" : "Documents en cours de vérification"}</Status>}
            <div className="inline" style={{ justifyContent: "center" }}>
              <Link className="clay s btn xs ghost" href="/commercial/profil">Mon profil</Link>
              <Link className="clay s btn xs ghost" href="/compte">Mon compte</Link>
              <form action={logoutAction}>
                <button className="clay s btn xs ghost">Se déconnecter</button>
              </form>
            </div>
          </div>
          <div className="clay" style={{ borderRadius: 22, padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="lab">Revenus</span>
            <div className="disp" style={{ fontSize: 40, lineHeight: 1 }}>
              {euros(earn.upcoming)} <span className="muted" style={{ font: "500 14px var(--sans)" }}>à recevoir</span>
            </div>
            <div className="sunk bars" role="img" aria-label={`Paie des 6 dernières semaines : ${earn.byWeek.map((c) => euros(c)).join(", ")}`}>
              {earn.byWeek.map((c, i) => (
                <span key={earn.weeks[i]} className={`clay s${i === 5 ? " now" : ""}`} style={{ height: `${Math.max(6, (c / max) * 100)}%` }}></span>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 14 }}>Prochain virement : lundi {longDate(earn.nextPayout)}</p>
            <Link className="small" href="/commercial/revenus">Factures, relevés et récapitulatif annuel</Link>
            {!f.payoutsEnabled && (
              <ActionForm action={stripeSetupAction}>
                <Submit className="clay s btn sm butter">Activer mes virements</Submit>
              </ActionForm>
            )}
          </div>
        </aside>

        <div style={{ flex: "999 1 640px", minWidth: 0, display: "flex", flexDirection: "column", gap: 22 }}>
          <section className="clay panel">
            <h2>Missions proposées</h2>
            {proposed.length === 0 && <p className="muted">Aucune mission en attente de réponse.</p>}
            {proposed.map((m) => (
              <div key={m.a.id} className="brow">
                <div>
                  <Link className="title" href={`/commercial/missions/${m.a.id}`}>
                    <b>{m.e?.name}</b>
                  </Link>
                  <div className="muted small">
                    {ROLES[m.a.role as RoleKey]?.short} · {m.e?.city} · {dateRange(m.first, m.last)} · {hourly(m.a.hourlyRateCents)} · ≈ {euros(m.estimatedCents)}
                  </div>
                </div>
                <div className="inline">
                  <ActionForm action={respond.bind(null, m.a.id, false)}>
                    <Submit className="clay s btn xs ghost" pending="…">Refuser</Submit>
                  </ActionForm>
                  <ActionForm action={respond.bind(null, m.a.id, true)}>
                    <Submit className="clay s btn xs ok" pending="…">Accepter</Submit>
                  </ActionForm>
                </div>
              </div>
            ))}
          </section>

          <section className="clay panel">
            <h2>Mes missions</h2>
            {accepted.length === 0 && <p className="muted">Aucune mission acceptée en cours.</p>}
            {accepted.map((m) => {
              const needHours = m.started && m.declaredDays < m.pastDays && ["en_cours", "heures_a_valider"].includes(m.b.status);
              return (
                <div key={m.a.id} className="brow">
                  <div>
                    <Link className="title" href={`/commercial/missions/${m.a.id}`}>
                      <b>{m.e?.name}</b>
                    </Link>
                    <div className="muted small">
                      {m.c.name} · {m.e?.city} · {dateRange(m.first, m.last)}
                      {m.leadsSent ? ` · ${m.leadsSent} leads envoyés` : ""}
                    </div>
                  </div>
                  <div className="inline">
                    {needHours && <Status tone="warn">Heures à déclarer</Status>}
                    {m.started && (
                      <Link className="clay s btn xs" href={`/commercial/leads/${m.a.id}`}>Déposer mes leads</Link>
                    )}
                    {!m.started && <Status tone="info">{m.first > today ? `Débute le ${longDate(m.first)}` : "En cours"}</Status>}
                  </div>
                </div>
              );
            })}
          </section>

          {past.length > 0 && (
            <section className="clay panel">
              <h2>Historique</h2>
              {past.map((m) => (
                <div key={m.a.id} className="brow">
                  <span>
                    <b>{m.e?.name}</b> <span className="muted small">· {dateRange(m.first, m.last, true)}</span>
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
