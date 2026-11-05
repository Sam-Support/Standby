/**
 * Score de compatibilité (0–100), règles pondérées et explicables :
 * langues 25 · spécialité de l'événement 25 · note 20 · expérience 10 · ville 10 · favori 5 · fiabilité 5.
 */

export type MatchCandidate = {
  languages: string[];
  specialties: string[];
  city: string;
  ratingX10: number;
  missionsCount: number;
  acceptRateBps: number;
  isFavorite: boolean;
};

export type MatchCriteria = {
  languages: string[];
  specialty: string | null;
  city: string;
};

export const MATCH_WEIGHTS = { languages: 25, specialty: 25, rating: 20, experience: 10, city: 10, favorite: 5, reliability: 5 };

export function matchScore(c: MatchCandidate, k: MatchCriteria): { score: number; details: Record<keyof typeof MATCH_WEIGHTS, number> } {
  const required = k.languages.length ? k.languages : ["Français"];
  const spoken = required.filter((l) => c.languages.includes(l)).length;
  const details = {
    languages: (MATCH_WEIGHTS.languages * spoken) / required.length,
    specialty: k.specialty && c.specialties.includes(k.specialty) ? MATCH_WEIGHTS.specialty : 0,
    rating: c.ratingX10 > 0 ? (MATCH_WEIGHTS.rating * Math.min(Math.max(c.ratingX10 - 30, 0), 20)) / 20 : MATCH_WEIGHTS.rating / 2,
    experience: (MATCH_WEIGHTS.experience * Math.min(c.missionsCount, 60)) / 60,
    city: normalizeCity(c.city) === normalizeCity(k.city) ? MATCH_WEIGHTS.city : 0,
    favorite: c.isFavorite ? MATCH_WEIGHTS.favorite : 0,
    reliability: (MATCH_WEIGHTS.reliability * c.acceptRateBps) / 10000,
  };
  const score = Math.round(Object.values(details).reduce((a, b) => a + b, 0));
  return { score: Math.min(100, score), details };
}

function normalizeCity(city: string) {
  return city.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Deux plages de jours se chevauchent-elles ? */
export function daysOverlap(a: string[], b: string[]) {
  const set = new Set(a);
  return b.some((d) => set.has(d));
}
