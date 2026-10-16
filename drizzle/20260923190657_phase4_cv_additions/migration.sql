ALTER TABLE `cv_settings` ADD `max_projects` integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `is_location_visible` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `include_in_cv` integer DEFAULT false NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_cv_settings` (
	`id` text PRIMARY KEY DEFAULT 'primary',
	`title` text DEFAULT 'Özgeçmiş' NOT NULL,
	`summary_override` text,
	`language` text DEFAULT 'tr' NOT NULL,
	`template` text DEFAULT 'classic' NOT NULL,
	`section_visibility` text DEFAULT '{}' NOT NULL,
	`section_order` text DEFAULT '[]' NOT NULL,
	`max_projects` integer DEFAULT 6 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "cv_settings_singleton" CHECK("id" = 'primary'),
	CONSTRAINT "cv_settings_max_projects_positive" CHECK("max_projects" > 0)
);
--> statement-breakpoint
INSERT INTO `__new_cv_settings`(`id`, `title`, `summary_override`, `language`, `template`, `section_visibility`, `section_order`, `updated_at`) SELECT `id`, `title`, `summary_override`, `language`, `template`, `section_visibility`, `section_order`, `updated_at` FROM `cv_settings`;--> statement-breakpoint
DROP TABLE `cv_settings`;--> statement-breakpoint
ALTER TABLE `__new_cv_settings` RENAME TO `cv_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `projects_cv_idx` ON `projects` (`published`,`include_in_cv`,`project_date`);