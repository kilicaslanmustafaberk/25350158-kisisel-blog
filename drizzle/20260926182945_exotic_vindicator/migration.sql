ALTER TABLE `profiles` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `profiles` ADD `is_phone_visible` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `social_links` ADD `show_in_cv` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `social_links` SET `show_in_cv` = 1 WHERE `platform` IN ('github', 'linkedin', 'website');
