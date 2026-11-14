import { ROLES, type RoleKey } from "@/lib/domain";
import type { Lang } from "../config";
import { domainLabels } from "./domain";
import { translateFeedback } from "./feedback";

// Factures, avoirs et autofactures. Le document reste en français (texte qui fait foi) ;
// pour un lecteur anglais ou espagnol, la traduction s'affiche sous chaque mention.
const doc = (o: {
  invoice: string;
  creditNote: string;
  issuedOn: (d: string) => string;
  issuedOnM: (d: string) => string;
  client: string;
  supplier: string;
  noAddress: string;
  service: (what: string) => string;
  standTeam: string;
  ref: (r: string) => string;
  designation: string;
  detail: string;
  reason: string;
  amountHt: string;
  totalHt: string;
  vat: (pct: string) => string;
  totalTtc: string;
  netAfter: string;
  creditOn: (n: string) => string;
  creditOnInvoice: (n: string, d: string) => string;
  due: (d: string) => string;
  penalties: string;
  recovery: string;
  refund: { aucun: string; en_cours: string; rembourse: string; echoue: string };
  selfBilling: string;
  issuedBy: (name: string) => string;
  mandate: string;
  mandateAccepted: (d: string) => string;
  cgi: string;
  vatExempt: string;
  payment: (net: string) => string;
  paidOn: (d: string) => string;
  plannedOn: (d: string) => string;
  commission: (c: string) => string;
  soleTrader: string;
  error: string;
  report: string;
  errorAfter: string;
  back: string;
  print: string;
}) => o;

export const invoiceDocs = {
  fr: doc({
    invoice: "Facture",
    creditNote: "Avoir",
    issuedOn: (d) => `Émise le ${d}`,
    issuedOnM: (d) => `Émis le ${d}`,
    client: "Client",
    supplier: "Prestataire",
    noAddress: "[adresse de facturation non renseignée]",
    service: (what) => `Prestation : ${what}`,
    standTeam: "équipe de stand",
    ref: (r) => `réf. ${r}`,
    designation: "Désignation",
    detail: "Détail",
    reason: "Motif",
    amountHt: "Montant HT",
    totalHt: "Total HT",
    vat: (pct) => `TVA ${pct}`,
    totalTtc: "Total TTC",
    netAfter: "Net après avoirs",
    creditOn: (n) => `Avoir sur facture ${n}`,
    creditOnInvoice: (n, d) => `Avoir sur la facture ${n} du ${d}`,
    due: (d) => `Échéance : ${d}, règlement par prélèvement automatique sur le moyen de paiement enregistré.`,
    penalties: "Pénalités de retard :",
    recovery: "indemnité forfaitaire de recouvrement : 40 € (art. D. 441-5 du Code de commerce).",
    refund: {
      aucun: "Montant déduit du prélèvement de la facture.",
      en_cours: "Remboursement en cours sur le moyen de paiement utilisé pour la facture.",
      rembourse: "Remboursé sur le moyen de paiement utilisé pour la facture.",
      echoue: "Remboursement en cours de traitement par l’équipe Stand-By.",
    },
    selfBilling: "Autofacturation",
    issuedBy: (name) => `Facture établie par [raison sociale] au nom et pour le compte de ${name}, en application du `,
    mandate: "mandat de facturation",
    mandateAccepted: (d) => ` accepté le ${d}`,
    cgi: " (art. 289 I-2 du CGI).",
    vatExempt: "TVA non applicable, art. 293 B du CGI",
    payment: (net) => `Règlement par virement de ${net}`,
    paidOn: (d) => `, effectué le ${d}`,
    plannedOn: (d) => `, prévu le lundi ${d}`,
    commission: (c) => `, après retenue de la commission de la plateforme (${c}), facturée séparément`,
    soleTrader: "Entrepreneur individuel",
    error: "Une erreur sur cette facture ? ",
    report: "Signalez-la",
    errorAfter: " sous 15 jours, comme prévu par le mandat.",
    back: "Retour",
    print: "Imprimer ou enregistrer en PDF",
  }),
  en: doc({
    invoice: "Invoice",
    creditNote: "Credit note",
    issuedOn: (d) => `Issued on ${d}`,
    issuedOnM: (d) => `Issued on ${d}`,
    client: "Customer",
    supplier: "Supplier",
    noAddress: "[billing address not provided]",
    service: (what) => `Service: ${what}`,
    standTeam: "booth team",
    ref: (r) => `ref. ${r}`,
    designation: "Description",
    detail: "Details",
    reason: "Reason",
    amountHt: "Amount excl. VAT",
    totalHt: "Total excl. VAT",
    vat: (pct) => `VAT ${pct}`,
    totalTtc: "Total incl. VAT",
    netAfter: "Net after credit notes",
    creditOn: (n) => `Credit note on invoice ${n}`,
    creditOnInvoice: (n, d) => `Credit note on invoice ${n} of ${d}`,
    due: (d) => `Due date: ${d}, paid by automatic debit from the registered payment method.`,
    penalties: "Late payment penalties:",
    recovery: "fixed recovery fee: €40 (art. D. 441-5 of the French Commercial Code).",
    refund: {
      aucun: "Amount deducted from the invoice debit.",
      en_cours: "Refund in progress to the payment method used for the invoice.",
      rembourse: "Refunded to the payment method used for the invoice.",
      echoue: "Refund being handled by the Stand-By team.",
    },
    selfBilling: "Self-billing",
    issuedBy: (name) => `Invoice drawn up by [company name] in the name and on behalf of ${name}, under the `,
    mandate: "billing mandate",
    mandateAccepted: (d) => ` accepted on ${d}`,
    cgi: " (art. 289 I-2 of the French Tax Code).",
    vatExempt: "VAT not applicable, art. 293 B of the French Tax Code",
    payment: (net) => `Paid by bank transfer of ${net}`,
    paidOn: (d) => `, made on ${d}`,
    plannedOn: (d) => `, scheduled for Monday ${d}`,
    commission: (c) => `, after deduction of the platform commission (${c}), invoiced separately`,
    soleTrader: "Sole trader",
    error: "An error on this invoice? ",
    report: "Report it",
    errorAfter: " within 15 days, as provided for in the mandate.",
    back: "Back",
    print: "Print or save as PDF",
  }),
  es: doc({
    invoice: "Factura",
    creditNote: "Factura rectificativa",
    issuedOn: (d) => `Emitida el ${d}`,
    issuedOnM: (d) => `Emitida el ${d}`,
    client: "Cliente",
    supplier: "Proveedor",
    noAddress: "[dirección de facturación no indicada]",
    service: (what) => `Servicio: ${what}`,
    standTeam: "equipo de stand",
    ref: (r) => `ref. ${r}`,
    designation: "Concepto",
    detail: "Detalle",
    reason: "Motivo",
    amountHt: "Importe sin IVA",
    totalHt: "Total sin IVA",
    vat: (pct) => `IVA ${pct}`,
    totalTtc: "Total con IVA",
    netAfter: "Neto tras rectificativas",
    creditOn: (n) => `Rectificativa de la factura ${n}`,
    creditOnInvoice: (n, d) => `Rectificativa de la factura ${n} del ${d}`,
    due: (d) => `Vencimiento: ${d}, pago mediante cargo automático en el medio de pago registrado.`,
    penalties: "Penalizaciones por demora:",
    recovery: "indemnización fija por gastos de cobro: 40 € (art. D. 441-5 del Código de Comercio francés).",
    refund: {
      aucun: "Importe descontado del cargo de la factura.",
      en_cours: "Reembolso en curso en el medio de pago utilizado para la factura.",
      rembourse: "Reembolsado en el medio de pago utilizado para la factura.",
      echoue: "Reembolso en tramitación por el equipo Stand-By.",
    },
    selfBilling: "Autofacturación",
    issuedBy: (name) => `Factura emitida por [razón social] en nombre y por cuenta de ${name}, en aplicación del `,
    mandate: "mandato de facturación",
    mandateAccepted: (d) => ` aceptado el ${d}`,
    cgi: " (art. 289 I-2 del Código General de Impuestos francés).",
    vatExempt: "IVA no aplicable, art. 293 B del Código General de Impuestos francés",
    payment: (net) => `Pago por transferencia de ${net}`,
    paidOn: (d) => `, realizada el ${d}`,
    plannedOn: (d) => `, prevista el lunes ${d}`,
    commission: (c) => `, tras la retención de la comisión de la plataforma (${c}), facturada por separado`,
    soleTrader: "Empresario individual",
    error: "¿Un error en esta factura? ",
    report: "Comuníquelo",
    errorAfter: " en un plazo de 15 días, como prevé el mandato.",
    back: "Volver",
    print: "Imprimir o guardar en PDF",
  }),
};
export type InvoiceDoc = (typeof invoiceDocs)["fr"];

const roleByShort = (v: string) => (Object.keys(ROLES) as RoleKey[]).find((k) => ROLES[k].short === v);
const roleByLabel = (v: string) => (Object.keys(ROLES) as RoleKey[]).find((k) => ROLES[k].label === v);

/** Désignation ou détail d'une ligne de facture (texte français enregistré) → traduction ; null si rien à traduire. */
export function translateInvoiceText(fr: string, lang: Lang): string | null {
  if (lang === "fr" || !fr) return null;
  const en = lang === "en";
  const dl = domainLabels(lang);
  let m: RegExpMatchArray | null;
  if ((m = fr.match(/^(\d+) × (.+)$/))) {
    const k = roleByShort(m[2]);
    return k ? `${m[1]} × ${dl.role(k).short}` : null;
  }
  if ((m = fr.match(/^([\d  ,]+) h validées$/))) return en ? `${m[1]} h approved` : `${m[1]} h validadas`;
  if ((m = fr.match(/^Frais de service \((.+) %\)$/))) return en ? `Service fee (${m[1]}%)` : `Gastos de servicio (${m[1]} %)`;
  if (fr === "Frais de service") return en ? "Service fee" : "Gastos de servicio";
  if ((m = fr.match(/^Frais d’annulation \((.+) %\)$/))) return en ? `Cancellation fee (${m[1]}%)` : `Gastos de cancelación (${m[1]} %)`;
  if ((m = fr.match(/^(\d+) personne\(s\) engagée\(s\) · annulation (.+)$/))) {
    const when = translateFeedback(m[2], lang);
    return en ? `${m[1]} person(s) committed · cancellation ${when}` : `${m[1]} persona(s) comprometida(s) · cancelación ${when}`;
  }
  // autofactures
  if ((m = fr.match(/^Indemnité d’annulation · (.+)$/))) return en ? `Cancellation compensation · ${m[1]}` : `Indemnización por cancelación · ${m[1]}`;
  if ((m = fr.match(/^(.+?) · (.+)$/)) && roleByLabel(m[1])) return `${dl.role(roleByLabel(m[1])!).label} · ${m[2]}`;
  if ((m = fr.match(/^(.+) validées × (.+) · réservation (.+)$/)))
    return en ? `${m[1]} approved × ${m[2]} · booking ${m[3]}` : `${m[1]} validadas × ${m[2]} · reserva ${m[3]}`;
  if ((m = fr.match(/^Réservation (\S+) annulée par l’exposant(?: (.+) : ([\d.,]+) % de la rémunération prévue)?$/))) {
    const when = m[2] ? translateFeedback(m[2], lang) : "";
    if (en) return `Booking ${m[1]} cancelled by the exhibitor${m[2] ? ` ${when}: ${m[3]}% of the planned pay` : ""}`;
    return `Reserva ${m[1]} cancelada por el expositor${m[2] ? ` ${when}: ${m[3]} % de la remuneración prevista` : ""}`;
  }
  return null;
}
