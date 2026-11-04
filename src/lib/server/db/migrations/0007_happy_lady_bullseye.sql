ALTER TABLE "events" ADD COLUMN "crew_id" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "show_crew" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE set null ON UPDATE no action;