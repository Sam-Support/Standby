import { ActionForm, Submit } from "@/components/action-form";
import { PageHead } from "@/components/ui";
import { account } from "@/lib/i18n/messages/account";
import { getMessages } from "@/lib/i18n/server";
import { resetAction } from "../../connexion/actions";

export async function generateMetadata() {
  return { title: (await getMessages(account)).resetPage.title };
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const all = await getMessages(account);
  const t = all.resetPage;
  return (
    <>
      <PageHead label={all.login.label} title={t.h1} />
      <section className="clay main" style={{ maxWidth: 640 }}>
        <ActionForm action={resetAction.bind(null, token)} className="stack" style={{ gap: 16 }}>
          <label className="field">
            {t.password}
            <input className="input" name="password" type="password" minLength={10} autoComplete="new-password" required />
          </label>
          <label className="field">
            {t.confirm}
            <input className="input" name="confirm" type="password" minLength={10} autoComplete="new-password" required />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Submit>{t.submit}</Submit>
          </div>
        </ActionForm>
      </section>
    </>
  );
}
