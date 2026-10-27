import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { BackLink, Status } from "@/components/ui";
import { requireFreelancer } from "@/lib/auth/session";
import { dateRange } from "@/lib/format";
import type { ColumnMapping } from "@/lib/leads/mapping";
import { freelancerMissions } from "@/lib/services/freelancer-views";
import { templateColumns } from "@/lib/services/leads";
import { fileUrl } from "@/lib/storage";
import { sendLeads, uploadCardsAction, uploadLeadsAction } from "../../actions";
import { MissionSelect } from "./mission-select";

export const metadata = { title: "Déposer mes leads" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await requireFreelancer(`/commercial/leads/${id}`);
  const db = await getDb();
  const missions = (await freelancerMissions(db, f.id)).filter((m) => m.a.status === "acceptee" && m.started);
  const m = missions.find((x) => x.a.id === id);
  if (!m) notFound();
  const tpl = await templateColumns(db, m.b, m.c);
  const [xlsx] = await db
    .select()
    .from(s.leadBatches)
    .where(and(eq(s.leadBatches.assignmentId, id), eq(s.leadBatches.source, "xlsx"), eq(s.leadBatches.status, "brouillon")))
    .orderBy(desc(s.leadBatches.createdAt));
  const [cardsBatch] = await db
    .select()
    .from(s.leadBatches)
    .where(and(eq(s.leadBatches.assignmentId, id), eq(s.leadBatches.source, "cartes"), eq(s.leadBatches.status, "brouillon")));
  const cards = cardsBatch ? await db.select().from(s.businessCards).where(eq(s.businessCards.batchId, cardsBatch.id)) : [];
  const preview = xlsx ? await db.select().from(s.leads).where(eq(s.leads.batchId, xlsx.id)).limit(4) : [];
  const mapping = xlsx?.mapping as (ColumnMapping & { headers: string[] }) | undefined;
  const sent = (await db.select().from(s.leadBatches).where(eq(s.leadBatches.assignmentId, id))).filter((b) => b.status !== "brouillon");
  const sentCount = sent.reduce((n, b) => n + b.rowsCount, 0);

  return (
    <>
      <BackLink href="/commercial">Espace commercial</BackLink>
      <section className="clay main">
        <div className="row-between">
          <h1 className="disp" style={{ fontSize: 32, lineHeight: 1.1 }}>Déposer mes leads</h1>
          <span className="lab">
            {m.e?.name} · {dateRange(m.first, m.last)}
          </span>
        </div>
        <MissionSelect current={id} options={missions.map((x) => ({ id: x.a.id, label: `${x.e?.name} · ${dateRange(x.first, x.last)} · ${x.c.name}` }))} />
        {sentCount > 0 && <p className="note ok">{sentCount} lead(s) déjà envoyés à {m.c.name} pour cette mission.</p>}

        <h2 style={{ font: "800 16px var(--sans)" }}>Format attendu par {m.c.name} : {tpl.name}</h2>
        <div className="chips" style={{ gap: 6 }}>
          {tpl.columns.map((c) => {
            const src = mapping?.mapping[c];
            if (!mapping) return <span key={c} className="colc">{c}</span>;
            return (
              <span key={c} className={`colc ${src ? "ok" : "miss"}`}>
                {c}
                {src && src !== c ? ` ← ${src}` : ""}
              </span>
            );
          })}
        </div>

        <h2 style={{ font: "800 16px var(--sans)" }}>Fichier Excel de leads</h2>
        <ActionForm action={uploadLeadsAction.bind(null, id)} className="sunk drop">
          <span className="clay s ic" aria-hidden="true"></span>
          <div>
            <label htmlFor="file">
              <b>{xlsx ? "Remplacer le fichier" : "Choisir un fichier .xlsx"}</b>
            </label>
            <p className="muted small">La première ligne doit contenir les en-têtes de colonnes. Elles sont rapprochées automatiquement du format de l’entreprise.</p>
          </div>
          <input id="file" className="input" type="file" name="file" accept=".xlsx" required style={{ maxWidth: 260 }} />
          <Submit className="clay s btn sm ghost" pending="Lecture…">Déposer</Submit>
        </ActionForm>
        {xlsx && mapping && (
          <>
            <div className="clay s" style={{ alignSelf: "flex-start", borderRadius: 14, padding: "8px 14px", font: "600 14px var(--sans)" }}>
              {xlsx.filename} · {xlsx.rowsCount} lignes
            </div>
            <div className={`note${mapping.missing.length ? "" : " ok"}`}>
              {mapping.recognized}/{tpl.columns.length} colonnes reconnues
              {mapping.missing.length ? ` · ${mapping.missing.join(", ")} sera complété${mapping.missing.length > 1 ? "s" : ""} par l’équipe Standby.` : "."}
            </div>
            <div className="tblwrap">
              <table className="tbl">
                <thead>
                  <tr>
                    {tpl.columns.slice(0, 6).map((c) => (
                      <th key={c} scope="col">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((l) => {
                    const d = l.data as Record<string, string>;
                    return (
                      <tr key={l.id}>
                        {tpl.columns.slice(0, 6).map((c) => (
                          <td key={c}>{d[c]}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: 14 }}>Aperçu des {preview.length} premières lignes sur {xlsx.rowsCount}.</p>
          </>
        )}

        <h2 style={{ font: "800 16px var(--sans)" }}>Photos de cartes de visite</h2>
        {cards.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
            {cards.map((c) => (
              <div key={c.id} className="clay s" style={{ aspectRatio: "7/4", borderRadius: 12, overflow: "hidden", position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(c.path)!} alt="Carte de visite" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <span style={{ position: "absolute", left: 6, bottom: 6 }}>
                  <Status tone={c.status === "saisie" ? "ok" : "info"}>{c.status === "saisie" ? "Lue" : "À saisir"}</Status>
                </span>
              </div>
            ))}
          </div>
        )}
        <ActionForm action={uploadCardsAction.bind(null, id)} className="sunk drop">
          <span className="clay s ic" aria-hidden="true"></span>
          <div>
            <label htmlFor="cards">
              <b>Ajouter des photos de cartes de visite</b>
            </label>
            <p className="muted small">JPG, PNG ou WebP. Les cartes sont lues automatiquement ; sinon saisies dans le fichier par l’équipe sous 24 h.</p>
          </div>
          <input id="cards" className="input" type="file" name="cards" accept=".jpg,.jpeg,.png,.webp" multiple required style={{ maxWidth: 260 }} />
          <Submit className="clay s btn sm ghost" pending="Envoi…">Ajouter</Submit>
        </ActionForm>

        <ActionForm action={sendLeads.bind(null, id)} style={{ display: "flex", justifyContent: "flex-end", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <Submit disabled={!xlsx && !cardsBatch} pending="Envoi…">Envoyer à l’entreprise</Submit>
        </ActionForm>
      </section>
    </>
  );
}
