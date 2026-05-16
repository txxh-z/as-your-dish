ALTER TABLE `menus` ADD `kind` text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `menus` ADD `slug` text;--> statement-breakpoint
CREATE UNIQUE INDEX `menus_slug_unique` ON `menus` (`slug`);
