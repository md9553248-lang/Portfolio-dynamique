-- 0001 : comptes administrateur, sessions, journaux et réglages du site.
-- Les mots de passe ne sont JAMAIS stockés en clair : seulement leur empreinte Argon2id.
-- Les jetons de session ne sont stockés que sous forme d'empreinte (SHA-256).

CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(254)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  display_name  VARCHAR(100)    NOT NULL,
  role          ENUM('admin')   NOT NULL DEFAULT 'admin',
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,
  last_login_at DATETIME        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
  token_hash   CHAR(64)        NOT NULL COMMENT 'SHA-256 du jeton de session (le jeton lui-même n''est jamais stocké)',
  user_id      BIGINT UNSIGNED NOT NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at   DATETIME        NOT NULL COMMENT 'Expiration absolue',
  ip_hash      CHAR(64)        NULL COMMENT 'Empreinte de l''adresse IP, jamais l''IP brute',
  user_agent   VARCHAR(255)    NULL,
  PRIMARY KEY (token_hash),
  KEY ix_sessions_user (user_id),
  KEY ix_sessions_expires (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE login_attempts (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  identifier_hash CHAR(64)        NOT NULL COMMENT 'Empreinte de l''e-mail saisi',
  ip_hash         CHAR(64)        NOT NULL,
  succeeded       TINYINT(1)      NOT NULL,
  attempted_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_login_attempts_identifier (identifier_hash, attempted_at),
  KEY ix_login_attempts_ip (ip_hash, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NULL,
  action      VARCHAR(80)     NOT NULL,
  entity_type VARCHAR(50)     NULL,
  entity_id   BIGINT UNSIGNED NULL,
  details     JSON            NULL COMMENT 'Jamais de mot de passe, jeton ou donnée sensible',
  ip_hash     CHAR(64)        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_audit_logs_user (user_id, created_at),
  KEY ix_audit_logs_action (action, created_at),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Réglages d'affichage du site (thème par défaut, langues...).
-- Les paramètres de sécurité n'ont PAS leur place ici : ils restent dans les variables d'environnement.
CREATE TABLE site_settings (
  setting_key   VARCHAR(100)    NOT NULL,
  setting_value TEXT            NOT NULL,
  value_type    ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
  is_public     TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '1 = peut être lu par les visiteurs',
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by    BIGINT UNSIGNED NULL,
  PRIMARY KEY (setting_key),
  CONSTRAINT fk_site_settings_user FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
