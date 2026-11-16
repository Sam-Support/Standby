ALTER TABLE "profiles" ADD COLUMN "signup_reminders_sent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "signup_reminded_at" timestamp with time zone;