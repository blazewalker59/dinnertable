-- FTS5 search index over recipe text (ADR-0006). Drizzle doesn't model
-- virtual tables; this migration and the queries against it are raw SQL.
CREATE VIRTUAL TABLE `recipes_fts` USING fts5(
  `title`, `ingredients`, `instructions`, `notes`, `attribution`,
  content=`recipes`, content_rowid=`id`
);
--> statement-breakpoint
CREATE TRIGGER `recipes_fts_ai` AFTER INSERT ON `recipes` BEGIN
  INSERT INTO `recipes_fts`(rowid, title, ingredients, instructions, notes, attribution)
  VALUES (new.id, new.title, new.ingredients, new.instructions, new.notes, new.attribution);
END;
--> statement-breakpoint
CREATE TRIGGER `recipes_fts_ad` AFTER DELETE ON `recipes` BEGIN
  INSERT INTO `recipes_fts`(`recipes_fts`, rowid, title, ingredients, instructions, notes, attribution)
  VALUES ('delete', old.id, old.title, old.ingredients, old.instructions, old.notes, old.attribution);
END;
--> statement-breakpoint
CREATE TRIGGER `recipes_fts_au` AFTER UPDATE ON `recipes` BEGIN
  INSERT INTO `recipes_fts`(`recipes_fts`, rowid, title, ingredients, instructions, notes, attribution)
  VALUES ('delete', old.id, old.title, old.ingredients, old.instructions, old.notes, old.attribution);
  INSERT INTO `recipes_fts`(rowid, title, ingredients, instructions, notes, attribution)
  VALUES (new.id, new.title, new.ingredients, new.instructions, new.notes, new.attribution);
END;
--> statement-breakpoint
INSERT INTO `recipes_fts`(rowid, title, ingredients, instructions, notes, attribution)
SELECT id, title, ingredients, instructions, notes, attribution FROM `recipes`;
