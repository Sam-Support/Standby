"use client";

import { createContext, useActionState, useContext, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/action";
import { common } from "@/lib/i18n/messages/common";
import { flash } from "./flash";
import { useMessages } from "./i18n";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

const Pending = createContext(false);

/**
 * Formulaire relié à une Server Action.
 * - Une fois la page chargée, l'envoi passe par onSubmit : React ne vide donc pas les champs après une erreur
 *   (comportement par défaut des formulaires d'action), et le message d'erreur est ramené à l'écran.
 * - Les confirmations s'affichent en haut de page (FlashRegion), y compris quand le formulaire disparaît.
 * - Avant l'hydratation, `action` garde l'envoi classique (sans JavaScript).
 */
export function ActionForm({
  action,
  children,
  className,
  style,
  id,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
}) {
  const [fallback, formAction] = useActionState(action, {});
  const [result, setResult] = useState<FormState | null>(null);
  const [pending, startTransition] = useTransition();
  const errorRef = useRef<HTMLParagraphElement>(null);
  const error = result ? result.error : fallback.error;

  useEffect(() => {
    if (result?.error) errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [result]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(async () => {
      const res = (await action(result ?? {}, fd)) ?? {};
      setResult(res);
      if (res.ok) flash(res.ok);
    });
  }

  return (
    <form action={formAction} onSubmit={onSubmit} className={className} style={style} id={id}>
      {error && (
        <p className="note err" role="alert" ref={errorRef}>
          {error}
        </p>
      )}
      {!result && fallback.ok && <p className="note ok">{fallback.ok}</p>}
      <Pending.Provider value={pending}>{children}</Pending.Provider>
    </form>
  );
}

export function Submit({
  children,
  className = "clay btn",
  pending,
  name,
  value,
  style,
  disabled,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  pending?: string;
  name?: string;
  value?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  title?: string;
}) {
  const status = useFormStatus();
  const busy = useContext(Pending) || status.pending;
  const sending = useMessages(common).pending;
  return (
    <button type="submit" className={className} name={name} value={value} style={style} disabled={disabled || busy} title={title}>
      {busy ? (pending ?? sending) : children}
    </button>
  );
}
