CREATE TABLE "booking_reminders" (
	"booking_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_reminders_booking_id_kind_pk" PRIMARY KEY("booking_id","kind")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "cancellation" jsonb;--> statement-breakpoint
ALTER TABLE "booking_reminders" ADD CONSTRAINT "booking_reminders_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;