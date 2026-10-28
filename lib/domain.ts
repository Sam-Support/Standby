// Référentiels métier repris du design.

export type RoleKey = "commercial" | "accueil" | "interprete" | "chef" | "animateur" | "demonstrateur";

export const ROLES: Record<
  RoleKey,
  { label: string; short: string; plural: string; desc: string; color: string; rare: boolean }
> = {
  commercial: {
    label: "Commercial·e de stand",
    short: "Commercial",
    plural: "commerciaux",
    desc: "pitch, qualification de leads",
    color: "#4D58EE",
    rare: false,
  },
  accueil: {
    label: "Hôte·sse d’accueil",
    short: "Accueil",
    plural: "accueil",
    desc: "accueil, badges, orientation",
    color: "#FF8CB6",
    rare: false,
  },
  interprete: {
    label: "Interprète",
    short: "Interprète",
    plural: "interprètes",
    desc: "FR ↔ EN, ES, DE, ZH",
    color: "#B39BFF",
    rare: false,
  },
  chef: {
    label: "Chef·fe de stand",
    short: "Chef de stand",
    plural: "chefs de stand",
    desc: "pilote l’équipe sur place : briefing du matin, planning et pauses, accueil des visiteurs clés, montage et démontage, point exposant, reporting de fin de journée",
    color: "#82C9FF",
    rare: true,
  },
  animateur: {
    label: "Animateur·rice",
    short: "Animation",
    plural: "animateurs",
    desc: "micro, jeux, animation de flux",
    color: "#FFCD4A",
    rare: true,
  },
  demonstrateur: {
    label: "Démonstrateur·rice produit",
    short: "Démo produit",
    plural: "démonstrateurs",
    desc: "démonstration, dégustation, vente",
    color: "#68D1A4",
    rare: true,
  },
};

export const ROLE_KEYS = Object.keys(ROLES) as RoleKey[];
// Ordre d'affichage du formulaire d'inscription commercial·e
export const SIGNUP_ROLE_ORDER: RoleKey[] = ["chef", "commercial", "accueil", "animateur", "demonstrateur", "interprete"];

export function isRoleKey(v: string): v is RoleKey {
  return v in ROLES;
}

export const LANGUAGES = ["Français", "Anglais", "Espagnol", "Allemand", "Italien", "Mandarin", "Arabe"];
export const LANGUAGE_CODES: Record<string, string> = {
  Français: "FR",
  Anglais: "EN",
  Espagnol: "ES",
  Allemand: "DE",
  Italien: "IT",
  Mandarin: "ZH",
  Arabe: "AR",
};
export function languageCode(lang: string) {
  return LANGUAGE_CODES[lang] ?? lang.slice(0, 2).toUpperCase();
}

export const SPECIALTIES = [
  "Tech & SaaS",
  "Retail",
  "Industrie",
  "Mobilité & logistique",
  "Énergie & environnement",
  "Santé",
  "Immobilier & bâtiment",
  "Agro & restauration",
  "Mode & luxe",
  "Marketing & événementiel",
  "RH & formation",
  "Secteur public",
  "Maison & grand public",
];

export const COMPANY_SIZES = ["1–9 salariés", "10–49 salariés", "50–249 salariés", "250–4 999 salariés", "5 000 salariés et plus"];

export const OUTFITS = {
  exposant: "Prêtée par l’exposant",
  perso: "Tenue perso noir & blanc",
  standby: "Tenue Standby",
} as const;
export type OutfitKey = keyof typeof OUTFITS;

// Fiche standard Standby : 12 colonnes
export const STANDARD_LEAD_COLUMNS = [
  "Nom",
  "Prénom",
  "Société",
  "Fonction",
  "Email",
  "Téléphone",
  "Ville",
  "Produit d’intérêt",
  "Niveau d’intérêt",
  "Note",
  "Date du contact",
  "Consentement",
];

// Champs importés dans HubSpot (libellé affiché → propriété HubSpot)
export const HUBSPOT_FIELDS: { label: string; property: string }[] = [
  { label: "First name", property: "firstname" },
  { label: "Last name", property: "lastname" },
  { label: "Company name", property: "company" },
  { label: "Job title", property: "jobtitle" },
  { label: "Email", property: "email" },
  { label: "Phone number", property: "phone" },
  { label: "Lead status", property: "hs_lead_status" },
  { label: "Notes", property: "message" },
];

export const DOCUMENT_TYPES = {
  identite: "Pièce d’identité",
  urssaf: "Attestation URSSAF",
  siret: "Avis de situation SIRENE (SIRET)",
  rib: "RIB",
} as const;
export type DocumentKey = keyof typeof DOCUMENT_TYPES;

export const BOOKING_STATUS_LABELS: Record<string, { label: string; tone: "" | "ok" | "warn" | "info" }> = {
  brouillon: { label: "Brouillon", tone: "" },
  envoyee: { label: "Acceptations en cours", tone: "warn" },
  partielle: { label: "Acceptations en cours", tone: "warn" },
  confirmee: { label: "Confirmée", tone: "ok" },
  en_cours: { label: "En cours", tone: "info" },
  heures_a_valider: { label: "Heures à valider", tone: "info" },
  validee: { label: "Heures validées", tone: "ok" },
  payee: { label: "Payée", tone: "ok" },
  annulee: { label: "Annulée", tone: "" },
};

export const ASSIGNMENT_STATUS_LABELS: Record<string, { label: string; tone: "" | "ok" | "warn" | "info" }> = {
  selectionne: { label: "Sélectionné", tone: "info" },
  proposee: { label: "En attente", tone: "warn" },
  acceptee: { label: "Acceptée", tone: "ok" },
  refusee: { label: "Refusée", tone: "" },
  expiree: { label: "Expirée", tone: "" },
  annulee: { label: "Annulée", tone: "" },
  desistee: { label: "Désisté·e", tone: "" },
};

// Réglages versionnés (valeurs entières : points de base pour les %, centimes pour les montants, jours)
export const PRICING_DEFAULTS: Record<string, { value: number; label: string; unit: "bps" | "cents" | "days" }> = {
  service_fee_bps: { value: 1200, label: "Frais de service exposant", unit: "bps" },
  freelancer_commission_bps: { value: 0, label: "Commission prélevée sur les commerciaux", unit: "bps" },
  vat_bps: { value: 2000, label: "TVA", unit: "bps" },
  outfit_standby_cents: { value: 300, label: "Majoration tenue Standby (par heure et par personne)", unit: "cents" },
  "floor:commercial": { value: 2700, label: "Tarif plancher · Commercial·e de stand", unit: "cents" },
  "floor:accueil": { value: 1900, label: "Tarif plancher · Hôte·sse d’accueil", unit: "cents" },
  "floor:interprete": { value: 3400, label: "Tarif plancher · Interprète", unit: "cents" },
  "floor:chef": { value: 3600, label: "Tarif plancher · Chef·fe de stand", unit: "cents" },
  "floor:animateur": { value: 2300, label: "Tarif plancher · Animateur·rice", unit: "cents" },
  "floor:demonstrateur": { value: 2500, label: "Tarif plancher · Démonstrateur·rice produit", unit: "cents" },
  // Barème d'annulation (selon le nombre de jours avant le premier jour réservé)
  cancel_free_days: { value: 14, label: "Annulation gratuite à partir de (jours avant le 1er jour)", unit: "days" },
  cancel_tier1_days: { value: 7, label: "Palier 1 : à partir de (jours avant)", unit: "days" },
  cancel_tier1_bps: { value: 3000, label: "Palier 1 : frais d’annulation", unit: "bps" },
  cancel_tier2_days: { value: 2, label: "Palier 2 : à partir de (jours avant)", unit: "days" },
  cancel_tier2_bps: { value: 5000, label: "Palier 2 : frais d’annulation", unit: "bps" },
  cancel_last_bps: { value: 10000, label: "Dernière minute (ou événement commencé) : frais d’annulation", unit: "bps" },
  // RGPD
  leads_retention_days: { value: 365, label: "Conservation des leads après réception", unit: "days" },
};

// Autofacturation : version du mandat en vigueur (à changer si le texte de /mandat-facturation change)
export const BILLING_MANDATE_VERSION = "2026-10";
export const VAT_REGIMES = {
  franchise: "Franchise en base de TVA (auto-entrepreneur)",
  assujetti: "Assujetti·e à la TVA",
} as const;
export type VatRegime = keyof typeof VAT_REGIMES;

export const AVATAR_COLORS = ["#82C9FF", "#B39BFF", "#FF8CB6", "#FFCD4A", "#68D1A4", "#4D58EE"];
