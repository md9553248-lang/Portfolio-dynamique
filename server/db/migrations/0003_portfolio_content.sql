-- 0003 : technologies, projets, compétences, expériences, formations, certifications.
-- Les textes traduisibles sont dans des tables *_translations (une ligne par langue).

CREATE TABLE technologies (
  id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(80)     NOT NULL,
  icon VARCHAR(80)     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_technologies_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE projects (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug           VARCHAR(120)    NOT NULL,
  category       VARCHAR(80)     NOT NULL,
  project_date   DATE            NOT NULL,
  github_url     VARCHAR(500)    NULL,
  demo_url       VARCHAR(500)    NULL,
  cover_media_id BIGINT UNSIGNED NULL,
  status         ENUM('draft','published') NOT NULL DEFAULT 'draft',
  is_featured    TINYINT(1)      NOT NULL DEFAULT 0,
  sort_order     INT             NOT NULL DEFAULT 0,
  published_at   DATETIME        NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_projects_slug (slug),
  KEY ix_projects_listing (status, sort_order),
  KEY ix_projects_featured (is_featured, status),
  CONSTRAINT fk_projects_cover FOREIGN KEY (cover_media_id) REFERENCES media (id) ON DELETE SET NULL,
  CONSTRAINT ck_projects_published CHECK (status <> 'published' OR published_at IS NOT NULL),
  CONSTRAINT ck_projects_github_url CHECK (github_url IS NULL OR github_url LIKE 'https://%'),
  CONSTRAINT ck_projects_demo_url CHECK (demo_url IS NULL OR demo_url LIKE 'https://%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_translations (
  project_id        BIGINT UNSIGNED NOT NULL,
  locale            VARCHAR(5)      NOT NULL,
  title             VARCHAR(150)    NOT NULL,
  short_description VARCHAR(300)    NOT NULL,
  description       TEXT            NOT NULL,
  role              VARCHAR(150)    NULL,
  challenges        JSON            NULL COMMENT 'Liste de { problem, solution }',
  PRIMARY KEY (project_id, locale),
  CONSTRAINT fk_project_translations_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT ck_project_translations_locale CHECK (locale IN ('fr','en'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_images (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL,
  media_id   BIGINT UNSIGNED NOT NULL,
  sort_order INT             NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_images (project_id, media_id),
  KEY ix_project_images_order (project_id, sort_order),
  CONSTRAINT fk_project_images_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_project_images_media FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_technologies (
  project_id    BIGINT UNSIGNED NOT NULL,
  technology_id BIGINT UNSIGNED NOT NULL,
  sort_order    INT             NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, technology_id),
  CONSTRAINT fk_project_technologies_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT fk_project_technologies_technology FOREIGN KEY (technology_id) REFERENCES technologies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE skill_categories (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(80)     NOT NULL,
  sort_order INT             NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skill_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE skills (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(80)     NOT NULL,
  level       ENUM('notions','intermediaire','avance') NULL,
  icon        VARCHAR(80)     NULL,
  sort_order  INT             NOT NULL DEFAULT 0,
  is_visible  TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_skills_category_name (category_id, name),
  KEY ix_skills_listing (is_visible, sort_order),
  -- RESTRICT : on ne peut pas supprimer une catégorie qui contient encore des compétences.
  CONSTRAINT fk_skills_category FOREIGN KEY (category_id) REFERENCES skill_categories (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experiences (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization VARCHAR(150)    NOT NULL,
  start_date   DATE            NOT NULL,
  end_date     DATE            NULL COMMENT 'NULL = en cours',
  sort_order   INT             NOT NULL DEFAULT 0,
  is_visible   TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY ix_experiences_listing (is_visible, start_date),
  CONSTRAINT ck_experiences_dates CHECK (end_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience_translations (
  experience_id BIGINT UNSIGNED NOT NULL,
  locale        VARCHAR(5)      NOT NULL,
  role          VARCHAR(150)    NOT NULL,
  description   TEXT            NULL,
  missions      JSON            NULL COMMENT 'Liste de textes',
  PRIMARY KEY (experience_id, locale),
  CONSTRAINT fk_experience_translations_experience FOREIGN KEY (experience_id) REFERENCES experiences (id) ON DELETE CASCADE,
  CONSTRAINT ck_experience_translations_locale CHECK (locale IN ('fr','en'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE experience_technologies (
  experience_id BIGINT UNSIGNED NOT NULL,
  technology_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (experience_id, technology_id),
  CONSTRAINT fk_experience_technologies_experience FOREIGN KEY (experience_id) REFERENCES experiences (id) ON DELETE CASCADE,
  CONSTRAINT fk_experience_technologies_technology FOREIGN KEY (technology_id) REFERENCES technologies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE educations (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  institution VARCHAR(150)    NOT NULL,
  start_date  DATE            NULL,
  end_date    DATE            NULL,
  status      ENUM('planned','in_progress','completed') NOT NULL DEFAULT 'completed',
  sort_order  INT             NOT NULL DEFAULT 0,
  is_visible  TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY ix_educations_listing (is_visible, sort_order),
  CONSTRAINT ck_educations_dates CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE education_translations (
  education_id BIGINT UNSIGNED NOT NULL,
  locale       VARCHAR(5)      NOT NULL,
  degree       VARCHAR(200)    NOT NULL,
  description  TEXT            NULL,
  PRIMARY KEY (education_id, locale),
  CONSTRAINT fk_education_translations_education FOREIGN KEY (education_id) REFERENCES educations (id) ON DELETE CASCADE,
  CONSTRAINT ck_education_translations_locale CHECK (locale IN ('fr','en'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE certifications (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(200)    NOT NULL,
  issuer        VARCHAR(150)    NOT NULL,
  issued_at     DATE            NOT NULL,
  expires_at    DATE            NULL,
  credential_id VARCHAR(120)    NULL,
  verify_url    VARCHAR(500)    NULL,
  media_id      BIGINT UNSIGNED NULL,
  sort_order    INT             NOT NULL DEFAULT 0,
  is_visible    TINYINT(1)      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY ix_certifications_listing (is_visible, issued_at),
  CONSTRAINT fk_certifications_media FOREIGN KEY (media_id) REFERENCES media (id) ON DELETE SET NULL,
  CONSTRAINT ck_certifications_dates CHECK (expires_at IS NULL OR expires_at >= issued_at),
  CONSTRAINT ck_certifications_verify_url CHECK (verify_url IS NULL OR verify_url LIKE 'https://%')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
