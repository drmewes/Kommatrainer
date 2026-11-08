CREATE TABLE `schreibi_records` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `schreibi_owner_kind` ON `schreibi_records` (`owner`,`kind`);--> statement-breakpoint
CREATE INDEX `schreibi_owner_updated` ON `schreibi_records` (`owner`,`updated_at`);