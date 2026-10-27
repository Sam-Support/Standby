import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead, Status } from "@/components/ui";
import { dateRange, longDate, todayIso } from "@/lib/format";
import { importCsvAction } from "../actions";

export const metadata = { title: "Salons et foires" };

export default async function Page() {
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
        <h2>Import CSV</h2>
        <p className="muted small">
          Séparateur « ; » ou « , ». Colonnes : nom ; type (salon/foire) ; ville ; debut (AAAA-MM-JJ) ; fin ; montage ; secteur ; specialite ; site
        </p>
        <ActionForm action={importCsvAction} className="inline">
          <input className="input" type="file" name="csv" accept=".csv,.txt" required aria-label="Fichier CSV" style={{ maxWidth: 320 }} />
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
                  <td>{e.logoPath ? (e.logoAuthorized ? "affiché" : "non autorisé") : "—"}</td>
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
