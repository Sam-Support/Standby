"use client";

import { useRouter } from "next/navigation";

export function MissionSelect({ current, options }: { current: string; options: { id: string; label: string }[] }) {
  const router = useRouter();
  return (
    <label className="field">
      <span className="sr-only">Mission</span>
      <select className="input" value={current} onChange={(e) => router.push(`/commercial/leads/${e.target.value}`)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
