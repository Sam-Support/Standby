"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export const CONSENT_COOKIE = "standby_consent";
const SIX_MONTHS = 60 * 60 * 24 * 182;

export type Consent = { audience: boolean; perso: boolean; pub: boolean };

export function readConsent(): Consent | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw.split("=")[1]));
  } catch {
    return null;
  }
}

export function writeConsent(c: Consent) {
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(c))}; path=/; max-age=${SIX_MONTHS}; samesite=lax`;
  window.dispatchEvent(new Event("standby-consent"));
}

/** Bandeau CNIL : refuser est aussi simple qu'accepter. */
export function CookieBanner() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const sync = () => setOpen(readConsent() === null);
    sync();
    window.addEventListener("standby-consent", sync);
    return () => window.removeEventListener("standby-consent", sync);
  }, []);
  if (!open) return null;
  return (
    <div className="clay cookiebar" role="region" aria-label="Choix des cookies">
      <p>
        Nous utilisons des cookies nécessaires au fonctionnement du site. Avec votre accord, nous mesurons aussi l’audience pour améliorer le
        parcours. <Link href="/cookies">Personnaliser</Link>
      </p>
      <div className="inline">
        <button className="clay s btn sm ghost" onClick={() => writeConsent({ audience: false, perso: false, pub: false })}>
          Tout refuser
        </button>
        <button className="clay s btn sm" onClick={() => writeConsent({ audience: true, perso: true, pub: true })}>
          Tout accepter
        </button>
      </div>
    </div>
  );
}
