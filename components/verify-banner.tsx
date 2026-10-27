import { resendVerificationAction } from "@/app/connexion/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { ActionForm, Submit } from "./action-form";

/** Rappel affiché tant que l'adresse e-mail n'est pas confirmée. */
export async function VerifyBanner() {
  const user = await getCurrentUser();
  if (!user || user.emailVerifiedAt) return null;
  return (
    <ActionForm action={resendVerificationAction} className="note row-between" style={{ alignItems: "center" }}>
      <span>
        Confirmez votre adresse e-mail : un lien a été envoyé à <b>{user.email}</b>. Sans confirmation, vous ne pouvez ni réserver ni accepter de
        mission.
      </span>
      <Submit className="clay s btn xs ghost" pending="Envoi…">
        Renvoyer le lien
      </Submit>
    </ActionForm>
  );
}
