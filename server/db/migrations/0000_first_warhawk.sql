CREATE TABLE `mystery_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_name` text NOT NULL,
	`category` text NOT NULL,
	`aliases` text NOT NULL,
	`hint_1` text NOT NULL,
	`hint_2` text NOT NULL,
	`hint_3` text NOT NULL,
	`difficulty` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `spirit_evolutions` (
	`id` text PRIMARY KEY NOT NULL,
	`spirit_id` text NOT NULL,
	`required_level` integer NOT NULL,
	`evolved_name` text NOT NULL,
	`stats_multiplier` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`spirit_id`) REFERENCES `spirits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `spirits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`realm` text NOT NULL,
	`rarity` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`favorite_spirit_id` text,
	`stats` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`favorite_spirit_id`) REFERENCES `spirits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_profiles_user_id_unique` ON `user_profiles` (`user_id`);--> statement-breakpoint
CREATE TABLE `user_spirits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`spirit_id` text NOT NULL,
	`level` integer DEFAULT 1 NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`evolution_state` integer DEFAULT 0 NOT NULL,
	`acquired_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`spirit_id`) REFERENCES `spirits`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `user_idx` ON `user_spirits` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);