import { ActionForm, Submit } from "@/components/action-form";
import { PageHead } from "@/components/ui";
import { resetAction } from "../../connexion/actions";

export const metadata = { title: "Nouveau mot de passe" };

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <>
      <PageHead label="Comptes" title="Choisir un nouveau mot de passe" />
      <section className="clay main" style={{ maxWidth: 640 }}>
        <ActionForm action={resetAction.bind(null, token)} className="stack" style={{ gap: 16 }}>
          <label className="field">
            Nouveau mot de passe (10 caractères minimum)
            <input className="input" name="password" type="password" minLength={10} autoComplete="new-password" required />
          </label>
          <label className="field">
            Confirmation
            <input className="input" name="confirm" type="password" minLength={10} autoComplete="new-password" required />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Submit>Enregistrer</Submit>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
