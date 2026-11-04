CREATE TABLE "crew_members" (
	"crew_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crew_members_crew_id_user_id_pk" PRIMARY KEY("crew_id","user_id"),
	CONSTRAINT "crew_members_role_check" CHECK ("crew_members"."role" in ('admin', 'member'))
);
--> statement-breakpoint
CREATE TABLE "crews" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "crews_city_id_unique" UNIQUE("city_id")
);
--> statement-breakpoint
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crews" ADD CONSTRAINT "crews_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crew_members_user_id_unique" ON "crew_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "crew_members_crew_id_index" ON "crew_members" USING btree ("crew_id");