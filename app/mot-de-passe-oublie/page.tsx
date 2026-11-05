import { ActionForm, Submit } from "@/components/action-form";
import { BackLink, PageHead } from "@/components/ui";
import { account } from "@/lib/i18n/messages/account";
import { getMessages } from "@/lib/i18n/server";
import { forgotAction } from "../connexion/actions";

export async function generateMetadata() {
  return { title: (await getMessages(account)).forgot.title };
}

export default async function Page() {
  const all = await getMessages(account);
  const t = all.forgot;
  return (
    <>
      <PageHead label={all.login.label} title={t.title}>
        {t.lead}
      </PageHead>
      <section className="clay main" style={{ maxWidth: 640 }}>
        <ActionForm action={forgotAction} className="stack" style={{ gap: 16 }}>
          <label className="field">
            {t.email}
            <input className="input" name="email" type="email" autoComplete="email" required />
          </label>
          <div className="row-between">
            <BackLink href="/connexion">{t.back}</BackLink>
            <Submit>{t.submit}</Submit>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
