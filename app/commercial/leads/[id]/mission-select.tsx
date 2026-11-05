"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/components/i18n";
import { localizePath } from "@/lib/i18n/config";

export function MissionSelect({ current, label, options }: { current: string; label: string; options: { id: string; label: string }[] }) {
  const router = useRouter();
  const lang = useLang();
  return (
    <label className="field">
      <span className="sr-only">{label}</span>
      <select className="input" value={current} onChange={(e) => router.push(localizePath(`/commercial/leads/${e.target.value}`, lang))}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
