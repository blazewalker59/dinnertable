CREATE TABLE `recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`section_id` integer NOT NULL,
	`servings` text,
	`attribution` text,
	`ingredients` text,
	`instructions` text,
	`notes` text,
	`added_by_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`section_id`) REFERENCES `sections`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`added_by_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
