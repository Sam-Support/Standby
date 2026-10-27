import { desc } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead, Status } from "@/components/ui";
import { longDateTime } from "@/lib/format";
import { handleMessageAction } from "../actions";

export const metadata = { title: "Messages" };

export default async function Page() {
  const rows = await (await getDb()).select().from(s.contactMessages).orderBy(desc(s.contactMessages.createdAt)).limit(100);
  return (
    <>
      <PageHead label="Administration" title="Messages de contact">
        Demandes reçues via la page Contact. Répondez par e-mail, puis marquez-les comme traitées.
      </PageHead>
      {rows.length === 0 && <p className="muted">Aucun message.</p>}
      {rows.map((m) => (
        <section key={m.id} className="clay panel">
          <div className="row-between">
            <span>
              <b>{m.subject}</b> · {m.name} · <a href={`mailto:${m.email}`}>{m.email}</a> · {m.audience}
              {m.bookingRef ? ` · ${m.bookingRef}` : ""}
            </span>
            <span className="inline">
              <span className="muted small">{longDateTime(m.createdAt)}</span>
              {m.handled ? (
                <Status tone="ok">traité</Status>
              ) : (
                <ActionForm action={handleMessageAction.bind(null, m.id)}>
                  <Submit className="clay s btn xs">Marquer traité</Submit>
                </ActionForm>
              )}
            </span>
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{m.message}</p>
        </section>
      ))}
    </>
  );
}
