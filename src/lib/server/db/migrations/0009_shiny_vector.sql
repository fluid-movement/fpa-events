CREATE TABLE "crew_jams" (
	"id" text PRIMARY KEY NOT NULL,
	"crew_id" text NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" text NOT NULL,
	"venue_name" text NOT NULL,
	"address" text,
	"latitude" real,
	"longitude" real,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crew_jams_weekday_check" CHECK ("crew_jams"."weekday" between 0 and 6)
);
--> statement-breakpoint
CREATE TABLE "crew_links" (
	"crew_id" text NOT NULL,
	"kind" text NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crew_jams" ADD CONSTRAINT "crew_jams_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_links" ADD CONSTRAINT "crew_links_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crew_jams_crew_id_index" ON "crew_jams" USING btree ("crew_id");--> statement-breakpoint
CREATE UNIQUE INDEX "crew_links_crew_kind_unique" ON "crew_links" USING btree ("crew_id","kind");