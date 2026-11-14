"use client";

import Link from "@/components/link";
import { useState } from "react";
import { ActionForm, Submit } from "@/components/action-form";
import { BookingAside, type AsideEvent } from "@/components/booking";
import type { FormState } from "@/lib/action";
import { useFmt, useMessages } from "@/components/i18n";
import { LANGUAGES, ROLES, ROLE_KEYS, type OutfitKey, type RoleKey } from "@/lib/domain";
import { booking } from "@/lib/i18n/messages/booking";
import { domainLabels } from "@/lib/i18n/messages/domain";
import { computeQuote } from "@/lib/pricing";

type Props = {
  id: string;
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  kind: "salon" | "foire";
  initialQty: Partial<Record<RoleKey, number>>;
  initialLanguages: string[];
  initialOutfit: OutfitKey;
  floors: Record<RoleKey, number>;
  selectedRates: Partial<Record<RoleKey, number[]>>;
  serviceFeeBps: number;
  vatBps: number;
  aside: { event: AsideEvent; stand: string | null; days: number; minutesPerDay: number; startTime: string; endTime: string };
};

const PRESET: Record<"salon" | "foire", Partial<Record<RoleKey, number>>> = {
  salon: { commercial: 2, accueil: 1 },
  foire: { demonstrateur: 2, animateur: 1 },
};

export function TeamForm(p: Props) {
  const m = useMessages(booking);
  const t = m.team;
  const f = useFmt();
  const dl = domainLabels(f.lang);
  const [qty, setQty] = useState<Partial<Record<RoleKey, number>>>(p.initialQty);
  const [outfit, setOutfit] = useState<OutfitKey>(p.initialOutfit);
  const [langs, setLangs] = useState<string[]>(p.initialLanguages.length ? p.initialLanguages : ["Français"]);
  const other = p.initialLanguages.filter((l) => !LANGUAGES.includes(l));

  const quote = computeQuote({
    positions: ROLE_KEYS.filter((r) => (qty[r] ?? 0) > 0).map((r) => {
      const rates = (p.selectedRates[r] ?? []).slice(0, qty[r]);
      while (rates.length < (qty[r] ?? 0)) rates.push(p.floors[r]);
      return { role: r, rates };
    }),
    days: p.aside.days,
    billableMinutesPerDay: p.aside.minutesPerDay,
    serviceFeeBps: p.serviceFeeBps,
    vatBps: p.vatBps,
  });

  const row = (r: RoleKey) => {
    const n = qty[r] ?? 0;
    return (
      <div key={r} className={`row${n === 0 ? " off" : ""}`}>
        <span className="clay s" style={{ ["--c" as string]: ROLES[r].color, width: 36, height: 36, borderRadius: "50%", flex: "none" }} aria-hidden="true"></span>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2, minWidth: 180 }}>
          <b id={`l-${r}`}>{dl.role(r).label}</b>
          <span className="muted small">
            {t.from(f.hourly(p.floors[r]))} · {dl.role(r).desc}
          </span>
        </div>
        <button type="button" className="clay s qb" disabled={n === 0} onClick={() => setQty({ ...qty, [r]: n - 1 })} aria-label={t.remove(dl.role(r).label)}>
          −
        </button>
        <span className="disp" style={{ fontSize: 22, minWidth: 28, textAlign: "center" }} aria-live="polite" aria-labelledby={`l-${r}`}>
          {n}
        </span>
        <button type="button" className="clay s qb" disabled={n >= 20} onClick={() => setQty({ ...qty, [r]: n + 1 })} aria-label={t.add(dl.role(r).label)}>
          +
        </button>
        <input type="hidden" name={`qty_${r}`} value={n} />
      </div>
    );
  };

  const main = ROLE_KEYS.filter((r) => !ROLES[r].rare);
  const rare = ROLE_KEYS.filter((r) => ROLES[r].rare);
  const preset = PRESET[p.kind];

  return (
    <div className="layout">
      <section className="clay main">
        <ActionForm action={p.action} className="stack" style={{ gap: 18 }}>
          <h2 className="ptitle">{t.who}</h2>
          <div className="sunk row-between" style={{ borderRadius: 20, padding: "14px 16px", fontSize: 14 }}>
            <span>
              {t.preset(p.kind === "salon")}
              <b>{p.kind === "salon" ? t.presetSalon : t.presetFair}</b>
            </span>
            <button type="button" className="clay s btn xs ghost" onClick={() => setQty({ ...preset })}>
              {t.apply}
            </button>
          </div>
          <div className="stack">{main.map(row)}</div>
          <details className="sunk more" open={rare.some((r) => (qty[r] ?? 0) > 0)}>
            <summary>{t.rare}</summary>
            <div className="stack" style={{ padding: "6px 2px 2px" }}>
              {rare.map(row)}
            </div>
          </details>

          <h2 className="ptitle">{t.languages}</h2>
          <div className="chips">
            {LANGUAGES.map((l) => (
              <label key={l} className="clay s chip">
                <input type="checkbox" name="languages" value={l} checked={langs.includes(l)} onChange={(e) => setLangs(e.target.checked ? [...langs, l] : langs.filter((x) => x !== l))} />
                {dl.language(l)}
              </label>
            ))}
            <input className="input" name="otherLanguage" aria-label={t.otherLanguage} placeholder={t.other} defaultValue={other[0] ?? ""} style={{ width: 160, minHeight: 40, padding: "8px 12px" }} />
          </div>

          <h2 className="ptitle">{t.outfit}</h2>
          <fieldset className="seg sunk" style={{ border: 0, margin: 0 }}>
            <legend className="sr-only">{t.outfit}</legend>
            {(
              [
                ["exposant", t.outfits.exposant],
                ["perso", t.outfits.perso],
              ] as [OutfitKey, string][]
            ).map(([v, l]) => (
              <label key={v}>
                <input type="radio" name="outfit" value={v} checked={outfit === v} onChange={() => setOutfit(v)} />
                {l}
              </label>
            ))}
          </fieldset>

          <div className="nav-row">
            <Link className="clay btn ghost" href={`/reserver/${p.id}/evenement`}>
              {m.back}
            </Link>
            <Submit disabled={quote.people === 0}>{t.next}</Submit>
          </div>
        </ActionForm>
      </section>
      <BookingAside {...p.aside} people={quote.people} quote={quote} />
    </div>
  );
}
