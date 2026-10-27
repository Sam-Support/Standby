"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/action";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

/** Formulaire relié à une Server Action, avec affichage des erreurs et confirmations. */
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
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className} style={style} id={id}>
      {state.error && (
        <p className="note err" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="note ok" role="status">
          {state.ok}
        </p>
      )}
      {children}
    </form>
  );
}

export function Submit({
  children,
  className = "clay btn",
  pending = "Envoi…",
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
  return (
    <button type="submit" className={className} name={name} value={value} style={style} disabled={disabled || status.pending} title={title}>
      {status.pending ? pending : children}
    </button>
  );
}
