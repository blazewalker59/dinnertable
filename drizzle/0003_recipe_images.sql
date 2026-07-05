CREATE TABLE `recipe_images` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` integer NOT NULL,
	`width` integer,
	`height` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`added_by_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`added_by_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE no action
);
