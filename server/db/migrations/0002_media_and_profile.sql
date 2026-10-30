-- 0002 : fichiers (médias), profil et réseaux sociaux.

CREATE TABLE media (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  storage_key   CHAR(36)        NOT NULL COMMENT 'UUID généré par le serveur : nom du fichier sur le stockage',
  original_name VARCHAR(255)    NOT NULL COMMENT 'Nom d''origine, affiché seulement, jamais utilisé comme chemin',
  mime_type     VARCHAR(100)    NOT NULL COMMENT 'Type réel détecté par le serveur',
  size_bytes    BIGINT UNSIGNED NOT NULL,
  sha256        CHAR(64)        NOT NULL,
  visibility    ENUM('public','private') NOT NULL DEFAULT 'public',
  alt_text      VARCHAR(255)    NULL,
  width         INT UNSIGNED    NULL,
  height        INT UNSIGNED    NULL,
  uploaded_by   BIGINT UNSIGNED NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_media_storage_key (storage_key),
  KEY ix_media_sha256 (sha256),
  CONSTRAINT fk_media_user FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL,
  -- Liste blanche de types : le SVG est volontairement exclu (il peut contenir du code actif).
  CONSTRAINT ck_media_mime CHECK (mime_type IN ('application/pdf','image/jpeg','image/png','image/webp','image/avif'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Une seule ligne (id = 1) : le profil du propriétaire du portfolio.
CREATE TABLE profile (
  id             TINYINT UNSIGNED NOT NULL DEFAULT 1,
  display_name   VARCHAR(100)     NOT NULL,
  photo_media_id BIGINT UNSIGNED  NULL,
  public_email   VARCHAR(254)     NULL,
  public_phone   VARCHAR(40)      NULL,
  updated_at     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_profile_photo FOREIGN KEY (photo_media_id) REFERENCES media (id) ON DELETE SET NULL,
  CONSTRAINT ck_profile_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE profile_translations (
  profile_id TINYINT UNSIGNED NOT NULL,
  locale     VARCHAR(5)       NOT NULL,
  headline   VARCHAR(150)     NOT NULL COMMENT 'Titre professionnel',
  context    VARCHAR(255)     NULL,
  intro      TEXT             NULL,
  about      TEXT             NULL,
  PRIMARY KEY (profile_id, locale),
  CONSTRAINT fk_profile_translations_profile FOREIGN KEY (profile_id) REFERENCES profile (id) ON DELETE CASCADE,
  CONSTRAINT ck_profile_translations_locale CHECK (locale IN ('fr','en'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE social_links (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  platform   VARCHAR(50)     NOT NULL,
  url        VARCHAR(500)    NOT NULL,
  sort_order INT             NOT NULL DEFAULT 0,
  is_visible TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY ix_social_links_order (is_visible, sort_order),
  -- https obligatoire : empêche d'enregistrer des adresses du type "javascript:...".
  CONSTRAINT ck_social_links_url CHECK (url LIKE 'https://%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
