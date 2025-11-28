DROP INDEX `event_magic_links_event_id_index`;--> statement-breakpoint
DROP INDEX `user_status_index`;--> statement-breakpoint
DROP INDEX `event_user_index`;--> statement-breakpoint
DROP INDEX `event_status_index`;--> statement-breakpoint
DROP INDEX `events_user_id_index`;--> statement-breakpoint
DROP INDEX "users_email_unique";--> statement-breakpoint
ALTER TABLE `events` ALTER COLUMN "updated_at" TO "updated_at" integer;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);