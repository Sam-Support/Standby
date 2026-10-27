"use client";

import { useState } from "react";

/** Puces à choix multiple qui conservent l'ordre de sélection (le premier choisi = principal). */
export function OrderedChips({ name, options, initial }: { name: string; options: { value: string; label: string }[]; initial: string[] }) {
  const [order, setOrder] = useState<string[]>(initial);
  return (
    <div className="chips" role="group">
      {options.map((o) => {
        const idx = order.indexOf(o.value);
        return (
          <label key={o.value} className="clay s chip">
            <input
              type="checkbox"
              checked={idx >= 0}
              onChange={(e) => setOrder(e.target.checked ? [...order, o.value] : order.filter((v) => v !== o.value))}
            />
            {o.label}
            {idx === 0 && <span className="sr-only"> (poste principal)</span>}
            {idx === 0 && order.length > 1 && <span aria-hidden="true"> ★</span>}
          </label>
        );
      })}
      {order.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
    </div>
  );
}
