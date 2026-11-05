CREATE TABLE "document_reminders" (
	"document_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_reminders_document_id_kind_pk" PRIMARY KEY("document_id","kind")
);
--> statement-breakpoint
ALTER TABLE "freelancer_documents" ALTER COLUMN "path" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "freelancer_documents" ADD COLUMN "source" text DEFAULT 'depot' NOT NULL;--> statement-breakpoint
ALTER TABLE "freelancer_documents" ADD COLUMN "issued_on" date;--> statement-breakpoint
ALTER TABLE "freelancer_documents" ADD COLUMN "valid_until" date;--> statement-breakpoint
ALTER TABLE "freelancers" ADD COLUMN "siret_status" text DEFAULT 'inconnu' NOT NULL;--> statement-breakpoint
ALTER TABLE "freelancers" ADD COLUMN "siret_name" text;--> statement-breakpoint
ALTER TABLE "freelancers" ADD COLUMN "siret_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "freelancers" ADD COLUMN "blocked_reason" text;--> statement-breakpoint
ALTER TABLE "document_reminders" ADD CONSTRAINT "document_reminders_document_id_freelancer_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."freelancer_documents"("id") ON DELETE cascade ON UPDATE no action;