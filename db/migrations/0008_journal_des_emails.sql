ALTER TABLE "email_outbox" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD COLUMN "status" text DEFAULT 'simule' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD COLUMN "provider_id" text;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD COLUMN "error" text;--> statement-breakpoint
ALTER TABLE "email_outbox" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "email_undeliverable_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "email_undeliverable_reason" text;--> statement-breakpoint
CREATE INDEX "email_outbox_provider_idx" ON "email_outbox" USING btree ("provider_id");