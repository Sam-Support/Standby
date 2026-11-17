import Link from "@/components/link";
import { asc } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead, Status } from "@/components/ui";
import { dateRange, longDate, todayIso } from "@/lib/format";
import { importCsvAction } from "../actions";
import { logoStatus } from "./event-form";
import { requireAdmin } from "@/lib/auth/session";

export const metadata = { title: "Salons et foires" };

export default async function Page() {
  await requireAdmin(); // le layout ne suffit pas : une navigation côté client ne le réexécute pas
  const db = await getDb();
  const events = await db.select().from(s.events).orderBy(asc(s.events.startsOn));
  const today = todayIso();
  return (
    <>
      <PageHead
        label="Administration"
        title="Salons et foires"
        actions={
          <Link className="clay btn sm" href="/admin/salons/nouveau">
            Nouveau salon
          </Link>
        }
      >
        Le calendrier affiché sur l’accueil et dans la réservation. Marquez les dates comme vérifiées après contrôle sur le site de l’organisateur.
      </PageHead>
      <section className="clay panel">
        <h2>Import Excel ou CSV</h2>
        <p className="muted small">
          Téléchargez le modèle, remplissez une ligne par salon ou foire, puis importez le fichier. Colonnes : nom ; type (salon/foire) ; ville ; début
          (AAAA-MM-JJ) ; fin ; montage ; secteur ; spécialité ; site. L’import crée des événements (il ne met pas à jour ceux qui existent déjà).
        </p>
        <div className="inline">
          <a className="clay s btn sm butter" href="/admin/salons/modele" download>
            Télécharger le modèle Excel
          </a>
        </div>
        <ActionForm action={importCsvAction} className="inline">
          <input className="input" type="file" name="csv" accept=".xlsx,.csv,.txt" required aria-label="Fichier Excel ou CSV" style={{ maxWidth: 320 }} />
          <Submit className="clay s btn sm" pending="Import…">Importer</Submit>
        </ActionForm>
      </section>
      <section className="clay panel">
        <h2>Calendrier ({events.length})</h2>
        <div className="tblwrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">Événement</th>
                <th scope="col">Type</th>
                <th scope="col">Ville</th>
                <th scope="col">Dates</th>
                <th scope="col">Logo</th>
                <th scope="col">Vérifié</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/admin/salons/${e.id}`}>{e.name}</Link>
                  </td>
                  <td>{e.kind === "salon" ? "Salon pro" : "Foire"}</td>
                  <td>{e.city}</td>
                  <td>{dateRange(e.startsOn, e.endsOn, true)}</td>
                  <td>{e.logoPath ? (logoStatus(e).shown ? "affiché" : e.logoAuthorized ? "hors dimensions" : "non autorisé") : "—"}</td>
                  <td>{e.verifiedOn ? longDate(e.verifiedOn) : <span className="todo">à vérifier</span>}</td>
                  <td>
                    {!e.published ? <Status>Masqué</Status> : e.endsOn < today ? <Status>Passé</Status> : <Status tone="ok">Publié</Status>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
