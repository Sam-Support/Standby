import { desc, eq, inArray } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { Avatar, PageHead, Status } from "@/components/ui";
import { DOCUMENT_TYPES, ROLES, type DocumentKey, type RoleKey } from "@/lib/domain";
import { hourly, longDate } from "@/lib/format";
import { formatSiret } from "@/lib/siret";
import { fileUrl } from "@/lib/storage";
import { freelancerStatusAction, reviewDocAction } from "../actions";

export const metadata = { title: "Inscrits à vérifier" };

export default async function Page({ searchParams }: { searchParams: Promise<{ tous?: string }> }) {
  const { tous } = await searchParams;
  const db = await getDb();
  const rows = await db
    .select({ f: s.freelancers, p: s.profiles })
    .from(s.freelancers)
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .where(tous ? undefined : inArray(s.freelancers.status, ["en_revue", "refuse"]))
    .orderBy(desc(s.freelancers.createdAt))
    .limit(100);
  const docs = rows.length ? await db.select().from(s.freelancerDocuments).where(inArray(s.freelancerDocuments.freelancerId, rows.map((r) => r.f.id))) : [];
  const companies = await db.select().from(s.companies).orderBy(desc(s.companies.createdAt)).limit(20);

  return (
    <>
      <PageHead label="Administration" title="Inscrits">
        Vérifiez identité, attestation URSSAF, SIRET et RIB avant de rendre un profil visible. Chaque décision est journalisée.
      </PageHead>
      <div className="inline">
        <a className={`clay s btn xs ${tous ? "ghost" : ""}`} href="/admin/inscrits">À vérifier</a>
        <a className={`clay s btn xs ${tous ? "" : "ghost"}`} href="/admin/inscrits?tous=1">Tous les commerciaux</a>
      </div>
      {rows.length === 0 && <p className="muted">Aucun profil en attente.</p>}
      {rows.map(({ f, p }) => (
        <section key={f.id} className="clay panel">
          <div className="row-between">
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar first={p.firstName} last={p.lastName} color={f.avatarColor} size={44} />
              <div>
                <b>{p.firstName} {p.lastName}</b> <span className="muted small">· {p.email} · {p.phone}</span>
                <div className="muted small">
                  {f.roles.map((r) => ROLES[r as RoleKey]?.short).join(", ")} · {f.city} · {hourly(f.hourlyRateCents)} · SIRET {f.siret ? formatSiret(f.siret) : "—"} · inscrit le {longDate(f.createdAt)}
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
          {(Object.keys(DOCUMENT_TYPES) as DocumentKey[]).map((t) => {
            const d = docs.find((x) => x.freelancerId === f.id && x.type === t);
            return (
              <div key={t} className="brow">
                <span>
                  <b>{DOCUMENT_TYPES[t]}</b>{" "}
                  {d ? (
                    <>
                      · <a href={fileUrl(d.path)!} target="_blank" rel="noopener">{d.filename}</a>{" "}
                      <Status tone={d.status === "valide" ? "ok" : d.status === "refuse" ? "warn" : "info"}>{d.status.replace("_", " ")}</Status>
                    </>
                  ) : (
                    <span className="muted small">· non fourni</span>
                  )}
                </span>
                {d && d.status !== "valide" && (
                  <span className="inline" style={{ gap: 6 }}>
                    <ActionForm action={reviewDocAction.bind(null, d.id, "valide")}>
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
      ))}
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
