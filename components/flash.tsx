"use client";

import { useEffect, useState } from "react";

const EVENT = "standby:flash";

/** Confirmation affichée en haut de page, même si le formulaire qui l'a déclenchée disparaît. */
export function flash(message: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }));
}

export function FlashRegion() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 8000);
    };
    window.addEventListener(EVENT, show);
    return () => {
      window.removeEventListener(EVENT, show);
      clearTimeout(timer);
    };
  }, []);
  // région toujours présente : les lecteurs d'écran annoncent chaque nouveau message
  return (
    <div className="flash" role="status" aria-live="polite">
      {message && (
        <p className="note ok">
          <span>{message}</span>
          <button type="button" className="flash-close" aria-label="Fermer le message" onClick={() => setMessage(null)}>
            ×
          </button>
        </p>
      )}
    </div>
  );
}
