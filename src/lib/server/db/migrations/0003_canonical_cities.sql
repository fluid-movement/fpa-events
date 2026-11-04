ALTER TABLE "event_locations" RENAME TO "cities";--> statement-breakpoint
ALTER SEQUENCE "event_locations_id_seq" RENAME TO "cities_id_seq";--> statement-breakpoint
ALTER TABLE "events" RENAME COLUMN "event_location_id" TO "city_id";--> statement-breakpoint
ALTER TABLE "events" DROP CONSTRAINT "events_event_location_id_event_locations_id_fk";--> statement-breakpoint
DROP INDEX "event_locations_city_country_idx";--> statement-breakpoint
-- Keep the lowest ID and its coordinates for each case-insensitive identity.
WITH canonical AS (
	SELECT "id", min("id") OVER (
		PARTITION BY lower("country"), lower("city")
	) AS "survivor_id"
	FROM "cities"
)
UPDATE "events" SET "city_id" = canonical."survivor_id"
FROM canonical
WHERE "events"."city_id" = canonical."id"
	AND canonical."id" <> canonical."survivor_id";--> statement-breakpoint
DELETE FROM "cities"
WHERE "id" NOT IN (
	SELECT min("id") FROM "cities" GROUP BY lower("country"), lower("city")
);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_city_id_cities_id_fk"
	FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cities_country_city_unique" ON "cities" USING btree (lower("country"),lower("city"));
