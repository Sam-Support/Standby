import type { Lang } from "@/lib/i18n/config";

/** Barème d'annulation, en fonction du nombre de jours avant le premier jour réservé. */

export type CancellationPolicy = {
  freeDays: number;
  tier1Days: number;
  tier1Bps: number;
  tier2Days: number;
  tier2Bps: number;
  lastBps: number;
};

export function cancellationRate(daysBefore: number, p: CancellationPolicy): { bps: number; label: string } {
  if (daysBefore >= p.freeDays) return { bps: 0, label: `${p.freeDays} jours ou plus avant l’événement` };
  if (daysBefore >= p.tier1Days) return { bps: p.tier1Bps, label: `${p.tier1Days} à ${p.freeDays - 1} jours avant l’événement` };
  if (daysBefore >= p.tier2Days) return { bps: p.tier2Bps, label: `${p.tier2Days} à ${p.tier1Days - 1} jours avant l’événement` };
  return { bps: p.lastBps, label: `moins de ${p.tier2Days} jours avant l’événement ou événement commencé` };
}

const SCHEDULE: Record<Lang, (p: CancellationPolicy) => [string, string, string, string]> = {
  fr: (p) => [
    `${p.freeDays} jours ou plus avant le premier jour`,
    `De ${p.tier1Days} à ${p.freeDays - 1} jours avant`,
    `De ${p.tier2Days} à ${p.tier1Days - 1} jours avant`,
    `Moins de ${p.tier2Days} jours avant, ou événement commencé`,
  ],
  en: (p) => [
    `${p.freeDays} days or more before the first day`,
    `${p.tier1Days} to ${p.freeDays - 1} days before`,
    `${p.tier2Days} to ${p.tier1Days - 1} days before`,
    `Less than ${p.tier2Days} days before, or event started`,
  ],
  es: (p) => [
    `${p.freeDays} días o más antes del primer día`,
    `De ${p.tier1Days} a ${p.freeDays - 1} días antes`,
    `De ${p.tier2Days} a ${p.tier1Days - 1} días antes`,
    `Menos de ${p.tier2Days} días antes, o evento ya iniciado`,
  ],
};

/** Lignes du barème, pour les CGV et l'écran d'annulation. */
export function cancellationSchedule(p: CancellationPolicy, lang: Lang = "fr"): { when: string; bps: number }[] {
  const [free, tier1, tier2, last] = SCHEDULE[lang](p);
  return [
    { when: free, bps: 0 },
    { when: tier1, bps: p.tier1Bps },
    { when: tier2, bps: p.tier2Bps },
    { when: last, bps: p.lastBps },
  ];
}
