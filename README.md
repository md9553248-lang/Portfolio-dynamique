# Portfolio professionnel dynamique

Portfolio professionnel administrable et sécurisé : React + TypeScript (frontend), Node.js + Express +
TypeScript (backend), MySQL.

> **État du projet : Phase 05 (backend).** Le projet comprend un socle technique, un design system, les
> pages publiques (contenus de démonstration lus dans des fichiers), le schéma MySQL, une API publique
> en lecture seule et un formulaire de contact qui enregistre les messages. L'authentification,
> l'administration et le raccordement des pages à l'API **ne sont pas encore implémentés**.

## Ce qui existe réellement aujourd'hui

- Monorepo npm (`client/` et `server/`).
- Backend Express : route `GET /api/health`, en-têtes de sécurité (Helmet), CORS restreint à une origine,
  limite de taille des requêtes JSON, gestion d'erreurs centralisée, journaux (pino) avec masquage des
  champs sensibles.
- Validation de la configuration au démarrage : en production, le serveur refuse de démarrer si un
  paramètre essentiel manque, si le compte MySQL est `root`, si une valeur d'exemple est utilisée ou si
  l'origine n'est pas en HTTPS.
- Design system (frontend) : variables de design (tokens), thèmes sombre et clair, polices
  auto-hébergées, composants communs (bouton, carte, badge, champs de formulaire, navigation
  responsive, pied de page, indicateur de chargement, cadre cinéma, trait de lumière).
- Page **Guide de style** (`/guide-de-style`) : catalogue visuel des composants (page technique).
- Site public : accueil, à propos, projets (avec filtre et détail), compétences, expériences,
  formations, certifications, actualités, contact, confidentialité, mentions légales, page 404 et
  page d'erreur. Contenus statiques : voir `docs/public-site.md`.
- API REST (Express) : lecture des contenus publiés, formulaire de contact avec validation Zod, limitation
  de débit, champ piège anti-spam, requêtes SQL préparées, erreurs centralisées, contrôle de santé.
  Voir `docs/api.md`.
- Base de données : schéma MySQL (28 tables) en migrations SQL versionnées, exécuteur de migrations,
  deux comptes MySQL aux droits séparés (application / migrations) et commande de contrôle des droits.
  Voir `docs/database.md`.
- ESLint, Prettier, TypeScript strict, Vitest, Supertest, Testing Library.

## Ce qui n'existe pas encore

Pages qui lisent leurs contenus dans l'API (elles lisent encore des fichiers), routes d'écriture,
authentification, création du premier administrateur, administration, gestion du CV et des médias,
consultation des messages, notification par e-mail, animations, anglais, déploiement. Ces
éléments arrivent dans les phases 06 à 11.

## Prérequis (Windows)

- Node.js LTS récent (le projet exige au minimum Node 20.19) et npm
- Git for Windows
- Visual Studio Code (extensions recommandées proposées automatiquement)
- MySQL : nécessaire à partir de la Phase 04 seulement

```powershell
node -v
npm -v
git --version
```

## Installation

Les dépendances ne sont volontairement pas figées dans les `package.json` : on installe les versions
disponibles au moment du développement, puis `package-lock.json` les fige. Depuis la racine du projet :

```powershell
# Outils communs (racine)
npm install -D eslint @eslint/js typescript-eslint eslint-plugin-react-hooks globals eslint-config-prettier prettier "typescript@<6.1.0"

# Backend
npm install -w server express cors helmet pino zod dotenv mysql2 express-rate-limit
npm install -D -w server @types/express @types/cors @types/node tsx vitest supertest @types/supertest

# Frontend
npm install -w client react react-dom react-router-dom lucide-react @fontsource-variable/sora @fontsource-variable/instrument-sans
npm install -D -w client vite @vitejs/plugin-react @types/react @types/react-dom vitest jsdom @testing-library/react
```

Si npm signale un conflit de dépendances (`ERESOLVE`), ne forcez pas l'installation avec `--force` :
lisez le message (il indique quel paquet est en conflit) et cherchez une version compatible.

Exécutez toujours ces commandes **depuis le dossier du projet**, jamais depuis `C:\Windows\System32`.

## Configuration

```powershell
Copy-Item server\.env.example server\.env
```

Pour générer un vrai secret de session (à placer dans `SESSION_SECRET`) :

```powershell
node -e "import('node:crypto').then(c=>console.log(c.randomBytes(48).toString('hex')))"
```

Le fichier `server\.env` est ignoré par Git. Ne le publiez jamais. Le frontend ne contient aucun secret :
tout ce qui commence par `VITE_` serait visible publiquement.

## Base de données (MySQL)

Prérequis : MySQL 8. La procédure complète (création des comptes, droits, migrations) est dans
`docs/database.md`. En résumé :

```powershell
npm run db:status -w server    # état des migrations
npm run db:migrate -w server   # applique les migrations en attente
npm run db:check -w server     # vérifie la connexion et les droits minimaux du compte de l'application
npm run db:seed -w server      # insère des contenus de démonstration (jamais en production)
```

Les scripts `db:migrate`, `db:status`, `db:check` et `db:seed` doivent exister dans `server/package.json` :

```powershell
npm pkg set "scripts.db:migrate=tsx src/scripts/migrate.ts up" -w server
npm pkg set "scripts.db:status=tsx src/scripts/migrate.ts status" -w server
npm pkg set "scripts.db:check=tsx src/scripts/db-check.ts" -w server
npm pkg set "scripts.db:seed=tsx src/scripts/seed.ts" -w server
```

## Lancement (deux fenêtres PowerShell)

```powershell
npm run dev:server   # API sur http://localhost:4000
npm run dev:client   # site sur http://localhost:5173
```

Le serveur exige que MySQL tourne et que `server\.env` soit correct (il s'arrête avec un message clair sinon).
Ouvrez http://localhost:5173 : l'accueil s'affiche. La page http://localhost:5173/guide-de-style
montre le message « API disponible » quand le serveur tourne.

## Qualité

```powershell
npm run format        # met en forme tous les fichiers (Prettier)
npm run lint
npm run typecheck
npm run test
npm run build
npm run format:check
npm run audit:deps
```

## Documentation du site et du design

- `docs/public-site.md` : pages, adresses, origine des contenus, limites actuelles.

- `docs/design-system.md` : concept, tokens, thèmes, règles d'accessibilité, contrastes.

## Sécurité (état actuel)

En place : Helmet, CORS limité, taille des requêtes limitée, erreurs sans trace interne, journaux
masquant mots de passe/cookies/jetons, validation stricte de la configuration, polices auto-hébergées
(aucune requête vers un service externe), `.gitignore` excluant secrets, `.env`, fichiers téléversés
et sauvegardes.

Pas encore en place : authentification, sessions, CSRF, limitation de débit, validation des entrées
métier, protection des fichiers (phases 05 à 07).

Avant chaque publication sur GitHub :

```powershell
git status
git ls-files
```

Vérifiez qu'aucun `.env`, CV, sauvegarde ou clé privée n'apparaît dans la liste.

## Documentation

- `docs/decisions.md` : décisions d'architecture.
- `docs/design-system.md` : design system.
- `docs/public-site.md` : site public.
- `docs/database.md` : base de données, comptes MySQL, migrations.
- `docs/api.md` : routes de l'API, codes d'erreur, protections.

## Limites connues

- Le rendu visuel n'a pas encore été contrôlé avec Lighthouse ni axe (prévu en Phase 10).
- Aucune capture d'écran n'est encore disponible.
- Les tests d'intégration MySQL ne s'exécutent que si `DB_TEST_NAME` est défini (voir `docs/database.md`).
- Le formulaire de contact enregistre les messages, mais aucune interface ne permet encore de les lire (Phase 08).
- Les pages légales sont des textes provisoires à compléter et à faire relire.
- Licence non choisie (décision explicite à prendre).

## Licence

À définir.
