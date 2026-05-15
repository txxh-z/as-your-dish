ALTER TABLE `llm_calls` ADD `cache_hit` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `llm_calls` ADD `status` text DEFAULT 'ok' NOT NULL;