import Link from "@/components/link";
import { common } from "@/lib/i18n/messages/common";
import { getMessages } from "@/lib/i18n/server";

export async function Progress({ step, total = 4, label, next, color }: { step: number; total?: number; label: string; next?: string; color?: string }) {
  const t = (await getMessages(common)).onboarding;
  return (
    <div className="progress">
      <div className="t">
        <span>
          {t.step(step, total)} · {label}
        </span>
        <span className="muted">{step === total ? t.last : next}</span>
      </div>
      <div className="bar sunk" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label={t.progress}>
        <i className="clay s" style={{ width: `${(step / total) * 100}%`, ["--c" as string]: color }}></i>
      </div>
    </div>
  );
}

export async function Why({ items, color }: { items: [string, string][]; color?: string }) {
  const t = (await getMessages(common)).onboarding;
  return (
    <aside className="clay aside why">
      <span className="lab">{t.why}</span>
      <ul>
        {items.map(([b, text]) => (
          <li key={b}>
            <i className="clay s" style={{ ["--c" as string]: color }} aria-hidden="true"></i>
            <span>
              <b>{b}</b> : {text}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Champs de création de compte (étape 1, visiteur non connecté). */
export async function AccountFields() {
  const t = (await getMessages(common)).onboarding;
  return (
    <>
      <h2 className="ptitle">{t.credentials}</h2>
      <div className="fgrid">
        <label className="field">
          <span>{t.firstName} <span className="req">*</span></span>
          <input className="input" name="firstName" autoComplete="given-name" required />
        </label>
        <label className="field">
          <span>{t.lastName} <span className="req">*</span></span>
          <input className="input" name="lastName" autoComplete="family-name" required />
        </label>
        <label className="field">
          <span>{t.email} <span className="req">*</span></span>
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          {t.phone}
          <input className="input" name="phone" type="tel" autoComplete="tel" />
        </label>
        <label className="field">
          <span>{t.password} <span className="req">*</span></span>
          <input className="input" name="password" type="password" minLength={10} autoComplete="new-password" required />
        </label>
        <label className="field">
          <span>{t.confirm} <span className="req">*</span></span>
          <input className="input" name="confirm" type="password" minLength={10} autoComplete="new-password" required />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" name="cgu" required />
        <span className="muted small">
          {t.acceptBefore}
          <Link href="/cgu">{t.terms}</Link>
          {t.acceptMiddle}
          <Link href="/confidentialite">{t.privacy}</Link>.
        </span>
      </label>
      <p className="muted small">
        {t.already} <Link href="/connexion">{t.login}</Link>
      </p>
    </>
  );
}
