CREATE TYPE "public"."refund_status" AS ENUM('aucun', 'en_cours', 'rembourse', 'echoue');--> statement-breakpoint
ALTER TYPE "public"."assignment_status" ADD VALUE 'desistee';--> statement-breakpoint
ALTER TYPE "public"."timesheet_status" ADD VALUE 'ajuste';--> statement-breakpoint
CREATE TABLE "credit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"number" text NOT NULL,
	"reason" text NOT NULL,
	"total_ht_cents" integer NOT NULL,
	"vat_cents" integer NOT NULL,
	"total_ttc_cents" integer NOT NULL,
	"refund_status" "refund_status" DEFAULT 'aucun' NOT NULL,
	"stripe_refund_id" text,
	"refund_error" text,
	"created_by" uuid,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_notes_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "withdrawn_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "withdrawal_reason" text;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "hours_adjusted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "hours_adjustment_note" text;--> statement-breakpoint
ALTER TABLE "assignments" ADD COLUMN "hours_dispute_note" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_notes" ADD CONSTRAINT "credit_notes_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_notes_invoice_idx" ON "credit_notes" USING btree ("invoice_id");