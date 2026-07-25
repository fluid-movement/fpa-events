ALTER TABLE "schedule_locations" ALTER COLUMN "latitude" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "schedule_locations" ALTER COLUMN "longitude" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "show_attendance" boolean DEFAULT true NOT NULL;