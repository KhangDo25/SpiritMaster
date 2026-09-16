CREATE TABLE `daily_mysteries` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`mystery_target_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`mystery_target_id`) REFERENCES `mystery_targets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_mysteries_date_unique` ON `daily_mysteries` (`date`);--> statement-breakpoint
CREATE TABLE `daily_mystery_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_mystery_id` text NOT NULL,
	`user_id` text NOT NULL,
	`guess_text` text NOT NULL,
	`is_correct` integer NOT NULL,
	`time_taken_ms` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`daily_mystery_id`) REFERENCES `daily_mysteries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `game_sessions` ADD `session_type` text DEFAULT 'NORMAL' NOT NULL;--> statement-breakpoint
ALTER TABLE `game_sessions` ADD `boss_phase` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `current_streak` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `longest_streak` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `last_activity_date` text;