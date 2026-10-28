CREATE TABLE "freelancer_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" uuid NOT NULL,
	"freelancer_id" uuid NOT NULL,
	"number" text NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"detail" text NOT NULL,
	"supplier" jsonb NOT NULL,
	"amount_ht_cents" integer NOT NULL,
	"vat_bps" integer NOT NULL,
	"vat_cents" integer NOT NULL,
	"total_ttc_cents" integer NOT NULL,
	"commission_cents" integer NOT NULL,
	"net_cents" integer NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "freelancer_invoices_payout_id_unique" UNIQUE("payout_id"),
	CONSTRAINT "freelancer_invoices_number_unique" UNIQUE("number")
);
--> statement-breakpoint
ALTER TABLE "freelancers" ADD COLUMN "billing_address" text;--> statement-breakpoint
ALTER TABLE "freelancers" ADD COLUMN "vat_regime" text DEFAULT 'franchise' NOT NULL;--> statement-breakpoint
ALTER TABLE "freelancers" ADD COLUMN "vat_number" text;--> statement-breakpoint
ALTER TABLE "freelancers" ADD COLUMN "billing_mandate_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "freelancers" ADD COLUMN "billing_mandate_version" text;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "gross_cents" integer;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "commission_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "vat_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "freelancer_invoices" ADD CONSTRAINT "freelancer_invoices_payout_id_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freelancer_invoices" ADD CONSTRAINT "freelancer_invoices_freelancer_id_freelancers_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."freelancers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "freelancer_invoices_freelancer_idx" ON "freelancer_invoices" USING btree ("freelancer_id");