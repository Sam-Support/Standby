import Link from "next/link";
import { getDb } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { longDate } from "@/lib/format";
import { getPricing } from "@/lib/settings";
import { deletionBlockers } from "@/lib/services/privacy";
import { deleteAccountAction } from "./actions";

export const metadata = { title: "Mes données" };

export default async function Page() {
  const user = await requireUser(undefined, "/compte");
  const db = await getDb();
  const blockers = await deletionBlockers(db, user.id);
  const { leadsRetentionDays } = await getPricing(db);

  return (
    <>
      <PageHead label="Votre compte" title="Mes données personnelles">
        Vos droits sur vos données (RGPD) : consultez, téléchargez ou supprimez ce que standby conserve sur vous. Détails dans la{" "}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </PageHead>
      <div className="grid2">
        <section className="clay panel">
          <h2>Mon compte</h2>
          <dl>
            <div className="kv"><dt>E-mail</dt><dd>{user.email}</dd></div>
            <div className="kv"><dt>Nom</dt><dd>{user.firstName} {user.lastName}</dd></div>
            <div className="kv"><dt>Créé le</dt><dd>{longDate(user.createdAt)}</dd></div>
            <div className="kv"><dt>E-mail confirmé</dt><dd>{user.emailVerifiedAt ? `oui, le ${longDate(user.emailVerifiedAt)}` : "non"}</dd></div>
          </dl>
          <p className="muted small">
            Pour corriger vos informations, utilisez votre{" "}
            <Link href={user.role === "commercial" ? "/commercial/profil" : user.role === "exposant" ? "/entreprise/profil" : "/admin"}>profil</Link>.
          </p>
        </section>
        <section className="clay panel">
          <h2>Télécharger mes données</h2>
          <p className="muted">
            Un fichier JSON avec votre profil, vos réservations ou missions, heures, factures, virements, avis, documents déposés (liste) et
            notifications. Les leads appartiennent aux entreprises exposantes : elles les exportent depuis chaque réservation.
          </p>
          <a className="clay s btn sm" href="/compte/export" download>
            Télécharger (.json)
          </a>
        </section>
      </div>
      <section className="clay panel">
        <h2>Supprimer mon compte</h2>
        <p className="muted">
          Vos coordonnées, documents, plaquettes, favoris, avis reçus, notifications et leads sont supprimés, et vous ne pouvez plus vous connecter.
          Les factures, réservations, heures et virements sont conservés 10 ans (obligation comptable), rattachés à un compte anonymisé.
        </p>
        <p className="muted small">Indépendamment de toute suppression, les leads sont effacés automatiquement {leadsRetentionDays} jours après leur réception.</p>
        {blockers.length > 0 ? (
          <div className="note">
            {blockers.map((b) => (
              <p key={b}>{b}</p>
            ))}
          </div>
        ) : (
          <ActionForm action={deleteAccountAction} className="stack" style={{ maxWidth: 520 }}>
            <label className="field">
              Pour confirmer, recopiez votre adresse e-mail
              <input className="input" name="confirm" type="email" autoComplete="off" required />
            </label>
            <div>
              <Submit className="clay s btn sm danger" pending="Suppression…">
                Supprimer définitivement mon compte
              </Submit>
            </div>
          </ActionForm>
        )}
      </section>
    </>
  );
}
