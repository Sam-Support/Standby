import { RateLimitError } from "@/lib/rate-limit";
import { AccountError } from "@/lib/services/accounts";
import { AdminError } from "@/lib/services/admin";
import { BookingError } from "@/lib/services/booking";
import { UploadError } from "@/lib/storage";

export type FormState = { error?: string; ok?: string };

/** Erreurs métier → message affiché ; le reste est journalisé et masqué. */
export function fail(e: unknown): FormState {
  if (e instanceof BookingError || e instanceof AccountError || e instanceof AdminError || e instanceof UploadError || e instanceof RateLimitError) {
    return { error: e.message };
  }
  console.error(e);
  return { error: "Une erreur est survenue. Réessayez dans un instant ou contactez-nous." };
}

export const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
export const strs = (fd: FormData, key: string) => fd.getAll(key).map((v) => String(v).trim()).filter(Boolean);
export const file = (fd: FormData, key: string) => {
  const v = fd.get(key);
  return v instanceof File && v.size > 0 ? v : null;
};
export const files = (fd: FormData, key: string) => fd.getAll(key).filter((v): v is File => v instanceof File && v.size > 0);

/** « 31 » ou « 31,50 » → centimes */
export function eurosToCents(v: string) {
  const n = Number(v.replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** « 7:30 », « 7h30 », « 7,5 » → minutes */
export function parseHours(v: string): number {
  const t = v.trim().toLowerCase().replace(/\s/g, "");
  if (!t) return NaN;
  const m = t.match(/^(\d{1,2})(?:[:h](\d{1,2}))?$/);
  if (m) return Number(m[1]) * 60 + Number(m[2] ?? 0);
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 60) : NaN;
}

/** Champs du bloc « Facturation » (inscription commercial et profil). */
export function billingFields(fd: FormData) {
  return { billingAddress: str(fd, "billingAddress"), vatRegime: str(fd, "vatRegime"), vatNumber: str(fd, "vatNumber"), acceptMandate: fd.get("acceptMandate") === "on" };
}

export function safeNext(v: string | null | undefined, fallback: string) {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}
