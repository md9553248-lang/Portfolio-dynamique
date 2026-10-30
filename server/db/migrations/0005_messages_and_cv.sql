-- 0005 : messagerie du formulaire de contact et versions du CV.

CREATE TABLE messages (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)    NOT NULL,
  email       VARCHAR(254)    NOT NULL,
  subject     VARCHAR(150)    NOT NULL,
  body        TEXT            NOT NULL,
  status      ENUM('unread','read','archived') NOT NULL DEFAULT 'unread',
  ip_hash     CHAR(64)        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at     DATETIME        NULL,
  archived_at DATETIME        NULL,
  PRIMARY KEY (id),
  KEY ix_messages_inbox (status, created_at),
  FULLTEXT KEY ft_messages_search (name, email, subject, body),
  CONSTRAINT ck_messages_body_length CHECK (CHAR_LENGTH(body) <= 5000)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE message_replies (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  message_id      BIGINT UNSIGNED NOT NULL,
  user_id         BIGINT UNSIGNED NULL,
  body            TEXT            NOT NULL,
  delivery_status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at         DATETIME        NULL,
  PRIMARY KEY (id),
  KEY ix_message_replies_message (message_id, created_at),
  CONSTRAINT fk_message_replies_message FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
  CONSTRAINT fk_message_replies_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Versions du CV. Le cycle : draft (importé, non publié) -> published (visible) -> archived.
-- La base elle-même garantit qu'il n'existe JAMAIS deux CV publiés en même temps.
CREATE TABLE cv_versions (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  media_id       BIGINT UNSIGNED NOT NULL,
  status         ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  -- Colonne calculée : vaut 1 pour le CV publié, NULL sinon. NULL est autorisé plusieurs fois
  -- dans un index unique, donc un seul CV peut avoir la valeur 1.
  published_flag TINYINT GENERATED ALWAYS AS (IF(status = 'published', 1, NULL)) STORED,
  uploaded_by    BIGINT UNSIGNED NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at   DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cv_versions_single_published (published_flag),
  KEY ix_cv_versions_status (status, created_at),
  -- RESTRICT : on ne supprime pas un fichier de média tant qu'une version de CV l'utilise.
  CONSTRAINT fk_cv_versions_media FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE RESTRICT,
  CONSTRAINT fk_cv_versions_user FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT ck_cv_versions_published CHECK (status <> 'published' OR published_at IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
