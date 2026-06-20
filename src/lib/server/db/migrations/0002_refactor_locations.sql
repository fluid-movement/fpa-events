-- Rename per-event venue table (was event_locations, now schedule_locations)
ALTER TABLE "event_locations" RENAME TO "schedule_locations";
--> statement-breakpoint
ALTER TABLE "schedules" RENAME CONSTRAINT "schedules_location_id_event_locations_id_fk" TO "schedules_location_id_schedule_locations_id_fk";
--> statement-breakpoint
ALTER TABLE "schedule_locations" RENAME CONSTRAINT "event_locations_event_id_events_id_fk" TO "schedule_locations_event_id_events_id_fk";
--> statement-breakpoint

-- Create new global city-level event_locations table
CREATE TABLE "event_locations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "event_locations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"city" text NOT NULL,
	"country" text NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "event_locations_city_country_idx" ON "event_locations" USING btree ("city","country");
--> statement-breakpoint

-- Update events table: replace inline geo columns with FK
ALTER TABLE "events" ADD COLUMN "event_location_id" integer;
--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "city";
--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "country";
--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "latitude";
--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "longitude";
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_event_location_id_event_locations_id_fk" FOREIGN KEY ("event_location_id") REFERENCES "public"."event_locations"("id") ON DELETE set null ON UPDATE no action;
