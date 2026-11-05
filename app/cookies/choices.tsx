"use client";

import { useState, useSyncExternalStore } from "react";
import { readConsent, writeConsent, type Consent } from "@/components/cookie-banner";
import { useMessages } from "@/components/i18n";
import { pages } from "@/lib/i18n/messages/pages";

const KEYS: (keyof Consent)[] = ["audience", "perso", "pub"];

const subscribe = (cb: () => void) => {
  window.addEventListener("standby-consent", cb);
  return () => window.removeEventListener("standby-consent", cb);
};
const NONE: Consent = { audience: false, perso: false, pub: false };

export function CookieChoices() {
  const t = useMessages(pages).cookies;
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
          <b>{t.necessary.title}</b>
          <p className="muted small">{t.necessary.desc}</p>
        </div>
        <input className="sw-input" type="checkbox" checked disabled readOnly />
        <span className="sw" aria-hidden="true">
          <i></i>
        </span>
      </label>
      {KEYS.map((key) => (
        <label key={key} className="tgl">
          <div>
            <b>{t.options[key].title}</b>
            <p className="muted small">{t.options[key].desc}</p>
          </div>
          <input
            className="sw-input"
            type="checkbox"
            role="switch"
            checked={c[key]}
            onChange={(e) => {
              setSaved(false);
              setC({ ...c, [key]: e.target.checked });
            }}
          />
          <span className="sw" aria-hidden="true">
            <i></i>
          </span>
        </label>
      ))}
      <div className="inline" style={{ gap: 12, marginTop: 6 }}>
        <button className="clay btn sm ghost" onClick={() => save({ audience: false, perso: false, pub: false })}>
          {t.refuse}
        </button>
        <button className="clay btn sm ghost" onClick={() => save({ audience: true, perso: true, pub: true })}>
          {t.accept}
        </button>
        <button className="clay btn sm" onClick={() => save(c)}>
          {t.save}
        </button>
      </div>
      {saved && (
        <p className="note ok" role="status">
          {t.saved}
        </p>
      )}
    </>
  );
}
