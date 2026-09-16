CREATE TABLE `game_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`map_id` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`collected_hints` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
