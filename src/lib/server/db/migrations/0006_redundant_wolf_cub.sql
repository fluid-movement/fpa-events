CREATE TABLE "crew_magic_links" (
	"id" text PRIMARY KEY NOT NULL,
	"crew_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "crew_magic_links" ADD CONSTRAINT "crew_magic_links_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crew_magic_links_crew_id_index" ON "crew_magic_links" USING btree ("crew_id");