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

/** Lignes du barème, pour les CGV et l'écran d'annulation. */
export function cancellationSchedule(p: CancellationPolicy): { when: string; bps: number }[] {
  return [
    { when: `${p.freeDays} jours ou plus avant le premier jour`, bps: 0 },
    { when: `De ${p.tier1Days} à ${p.freeDays - 1} jours avant`, bps: p.tier1Bps },
    { when: `De ${p.tier2Days} à ${p.tier1Days - 1} jours avant`, bps: p.tier2Bps },
    { when: `Moins de ${p.tier2Days} jours avant, ou événement commencé`, bps: p.lastBps },
  ];
}
