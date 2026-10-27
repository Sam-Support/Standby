"use client";

import { useState, useSyncExternalStore } from "react";
import { readConsent, writeConsent, type Consent } from "@/components/cookie-banner";

const OPTIONS: { key: keyof Consent; title: string; desc: string }[] = [
  { key: "audience", title: "Mesure d’audience", desc: "Statistiques de fréquentation anonymisées pour améliorer le parcours de réservation." },
  { key: "perso", title: "Personnalisation", desc: "Mémorisation de vos événements consultés et de vos préférences de recherche." },
  { key: "pub", title: "Publicité et réseaux sociaux", desc: "Mesure de nos campagnes et partage de contenus sur les réseaux sociaux." },
];

const subscribe = (cb: () => void) => {
  window.addEventListener("standby-consent", cb);
  return () => window.removeEventListener("standby-consent", cb);
};
const NONE: Consent = { audience: false, perso: false, pub: false };

export function CookieChoices() {
  const stored = useSyncExternalStore(subscribe, () => document.cookie, () => "");
  const [draft, setDraft] = useState<Consent | null>(null);
  const [saved, setSaved] = useState(false);
  const c = draft ?? (stored ? (readConsent() ?? NONE) : NONE);
  const setC = (next: Consent) => setDraft(next);
  const save = (next: Consent) => {
    setC(next);
    writeConsent(next);
    setSaved(true);
  };
  return (
    <>
      <label className="tgl">
        <div>
          <b>Cookies strictement nécessaires</b>
          <p className="muted small">Session, sécurité, mémorisation de votre réservation en cours. Ils ne peuvent pas être désactivés.</p>
        </div>
        <input className="sw-input" type="checkbox" checked disabled readOnly />
        <span className="sw" aria-hidden="true">
          <i></i>
        </span>
      </label>
      {OPTIONS.map((o) => (
        <label key={o.key} className="tgl">
          <div>
            <b>{o.title}</b>
            <p className="muted small">{o.desc}</p>
          </div>
          <input
            className="sw-input"
            type="checkbox"
            role="switch"
            checked={c[o.key]}
            onChange={(e) => {
              setSaved(false);
              setC({ ...c, [o.key]: e.target.checked });
            }}
          />
          <span className="sw" aria-hidden="true">
            <i></i>
          </span>
        </label>
      ))}
      <div className="inline" style={{ gap: 12, marginTop: 6 }}>
        <button className="clay btn sm ghost" onClick={() => save({ audience: false, perso: false, pub: false })}>
          Tout refuser
        </button>
        <button className="clay btn sm ghost" onClick={() => save({ audience: true, perso: true, pub: true })}>
          Tout accepter
        </button>
        <button className="clay btn sm" onClick={() => save(c)}>
          Enregistrer mes choix
        </button>
      </div>
      {saved && (
        <p className="note ok" role="status">
          Vos choix sont enregistrés.
        </p>
      )}
    </>
  );
}
