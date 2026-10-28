import { and, count, desc, eq, gte, isNull, lt } from "drizzle-orm";
import type { Db } from "@/db";
import * as s from "@/db/schema";
import { ROLES, type RoleKey, type VatRegime } from "@/lib/domain";
import { dateRange, hourly, hoursLabel } from "@/lib/format";
import { notifyAdmins } from "@/lib/notify";
import { getPricing } from "@/lib/settings";
import type { CancellationRecord } from "./billing";
import { BookingError } from "./booking";

/**
 * Autofacturation (art. 289 I-2 du CGI) : Standby émet, au nom et pour le compte du commercial et en vertu de son
 * mandat de facturation, une facture par virement (mission ou indemnité d'annulation). Numérotation propre à chaque
 * commercial, coordonnées figées à l'émission. À faire valider par l'expert-comptable.
 */

export type FreelancerInvoice = typeof s.freelancerInvoices.$inferSelect;
export type Supplier = {
  name: string;
  email: string;
  siret: string | null;
  address: string | null;
  legalStatus: string | null;
  vatRegime: VatRegime;
  vatNumber: string | null;
  mandateAcceptedAt: string | null;
  mandateVersion: string | null;
};

/** Série propre au commercial : AF-<8 premiers caractères de son identifiant>-AAAA-NNNN. */
export async function nextSelfBillNumber(db: Db, freelancerId: string, year = new Date().getFullYear()) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(s.freelancerInvoices)
    .where(
      and(
        eq(s.freelancerInvoices.freelancerId, freelancerId),
        gte(s.freelancerInvoices.issuedAt, new Date(`${year}-01-01T00:00:00Z`)),
        lt(s.freelancerInvoices.issuedAt, new Date(`${year + 1}-01-01T00:00:00Z`)),
      ),
    );
  return `AF-${freelancerId.replace(/-/g, "").slice(0, 8).toUpperCase()}-${year}-${String(n + 1).padStart(4, "0")}`;
}

/** Autofacture d'un virement ; reportée (null) tant que le mandat n'est pas accepté. */
export async function issueSelfBill(db: Db, payoutId: string): Promise<FreelancerInvoice | null> {
  const [existing] = await db.select().from(s.freelancerInvoices).where(eq(s.freelancerInvoices.payoutId, payoutId));
  if (existing) return existing;
  const [row] = await db
    .select({ p: s.payouts, a: s.assignments, b: s.bookings, f: s.freelancers, pr: s.profiles, e: s.events })
    .from(s.payouts)
    .innerJoin(s.assignments, eq(s.assignments.id, s.payouts.assignmentId))
    .innerJoin(s.bookings, eq(s.bookings.id, s.assignments.bookingId))
    .innerJoin(s.freelancers, eq(s.freelancers.id, s.payouts.freelancerId))
    .innerJoin(s.profiles, eq(s.profiles.id, s.freelancers.userId))
    .leftJoin(s.events, eq(s.events.id, s.bookings.eventId))
    .where(eq(s.payouts.id, payoutId));
  if (!row) return null;
  const { p, a, b, f, pr, e } = row;
  if (!f.billingMandateAcceptedAt || !f.billingAddress) {
    await notifyAdmins(db, {
      title: "Autofacture en attente",
      body: `${pr.firstName} ${pr.lastName} n’a pas encore accepté le mandat de facturation : la facture de la mission ${b.ref} sera émise dès son acceptation.`,
      link: "/admin/finances",
      email: false,
    });
    return null;
  }

  const gross = p.grossCents ?? p.amountCents;
  const vatBps = p.vatCents > 0 ? (await getPricing(db, b.confirmedAt ?? new Date())).vatBps : 0;
  const where = e ? `${e.name} · ${e.city} · ${dateRange(e.startsOn, e.endsOn, true)}` : `réservation ${b.ref}`;
  let kind: "mission" | "indemnite";
  let label: string;
  let detail: string;
  if (b.status === "annulee") {
    const c = b.cancellation as CancellationRecord | null;
    kind = "indemnite";
    label = `Indemnité d’annulation · ${where}`;
    detail = `Réservation ${b.ref} annulée par l’exposant${c ? ` ${c.label} : ${c.bps / 100} % de la rémunération prévue` : ""}`;
  } else {
    const sheets = await db.select().from(s.timesheets).where(eq(s.timesheets.assignmentId, a.id));
    const minutes = sheets.reduce((n, t) => n + (t.minutesValidated ?? 0), 0);
    kind = "mission";
    label = `${ROLES[a.role as RoleKey]?.label ?? a.role} · ${where}`;
    detail = `${hoursLabel(minutes)} validées × ${hourly(a.hourlyRateCents)} · réservation ${b.ref}`;
  }
  const supplier: Supplier = {
    name: `${pr.firstName} ${pr.lastName}`,
    email: pr.email,
    siret: f.siret,
    address: f.billingAddress,
    legalStatus: f.legalStatus,
    vatRegime: f.vatRegime === "assujetti" ? "assujetti" : "franchise",
    vatNumber: f.vatNumber,
    mandateAcceptedAt: f.billingMandateAcceptedAt.toISOString(),
    mandateVersion: f.billingMandateVersion,
  };
  const [inv] = await db
    .insert(s.freelancerInvoices)
    .values({
      payoutId,
      freelancerId: f.id,
      number: await nextSelfBillNumber(db, f.id),
      kind,
      label,
      detail,
      supplier,
      amountHtCents: gross,
      vatBps,
      vatCents: p.vatCents,
      totalTtcCents: gross + p.vatCents,
      commissionCents: p.commissionCents,
      netCents: p.amountCents,
    })
    .onConflictDoNothing({ target: s.freelancerInvoices.payoutId })
    .returning();
  return inv ?? null;
}

/** Après acceptation du mandat : factures des virements restés sans autofacture. */
export async function issueMissingSelfBills(db: Db, freelancerId: string) {
  const pending = await db
    .select({ id: s.payouts.id })
    .from(s.payouts)
    .leftJoin(s.freelancerInvoices, eq(s.freelancerInvoices.payoutId, s.payouts.id))
    .where(and(eq(s.payouts.freelancerId, freelancerId), isNull(s.freelancerInvoices.id)));
  let n = 0;
  for (const p of pending) if (await issueSelfBill(db, p.id)) n++;
  return n;
}

export type SelfBillRow = { inv: FreelancerInvoice; p: typeof s.payouts.$inferSelect };

/** Autofactures d'un commercial avec leur virement, les plus récentes d'abord (filtrables par année de virement). */
export async function selfBillsFor(db: Db, freelancerId: string, year?: number): Promise<SelfBillRow[]> {
  const rows = await db
    .select({ inv: s.freelancerInvoices, p: s.payouts })
    .from(s.freelancerInvoices)
    .innerJoin(s.payouts, eq(s.payouts.id, s.freelancerInvoices.payoutId))
    .where(eq(s.freelancerInvoices.freelancerId, freelancerId))
    .orderBy(desc(s.payouts.scheduledFor), desc(s.freelancerInvoices.issuedAt));
  return year ? rows.filter((r) => r.p.scheduledFor.startsWith(String(year))) : rows;
}

export type Totals = { count: number; htCents: number; vatCents: number; ttcCents: number; commissionCents: number; netCents: number };

export function totals(rows: SelfBillRow[]): Totals {
  return rows.reduce(
    (t, { inv }) => ({
      count: t.count + 1,
      htCents: t.htCents + inv.amountHtCents,
      vatCents: t.vatCents + inv.vatCents,
      ttcCents: t.ttcCents + inv.totalTtcCents,
      commissionCents: t.commissionCents + inv.commissionCents,
      netCents: t.netCents + inv.netCents,
    }),
    { count: 0, htCents: 0, vatCents: 0, ttcCents: 0, commissionCents: 0, netCents: 0 },
  );
}

/** Mois (AAAA-MM) du virement, base des relevés : les auto-entrepreneurs déclarent à l'encaissement. */
export const payoutMonth = (r: SelfBillRow) => r.p.scheduledFor.slice(0, 7);

/** Récapitulatif annuel par trimestre de virement (mêmes agrégats que la déclaration DAC7 de la plateforme). */
export function yearSummary(rows: SelfBillRow[]) {
  const quarters = [1, 2, 3, 4].map((q) => {
    const mine = rows.filter((r) => Math.ceil(Number(r.p.scheduledFor.slice(5, 7)) / 3) === q);
    return { quarter: q, ...totals(mine) };
  });
  const paid = rows.filter((r) => r.p.status === "transfere");
  return { quarters, all: totals(rows), paid: totals(paid), pending: totals(rows.filter((r) => r.p.status !== "transfere")) };
}

export async function assertSelfBillAccess(db: Db, invoiceId: string, freelancerId: string | null) {
  if (!/^[0-9a-f-]{36}$/.test(invoiceId)) throw new BookingError("Facture introuvable.");
  const [row] = await db
    .select({ inv: s.freelancerInvoices, p: s.payouts })
    .from(s.freelancerInvoices)
    .innerJoin(s.payouts, eq(s.payouts.id, s.freelancerInvoices.payoutId))
    .where(eq(s.freelancerInvoices.id, invoiceId));
  if (!row || (freelancerId && row.inv.freelancerId !== freelancerId)) throw new BookingError("Facture introuvable.");
  return row;
}

/** CSV pour Excel (séparateur point-virgule, BOM UTF-8). */
export function toCsv(rows: (string | number | null)[][]) {
  const cell = (v: string | number | null) => {
    const t = v === null ? "" : String(v);
    return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  return `﻿${rows.map((r) => r.map(cell).join(";")).join("\r\n")}\r\n`;
}

/** Centimes → « 1234,56 » (colonnes numériques des exports). */
export const csvAmount = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
