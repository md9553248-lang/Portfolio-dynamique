# API

État : **Phase 06**. L'API publique est en lecture seule, plus l'envoi du formulaire de contact. L'authentification
existe (voir `docs/security.md`) ; les routes de gestion des contenus arrivent en Phase 07.
Les routes qui servent les fichiers (images, CV à télécharger) arrivent avec le stockage (Phase 07).

Toutes les réponses sont en JSON. Succès : `{ "data": ... }`. Erreur :
`{ "error": { "code": "...", "message": "...", "fields": { ... } } }` (`fields` seulement pour une erreur de validation).

## Routes

| Méthode | Adresse | Rôle |
|---|---|---|
| GET | `/api/health` | Le serveur répond |
| GET | `/api/health/ready` | Le serveur et la base répondent (503 sinon) |
| GET | `/api/public/profile` | Profil et liens sociaux |
| GET | `/api/public/projects` | Projets publiés. Filtres : `category`, `featured=true\|false` |
| GET | `/api/public/projects/:slug` | Détail d'un projet publié |
| GET | `/api/public/skills` | Compétences visibles, groupées par catégorie |
| GET | `/api/public/experiences` | Expériences visibles |
| GET | `/api/public/educations` | Formations visibles |
| GET | `/api/public/certifications` | Certifications visibles |
| GET | `/api/public/articles` | Articles publiés (du plus récent au plus ancien) |
| GET | `/api/public/articles/:slug` | Un article publié (contenu en Markdown brut) |
| GET | `/api/public/settings` | Réglages publics (thème par défaut, langues) |
| GET | `/api/public/cv` | `{ available, updatedAt }` : un CV est-il publié ? |
| POST | `/api/contact` | Envoi du formulaire de contact |
| POST | `/api/auth/login` | Connexion (e-mail + mot de passe) : pose le cookie de session, renvoie l'utilisateur et le jeton CSRF |
| GET | `/api/auth/me` | Session courante (401 sinon) : utilisateur et jeton CSRF |
| POST | `/api/auth/logout` | Déconnexion (jeton CSRF exigé si une session existe) |
| POST | `/api/auth/change-password` | Changement de mot de passe (session + CSRF) ; ferme les autres sessions |
| GET | `/api/admin/status` | Vérification technique de l'accès administrateur (session + rôle) |

Paramètre commun : `?locale=fr` ou `?locale=en` (français par défaut ; une traduction manquante
retombe sur le français).

## Formulaire de contact

Corps JSON obligatoire (`Content-Type: application/json`) :

```json
{ "name": "...", "email": "...", "subject": "...", "message": "...", "website": "" }
```

- Limites : nom 2 à 100, e-mail 3 à 254, sujet 3 à 150, message 10 à 5000 caractères.
- Aucun saut de ligne dans le nom, l'e-mail et le sujet (protection contre l'injection d'en-têtes d'e-mail).
- `website` est un champ piège : il doit rester vide. S'il est rempli, la réponse est un succès mais rien n'est enregistré.
- Tout champ non prévu est refusé.
- Réponses : `201` enregistré, `400` données invalides, `413` corps trop gros, `415` pas du JSON, `429` trop d'envois.

## Codes d'erreur

| Statut | `code` | Signification |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Données invalides (détail dans `fields`) |
| 400 | `BAD_REQUEST` | Requête mal formée (JSON invalide...) |
| 404 | `NOT_FOUND` | Ressource inexistante, non publiée ou masquée |
| 413 | `PAYLOAD_TOO_LARGE` | Corps de requête trop volumineux (20 ko maximum) |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Le contenu n'est pas du JSON |
| 401 | `UNAUTHENTICATED` | Aucune session valide |
| 401 | `INVALID_CREDENTIALS` | Identifiants incorrects (même réponse quel que soit le motif) |
| 403 | `FORBIDDEN` | Session valide mais rôle insuffisant |
| 403 | `FORBIDDEN_ORIGIN` | Requête d'écriture venant d'une autre origine |
| 403 | `INVALID_CSRF_TOKEN` | Jeton CSRF absent ou invalide |
| 429 | `TOO_MANY_REQUESTS` | Limite de requêtes dépassée (en-tête `Retry-After`) |
| 429 | `TOO_MANY_ATTEMPTS` | Trop d'échecs de connexion : délai progressif (en-tête `Retry-After`) |
| 500 | `INTERNAL_ERROR` | Erreur interne (aucun détail n'est donné au client) |
| 503 | (`status: "unavailable"`) | Base de données indisponible (`/api/health/ready`) |

## Protections en place

- **Validation** de toutes les entrées côté serveur avec Zod. Les valeurs reçues ne sont jamais recopiées dans les erreurs.
- **Requêtes SQL préparées** uniquement : aucune valeur n'est assemblée dans le texte SQL.
- **Limitation de débit** par adresse IP : 300 requêtes par 15 minutes pour les lectures, 5 envois par heure pour le contact
  (les envois invalides comptent aussi). Les compteurs sont en mémoire, donc valables pour un seul processus.
- **Adresse IP** : seule une empreinte HMAC non réversible est stockée. Derrière un reverse proxy, configurez
  `TRUST_PROXY` (sinon tous les visiteurs auraient la même adresse).
- **Contenus publiés uniquement** : brouillons, éléments masqués et fichiers privés ne sont jamais renvoyés.
- **Erreurs** : réponses génériques en cas de problème interne, détails uniquement dans les journaux.
- **Journaux** : méthode, chemin (sans paramètres d'URL), statut, durée et identifiant de requête (`X-Request-Id`).
  Jamais le corps, les cookies ni les mots de passe.
- **Cache** : `Cache-Control: no-cache` sur toute l'API, pour qu'une modification soit visible tout de suite.

## Limites connues

- Aucune route de gestion des contenus (hors contact et authentification) : les contenus se remplissent avec `npm run db:seed` en attendant l'administration (Phase 07).
- Pas de double authentification (TOTP) pour l'instant.
- L'envoi d'un e-mail de notification à la réception d'un message est prévu en Phase 08.
- Les URL d'images (`/api/public/media/<identifiant>`) sont préparées mais le service de fichiers n'existe pas encore.
