CREATE TABLE `mystery_guesses` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`guess_text` text NOT NULL,
	`is_correct` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `game_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `game_sessions` ADD `mystery_target_id` text REFERENCES mystery_targets(id);--> statement-breakpoint
ALTER TABLE `game_sessions` ADD `earned_coins` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `coins` integer DEFAULT 0 NOT NULL;