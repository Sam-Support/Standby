import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "../connexion/actions";

export const metadata = { title: "Comptes" };

export default async function Page({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const user = await getCurrentUser();
  return (
    <>
      <div className="head">
        <div>
          <span className="lab">Comptes</span>
          <h1>Inscription et connexion</h1>
          <p>
            Deux types de comptes : entreprise exposante et commercial·e. Connectez-vous ou créez votre compte pour suivre une réservation de bout en
            bout.
          </p>
        </div>
      </div>
      {erreur === "role" && <p className="note">Cette page est réservée à l’autre type de compte. Connectez-vous avec le compte correspondant.</p>}
      {user && (
        <div className="clay brow" style={{ background: undefined }}>
          <span>
            Connecté·e en tant que <b>{user.email}</b>
          </span>
          <form action={logoutAction}>
            <button className="clay s btn sm ghost">Se déconnecter</button>
          </form>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 22 }}>
        <article className="clay hub">
          <span className="clay" aria-hidden="true" style={{ ["--c" as string]: "#4D58EE", position: "absolute", right: -26, top: -26, width: 110, height: 110, borderRadius: "50%" }}></span>
          <span className="lab">Entreprise exposante</span>
          <h2>Réserver des commerciaux pour vos événements</h2>
          <ul>
            <li>Société, SIRET, secteur</li>
            <li>Site web, page LinkedIn, plaquette commerciale</li>
            <li>Référents à contacter pendant l’événement</li>
            <li>Format de remontée des leads : template Excel ou accès à votre CRM</li>
          </ul>
          <div className="inline">
            <Link className="clay btn" href="/inscription/entreprise">
              Créer mon compte entreprise
            </Link>
            <Link className="clay s btn sm ghost" href="/connexion?next=/entreprise">
              Se connecter
            </Link>
          </div>
        </article>
        <article className="clay hub" style={{ ["--c" as string]: "#F3EBD4" }}>
          <span className="clay" aria-hidden="true" style={{ ["--c" as string]: "#68D1A4", position: "absolute", right: -30, top: -30, width: 120, height: 120, borderRadius: "50%" }}></span>
          <span className="lab">Commercial·e indépendant·e</span>
          <h2>Trouver des missions salons et foires</h2>
          <ul>
            <li>Identité, ville, statut auto-entrepreneur</li>
            <li>Postes, spécialités, langues, tarif horaire</li>
            <li>Tailles pour les tenues prêtées par les exposants</li>
            <li>Documents : pièce d’identité, attestation URSSAF, RIB</li>
          </ul>
          <div className="inline">
            <Link className="clay btn butter" href="/inscription/commercial">
              Créer mon compte commercial
            </Link>
            <Link className="clay s btn sm ghost" href="/connexion?next=/commercial">
              Se connecter
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}
