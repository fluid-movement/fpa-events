-- Remove duplicate (event, user) rows before the unique index can be built.
-- Keep an organizing row over an attending one, then the oldest row.
DELETE FROM "event_user"
WHERE "id" IN (
	SELECT "id" FROM (
		SELECT "id",
			row_number() OVER (
				PARTITION BY "event_id", "user_id"
				ORDER BY ("status" = 'organizing') DESC, "id"
			) AS "rn"
		FROM "event_user"
	) AS "ranked"
	WHERE "rn" > 1
);--> statement-breakpoint
CREATE UNIQUE INDEX "event_user_event_id_user_id_unique" ON "event_user" USING btree ("event_id","user_id");
