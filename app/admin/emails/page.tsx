import { desc } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { PageHead } from "@/components/ui";
import { longDateTime } from "@/lib/format";

export const metadata = { title: "E-mails simulés" };

export default async function Page() {
  const rows = await (await getDb()).select().from(s.emailOutbox).orderBy(desc(s.emailOutbox.createdAt)).limit(100);
  return (
    <>
      <PageHead label="Administration" title="E-mails simulés">
        Sans clé Resend, les e-mails ne partent pas : ils sont listés ici (100 derniers) pour les démonstrations et les tests.
        {process.env.RESEND_API_KEY ? " Resend est configuré : les nouveaux e-mails partent réellement." : ""}
      </PageHead>
      {rows.length === 0 && <p className="muted">Aucun e-mail simulé.</p>}
      {rows.map((m) => (
        <section key={m.id} className="clay panel">
          <div className="row-between">
            <span>
              <b>{m.subject}</b> · à {m.to}
            </span>
            <span className="muted small">{longDateTime(m.createdAt)}</span>
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
          {m.link && (
            <p className="small">
              Lien : <a href={m.link}>{m.link}</a>
            </p>
          )}
        </section>
      ))}
    </>
  );
}
