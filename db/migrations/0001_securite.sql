CREATE TABLE "email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"to" text NOT NULL,
	"subject" text NOT NULL,
	"text" text NOT NULL,
	"link" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "email_verified_at" timestamp with time zone;
--> statement-breakpoint
-- les comptes créés avant la vérification d'e-mail restent utilisables
UPDATE "profiles" SET "email_verified_at" = "created_at" WHERE "email_verified_at" IS NULL;