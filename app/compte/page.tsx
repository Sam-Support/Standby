import Link from "@/components/link";
import { getDb } from "@/db";
import { ActionForm, Submit } from "@/components/action-form";
import { PageHead } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { account } from "@/lib/i18n/messages/account";
import { getFmt, getMessages, say } from "@/lib/i18n/server";
import { getPricing } from "@/lib/settings";
import { deletionBlockers } from "@/lib/services/privacy";
import { changeEmailAction, changePasswordAction, deleteAccountAction } from "./actions";

export async function generateMetadata() {
  return { title: (await getMessages(account)).me.title };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const user = await requireUser(undefined, "/compte");
  const db = await getDb();
  const blockers = await Promise.all((await deletionBlockers(db, user.id)).map(say));
  const { leadsRetentionDays } = await getPricing(db);
  const t = (await getMessages(account)).me;
  const f = await getFmt();
  const current = t.email.current(user.email);

  return (
    <>
      <PageHead label={t.label} title={t.h1}>
        {t.leadBefore}
        <Link href="/confidentialite">{t.privacy}</Link>.
      </PageHead>
      {email === "modifie" && <p className="note ok">{t.emailChanged}</p>}
      {user.emailUndeliverableAt && <p className="note err">{t.undeliverable}</p>}
      <div className="grid2">
        <section className="clay panel" aria-labelledby="pw-title">
          <h2 id="pw-title">{t.password.title}</h2>
          <ActionForm action={changePasswordAction} className="stack" style={{ gap: 14 }}>
            <label className="field">
              {t.password.current}
              <input className="input" name="current" type="password" autoComplete="current-password" required />
            </label>
            <label className="field">
              {t.password.next}
              <input className="input" name="password" type="password" autoComplete="new-password" minLength={10} required />
            </label>
            <label className="field">
              {t.password.confirm}
              <input className="input" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
            </label>
            <p className="muted small">{t.password.others}</p>
            <div>
              <Submit className="clay s btn sm" pending={t.password.pending}>
                {t.password.submit}
              </Submit>
            </div>
          </ActionForm>
        </section>
        <section className="clay panel" aria-labelledby="email-title">
          <h2 id="email-title">{t.email.title}</h2>
          <p className="muted small">
            {current.before}
            <b>{current.email}</b>
            {current.after}
          </p>
          <ActionForm action={changeEmailAction} className="stack" style={{ gap: 14 }}>
            <label className="field">
              {t.email.next}
              <input className="input" name="email" type="email" autoComplete="email" required />
            </label>
            <label className="field">
              {t.email.password}
              <input className="input" name="password" type="password" autoComplete="current-password" required />
            </label>
            <div>
              <Submit className="clay s btn sm" pending={t.email.pending}>
                {t.email.submit}
              </Submit>
            </div>
          </ActionForm>
        </section>
      </div>
      <div className="grid2">
        <section className="clay panel">
          <h2>{t.info.title}</h2>
          <dl>
            <div className="kv"><dt>{t.info.email}</dt><dd>{user.email}</dd></div>
            <div className="kv"><dt>{t.info.name}</dt><dd>{user.firstName} {user.lastName}</dd></div>
            <div className="kv"><dt>{t.info.created}</dt><dd>{f.longDate(user.createdAt)}</dd></div>
            <div className="kv"><dt>{t.info.verified}</dt><dd>{user.emailVerifiedAt ? t.info.yes(f.longDate(user.emailVerifiedAt)) : t.info.no}</dd></div>
          </dl>
          <p className="muted small">
            {t.info.profileBefore}
            <Link href={user.role === "commercial" ? "/commercial/profil" : user.role === "exposant" ? "/entreprise/profil" : "/admin"}>{t.info.profile}</Link>.
          </p>
        </section>
        <section className="clay panel">
          <h2>{t.download.title}</h2>
          <p className="muted">{t.download.text}</p>
          <a className="clay s btn sm" href="/compte/export" download>
            {t.download.cta}
          </a>
        </section>
      </div>
      <section className="clay panel">
        <h2>{t.delete.title}</h2>
        <p className="muted">{t.delete.text}</p>
        <p className="muted small">{t.delete.retention(leadsRetentionDays)}</p>
        {blockers.length > 0 ? (
          <div className="note">
            {blockers.map((b) => (
              <p key={b}>{b}</p>
            ))}
          </div>
        ) : (
          <ActionForm action={deleteAccountAction} className="stack" style={{ maxWidth: 520 }}>
            <label className="field">
              {t.delete.confirm}
              <input className="input" name="confirm" type="email" autoComplete="off" required />
            </label>
            <div>
              <Submit className="clay s btn sm danger" pending={t.delete.pending}>
                {t.delete.submit}
              </Submit>
            </div>
          </ActionForm>
        )}
      </section>
    </>
  );
}
