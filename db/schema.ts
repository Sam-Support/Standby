import { boolean, date, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["exposant", "commercial", "admin"]);
export const eventKind = pgEnum("event_kind", ["salon", "foire"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  role: userRole("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kind: eventKind("kind").notNull(),
  city: text("city").notNull(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  setupDay: boolean("setup_day").notNull().default(false),
  sector: text("sector"),
  siteUrl: text("site_url"),
  verifiedOn: date("verified_on"),
  logoPath: text("logo_path"),
  logoAuthorized: boolean("logo_authorized").notNull().default(false),
});

export const pricingSettings = pgTable("pricing_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull(), // service_fee_pct, vat_pct, outfit_surcharge_cents...
  value: integer("value").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull(),
  createdBy: uuid("created_by"),
});
