import { resendVerificationAction } from "@/app/connexion/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { common } from "@/lib/i18n/messages/common";
import { getMessages } from "@/lib/i18n/server";
import { ActionForm, Submit } from "./action-form";

/** Rappel affiché tant que l'adresse e-mail n'est pas confirmée. */
export async function VerifyBanner() {
  const user = await getCurrentUser();
  if (!user || user.emailVerifiedAt) return null;
  const t = (await getMessages(common)).verify;
  const text = t.text(user.email);
  return (
    <ActionForm action={resendVerificationAction} className="note row-between" style={{ alignItems: "center" }}>
      <span>
        {text.before}
        <b>{text.email}</b>
        {text.after}
      </span>
      <Submit className="clay s btn xs ghost" pending={t.sending}>
        {t.resend}
      </Submit>
    </ActionForm>
  );
}
