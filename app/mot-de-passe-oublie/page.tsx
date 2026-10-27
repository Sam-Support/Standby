import { ActionForm, Submit } from "@/components/action-form";
import { BackLink, PageHead } from "@/components/ui";
import { forgotAction } from "../connexion/actions";

export const metadata = { title: "Mot de passe oublié" };

export default function Page() {
  return (
    <>
      <PageHead label="Comptes" title="Mot de passe oublié">
        Indiquez votre adresse e-mail : nous vous envoyons un lien pour choisir un nouveau mot de passe.
      </PageHead>
      <section className="clay main" style={{ maxWidth: 640 }}>
        <ActionForm action={forgotAction} className="stack" style={{ gap: 16 }}>
          <label className="field">
            Adresse e-mail
            <input className="input" name="email" type="email" autoComplete="email" required />
          </label>
          <div className="row-between">
            <BackLink href="/connexion">Retour à la connexion</BackLink>
            <Submit>Envoyer le lien</Submit>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
