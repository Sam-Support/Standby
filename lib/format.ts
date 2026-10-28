const euroFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const euroCentsFmt = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

// L'espace fine insécable (U+202F) d'Intl est presque invisible dans Onest : espace insécable classique.
const nbsp = (s: string) => s.replace(/ /g, " ");
/** 290304 → « 2 903 € » */
export const euros = (cents: number) => nbsp(euroFmt.format(Math.round(cents / 100)));
export const eurosPrecise = (cents: number) => nbsp(euroCentsFmt.format(cents / 100));
/** « 09:00 » → « 9 h », « 09:30 » → « 9 h 30 » */
export function timeLabel(t: string) {
  const [h, m] = t.split(":").map(Number);
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}
/** 3100 → « 31 €/h » */
export const hourly = (cents: number) => `${Number.isInteger(cents / 100) ? cents / 100 : (cents / 100).toFixed(2).replace(".", ",")} €/h`;
export const percent = (bps: number) => `${(bps / 100).toLocaleString("fr-FR")} %`;
export const rating = (x10: number) => (x10 / 10).toLocaleString("fr-FR", { minimumFractionDigits: 1 });

/** 480 → « 8 h », 450 → « 7 h 30 » */
export function hoursLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const MONTHS_UP = ["JANV.", "FÉVR.", "MARS", "AVR.", "MAI", "JUIN", "JUIL.", "AOÛT", "SEPT.", "OCT.", "NOV.", "DÉC."];
const DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

const d = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);

export const monthUpper = (iso: string) => MONTHS_UP[d(iso).getUTCMonth()];
export const weekday = (iso: string) => DAYS[d(iso).getUTCDay()];

/** « 2 nov. » */
export function shortDate(iso: string) {
  const x = d(iso);
  return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`;
}

/** « lun. 2 nov. » ou « Lun. 2 nov. » */
export function dayLabel(iso: string, capital = false) {
  const s = `${weekday(iso)} ${shortDate(iso)}`;
  return capital ? s[0].toUpperCase() + s.slice(1) : s;
}

/** « 2 – 5 nov. », « 28 nov. – 2 déc. », avec l'année si demandée */
export function dateRange(start: string, end: string, withYear = false) {
  const a = d(start);
  const b = d(end);
  const year = withYear ? ` ${b.getUTCFullYear()}` : "";
  if (start === end) return `${shortDate(start)}${year}`;
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
    return `${a.getUTCDate()} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}${year}`;
  }
  return `${shortDate(start)} – ${shortDate(end)}${year}`;
}

/** « 2–5 » pour la pastille de date */
export function dayNumbers(start: string, end: string) {
  const a = d(start);
  const b = d(end);
  return a.getUTCMonth() === b.getUTCMonth() ? (start === end ? `${a.getUTCDate()}` : `${a.getUTCDate()}–${b.getUTCDate()}`) : `${a.getUTCDate()}+`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(iso: string, from = todayIso()) {
  return Math.round((d(iso).getTime() - d(from).getTime()) / 86_400_000);
}

export function eventDayCount(start: string, end: string) {
  return daysUntil(end, start) + 1;
}

export function listDays(start: string, end: string): string[] {
  const out: string[] = [];
  for (let x = d(start); x <= d(end); x.setUTCDate(x.getUTCDate() + 1)) out.push(x.toISOString().slice(0, 10));
  return out;
}

export function addDays(iso: string, n: number) {
  const x = d(iso);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

/** Lundi suivant une date (jour de paie). */
export function nextMonday(iso = todayIso()) {
  const x = d(iso);
  const delta = ((8 - x.getUTCDay()) % 7) || 7;
  return addDays(iso, delta);
}

/** « 2026-10 » → « octobre 2026 » */
export function monthLabel(ym: string) {
  return new Date(`${ym}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

export function longDateTime(date: Date) {
  return date.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
}

export function longDate(date: Date | string) {
  return new Date(date).toLocaleDateString("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });
}
