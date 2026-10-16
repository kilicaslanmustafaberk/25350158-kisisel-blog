CREATE TABLE `certificates` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`issuer` text,
	`instructor` text,
	`issued_at` text,
	`expires_at` text,
	`credential_id` text,
	`credential_url` text,
	`description` text,
	`is_visible` integer DEFAULT true NOT NULL,
	`show_in_cv` integer DEFAULT true NOT NULL,
	`display_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "certificates_expiry_after_issue" CHECK("issued_at" IS NULL OR "expires_at" IS NULL OR "expires_at" >= "issued_at")
);
--> statement-breakpoint
CREATE INDEX `certificates_order_idx` ON `certificates` (`display_order`);