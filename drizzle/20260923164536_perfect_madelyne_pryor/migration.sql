CREATE TABLE `accounts` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_accounts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`id` text PRIMARY KEY,
	`key` text NOT NULL UNIQUE,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	CONSTRAINT `fk_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer
);
--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `cv_settings` (
	`id` text PRIMARY KEY DEFAULT 'primary',
	`title` text DEFAULT 'Özgeçmiş' NOT NULL,
	`summary_override` text,
	`language` text DEFAULT 'tr' NOT NULL,
	`template` text DEFAULT 'classic' NOT NULL,
	`section_visibility` text DEFAULT '{}' NOT NULL,
	`section_order` text DEFAULT '[]' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "cv_settings_singleton" CHECK("id" = 'primary')
);
--> statement-breakpoint
CREATE TABLE `education` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`institution` text NOT NULL,
	`program` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`is_current` integer DEFAULT false NOT NULL,
	`description` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_education_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT "education_current_has_no_end" CHECK("is_current" = 0 OR "end_date" IS NULL)
);
--> statement-breakpoint
CREATE TABLE `experiences` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`organization` text NOT NULL,
	`position` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`is_current` integer DEFAULT false NOT NULL,
	`description` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_experiences_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE,
	CONSTRAINT "experiences_current_has_no_end" CHECK("is_current" = 0 OR "end_date" IS NULL)
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY,
	`storage_key` text NOT NULL,
	`url` text,
	`mime_type` text NOT NULL,
	`width` integer,
	`height` integer,
	`size` integer NOT NULL,
	`alt_text` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "media_size_non_negative" CHECK("size" >= 0),
	CONSTRAINT "media_dimensions_positive" CHECK(("width" IS NULL OR "width" > 0) AND ("height" IS NULL OR "height" > 0))
);
--> statement-breakpoint
CREATE TABLE `post_tags` (
	`post_id` text NOT NULL,
	`tag_id` text NOT NULL,
	CONSTRAINT `post_tags_pk` PRIMARY KEY(`post_id`, `tag_id`),
	CONSTRAINT `fk_post_tags_post_id_posts_id_fk` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_post_tags_tag_id_tags_id_fk` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` text PRIMARY KEY,
	`category_id` text,
	`cover_media_id` text,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`excerpt` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`seo_title` text,
	`seo_description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_posts_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_posts_cover_media_id_media_id_fk` FOREIGN KEY (`cover_media_id`) REFERENCES `media`(`id`) ON DELETE SET NULL,
	CONSTRAINT "posts_status_valid" CHECK("status" IN ('draft', 'published')),
	CONSTRAINT "posts_publication_date_consistent" CHECK(("status" = 'draft' AND "published_at" IS NULL) OR ("status" = 'published' AND "published_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY DEFAULT 'primary',
	`full_name` text NOT NULL,
	`headline` text NOT NULL,
	`short_bio` text NOT NULL,
	`long_bio` text,
	`location` text,
	`email` text,
	`is_email_visible` integer DEFAULT false NOT NULL,
	`avatar_media_id` text,
	`available_for_work` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_profiles_avatar_media_id_media_id_fk` FOREIGN KEY (`avatar_media_id`) REFERENCES `media`(`id`) ON DELETE SET NULL,
	CONSTRAINT "profiles_singleton" CHECK("id" = 'primary')
);
--> statement-breakpoint
CREATE TABLE `project_images` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`media_id` text NOT NULL,
	`alt_text` text NOT NULL,
	`caption` text,
	`type` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_project_images_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_project_images_media_id_media_id_fk` FOREIGN KEY (`media_id`) REFERENCES `media`(`id`) ON DELETE RESTRICT,
	CONSTRAINT "project_images_type_valid" CHECK("type" IN ('cover', 'gallery'))
);
--> statement-breakpoint
CREATE TABLE `project_skills` (
	`project_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `project_skills_pk` PRIMARY KEY(`project_id`, `skill_id`),
	CONSTRAINT `fk_project_skills_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_project_skills_skill_id_skills_id_fk` FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`slug` text NOT NULL,
	`short_description` text NOT NULL,
	`detailed_description` text,
	`problem` text,
	`solution` text,
	`role` text,
	`architecture_description` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`project_date` text,
	`live_url` text,
	`repository_visibility` text DEFAULT 'none' NOT NULL,
	`repository_url` text,
	`featured` integer DEFAULT false NOT NULL,
	`published` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "projects_status_valid" CHECK("status" IN ('planned', 'in_progress', 'completed', 'archived')),
	CONSTRAINT "projects_repository_visibility_valid" CHECK("repository_visibility" IN ('none', 'private', 'public')),
	CONSTRAINT "projects_none_has_no_repository_url" CHECK("repository_visibility" <> 'none' OR "repository_url" IS NULL)
);
--> statement-breakpoint
CREATE TABLE `site_settings` (
	`id` text PRIMARY KEY DEFAULT 'primary',
	`site_title` text NOT NULL,
	`site_description` text NOT NULL,
	`hero_eyebrow` text NOT NULL,
	`hero_title` text NOT NULL,
	`hero_description` text NOT NULL,
	`contact_visible` integer DEFAULT true NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "site_settings_singleton" CHECK("id" = 'primary')
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`icon_identifier` text,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `social_links` (
	`id` text PRIMARY KEY,
	`profile_id` text NOT NULL,
	`platform` text NOT NULL,
	`label` text NOT NULL,
	`url` text NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`is_visible` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_social_links_profile_id_profiles_id_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `accounts_userId_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_userId_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE INDEX `education_profile_order_idx` ON `education` (`profile_id`,`display_order`);--> statement-breakpoint
CREATE INDEX `experiences_profile_order_idx` ON `experiences` (`profile_id`,`display_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `media_storage_key_unique` ON `media` (`storage_key`);--> statement-breakpoint
CREATE INDEX `post_tags_tag_idx` ON `post_tags` (`tag_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);--> statement-breakpoint
CREATE INDEX `posts_publication_idx` ON `posts` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `posts_category_idx` ON `posts` (`category_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_images_project_media_unique` ON `project_images` (`project_id`,`media_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_images_single_cover_unique` ON `project_images` (`project_id`) WHERE "project_images"."type" = 'cover';--> statement-breakpoint
CREATE INDEX `project_images_project_order_idx` ON `project_images` (`project_id`,`display_order`);--> statement-breakpoint
CREATE INDEX `project_skills_project_order_idx` ON `project_skills` (`project_id`,`display_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_slug_unique` ON `projects` (`slug`);--> statement-breakpoint
CREATE INDEX `projects_public_featured_idx` ON `projects` (`published`,`featured`,`project_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `skills_slug_unique` ON `skills` (`slug`);--> statement-breakpoint
CREATE INDEX `skills_category_order_idx` ON `skills` (`category`,`display_order`);--> statement-breakpoint
CREATE INDEX `social_links_profile_order_idx` ON `social_links` (`profile_id`,`display_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);