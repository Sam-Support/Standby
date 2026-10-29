import type { Lang } from "../config";
import { ROLES, type RoleKey } from "@/lib/domain";

// Libellés métier. Les valeurs enregistrées en base restent les clés françaises (langues, spécialités, effectifs…).

type Role = { label: string; short: string; plural: string; desc: string };

const ROLE_LABELS: Record<"en" | "es", Record<RoleKey, Role>> = {
  en: {
    commercial: { label: "Booth sales rep", short: "Sales rep", plural: "sales reps", desc: "pitch, lead qualification" },
    accueil: { label: "Booth host", short: "Host", plural: "hosts", desc: "welcome, badges, directions" },
    interprete: { label: "Interpreter", short: "Interpreter", plural: "interpreters", desc: "FR ↔ EN, ES, DE, ZH" },
    chef: {
      label: "Booth manager",
      short: "Booth manager",
      plural: "booth managers",
      desc: "runs the team on site: morning briefing, schedule and breaks, key visitors, set-up and dismantling, exhibitor check-ins, end-of-day reporting",
    },
    animateur: { label: "Event host", short: "Animation", plural: "event hosts", desc: "microphone, games, crowd flow" },
    demonstrateur: { label: "Product demonstrator", short: "Product demo", plural: "demonstrators", desc: "demos, tastings, sales" },
  },
  es: {
    commercial: { label: "Comercial de stand", short: "Comercial", plural: "comerciales", desc: "pitch, cualificación de leads" },
    accueil: { label: "Azafata/o de stand", short: "Recepción", plural: "azafatas", desc: "recepción, acreditaciones, orientación" },
    interprete: { label: "Intérprete", short: "Intérprete", plural: "intérpretes", desc: "FR ↔ EN, ES, DE, ZH" },
    chef: {
      label: "Jefe/a de stand",
      short: "Jefe de stand",
      plural: "jefes de stand",
      desc: "dirige el equipo in situ: briefing matinal, turnos y pausas, visitantes clave, montaje y desmontaje, seguimiento con el expositor, informe diario",
    },
    animateur: { label: "Animador/a", short: "Animación", plural: "animadores", desc: "micrófono, juegos, animación de público" },
    demonstrateur: { label: "Demostrador/a de producto", short: "Demo producto", plural: "demostradores", desc: "demostraciones, degustaciones, venta" },
  },
};

const LANGUAGE_NAMES: Record<string, { en: string; es: string }> = {
  Français: { en: "French", es: "Francés" },
  Anglais: { en: "English", es: "Inglés" },
  Espagnol: { en: "Spanish", es: "Español" },
  Allemand: { en: "German", es: "Alemán" },
  Italien: { en: "Italian", es: "Italiano" },
  Mandarin: { en: "Mandarin", es: "Mandarín" },
  Arabe: { en: "Arabic", es: "Árabe" },
};

const SPECIALTY_NAMES: Record<string, { en: string; es: string }> = {
  "Tech & SaaS": { en: "Tech & SaaS", es: "Tecnología y SaaS" },
  Retail: { en: "Retail", es: "Retail" },
  Industrie: { en: "Industry", es: "Industria" },
  "Mobilité & logistique": { en: "Mobility & logistics", es: "Movilidad y logística" },
  "Énergie & environnement": { en: "Energy & environment", es: "Energía y medio ambiente" },
  Santé: { en: "Healthcare", es: "Salud" },
  "Immobilier & bâtiment": { en: "Real estate & construction", es: "Inmobiliario y construcción" },
  "Agro & restauration": { en: "Food & hospitality", es: "Agroalimentación y restauración" },
  "Mode & luxe": { en: "Fashion & luxury", es: "Moda y lujo" },
  "Marketing & événementiel": { en: "Marketing & events", es: "Marketing y eventos" },
  "RH & formation": { en: "HR & training", es: "RR. HH. y formación" },
  "Secteur public": { en: "Public sector", es: "Sector público" },
  "Maison & grand public": { en: "Home & consumer", es: "Hogar y gran público" },
};

const SIZES: Record<string, { en: string; es: string }> = {
  "1–9 salariés": { en: "1–9 employees", es: "1–9 empleados" },
  "10–49 salariés": { en: "10–49 employees", es: "10–49 empleados" },
  "50–249 salariés": { en: "50–249 employees", es: "50–249 empleados" },
  "250–4 999 salariés": { en: "250–4,999 employees", es: "250–4.999 empleados" },
  "5 000 salariés et plus": { en: "5,000 employees or more", es: "5.000 empleados o más" },
};

// colonnes de la fiche standard (affichage seulement : les fichiers gardent les en-têtes français)
const LEAD_COLUMNS: Record<string, { en: string; es: string }> = {
  Nom: { en: "Last name", es: "Apellidos" },
  Prénom: { en: "First name", es: "Nombre" },
  Société: { en: "Company", es: "Empresa" },
  Fonction: { en: "Job title", es: "Cargo" },
  Email: { en: "Email", es: "Email" },
  Téléphone: { en: "Phone", es: "Teléfono" },
  Ville: { en: "City", es: "Ciudad" },
  "Produit d’intérêt": { en: "Product of interest", es: "Producto de interés" },
  "Niveau d’intérêt": { en: "Interest level", es: "Nivel de interés" },
  Note: { en: "Note", es: "Nota" },
  "Date du contact": { en: "Contact date", es: "Fecha del contacto" },
  Consentement: { en: "Consent", es: "Consentimiento" },
};

type Tone = "" | "ok" | "warn" | "info";
const BOOKING_STATUS: Record<string, { fr: string; en: string; es: string; tone: Tone }> = {
  brouillon: { fr: "Brouillon", en: "Draft", es: "Borrador", tone: "" },
  envoyee: { fr: "Acceptations en cours", en: "Awaiting acceptances", es: "Aceptaciones pendientes", tone: "warn" },
  partielle: { fr: "Acceptations en cours", en: "Awaiting acceptances", es: "Aceptaciones pendientes", tone: "warn" },
  confirmee: { fr: "Confirmée", en: "Confirmed", es: "Confirmada", tone: "ok" },
  en_cours: { fr: "En cours", en: "In progress", es: "En curso", tone: "info" },
  heures_a_valider: { fr: "Heures à valider", en: "Hours to approve", es: "Horas por validar", tone: "info" },
  validee: { fr: "Heures validées", en: "Hours approved", es: "Horas validadas", tone: "ok" },
  payee: { fr: "Payée", en: "Paid", es: "Pagada", tone: "ok" },
  annulee: { fr: "Annulée", en: "Cancelled", es: "Cancelada", tone: "" },
};
const ASSIGNMENT_STATUS: Record<string, { fr: string; en: string; es: string; tone: Tone }> = {
  selectionne: { fr: "Sélectionné", en: "Selected", es: "Seleccionado", tone: "info" },
  proposee: { fr: "En attente", en: "Pending", es: "Pendiente", tone: "warn" },
  acceptee: { fr: "Acceptée", en: "Accepted", es: "Aceptada", tone: "ok" },
  refusee: { fr: "Refusée", en: "Declined", es: "Rechazada", tone: "" },
  expiree: { fr: "Expirée", en: "Expired", es: "Caducada", tone: "" },
  annulee: { fr: "Annulée", en: "Cancelled", es: "Cancelada", tone: "" },
  desistee: { fr: "Désisté·e", en: "Withdrew", es: "Se retiró", tone: "" },
};

const OUTFITS = {
  fr: { exposant: "Prêtée par l’exposant", perso: "Tenue perso noir & blanc", standby: "Tenue Standby" },
  en: { exposant: "Provided by the exhibitor", perso: "Own black & white outfit", standby: "Standby outfit" },
  es: { exposant: "Prestada por el expositor", perso: "Ropa propia en blanco y negro", standby: "Uniforme Standby" },
};
const DOCUMENTS = {
  fr: { identite: "Pièce d’identité", urssaf: "Attestation URSSAF", siret: "Avis de situation SIRENE (SIRET)", rib: "RIB" },
  en: { identite: "ID document", urssaf: "URSSAF certificate", siret: "SIRENE registration notice (SIRET)", rib: "Bank details (RIB)" },
  es: { identite: "Documento de identidad", urssaf: "Certificado URSSAF", siret: "Certificado SIRENE (SIRET)", rib: "Datos bancarios (RIB)" },
};
const VAT = {
  fr: { franchise: "Franchise en base de TVA (auto-entrepreneur)", assujetti: "Assujetti·e à la TVA" },
  en: { franchise: "VAT-exempt small business (auto-entrepreneur)", assujetti: "VAT-registered" },
  es: { franchise: "Exento de IVA (auto-entrepreneur)", assujetti: "Sujeto a IVA" },
};

/** Libellés métier dans une langue. */
export function domainLabels(lang: Lang) {
  const pick = (table: Record<string, { en: string; es: string }>, v: string) => (lang === "fr" ? v : (table[v]?.[lang] ?? v));
  const role = (k: string): Role => (lang === "fr" ? ROLES[k as RoleKey] : ROLE_LABELS[lang][k as RoleKey]) ?? { label: k, short: k, plural: k, desc: "" };
  return {
    role,
    language: (v: string) => pick(LANGUAGE_NAMES, v),
    specialty: (v: string) => pick(SPECIALTY_NAMES, v),
    size: (v: string) => pick(SIZES, v),
    leadColumn: (v: string) => pick(LEAD_COLUMNS, v),
    outfit: (k: string) => OUTFITS[lang][k as keyof (typeof OUTFITS)["fr"]] ?? k,
    document: (k: string) => DOCUMENTS[lang][k as keyof (typeof DOCUMENTS)["fr"]] ?? k,
    vatRegime: (k: string) => VAT[lang][k as keyof (typeof VAT)["fr"]] ?? k,
    bookingStatus: (k: string) => ({ label: BOOKING_STATUS[k]?.[lang] ?? k, tone: BOOKING_STATUS[k]?.tone ?? ("" as Tone) }),
    assignmentStatus: (k: string) => ({ label: ASSIGNMENT_STATUS[k]?.[lang] ?? k, tone: ASSIGNMENT_STATUS[k]?.tone ?? ("" as Tone) }),
  };
}
export type DomainLabels = ReturnType<typeof domainLabels>;
