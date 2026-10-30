-- 0004 : actualités et articles (brouillons, publication, métadonnées SEO).

CREATE TABLE article_categories (
  id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(80)     NOT NULL,
  name VARCHAR(80)     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_article_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE articles (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug           VARCHAR(120)    NOT NULL,
  category_id    BIGINT UNSIGNED NULL,
  cover_media_id BIGINT UNSIGNED NULL,
  status         ENUM('draft','published') NOT NULL DEFAULT 'draft',
  published_at   DATETIME        NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_articles_slug (slug),
  KEY ix_articles_listing (status, published_at),
  CONSTRAINT fk_articles_category FOREIGN KEY (category_id) REFERENCES article_categories (id) ON DELETE SET NULL,
  CONSTRAINT fk_articles_cover FOREIGN KEY (cover_media_id) REFERENCES media (id) ON DELETE SET NULL,
  CONSTRAINT ck_articles_published CHECK (status <> 'published' OR published_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE article_translations (
  article_id       BIGINT UNSIGNED NOT NULL,
  locale           VARCHAR(5)      NOT NULL,
  title            VARCHAR(200)    NOT NULL,
  excerpt          VARCHAR(400)    NOT NULL,
  content_markdown MEDIUMTEXT      NOT NULL COMMENT 'Markdown brut : toujours nettoyé avant affichage',
  seo_title        VARCHAR(70)     NULL,
  seo_description  VARCHAR(170)    NULL,
  PRIMARY KEY (article_id, locale),
  CONSTRAINT fk_article_translations_article FOREIGN KEY (article_id) REFERENCES articles (id) ON DELETE CASCADE,
  CONSTRAINT ck_article_translations_locale CHECK (locale IN ('fr','en'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
