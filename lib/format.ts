import { LOCALES, type Lang } from "@/lib/i18n/config";

// L'espace fine insécable (U+202F) d'Intl est presque invisible dans Onest : espace insécable classique.
const nbsp = (s: string) => s.replace(/ /g, " ");

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const DAYS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

const d = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);

/**
 * Formats d'affichage dans une langue (montants, heures, dates).
 * Les exports nommés plus bas sont la version française, utilisée par l'admin, les services et les e-mails internes.
 */
export function fmt(lang: Lang) {
  const locale = LOCALES[lang];
  const euroFmt = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const euroCentsFmt = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
  const monthShort = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
  const dayShort = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  const month = (x: Date) => (lang === "fr" ? MONTHS[x.getUTCMonth()] : monthShort.format(x).replace(/\.$/, ""));
  const num = (n: number, digits = 0) => n.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: 2 });

  const shortDate = (iso: string) => {
    const x = d(iso);
    return `${x.getUTCDate()} ${month(x)}`;
  };
  const weekday = (iso: string) => (lang === "fr" ? DAYS[d(iso).getUTCDay()] : dayShort.format(d(iso)).replace(/\.$/, ""));

  return {
    lang,
    locale,
    /** 290304 → « 2 903 € » / « €2,903 » */
    euros: (cents: number) => nbsp(euroFmt.format(Math.round(cents / 100))),
    eurosPrecise: (cents: number) => nbsp(euroCentsFmt.format(cents / 100)),
    /** « 09:00 » → « 9 h » (fr) ou « 9:00 » */
    timeLabel(t: string) {
      const [h, m] = t.split(":").map(Number);
      if (lang !== "fr") return `${h}:${String(m).padStart(2, "0")}`;
      return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
    },
    /** 3100 → « 31 €/h » / « €31/h » */
    hourly: (cents: number) => {
      const v = num(cents / 100, Number.isInteger(cents / 100) ? 0 : 2);
      return lang === "en" ? `€${v}/h` : `${v} €/h`;
    },
    percent: (bps: number) => (lang === "en" ? `${num(bps / 100)}%` : `${num(bps / 100)} %`),
    rating: (x10: number) => (x10 / 10).toLocaleString(locale, { minimumFractionDigits: 1 }),
    /** 480 → « 8 h », 450 → « 7 h 30 » */
    hoursLabel(minutes: number) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
    },
    monthUpper: (iso: string) => month(d(iso)).toUpperCase(),
    weekday,
    /** « 2 nov. » / « 2 Nov » */
    shortDate,
    /** « lun. 2 nov. » ou « Lun. 2 nov. » */
    dayLabel(iso: string, capital = false) {
      const s = `${weekday(iso)} ${shortDate(iso)}`;
      return capital ? s[0].toUpperCase() + s.slice(1) : s;
    },
    /** « 2 – 5 nov. », « 28 nov. – 2 déc. », avec l'année si demandée */
    dateRange(start: string, end: string, withYear = false) {
      const a = d(start);
      const b = d(end);
      const year = withYear ? ` ${b.getUTCFullYear()}` : "";
      if (start === end) return `${shortDate(start)}${year}`;
      if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
        return `${a.getUTCDate()} – ${b.getUTCDate()} ${month(b)}${year}`;
      }
      return `${shortDate(start)} – ${shortDate(end)}${year}`;
    },
    /** « 2026-10 » → « octobre 2026 » */
    monthLabel: (ym: string) => new Date(`${ym}-01T12:00:00Z`).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
    longDateTime: (date: Date) => date.toLocaleString(locale, { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }),
    /** « 1er décembre 2026 », « 1 December 2026 », « 1 de diciembre de 2026 » */
    longDate(date: Date | string) {
      const s = new Date(date).toLocaleDateString(locale, { dateStyle: "long", timeZone: "Europe/Paris" });
      return lang === "fr" ? s.replace(/^1 /, "1er ") : s;
    },
  };
}

export type Formatters = ReturnType<typeof fmt>;

const fr = fmt("fr");
export const {
  euros,
  eurosPrecise,
  timeLabel,
  hourly,
  percent,
  rating,
  hoursLabel,
  monthUpper,
  weekday,
  shortDate,
  dayLabel,
  dateRange,
  monthLabel,
  longDateTime,
  longDate,
} = fr;

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

export function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}
