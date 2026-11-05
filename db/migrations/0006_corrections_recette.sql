ALTER TABLE "companies" ADD COLUMN "siret_name" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "billing_address" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "vat_number" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "client" jsonb;