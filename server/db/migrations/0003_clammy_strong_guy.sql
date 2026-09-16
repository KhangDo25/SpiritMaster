CREATE TABLE `daily_quests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`quest_type` text NOT NULL,
	`target_value` integer NOT NULL,
	`current_value` integer DEFAULT 0 NOT NULL,
	`is_claimed` integer DEFAULT false NOT NULL,
	`date` text NOT NULL,
	`reward_coins` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
