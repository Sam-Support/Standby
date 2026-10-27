import { and, asc, desc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { Avatar, PageHead, Status } from "@/components/ui";
import { DOCUMENT_TYPES, ROLES, type DocumentKey, type RoleKey } from "@/lib/domain";
import { addDays, hourly, longDate, todayIso } from "@/lib/format";
import { SIRET_LABELS, siretNameMatches } from "@/lib/services/compliance";
import { formatSiret } from "@/lib/siret";
import { fileUrl } from "@/lib/storage";
import { freelancerStatusAction, reviewDocAction } from "../actions";

export const metadata = { title: "Inscrits à vérifier" };

export default async function Page({ searchParams }: { searchParams: Promise<{ tous?: string }> }) {
  const { tous } = await searchParams;
  const db = await getDb();
  const today = todayIso();
  const rows = await db
    .select({ f: s.freelancers, p: s.profiles })
    .from(s.freelancers)
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .where(tous ? undefined : inArray(s.freelancers.status, ["en_revue", "refuse"]))
    .orderBy(desc(s.freelancers.createdAt))
    .limit(100);
  const docs = rows.length ? await db.select().from(s.freelancerDocuments).where(inArray(s.freelancerDocuments.freelancerId, rows.map((r) => r.f.id))) : [];
  const expiring = await db
    .select({ d: s.freelancerDocuments, p: s.profiles })
    .from(s.freelancerDocuments)
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.freelancerDocuments.freelancerId))
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .where(and(eq(s.freelancerDocuments.type, "urssaf"), isNotNull(s.freelancerDocuments.validUntil), lte(s.freelancerDocuments.validUntil, addDays(today, 30))))
    .orderBy(asc(s.freelancerDocuments.validUntil));
  const blocked = await db
    .select({ f: s.freelancers, p: s.profiles })
    .from(s.freelancers)
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .where(isNotNull(s.freelancers.blockedReason));
  const companies = await db.select().from(s.companies).orderBy(desc(s.companies.createdAt)).limit(20);

  return (
    <>
      <PageHead label="Administration" title="Inscrits">
        Le SIRET est contrôlé dans SIRENE à l’inscription puis tous les 30 jours ; la pièce d’identité et le RIB sont validés automatiquement quand
        Stripe les a vérifiés. Il reste à contrôler l’attestation URSSAF (code de sécurité sur urssaf.fr) et sa date de délivrance.
      </PageHead>
      <div className="inline">
        <a className={`clay s btn xs ${tous ? "ghost" : ""}`} href="/admin/inscrits">À vérifier</a>
        <a className={`clay s btn xs ${tous ? "" : "ghost"}`} href="/admin/inscrits?tous=1">Tous les commerciaux</a>
      </div>

      {(expiring.length > 0 || blocked.length > 0) && (
        <div className="grid2">
          <section className="clay panel">
            <h2>Attestations URSSAF à échéance (30 jours)</h2>
            {expiring.length === 0 && <p className="muted small">Aucune.</p>}
            {expiring.map(({ d, p }) => (
              <div key={d.id} className="dev">
                <span>{p.firstName} {p.lastName}</span>
                <Status tone={d.validUntil! < today ? "warn" : "info"}>{d.validUntil! < today ? "expirée le " : "jusqu’au "}{longDate(d.validUntil!)}</Status>
              </div>
            ))}
          </section>
          <section className="clay panel">
            <h2>Retirés du matching</h2>
            {blocked.length === 0 && <p className="muted small">Aucun.</p>}
            {blocked.map(({ f, p }) => (
              <div key={f.id} className="stack" style={{ gap: 2 }}>
                <b>{p.firstName} {p.lastName}</b>
                <span className="muted small">{f.blockedReason}</span>
              </div>
            ))}
          </section>
        </div>
      )}

      {rows.length === 0 && <p className="muted">Aucun profil en attente.</p>}
      {rows.map(({ f, p }) => {
        const nameOk = siretNameMatches(f.siretName, p.firstName, p.lastName);
        return (
          <section key={f.id} className="clay panel">
            <div className="row-between">
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Avatar first={p.firstName} last={p.lastName} color={f.avatarColor} size={44} />
                <div>
                  <b>{p.firstName} {p.lastName}</b> <span className="muted small">· {p.email} · {p.phone}</span>
                  <div className="muted small">
                    {f.roles.map((r) => ROLES[r as RoleKey]?.short).join(", ")} · {f.city} · {hourly(f.hourlyRateCents)} · inscrit le {longDate(f.createdAt)}
                  </div>
                </div>
              </div>
              <span className="inline">
                <Status tone={f.status === "valide" ? "ok" : f.status === "refuse" ? "warn" : "info"}>{f.status.replace("_", " ")}</Status>
                {f.status !== "valide" && (
                  <ActionForm action={freelancerStatusAction.bind(null, f.id, "valide")}>
                    <Submit className="clay s btn xs ok">Valider le profil</Submit>
                  </ActionForm>
                )}
                {f.status === "valide" && (
                  <ActionForm action={freelancerStatusAction.bind(null, f.id, "refuse")}>
                    <Submit className="clay s btn xs danger">Suspendre</Submit>
                  </ActionForm>
                )}
              </span>
            </div>
            <div className="brow">
              <span>
                <b>SIRET</b> {f.siret ? formatSiret(f.siret) : "—"}{" "}
                <Status tone={f.siretStatus === "actif" ? "ok" : f.siretStatus === "inconnu" ? "info" : "warn"}>{SIRET_LABELS[f.siretStatus] ?? f.siretStatus}</Status>
                {f.siretName && (
                  <span className="muted small">
                    {" "}
                    · SIRENE : {f.siretName} {nameOk ? "(nom conforme)" : "(nom différent du compte : à vérifier)"}
                  </span>
                )}
              </span>
              {f.siretCheckedAt && <span className="muted small">contrôlé le {longDate(f.siretCheckedAt)}</span>}
            </div>
            {f.blockedReason && <p className="note err">Retiré du matching : {f.blockedReason}</p>}
            {(Object.keys(DOCUMENT_TYPES) as DocumentKey[]).map((t) => {
              const d = docs.find((x) => x.freelancerId === f.id && x.type === t);
              const url = fileUrl(d?.path);
              return (
                <div key={t} className="brow">
                  <span>
                    <b>{DOCUMENT_TYPES[t]}</b>{" "}
                    {d ? (
                      <>
                        · {url ? <a href={url} target="_blank" rel="noopener">{d.filename}</a> : d.filename}{" "}
                        <Status tone={d.status === "valide" ? "ok" : d.status === "refuse" ? "warn" : "info"}>
                          {d.source === "stripe" ? "vérifié par Stripe" : d.status.replace("_", " ")}
                        </Status>
                        {d.issuedOn && <span className="muted small"> · délivrée le {longDate(d.issuedOn)}</span>}
                        {d.validUntil && <span className="muted small"> · valable jusqu’au {longDate(d.validUntil)}</span>}
                      </>
                    ) : (
                      <span className="muted small">· non fourni</span>
                    )}
                  </span>
                  {d && d.status !== "valide" && (
                    <span className="inline" style={{ gap: 6 }}>
                      <ActionForm action={reviewDocAction.bind(null, d.id, "valide")} className="inline" style={{ gap: 6 }}>
                        {t === "urssaf" && (
                          <input
                            className="input"
                            type="date"
                            name="issuedOn"
                            defaultValue={d.issuedOn ?? ""}
                            aria-label="Date de délivrance de l’attestation"
                            required
                            style={{ width: 160, minHeight: 36, padding: "6px 10px", fontSize: 14 }}
                          />
                        )}
                        <Submit className="clay s btn xs ok">Valider</Submit>
                      </ActionForm>
                      <ActionForm action={reviewDocAction.bind(null, d.id, "refuse")} className="inline" style={{ gap: 6 }}>
                        <input className="input" name="comment" placeholder="Motif du refus" aria-label="Motif du refus" style={{ width: 200, minHeight: 36, padding: "6px 10px", fontSize: 14 }} />
                        <Submit className="clay s btn xs danger">Refuser</Submit>
                      </ActionForm>
                    </span>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}
      <section className="clay panel">
        <h2>Dernières entreprises inscrites</h2>
        {companies.map((c) => (
          <div key={c.id} className="dev">
            <span>
              <b>{c.name}</b> · SIRET {formatSiret(c.siret)} {c.siretVerified ? <Status tone="ok">SIRENE</Status> : <Status tone="warn">à vérifier</Status>}
            </span>
            <span className="muted small">{longDate(c.createdAt)}{c.onboardingStep <= 4 ? " · inscription inachevée" : ""}</span>
          </div>
        ))}
      </section>
    </>
  );
}
