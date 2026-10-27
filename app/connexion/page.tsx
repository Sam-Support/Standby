import Link from "next/link";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead } from "@/components/ui";
import { loginAction } from "./actions";

export const metadata = { title: "Connexion" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; reinitialise?: string; email?: string }> }) {
  const { next, reinitialise, email } = await searchParams;
  return (
    <>
      <PageHead label="Comptes" title="Se connecter">
        Entreprise exposante ou commercial·e : un seul accès pour suivre vos réservations et vos missions.
      </PageHead>
      <div className="layout">
        <section className="clay main" style={{ maxWidth: 640 }}>
          {reinitialise && <p className="note ok">Mot de passe modifié. Vous pouvez vous connecter.</p>}
          {email === "confirme" && <p className="note ok">Adresse e-mail confirmée. Connectez-vous pour continuer.</p>}
          {email === "invalide" && <p className="note err">Lien de confirmation expiré ou invalide. Connectez-vous pour en recevoir un nouveau.</p>}
          <ActionForm action={loginAction} className="stack" style={{ gap: 16 }}>
            <input type="hidden" name="next" value={next ?? ""} />
            <label className="field">
              Adresse e-mail
              <input className="input" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="field">
              Mot de passe
              <input className="input" name="password" type="password" autoComplete="current-password" required />
            </label>
            <div className="row-between">
              <Link href="/mot-de-passe-oublie" className="small">
                Mot de passe oublié ?
              </Link>
              <Submit pending="Connexion…">Se connecter</Submit>
            </div>
          </ActionForm>
          <div className="nav-row">
            <span className="muted small">Pas encore de compte ?</span>
            <div className="inline">
              <Link className="clay s btn sm ghost" href="/inscription/entreprise">
                Compte entreprise
              </Link>
              <Link className="clay s btn sm butter" href="/inscription/commercial">
                Compte commercial
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
