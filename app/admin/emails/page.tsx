import { desc, eq, isNotNull } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead, Status } from "@/components/ui";
import { longDateTime } from "@/lib/format";
import { emailConfig } from "@/lib/integrations/email";
import { sendTestEmailAction } from "../actions";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "E-mails" };

const STATUS: Record<string, { label: string; tone: "" | "ok" | "warn" | "info" }> = {
  simule: { label: "simulé", tone: "" },
  en_attente: { label: "en cours d’envoi", tone: "info" },
  envoye: { label: "envoyé", tone: "info" },
  differe: { label: "remise retardée", tone: "warn" },
  delivre: { label: "remis", tone: "ok" },
  rebond: { label: "rebond", tone: "warn" },
  plainte: { label: "signalé indésirable", tone: "warn" },
  bloque: { label: "bloqué par Resend", tone: "warn" },
  echec: { label: "échec", tone: "warn" },
};
const PROBLEMS = ["rebond", "plainte", "bloque", "echec"];

export default async function Page({ searchParams }: { searchParams: Promise<{ etat?: string }> }) {
  await requireAdmin(); // le layout ne suffit pas : une navigation côté client ne le réexécute pas
  const { etat } = await searchParams;
  const db = await getDb();
  const cfg = emailConfig();
  const query = db.select().from(s.emailOutbox);
  const rows = await (etat === "problemes" ? query.where(isNotNull(s.emailOutbox.error)) : etat && STATUS[etat] ? query.where(eq(s.emailOutbox.status, etat)) : query)
    .orderBy(desc(s.emailOutbox.createdAt))
    .limit(100);
  const undeliverable = await db
    .select({ email: s.profiles.email, at: s.profiles.emailUndeliverableAt, reason: s.profiles.emailUndeliverableReason, role: s.profiles.role })
    .from(s.profiles)
    .where(isNotNull(s.profiles.emailUndeliverableAt));

  return (
    <>
      <PageHead label="Administration" title="E-mails">
        {cfg.enabled
          ? "Resend est configuré : les e-mails partent réellement et leur remise est suivie ici (100 derniers)."
          : "Sans clé Resend, les e-mails ne partent pas : ils sont listés ici (100 derniers) pour les démonstrations et les tests."}
      </PageHead>
      <div className="grid2">
        <section className="clay panel">
          <h2>Configuration</h2>
          <dl>
            <div className="kv"><dt>Envoi</dt><dd><Status tone={cfg.enabled ? "ok" : "info"}>{cfg.enabled ? "Resend" : "simulé"}</Status></dd></div>
            <div className="kv"><dt>Expéditeur</dt><dd>{cfg.from}</dd></div>
            <div className="kv"><dt>Réponses à</dt><dd>{cfg.replyTo ?? "—"}</dd></div>
            <div className="kv"><dt>Suivi de remise</dt><dd><Status tone={cfg.webhook ? "ok" : "warn"}>{cfg.webhook ? "webhook actif" : "webhook non configuré"}</Status></dd></div>
          </dl>
          {cfg.problems.length > 0 && (
            <div className="note err">
              {cfg.problems.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          )}
          <p className="muted small">Mise en place du domaine et des enregistrements DNS : docs/05-EMAILS.md.</p>
          <ActionForm action={sendTestEmailAction}>
            <Submit className="clay s btn sm">M’envoyer un e-mail de test</Submit>
          </ActionForm>
        </section>
        <section className="clay panel">
          <h2>Adresses en échec</h2>
          {undeliverable.length === 0 ? (
            <p className="muted small">Aucune : les rebonds définitifs et les plaintes signalés par Resend apparaissent ici.</p>
          ) : (
            undeliverable.map((u) => (
              <div key={u.email} className="brow" style={{ flexDirection: "column", alignItems: "stretch", gap: 2 }}>
                <span>
                  <b>{u.email}</b> · {u.role} · {u.at ? longDateTime(u.at) : ""}
                </span>
                <span className="muted small">{u.reason}</span>
              </div>
            ))
          )}
          <p className="muted small">L’utilisateur en est averti dans « Mon compte ». L’état s’efface dès qu’un e-mail lui est de nouveau remis.</p>
        </section>
      </div>
      <nav className="inline" style={{ gap: 6 }} aria-label="Filtrer par état">
        {[["", "Tous"], ["problemes", "Problèmes"], ["delivre", "Remis"], ["envoye", "Envoyés"], ["simule", "Simulés"]].map(([k, label]) => (
          <a key={k} className={`clay s btn xs ${(etat ?? "") === k ? "" : "ghost"}`} href={k ? `/admin/emails?etat=${k}` : "/admin/emails"} aria-current={(etat ?? "") === k ? "page" : undefined}>
            {label}
          </a>
        ))}
      </nav>
      {rows.length === 0 && <p className="muted">Aucun e-mail.</p>}
      {rows.map((m) => {
        const st = STATUS[m.status] ?? { label: m.status, tone: "" as const };
        return (
          <section key={m.id} className="clay panel">
            <div className="row-between">
              <span>
                <b>{m.subject}</b> · à {m.to}
              </span>
              <span className="inline" style={{ gap: 8 }}>
                <Status tone={PROBLEMS.includes(m.status) ? "warn" : st.tone}>{st.label}</Status>
                <span className="muted small">{longDateTime(m.createdAt)}</span>
              </span>
            </div>
            {m.error && <p className="note err small">{m.error}</p>}
            <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
            {m.link && (
              <p className="small">
                Lien : <a href={m.link}>{m.link}</a>
              </p>
            )}
            <p className="muted small">
              {m.category ?? "notification"}
              {m.providerId ? ` · Resend ${m.providerId}` : ""}
            </p>
          </section>
        );
      })}
    </>
  );
}
