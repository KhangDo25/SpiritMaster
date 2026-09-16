CREATE TABLE `room_players` (
	`id` text PRIMARY KEY NOT NULL,
	`room_id` text NOT NULL,
	`user_id` text NOT NULL,
	`is_ready` integer DEFAULT false NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`connection_state` text DEFAULT 'CONNECTED' NOT NULL,
	`joined_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `room_user_idx` ON `room_players` (`room_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`host_id` text NOT NULL,
	`mode` text NOT NULL,
	`theme` text NOT NULL,
	`max_rounds` integer NOT NULL,
	`round_time_seconds` integer NOT NULL,
	`status` text DEFAULT 'LOBBY' NOT NULL,
	`max_players` integer DEFAULT 12 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`host_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_code_unique` ON `rooms` (`code`);