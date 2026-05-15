CREATE TABLE `dishes` (
	`id` text PRIMARY KEY NOT NULL,
	`menu_id` text NOT NULL,
	`position` integer NOT NULL,
	`confidence` real NOT NULL,
	`payload` text NOT NULL,
	FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `image_cache` (
	`query_hash` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`fetched_at` integer DEFAULT (strftime('%s','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `llm_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`user_id` text,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`estimated_usd` real NOT NULL,
	`key_source` text NOT NULL,
	`call_type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `menus` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`image_hash` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s','now')) NOT NULL,
	`language_detected` text,
	`warnings` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `menus_image_hash_unique` ON `menus` (`image_hash`);