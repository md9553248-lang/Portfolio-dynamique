-- 0007 : repère les contenus de démonstration (exemples fictifs).
-- Le site peut ainsi afficher un badge « Démo », et l'administration pourra les supprimer en un clic.
-- Les données personnelles réelles (profil, formations) ne portent jamais ce repère.

ALTER TABLE projects       ADD COLUMN is_demo TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured;
ALTER TABLE skills         ADD COLUMN is_demo TINYINT(1) NOT NULL DEFAULT 0 AFTER is_visible;
ALTER TABLE experiences    ADD COLUMN is_demo TINYINT(1) NOT NULL DEFAULT 0 AFTER is_visible;
ALTER TABLE certifications ADD COLUMN is_demo TINYINT(1) NOT NULL DEFAULT 0 AFTER is_visible;
ALTER TABLE articles       ADD COLUMN is_demo TINYINT(1) NOT NULL DEFAULT 0 AFTER status;
