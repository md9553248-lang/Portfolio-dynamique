# Base de données

État : **Phase 05**. Le schéma, les migrations et les comptes MySQL existent, et l'API s'y connecte
(voir `docs/api.md`). Le site public lit encore ses contenus dans des fichiers : son raccordement est l'étape suivante.

Base visée : **MySQL 8** (les contraintes `CHECK` et les colonnes calculées exigent MySQL 8.0.16 ou plus).

## Vue d'ensemble

| Domaine              | Tables                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Accès et sécurité    | `users`, `sessions`, `login_attempts`, `audit_logs`                                                                           |
| Réglages             | `site_settings`                                                                                                               |
| Fichiers             | `media`                                                                                                                       |
| Profil               | `profile`, `profile_translations`, `social_links`                                                                             |
| Projets              | `projects`, `project_translations`, `project_images`, `project_technologies`, `technologies`                                  |
| Compétences          | `skill_categories`, `skills`                                                                                                  |
| Parcours             | `experiences`, `experience_translations`, `experience_technologies`, `educations`, `education_translations`, `certifications` |
| Articles             | `articles`, `article_translations`, `article_categories`                                                                      |
| Contact              | `messages`, `message_replies`                                                                                                 |
| CV                   | `cv_versions`                                                                                                                 |
| Suivi des migrations | `schema_migrations`                                                                                                           |

## Conventions

- Moteur InnoDB, jeu de caractères `utf8mb4` (accents et émojis), comparaison insensible à la casse.
- Clés primaires numériques ; les fichiers sont identifiés publiquement par un UUID (`media.storage_key`),
  jamais par un numéro devinable.
- **Traductions** : le texte traduisible vit dans une table `*_translations` (une ligne par langue,
  `fr` ou `en`). Les champs communs à toutes les langues (dates, liens, ordre, statut) restent dans la
  table principale. Pour l'instant, seul le français est utilisé.
- Les dates sont stockées en **UTC**.
- Statut de publication : `draft` ou `published`. Un élément publié doit avoir une date de publication
  (contrainte `CHECK`).
- Suppressions : supprimer un projet supprime ses traductions et ses images (`CASCADE`). Supprimer un
  fichier encore utilisé par un CV est refusé (`RESTRICT`).

## Ce que la base garantit elle-même (défense en profondeur)

Ces règles s'ajoutent à la validation de l'API, elles ne la remplacent pas.

- Un seul profil (`id = 1`).
- Les adresses de liens (GitHub, démo, vérification, réseaux sociaux) doivent commencer par `https://`
  (impossible d'enregistrer `javascript:...`).
- Les types de fichiers sont limités à PDF, JPEG, PNG, WebP et AVIF. Le SVG est exclu volontairement.
- **Un seul CV peut être publié à la fois**, grâce à une colonne calculée et un index unique.
- Un e-mail d'administrateur est unique, sans tenir compte des majuscules.
- Les messages de contact sont limités à 5 000 caractères.
- Les mots de passe et les jetons de session ne sont jamais stockés en clair (empreintes seulement),
  et les adresses IP ne sont stockées que sous forme d'empreinte.

## Deux comptes MySQL aux droits séparés

| Compte               | Droits                                                    | Utilisé par                                              |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------------- |
| `portfolio_app`      | lire, ajouter, modifier, supprimer des **données**        | le site, en fonctionnement                               |
| `portfolio_migrator` | comme ci-dessus + créer/modifier/supprimer des **tables** | uniquement `npm run db:migrate`                          |
| `root`               | tout                                                      | uniquement pour créer les comptes, jamais dans le projet |

Si le site est un jour compromis, l'attaquant ne pourra pas supprimer ni modifier la structure des tables
avec le compte de l'application. La commande `npm run db:check` vérifie que c'est bien le cas.

## Mise en place sous Windows

1. **Vérifiez MySQL** : `mysql --version` (il doit s'agir de MySQL 8) et que le service tourne.
2. **Copiez le modèle de script** :
   ```powershell
   Copy-Item server\db\setup\create-database-and-users.example.sql server\db\setup\create-database-and-users.local.sql
   ```
   Ouvrez la copie `.local.sql`, remplacez les deux mots de passe (longs, uniques, différents), enregistrez.
   Les fichiers `*.local.sql` sont ignorés par Git.
3. **Exécutez la copie** avec le compte `root` (dans MySQL Workbench ou HeidiSQL : ouvrez le fichier puis exécutez-le).
   Vérifiez que les deux `SHOW GRANTS` affichent bien les droits attendus.
4. **Complétez `server\.env`** avec les mêmes mots de passe : `DB_USER`, `DB_PASSWORD`,
   `DB_MIGRATION_USER`, `DB_MIGRATION_PASSWORD` (voir `server\.env.example`).
5. **Appliquez les migrations** :
   ```powershell
   npm run db:status -w server
   npm run db:migrate -w server
   npm run db:check -w server
   ```

## Contenus de démonstration

La migration `0007` ajoute une colonne `is_demo` aux projets, compétences, expériences, certifications et
articles. La commande `npm run db:seed -w server` insère des exemples fictifs marqués `is_demo = 1` (et, s'ils
n'existent pas, le profil et la formation réels, qui ne sont jamais marqués comme démo). Elle refuse de
s'exécuter en production. `npm run db:seed -w server -- --reset` supprime puis recrée les exemples.

## Ajouter ou modifier une table plus tard

1. Créez un nouveau fichier `server/db/migrations/0007_description_en_minuscules.sql` (numéro suivant,
   sans trou).
2. **Ne modifiez jamais une migration déjà appliquée** : l'outil détecte le changement (empreinte du
   fichier) et refuse de continuer.
3. Lancez `npm run db:migrate -w server`.

## Tests d'intégration MySQL

Ils vérifient les contraintes ci-dessus sur une vraie base. Ils sont ignorés tant que `DB_TEST_NAME` n'est
pas défini dans `server\.env` (par exemple `DB_TEST_NAME=portfolio_test`). **Le nom doit se terminer par
`_test`** : la base de test est entièrement vidée à chaque exécution, et les tests refusent de tourner sur
tout autre nom pour ne jamais toucher à la vraie base.

## Limites connues

- MySQL valide automatiquement chaque instruction de structure : une migration interrompue en cours de
  route ne peut pas être annulée automatiquement. Les migrations sont donc courtes, et l'outil s'arrête
  à la première erreur.
- Les dates par défaut (`CURRENT_TIMESTAMP`) suivent le fuseau horaire du serveur MySQL. Configurez-le
  en UTC (`default-time-zone = '+00:00'`) ou fixez-le à la connexion en Phase 05.
- Sauvegardes et restauration : prévues en Phase 11.
- Le schéma n'a pas encore été vérifié par l'API (Phase 05) : des ajustements sont possibles.
