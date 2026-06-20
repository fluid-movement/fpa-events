CREATE TABLE "event_locations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_locations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "latitude" real;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "longitude" real;--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "location_id" integer;--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "location";--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "longitude";--> statement-breakpoint
ALTER TABLE "schedules" DROP COLUMN "latitude";--> statement-breakpoint
ALTER TABLE "event_locations" ADD CONSTRAINT "event_locations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_location_id_event_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."event_locations"("id") ON DELETE set null ON UPDATE no action;
