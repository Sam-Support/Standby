/** Contrôle de clé d'un SIRET (14 chiffres, algorithme de Luhn ; exception La Poste). */
export function normalizeSiret(v: string) {
  return v.replace(/\s/g, "");
}

export function isValidSiret(value: string): boolean {
  const v = normalizeSiret(value);
  if (!/^\d{14}$/.test(v)) return false;
  if (v.startsWith("356000000")) {
    return v.split("").reduce((s, c) => s + Number(c), 0) % 5 === 0;
  }
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let n = Number(v[13 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export function formatSiret(v: string) {
  const s = normalizeSiret(v);
  return s.length === 14 ? `${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 9)} ${s.slice(9)}` : v;
}
