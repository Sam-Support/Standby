import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { BackLink, Status } from "@/components/ui";
import { requireFreelancer } from "@/lib/auth/session";
import { booking as bookingMessages } from "@/lib/i18n/messages/booking";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { freelancer as messages } from "@/lib/i18n/messages/freelancer";
import { getFmt, getMessages } from "@/lib/i18n/server";
import type { ColumnMapping } from "@/lib/leads/mapping";
import { freelancerMissions } from "@/lib/services/freelancer-views";
import { templateColumns } from "@/lib/services/leads";
import { fileUrl } from "@/lib/storage";
import { sendLeads, uploadCardsAction, uploadLeadsAction } from "../../actions";
import { MissionSelect } from "./mission-select";

export async function generateMetadata() {
  return { title: (await getMessages(messages)).leads.title };
}

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
  const all = await getMessages(messages);
  const t = all.leads;
  const lf = (await getMessages(bookingMessages)).leadFormats;
  const fm = await getFmt();
  const dl = domainLabels(fm.lang);
  const standard = tpl.name === "Fiche standard Stand-By";
  const tplName = m.c.leadMode === "crm" ? lf.crm(m.c.crmProvider ?? "CRM") : standard ? lf.standard : tpl.name;
  const col = (c: string) => (standard ? dl.leadColumn(c) : c);

  return (
    <>
      <BackLink href="/commercial">{all.area}</BackLink>
      <section className="clay main">
        <div className="row-between">
          <h1 className="disp" style={{ fontSize: 32, lineHeight: 1.1 }}>{t.title}</h1>
          <span className="lab">
            {m.e?.name} · {fm.dateRange(m.first, m.last)}
          </span>
        </div>
        <MissionSelect current={id} label={t.mission} options={missions.map((x) => ({ id: x.a.id, label: `${x.e?.name} · ${fm.dateRange(x.first, x.last)} · ${x.c.name}` }))} />
        {sentCount > 0 && <p className="note ok">{t.alreadySent(sentCount, m.c.name)}</p>}

        <h2 style={{ font: "800 16px var(--sans)" }}>{t.format(m.c.name, tplName)}</h2>
        <div className="chips" style={{ gap: 6 }}>
          {tpl.columns.map((c) => {
            const src = mapping?.mapping[c];
            if (!mapping) return <span key={c} className="colc">{col(c)}</span>;
            return (
              <span key={c} className={`colc ${src ? "ok" : "miss"}`}>
                {col(c)}
                {src && src !== c ? ` ← ${src}` : ""}
              </span>
            );
          })}
        </div>

        <h2 style={{ font: "800 16px var(--sans)" }}>{t.excel}</h2>
        <ActionForm action={uploadLeadsAction.bind(null, id)} className="sunk drop">
          <span className="clay s ic" aria-hidden="true"></span>
          <div>
            <label htmlFor="file">
              <b>{xlsx ? t.replace : t.choose}</b>
            </label>
            <p className="muted small">{t.excelHint}</p>
          </div>
          <input id="file" className="input" type="file" name="file" accept=".xlsx" required style={{ maxWidth: 260 }} />
          <Submit className="clay s btn sm ghost" pending={t.reading}>{t.upload}</Submit>
        </ActionForm>
        {xlsx && mapping && (
          <>
            <div className="clay s" style={{ alignSelf: "flex-start", borderRadius: 14, padding: "8px 14px", font: "600 14px var(--sans)" }}>
              {xlsx.filename} · {t.rows(xlsx.rowsCount)}
            </div>
            <div className={`note${mapping.missing.length ? "" : " ok"}`}>
              {t.recognized(mapping.recognized, tpl.columns.length)}
              {mapping.missing.length ? t.missing(mapping.missing.map(col).join(", "), mapping.missing.length) : "."}
            </div>
            <div className="tblwrap">
              <table className="tbl">
                <thead>
                  <tr>
                    {tpl.columns.slice(0, 6).map((c) => (
                      <th key={c} scope="col">{col(c)}</th>
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
            <p className="muted" style={{ fontSize: 14 }}>{t.preview(preview.length, xlsx.rowsCount)}</p>
          </>
        )}

        <h2 style={{ font: "800 16px var(--sans)" }}>{t.cards}</h2>
        {cards.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
            {cards.map((c) => (
              <div key={c.id} className="clay s" style={{ aspectRatio: "7/4", borderRadius: 12, overflow: "hidden", position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(c.path)!} alt={t.card} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <span style={{ position: "absolute", left: 6, bottom: 6 }}>
                  <Status tone={c.status === "saisie" ? "ok" : "info"}>{c.status === "saisie" ? t.read : t.toEnter}</Status>
                </span>
              </div>
            ))}
          </div>
        )}
        <ActionForm action={uploadCardsAction.bind(null, id)} className="sunk drop">
          <span className="clay s ic" aria-hidden="true"></span>
          <div>
            <label htmlFor="cards">
              <b>{t.addCards}</b>
            </label>
            <p className="muted small">{t.cardsHint}</p>
          </div>
          <input id="cards" className="input" type="file" name="cards" accept=".jpg,.jpeg,.png,.webp" multiple required style={{ maxWidth: 260 }} />
          <Submit className="clay s btn sm ghost" pending={t.sending}>{t.add}</Submit>
        </ActionForm>

        <ActionForm action={sendLeads.bind(null, id)} style={{ display: "flex", justifyContent: "flex-end", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
          <Submit disabled={!xlsx && !cardsBatch} pending={t.sending}>{t.send}</Submit>
        </ActionForm>
      </section>
    </>
  );
}
