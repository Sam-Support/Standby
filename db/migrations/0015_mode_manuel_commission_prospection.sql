ALTER TABLE "assignments" ADD COLUMN "qualified_leads" integer;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "sales_cents" integer;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "commission_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "offer" text DEFAULT 'stand' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "prospection_target" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "commission_type" text DEFAULT 'aucune' NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "commission_lead_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "commission_sale_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "contact_authorized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "contact_authorized_by" uuid;--> statement-breakpoint
ALTER TABLE "freelancers" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "freelancers" ADD COLUMN "instagram_url" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "public_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "published_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "published_by" uuid;