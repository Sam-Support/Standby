import { getDb } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead } from "@/components/ui";
import { longDateTime } from "@/lib/format";
import { reviewsFor } from "@/lib/services/reviews";
import { deleteReviewAction } from "../actions";

export const metadata = { title: "Avis" };

export default async function Page() {
  const rows = await reviewsFor(await getDb());
  return (
    <>
      <PageHead label="Administration" title="Avis des exposants">
        Les avis sont publiés directement. Supprimez ceux qui sont injurieux, hors sujet ou contiennent des données personnelles : la note du
        commercial est recalculée.
      </PageHead>
      {rows.length === 0 && <p className="muted">Aucun avis pour l’instant.</p>}
      {rows.map(({ r, companyName, ref, firstName, lastName }) => (
        <section key={r.id} className="clay panel">
          <div className="row-between">
            <span>
              <b>
                {firstName} {lastName}
              </b>{" "}
              · {r.rating}/5 · par {companyName} · {ref}
            </span>
            <span className="inline">
              <span className="muted small">{longDateTime(r.createdAt)}</span>
              <ActionForm action={deleteReviewAction.bind(null, r.id)}>
                <Submit className="clay s btn xs danger" pending="…">
                  Supprimer
                </Submit>
              </ActionForm>
            </span>
          </div>
          {r.comment && <p style={{ whiteSpace: "pre-wrap" }}>{r.comment}</p>}
        </section>
      ))}
    </>
  );
}
