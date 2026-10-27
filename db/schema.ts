import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const textArray = (name: string) => text(name).array().notNull().default(sql`'{}'::text[]`);

export const userRole = pgEnum("user_role", ["exposant", "commercial", "admin"]);
export const eventKind = pgEnum("event_kind", ["salon", "foire"]);
export const leadMode = pgEnum("lead_mode", ["excel", "crm", "standard"]);
export const freelancerStatus = pgEnum("freelancer_status", ["brouillon", "en_revue", "valide", "refuse"]);
export const documentType = pgEnum("document_type", ["identite", "urssaf", "rib", "siret"]);
export const reviewStatus = pgEnum("review_status", ["en_attente", "valide", "refuse"]);
export const outfitMode = pgEnum("outfit_mode", ["exposant", "perso", "standby"]);
export const leadFrequency = pgEnum("lead_frequency", ["quotidien", "fin"]);
export const bookingStatus = pgEnum("booking_status", [
  "brouillon",
  "envoyee",
  "partielle",
  "confirmee",
  "en_cours",
  "heures_a_valider",
  "validee",
  "payee",
  "annulee",
]);
export const assignmentStatus = pgEnum("assignment_status", [
  "selectionne",
  "proposee",
  "acceptee",
  "refusee",
  "expiree",
  "annulee",
]);
export const timesheetStatus = pgEnum("timesheet_status", ["declare", "valide", "conteste"]);
export const paymentStatus = pgEnum("payment_status", ["en_attente", "en_cours", "reussi", "echoue"]);
export const payoutStatus = pgEnum("payout_status", ["planifie", "transfere", "echoue"]);
export const leadSource = pgEnum("lead_source", ["xlsx", "cartes"]);
export const batchStatus = pgEnum("batch_status", ["brouillon", "envoye", "pousse_crm"]);
export const cardStatus = pgEnum("card_status", ["a_saisir", "saisie"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = id du fournisseur d'identité (Supabase Auth ou local)
  email: text("email").notNull().unique(),
  role: userRole("role").notNull(),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  phone: text("phone"),
  createdAt: createdAt(),
});

// Utilisé uniquement par le fournisseur d'identité local (sans Supabase)
export const credentials = pgTable("credentials", {
  userId: uuid("user_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
});

export const passwordResets = pgTable("password_resets", {
  token: text("token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const companies = pgTable("companies", {
  id: id(),
  ownerId: uuid("owner_id").notNull().references(() => profiles.id),
  name: text("name").notNull(),
  siret: text("siret").notNull(),
  siretVerified: boolean("siret_verified").notNull().default(false),
  sector: text("sector"),
  size: text("size"),
  website: text("website"),
  linkedin: text("linkedin"),
  brochurePath: text("brochure_path"),
  brochureName: text("brochure_name"),
  leadMode: leadMode("lead_mode").notNull().default("standard"),
  crmProvider: text("crm_provider"),
  crmAdminEmail: text("crm_admin_email"),
  stripeCustomerId: text("stripe_customer_id"),
  stripePaymentMethodId: text("stripe_payment_method_id"),
  onboardingStep: integer("onboarding_step").notNull().default(1),
  createdAt: createdAt(),
});

export const companyReferents = pgTable("company_referents", {
  id: id(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title"),
  phone: text("phone"),
});

export const leadTemplates = pgTable("lead_templates", {
  id: id(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }), // null = fiche standard Standby
  name: text("name").notNull(),
  columns: textArray("columns"),
  createdAt: createdAt(),
});

export const crmConnections = pgTable("crm_connections", {
  id: id(),
  companyId: uuid("company_id").notNull().unique().references(() => companies.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  status: text("status").notNull().default("en_attente"), // en_attente | connecte | erreur
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  externalAccountId: text("external_account_id"),
  createdAt: createdAt(),
});

export const freelancers = pgTable("freelancers", {
  id: id(),
  userId: uuid("user_id").notNull().unique().references(() => profiles.id, { onDelete: "cascade" }),
  city: text("city").notNull().default(""),
  bio: text("bio"),
  roles: textArray("roles"), // le premier = poste principal
  specialties: textArray("specialties"),
  languages: textArray("languages"),
  hourlyRateCents: integer("hourly_rate_cents").notNull().default(0),
  topSize: text("top_size"),
  pantsSize: text("pants_size"),
  shoeSize: text("shoe_size"),
  siret: text("siret"),
  legalStatus: text("legal_status"),
  status: freelancerStatus("status").notNull().default("brouillon"),
  stripeAccountId: text("stripe_account_id"),
  payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
  ratingX10: integer("rating_x10").notNull().default(0),
  ratingsCount: integer("ratings_count").notNull().default(0),
  missionsCount: integer("missions_count").notNull().default(0),
  acceptRateBps: integer("accept_rate_bps").notNull().default(10000),
  avatarColor: text("avatar_color").notNull().default("#82C9FF"),
  onboardingStep: integer("onboarding_step").notNull().default(1),
  createdAt: createdAt(),
});

export const freelancerDocuments = pgTable(
  "freelancer_documents",
  {
    id: id(),
    freelancerId: uuid("freelancer_id").notNull().references(() => freelancers.id, { onDelete: "cascade" }),
    type: documentType("type").notNull(),
    path: text("path").notNull(),
    filename: text("filename").notNull(),
    status: reviewStatus("status").notNull().default("en_attente"),
    comment: text("comment"),
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("freelancer_documents_type_idx").on(t.freelancerId, t.type)],
);

export const events = pgTable("events", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  kind: eventKind("kind").notNull(),
  city: text("city").notNull(),
  venue: text("venue"),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  setupOn: date("setup_on"),
  sector: text("sector").notNull(), // libellé affiché, ex. « Hôtellerie et restauration »
  specialty: text("specialty"), // spécialité de matching, ex. « Agro & restauration »
  siteUrl: text("site_url"),
  verifiedOn: date("verified_on"),
  logoPath: text("logo_path"),
  logoAuthorized: boolean("logo_authorized").notNull().default(false),
  color: text("color").notNull().default("#FFCD4A"),
  published: boolean("published").notNull().default(true),
  createdAt: createdAt(),
});

export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    ref: text("ref").notNull().unique(),
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id),
    status: bookingStatus("status").notNull().default("brouillon"),
    days: date("days").array().notNull().default(sql`'{}'::date[]`),
    startTime: text("start_time").notNull().default("09:00"),
    endTime: text("end_time").notNull().default("18:00"),
    stand: text("stand"),
    outfit: outfitMode("outfit").notNull().default("exposant"),
    languages: textArray("languages"),
    referentId: uuid("referent_id").references(() => companyReferents.id),
    referentOtherName: text("referent_other_name"),
    referentOtherPhone: text("referent_other_phone"),
    highlights: text("highlights"),
    brief: text("brief"),
    brochurePath: text("brochure_path"),
    brochureName: text("brochure_name"),
    leadTemplateId: uuid("lead_template_id").references(() => leadTemplates.id),
    leadFrequency: leadFrequency("lead_frequency").notNull().default("quotidien"),
    quote: jsonb("quote"),
    totalHtCents: integer("total_ht_cents"),
    totalTtcCents: integer("total_ttc_cents"),
    cgvAcceptedAt: timestamp("cgv_accepted_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("bookings_company_idx").on(t.companyId)],
);

export const bookingPositions = pgTable(
  "booking_positions",
  {
    bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    qty: integer("qty").notNull(),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.role] })],
);

export const assignments = pgTable(
  "assignments",
  {
    id: id(),
    bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
    freelancerId: uuid("freelancer_id").notNull().references(() => freelancers.id),
    role: text("role").notNull(),
    hourlyRateCents: integer("hourly_rate_cents").notNull(),
    matchScore: integer("match_score").notNull().default(0),
    status: assignmentStatus("status").notNull().default("selectionne"),
    proposedAt: timestamp("proposed_at", { withTimezone: true }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("assignments_booking_idx").on(t.bookingId),
    index("assignments_freelancer_idx").on(t.freelancerId),
  ],
);

export const timesheets = pgTable(
  "timesheets",
  {
    id: id(),
    assignmentId: uuid("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    minutesDeclared: integer("minutes_declared").notNull(),
    minutesValidated: integer("minutes_validated"),
    status: timesheetStatus("status").notNull().default("declare"),
    comment: text("comment"),
  },
  (t) => [uniqueIndex("timesheets_assignment_day_idx").on(t.assignmentId, t.day)],
);

export const payments = pgTable("payments", {
  id: id(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeChargeId: text("stripe_charge_id"),
  amountCents: integer("amount_cents").notNull(),
  status: paymentStatus("status").notNull().default("en_attente"),
  error: text("error"),
  createdAt: createdAt(),
});

export const payouts = pgTable("payouts", {
  id: id(),
  assignmentId: uuid("assignment_id").notNull().unique().references(() => assignments.id),
  freelancerId: uuid("freelancer_id").notNull().references(() => freelancers.id),
  amountCents: integer("amount_cents").notNull(),
  scheduledFor: date("scheduled_for").notNull(),
  stripeTransferId: text("stripe_transfer_id"),
  status: payoutStatus("status").notNull().default("planifie"),
  createdAt: createdAt(),
});

export const invoices = pgTable("invoices", {
  id: id(),
  bookingId: uuid("booking_id").notNull().unique().references(() => bookings.id),
  number: text("number").notNull().unique(),
  lines: jsonb("lines").notNull(),
  subtotalCents: integer("subtotal_cents").notNull(),
  serviceFeeCents: integer("service_fee_cents").notNull(),
  totalHtCents: integer("total_ht_cents").notNull(),
  vatCents: integer("vat_cents").notNull(),
  totalTtcCents: integer("total_ttc_cents").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow().notNull(),
});

export const leadBatches = pgTable("lead_batches", {
  id: id(),
  assignmentId: uuid("assignment_id").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  source: leadSource("source").notNull(),
  filename: text("filename"),
  mapping: jsonb("mapping"),
  missing: textArray("missing"),
  rowsCount: integer("rows_count").notNull().default(0),
  status: batchStatus("status").notNull().default("brouillon"),
  crmError: text("crm_error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const leads = pgTable(
  "leads",
  {
    id: id(),
    batchId: uuid("batch_id").notNull().references(() => leadBatches.id, { onDelete: "cascade" }),
    bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
    data: jsonb("data").notNull(),
    completedByStandby: boolean("completed_by_standby").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("leads_booking_idx").on(t.bookingId)],
);

export const businessCards = pgTable("business_cards", {
  id: id(),
  batchId: uuid("batch_id").notNull().references(() => leadBatches.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  status: cardStatus("status").notNull().default("a_saisir"),
  ocr: jsonb("ocr"),
  leadId: uuid("lead_id").references(() => leads.id),
  createdAt: createdAt(),
});

export const favorites = pgTable(
  "favorites",
  {
    companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
    freelancerId: uuid("freelancer_id").notNull().references(() => freelancers.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.companyId, t.freelancerId] })],
);

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    bookingId: uuid("booking_id").notNull().references(() => bookings.id),
    freelancerId: uuid("freelancer_id").notNull().references(() => freelancers.id),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("reviews_booking_freelancer_idx").on(t.bookingId, t.freelancerId)],
);

export const pricingSettings = pgTable("pricing_settings", {
  id: id(),
  key: text("key").notNull(),
  value: integer("value").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  createdBy: uuid("created_by"),
  createdAt: createdAt(),
});

export const contactMessages = pgTable("contact_messages", {
  id: id(),
  audience: text("audience").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  bookingRef: text("booking_ref"),
  message: text("message").notNull(),
  handled: boolean("handled").notNull().default(false),
  createdAt: createdAt(),
});

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId)],
);

export const auditLog = pgTable("audit_log", {
  id: id(),
  actorId: uuid("actor_id"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  data: jsonb("data"),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
});
