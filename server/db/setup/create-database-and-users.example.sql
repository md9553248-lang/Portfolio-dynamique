-- ============================================================================
-- MODÈLE : création de la base et des comptes MySQL du portfolio.
--
-- MODE D'EMPLOI
--   1. Copiez ce fichier en "create-database-and-users.local.sql" (les fichiers *.local.sql sont
--      ignorés par Git : vos mots de passe ne seront jamais publiés).
--   2. Dans la COPIE, remplacez les deux mots de passe par des valeurs longues et uniques.
--   3. Exécutez la copie une seule fois, connecté en administrateur MySQL (root),
--      par exemple avec MySQL Workbench ou HeidiSQL.
--   4. Reportez ces mots de passe dans server\.env (DB_PASSWORD et DB_MIGRATION_PASSWORD).
--
-- Ne mettez JAMAIS le mot de passe root dans server\.env : l'application n'en a pas besoin.
--
-- Si MySQL tourne dans Docker et que vous vous connectez depuis Windows, remplacez
-- 'localhost' par '%' (en limitant l'exposition du port à 127.0.0.1 dans Docker).
-- Si les comptes existent déjà, CREATE USER IF NOT EXISTS ne change PAS leur mot de passe.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS portfolio
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Base réservée aux tests automatiques (son nom DOIT se terminer par _test).
CREATE DATABASE IF NOT EXISTS portfolio_test
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Compte de l'application : lecture et écriture des DONNÉES uniquement.
-- Il ne peut ni créer, ni modifier, ni supprimer de tables.
CREATE USER IF NOT EXISTS 'portfolio_app'@'localhost'
  IDENTIFIED BY 'REMPLACER_PAR_UN_MOT_DE_PASSE_LONG_ET_UNIQUE_APP';

-- Compte des migrations : peut modifier la STRUCTURE, mais seulement sur ces deux bases.
-- Il sert uniquement quand on lance "npm run db:migrate", jamais pendant que le site tourne.
CREATE USER IF NOT EXISTS 'portfolio_migrator'@'localhost'
  IDENTIFIED BY 'REMPLACER_PAR_UN_MOT_DE_PASSE_LONG_ET_UNIQUE_MIGRATION';

GRANT SELECT, INSERT, UPDATE, DELETE
  ON portfolio.* TO 'portfolio_app'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON portfolio.* TO 'portfolio_migrator'@'localhost';

-- Tests automatiques : mêmes droits, sur la base de test uniquement.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON portfolio_test.* TO 'portfolio_app'@'localhost';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON portfolio_test.* TO 'portfolio_migrator'@'localhost';

-- Vérification : affichez les droits obtenus.
SHOW GRANTS FOR 'portfolio_app'@'localhost';
SHOW GRANTS FOR 'portfolio_migrator'@'localhost';
