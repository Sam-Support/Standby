import Link from "@/components/link";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/action";
import { getCurrentUser } from "@/lib/auth/session";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead } from "@/components/ui";
import { localizePath } from "@/lib/i18n/config";
import { account } from "@/lib/i18n/messages/account";
import { getLang, getMessages } from "@/lib/i18n/server";
import { loginAction } from "./actions";

export async function generateMetadata() {
  return { title: (await getMessages(account)).login.title };
}

const HOME = { exposant: "/entreprise", commercial: "/commercial", admin: "/admin" } as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; reinitialise?: string; email?: string }> }) {
  const { next, reinitialise, email } = await searchParams;
  // déjà connecté : direction son espace, sauf s'il y a un message à lire (adresse confirmée, mot de passe réinitialisé…)
  const user = await getCurrentUser();
  if (user && !reinitialise && !email) redirect(localizePath(safeNext(next, HOME[user.role]), await getLang()));
  const t = (await getMessages(account)).login;
  return (
    <>
      <PageHead label={t.label} title={t.h1}>
        {t.lead}
      </PageHead>
      <div className="layout">
        <section className="clay main" style={{ maxWidth: 640 }}>
          {reinitialise && <p className="note ok">{t.reset}</p>}
          {email === "confirme" && <p className="note ok">{t.confirmed}</p>}
          {email === "invalide" && <p className="note err">{t.invalid}</p>}
          {email === "modifie" && <p className="note ok">{t.changed}</p>}
          {email === "lien-invalide" && <p className="note err">{t.changeInvalid}</p>}
          <ActionForm action={loginAction} className="stack" style={{ gap: 16 }}>
            <input type="hidden" name="next" value={next ?? ""} />
            <label className="field">
              {t.email}
              <input className="input" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="field">
              {t.password}
              <input className="input" name="password" type="password" autoComplete="current-password" required />
            </label>
            <div className="row-between">
              <Link href="/mot-de-passe-oublie" className="small">
                {t.forgot}
              </Link>
              <Submit pending={t.pending}>{t.submit}</Submit>
            </div>
          </ActionForm>
          <div className="nav-row">
            <span className="muted small">{t.noAccount}</span>
            <div className="inline">
              <Link className="clay s btn sm ghost" href="/inscription/entreprise">
                {t.companyAccount}
              </Link>
              <Link className="clay s btn sm butter" href="/inscription/commercial">
                {t.freelancerAccount}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
