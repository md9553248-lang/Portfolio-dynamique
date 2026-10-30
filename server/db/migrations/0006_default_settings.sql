-- 0006 : données de référence indispensables (réglages par défaut et catégories de compétences).
-- Aucun contenu personnel ici : le profil et les contenus seront créés depuis l'administration.

INSERT INTO site_settings (setting_key, setting_value, value_type, is_public) VALUES
  ('site.default_theme',   'dark',   'string', 1),
  ('site.default_locale',  'fr',     'string', 1),
  ('site.enabled_locales', '["fr"]', 'json',   1);

INSERT INTO skill_categories (name, sort_order) VALUES
  ('Front-end', 1),
  ('Back-end', 2),
  ('Bases de données', 3),
  ('Outils', 4);
