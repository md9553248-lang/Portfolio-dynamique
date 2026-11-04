# Sécurité de l'authentification

État : **Phase 06**. L'authentification, les sessions et le contrôle d'accès existent côté serveur, avec un écran
de connexion minimal. Les écrans de gestion (Phase 07) s'appuieront dessus. Rien ici ne rend le site
« inviolable » : ce sont des protections raisonnables, testées, avec leurs limites indiquées plus bas.

## Principe

- **Sessions côté serveur**, et non des jetons JWT conservés dans le navigateur. Une session se révoque
  immédiatement (déconnexion, changement de mot de passe, compte désactivé).
- Le navigateur reçoit un **cookie opaque** (256 bits aléatoires). La base ne garde que son **empreinte SHA-256** :
  une fuite de la base ne donne aucune session utilisable.
- **Rien dans `localStorage`** : ni session, ni mot de passe. Le jeton CSRF reste en mémoire de la page.

| Cookie | Valeur | Pourquoi |
|---|---|---|
| `HttpOnly` | toujours | un script injecté ne peut pas lire la session |
| `SameSite=Strict` | toujours | le cookie n'est jamais envoyé depuis un autre site |
| `Secure` | en production | transmis uniquement en HTTPS |
| nom `__Host-portfolio_session` | en production | le navigateur refuse tout cookie de ce nom posé par un sous-domaine |
| pas de durée (`Max-Age`) | toujours | cookie de session effacé à la fermeture du navigateur |

## Flux de connexion

1. `POST /api/auth/login` (e-mail + mot de passe, JSON obligatoire, origine contrôlée).
2. Le serveur vérifie le délai de connexion en cours (voir « Force brute »).
3. Il vérifie le mot de passe avec Argon2id. **Si le compte n'existe pas, il vérifie quand même une empreinte
   factice** : le temps de réponse ne révèle pas quels e-mails existent.
4. Échec : réponse **identique** pour un mauvais mot de passe, un compte inexistant ou désactivé
   (`401 INVALID_CREDENTIALS`).
5. Succès : une **nouvelle** session est créée (l'ancienne est fermée), les échecs sont remis à zéro,
   l'empreinte du mot de passe est mise à niveau si les paramètres ont changé.

## Force brute : trois couches

| Couche | Règle | Effet |
|---|---|---|
| Par adresse IP | 10 tentatives / 15 min | `429 TOO_MANY_REQUESTS` |
| Par e-mail + adresse IP | dès 5 échecs : attente de 30 s, qui double à chaque échec (plafond 15 min) | `429 TOO_MANY_ATTEMPTS` + `Retry-After` |
| Par e-mail, toutes adresses | dès 20 échecs : même délai progressif | protège contre une attaque répartie |

Il n'y a **pas de blocage définitif** : un attaquant ne peut pas verrouiller durablement le compte légitime
(le délai maximum est de 15 minutes). Les adresses IP et les e-mails saisis ne sont stockés que sous forme
d'empreinte HMAC. Les tentatives de plus de 30 jours sont supprimées.

## Mots de passe

- **Argon2id**, paramètres minimaux de l'OWASP (19 Mio de mémoire, 2 passes, 1 thread). Jamais de mot de passe en clair.
- Politique (création et changement) : 12 à 128 caractères, pas dans une liste de mots de passe courants, pas
  répétitif, et ne contenant ni le nom affiché ni la partie locale de l'e-mail (accents et casse ignorés).
  Une phrase de passe est la meilleure option.
- Le mot de passe est limité à 128 caractères à la connexion pour empêcher qu'un envoi géant ne sature le serveur.
- Changement de mot de passe (`POST /api/auth/change-password`) : session + jeton CSRF + mot de passe actuel
  exigés ; **toutes les autres sessions sont fermées**.

## Durée des sessions

| Réglage (`server/.env`) | Défaut | Rôle |
|---|---|---|
| `SESSION_ABSOLUTE_HOURS` | 12 | durée maximale, même en cas d'activité continue |
| `SESSION_IDLE_MINUTES` | 120 | déconnexion automatique après inactivité |

Les dates sont calculées par MySQL en UTC. Les sessions expirées sont supprimées au démarrage puis chaque heure.

## CSRF et origine

Les requêtes qui modifient des données (POST, PUT, PATCH, DELETE) exigent :

1. une **origine** égale à celle du site (`Origin`), et refusent `Sec-Fetch-Site: cross-site` ;
2. un **jeton CSRF** (`X-CSRF-Token`) : HMAC du jeton de session avec un secret serveur. Un autre site ne peut
   ni le lire ni le deviner. Comparaison en temps constant.

CORS n'est pas un mécanisme d'authentification : il ne remplace aucune des protections ci-dessus.

## Autorisations

- Toute route sous `/api/admin` passe par : session valide (`401`), rôle administrateur (`403`), origine et CSRF.
  Une adresse inexistante sous `/api/admin` répond aussi `401` à un anonyme : on ne révèle pas quelles routes existent.
- Le contrôle est fait **par le serveur**. La garde de l'interface (`RequireAuth`) n'est qu'un confort d'affichage.
- Il n'existe **aucune route d'inscription**.

## Premier administrateur et mot de passe oublié

Uniquement en ligne de commande, dans un terminal interactif (le mot de passe est saisi sans affichage, jamais
passé en argument ni écrit dans un fichier) :

```powershell
npm run admin:create -w server         # crée le premier compte (refuse s'il en existe déjà un)
npm run admin:set-password -w server   # mot de passe oublié : redéfinit le mot de passe et ferme toutes les sessions
```

Il n'y a pas de réinitialisation par e-mail : la ligne de commande suppose l'accès au serveur, ce qui est
volontaire pour un site à un seul administrateur.

## Journal d'audit

Les connexions réussies, échouées ou ralenties, déconnexions et changements de mot de passe sont inscrits dans
`audit_logs` avec une empreinte d'adresse IP. **Jamais** l'e-mail saisi, le mot de passe ni un jeton.

## Menaces et limites connues

| Risque | Mesure | Limite |
|---|---|---|
| Vol de mot de passe par force brute | délai progressif, limite par IP, Argon2id, politique de mots de passe | pas de double authentification (TOTP) pour l'instant |
| Vol du cookie de session | HttpOnly, SameSite=Strict, Secure, durée limitée, fermeture des autres sessions | un cookie volé reste utilisable jusqu'à expiration ou déconnexion |
| XSS | React échappe le contenu, cookie illisible par JavaScript | la CSP stricte reste à régler (Phase 10) |
| CSRF | origine + jeton lié à la session + SameSite=Strict | |
| Énumération de comptes | réponses identiques, calcul factice, délai non lié à l'existence du compte | |
| Fuite de la base | mots de passe Argon2id, jetons de session hachés, IP hachées | |
| Mauvaise configuration | le serveur refuse de démarrer en production sans secret solide ni HTTPS | |
| Limiteur de débit | compteurs en mémoire (un seul processus) | à revoir si plusieurs serveurs |

À faire avant la mise en production : HTTPS obligatoire, `SESSION_SECRET` aléatoire, `TRUST_PROXY` réglé
derrière un reverse proxy, décision sur la double authentification (décision n°7), revue de la CSP.
