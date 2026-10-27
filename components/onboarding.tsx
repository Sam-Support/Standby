import Link from "next/link";

export function Progress({ step, total = 4, label, next, color }: { step: number; total?: number; label: string; next?: string; color?: string }) {
  return (
    <div className="progress">
      <div className="t">
        <span>
          Étape {step} sur {total} · {label}
        </span>
        <span className="muted">{step === total ? "Dernière étape" : next}</span>
      </div>
      <div className="bar sunk" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step} aria-label="Progression">
        <i className="clay s" style={{ width: `${(step / total) * 100}%`, ["--c" as string]: color }}></i>
      </div>
    </div>
  );
}

export function Why({ items, color }: { items: [string, string][]; color?: string }) {
  return (
    <aside className="clay aside why">
      <span className="lab">À quoi ça sert</span>
      <ul>
        {items.map(([b, t]) => (
          <li key={b}>
            <i className="clay s" style={{ ["--c" as string]: color }} aria-hidden="true"></i>
            <span>
              <b>{b}</b> : {t}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Champs de création de compte (étape 1, visiteur non connecté). */
export function AccountFields() {
  return (
    <>
      <h2 className="ptitle">Vos identifiants</h2>
      <div className="fgrid">
        <label className="field">
          Prénom <span className="req">*</span>
          <input className="input" name="firstName" autoComplete="given-name" required />
        </label>
        <label className="field">
          Nom <span className="req">*</span>
          <input className="input" name="lastName" autoComplete="family-name" required />
        </label>
        <label className="field">
          Adresse e-mail <span className="req">*</span>
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="field">
          Téléphone
          <input className="input" name="phone" type="tel" autoComplete="tel" />
        </label>
        <label className="field">
          Mot de passe (10 caractères minimum) <span className="req">*</span>
          <input className="input" name="password" type="password" minLength={10} autoComplete="new-password" required />
        </label>
        <label className="field">
          Confirmation <span className="req">*</span>
          <input className="input" name="confirm" type="password" minLength={10} autoComplete="new-password" required />
        </label>
      </div>
      <label className="check">
        <input type="checkbox" name="cgu" required />
        <span className="muted small">
          J’accepte les <Link href="/cgu">conditions générales d’utilisation</Link> et j’ai lu la{" "}
          <Link href="/confidentialite">politique de confidentialité</Link>.
        </span>
      </label>
      <p className="muted small">
        Déjà inscrit·e ? <Link href="/connexion">Se connecter</Link>
      </p>
    </>
  );
}
