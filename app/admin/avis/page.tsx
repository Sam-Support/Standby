import { getDb } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead, Status } from "@/components/ui";
import { longDateTime } from "@/lib/format";
import { reviewsFor } from "@/lib/services/reviews";
import { deleteReviewAction, publishReviewAction } from "../actions";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Avis" };

export default async function Page() {
  await requireAdmin(); // le layout ne suffit pas : une navigation côté client ne le réexécute pas
  const rows = await reviewsFor(await getDb());
  return (
    <>
      <PageHead label="Administration" title="Avis des exposants">
        Les avis apparaissent directement sur le profil du commercial. Supprimez ceux qui sont injurieux, hors sujet ou contiennent des données
        personnelles : la note est recalculée. « Publier sur l’accueil » affiche l’avis sur la page d’accueil, avec le nom de la société si elle
        l’a accepté, sinon « Exposant » et son secteur ; le commercial y apparaît en prénom et initiale du nom.
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
              <Status tone={r.publicConsent ? "ok" : "info"}>{r.publicConsent ? "nom de la société accepté" : "anonyme si publié"}</Status>
              {r.publishedAt && <Status tone="ok">sur l’accueil</Status>}
              {(r.publishedAt || r.comment) && (
                <ActionForm action={publishReviewAction.bind(null, r.id, !r.publishedAt)}>
                  <Submit className="clay s btn xs ghost" pending="…">
                    {r.publishedAt ? "Retirer de l’accueil" : "Publier sur l’accueil"}
                  </Submit>
                </ActionForm>
              )}
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
