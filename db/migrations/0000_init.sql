CREATE TYPE "public"."assignment_status" AS ENUM('selectionne', 'proposee', 'acceptee', 'refusee', 'expiree', 'annulee');--> statement-breakpoint
CREATE TYPE "public"."batch_status" AS ENUM('brouillon', 'envoye', 'pousse_crm');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('brouillon', 'envoyee', 'partielle', 'confirmee', 'en_cours', 'heures_a_valider', 'validee', 'payee', 'annulee');--> statement-breakpoint
CREATE TYPE "public"."card_status" AS ENUM('a_saisir', 'saisie');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('identite', 'urssaf', 'rib', 'siret');--> statement-breakpoint
CREATE TYPE "public"."event_kind" AS ENUM('salon', 'foire');--> statement-breakpoint
CREATE TYPE "public"."freelancer_status" AS ENUM('brouillon', 'en_revue', 'valide', 'refuse');--> statement-breakpoint
CREATE TYPE "public"."lead_frequency" AS ENUM('quotidien', 'fin');--> statement-breakpoint
CREATE TYPE "public"."lead_mode" AS ENUM('excel', 'crm', 'standard');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('xlsx', 'cartes');--> statement-breakpoint
CREATE TYPE "public"."outfit_mode" AS ENUM('exposant', 'perso', 'standby');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('en_attente', 'en_cours', 'reussi', 'echoue');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('planifie', 'transfere', 'echoue');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('en_attente', 'valide', 'refuse');--> statement-breakpoint
CREATE TYPE "public"."timesheet_status" AS ENUM('declare', 'valide', 'conteste');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('exposant', 'commercial', 'admin');--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"freelancer_id" uuid NOT NULL,
	"role" text NOT NULL,
	"hourly_rate_cents" integer NOT NULL,
	"match_score" integer DEFAULT 0 NOT NULL,
	"status" "assignment_status" DEFAULT 'selectionne' NOT NULL,
	"proposed_at" timestamp with time zone,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text,
	"data" jsonb,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_positions" (
	"booking_id" uuid NOT NULL,
	"role" text NOT NULL,
	"qty" integer NOT NULL,
	CONSTRAINT "booking_positions_booking_id_role_pk" PRIMARY KEY("booking_id","role")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"company_id" uuid NOT NULL,
	"event_id" uuid,
	"status" "booking_status" DEFAULT 'brouillon' NOT NULL,
	"days" date[] DEFAULT '{}'::date[] NOT NULL,
	"start_time" text DEFAULT '09:00' NOT NULL,
	"end_time" text DEFAULT '18:00' NOT NULL,
	"stand" text,
	"outfit" "outfit_mode" DEFAULT 'exposant' NOT NULL,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"referent_id" uuid,
	"referent_other_name" text,
	"referent_other_phone" text,
	"highlights" text,
	"brief" text,
	"brochure_path" text,
	"brochure_name" text,
	"lead_template_id" uuid,
	"lead_frequency" "lead_frequency" DEFAULT 'quotidien' NOT NULL,
	"quote" jsonb,
	"total_ht_cents" integer,
	"total_ttc_cents" integer,
	"cgv_accepted_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_ref_unique" UNIQUE("ref")
);
--> statement-breakpoint
CREATE TABLE "business_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"path" text NOT NULL,
	"status" "card_status" DEFAULT 'a_saisir' NOT NULL,
	"ocr" jsonb,
	"lead_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"siret" text NOT NULL,
	"siret_verified" boolean DEFAULT false NOT NULL,
	"sector" text,
	"size" text,
	"website" text,
	"linkedin" text,
	"brochure_path" text,
	"brochure_name" text,
	"lead_mode" "lead_mode" DEFAULT 'standard' NOT NULL,
	"crm_provider" text,
	"crm_admin_email" text,
	"stripe_customer_id" text,
	"stripe_payment_method_id" text,
	"onboarding_step" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_referents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"phone" text
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audience" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"booking_ref" text,
	"message" text NOT NULL,
	"handled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'en_attente' NOT NULL,
	"access_token_enc" text,
	"refresh_token_enc" text,
	"expires_at" timestamp with time zone,
	"external_account_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crm_connections_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"kind" "event_kind" NOT NULL,
	"city" text NOT NULL,
	"venue" text,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"setup_on" date,
	"sector" text NOT NULL,
	"specialty" text,
	"site_url" text,
	"verified_on" date,
	"logo_path" text,
	"logo_authorized" boolean DEFAULT false NOT NULL,
	"color" text DEFAULT '#FFCD4A' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"company_id" uuid NOT NULL,
	"freelancer_id" uuid NOT NULL,
	CONSTRAINT "favorites_company_id_freelancer_id_pk" PRIMARY KEY("company_id","freelancer_id")
);
--> statement-breakpoint
CREATE TABLE "freelancer_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"freelancer_id" uuid NOT NULL,
	"type" "document_type" NOT NULL,
	"path" text NOT NULL,
	"filename" text NOT NULL,
	"status" "review_status" DEFAULT 'en_attente' NOT NULL,
	"comment" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "freelancers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"bio" text,
	"roles" text[] DEFAULT '{}'::text[] NOT NULL,
	"specialties" text[] DEFAULT '{}'::text[] NOT NULL,
	"languages" text[] DEFAULT '{}'::text[] NOT NULL,
	"hourly_rate_cents" integer DEFAULT 0 NOT NULL,
	"top_size" text,
	"pants_size" text,
	"shoe_size" text,
	"siret" text,
	"legal_status" text,
	"status" "freelancer_status" DEFAULT 'brouillon' NOT NULL,
	"stripe_account_id" text,
	"payouts_enabled" boolean DEFAULT false NOT NULL,
	"rating_x10" integer DEFAULT 0 NOT NULL,
	"ratings_count" integer DEFAULT 0 NOT NULL,
	"missions_count" integer DEFAULT 0 NOT NULL,
	"accept_rate_bps" integer DEFAULT 10000 NOT NULL,
	"avatar_color" text DEFAULT '#82C9FF' NOT NULL,
	"onboarding_step" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "freelancers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"number" text NOT NULL,
	"lines" jsonb NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"service_fee_cents" integer NOT NULL,
	"total_ht_cents" integer NOT NULL,
	"vat_cents" integer NOT NULL,
	"total_ttc_cents" integer NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_booking_id_unique" UNIQUE("booking_id"),
	CONSTRAINT "invoices_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "lead_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"source" "lead_source" NOT NULL,
	"filename" text,
	"mapping" jsonb,
	"missing" text[] DEFAULT '{}'::text[] NOT NULL,
	"rows_count" integer DEFAULT 0 NOT NULL,
	"status" "batch_status" DEFAULT 'brouillon' NOT NULL,
	"crm_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lead_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid,
	"name" text NOT NULL,
	"columns" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"booking_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"completed_by_standby" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"token" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"stripe_payment_intent_id" text,
	"stripe_charge_id" text,
	"amount_cents" integer NOT NULL,
	"status" "payment_status" DEFAULT 'en_attente' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"freelancer_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"scheduled_for" date NOT NULL,
	"stripe_transfer_id" text,
	"status" "payout_status" DEFAULT 'planifie' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_assignment_id_unique" UNIQUE("assignment_id")
);
--> statement-breakpoint
CREATE TABLE "pricing_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" integer NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"role" "user_role" NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"freelancer_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timesheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"day" date NOT NULL,
	"minutes_declared" integer NOT NULL,
	"minutes_validated" integer,
	"status" timesheet_status DEFAULT 'declare' NOT NULL,
	"comment" text
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_freelancer_id_freelancers_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."freelancers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_positions" ADD CONSTRAINT "booking_positions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_referent_id_company_referents_id_fk" FOREIGN KEY ("referent_id") REFERENCES "public"."company_referents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_lead_template_id_lead_templates_id_fk" FOREIGN KEY ("lead_template_id") REFERENCES "public"."lead_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_batch_id_lead_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."lead_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_cards" ADD CONSTRAINT "business_cards_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_referents" ADD CONSTRAINT "company_referents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_connections" ADD CONSTRAINT "crm_connections_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_freelancer_id_freelancers_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."freelancers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freelancer_documents" ADD CONSTRAINT "freelancer_documents_freelancer_id_freelancers_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."freelancers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freelancers" ADD CONSTRAINT "freelancers_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_batches" ADD CONSTRAINT "lead_batches_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_batches" ADD CONSTRAINT "lead_batches_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_templates" ADD CONSTRAINT "lead_templates_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_batch_id_lead_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."lead_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_freelancer_id_freelancers_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."freelancers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_freelancer_id_freelancers_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."freelancers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assignments_booking_idx" ON "assignments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "assignments_freelancer_idx" ON "assignments" USING btree ("freelancer_id");--> statement-breakpoint
CREATE INDEX "bookings_company_idx" ON "bookings" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "freelancer_documents_type_idx" ON "freelancer_documents" USING btree ("freelancer_id","type");--> statement-breakpoint
CREATE INDEX "leads_booking_idx" ON "leads" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_booking_freelancer_idx" ON "reviews" USING btree ("booking_id","freelancer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "timesheets_assignment_day_idx" ON "timesheets" USING btree ("assignment_id","day");