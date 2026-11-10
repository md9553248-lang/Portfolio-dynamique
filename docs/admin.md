# Administration

État : **Phase 07, partie 1**. L'espace d'administration (`/admin`) existe avec : tableau de bord, gestion du CV
et médiathèque. La gestion des projets, compétences, expériences, formations, certifications, articles, du profil et
des réglages arrive dans les parties suivantes de la Phase 07 ; la boîte de réception des messages en Phase 08.

L'administration est un espace séparé du site public (sans sa navigation), non référencé par les moteurs de
recherche, et protégé par l'authentification décrite dans `docs/security.md`.

## Écrans disponibles

| Écran | Adresse | Rôle |
|---|---|---|
| Connexion | `/admin/connexion` | identification de l'administrateur |
| Tableau de bord | `/admin` | statistiques réelles et activité récente |
| CV | `/admin/cv` | importer, prévisualiser, publier, masquer, supprimer |
| Médias | `/admin/medias` | importer, décrire, remplacer, supprimer des images et des PDF |

## Tableau de bord

Chiffres calculés dans la base (jamais inventés) : projets et articles publiés ou en brouillon, messages reçus et non
lus, fichiers de la médiathèque, date de publication du CV, **connexions échouées des dernières 24 heures**, et
l'activité récente (actions d'administration, connexions). Les échecs de connexion individuels sont comptés, pas
listés, pour ne pas encombrer l'écran.

## Gestion du CV

Parcours d'un nouveau CV :

1. **Importer** un PDF. Il devient un **brouillon** : le CV en ligne ne change pas.
2. **Prévisualiser** le brouillon dans la page (un lien permet de l'ouvrir dans un nouvel onglet).
3. **Publier** : en une opération unique, le brouillon devient le CV en ligne et l'ancien est archivé.
   Ou **annuler l'import** (suppression du brouillon, après confirmation).
4. **Masquer** le CV : le bouton « Télécharger mon CV » disparaît du site. Une version archivée peut être
   **republiée** ou **supprimée**.

Garanties :

- Le bouton public lit l'état à chaque affichage : un CV publié ou masqué est visible tout de suite, **sans modifier le
  code ni redéployer**. Le téléchargement est servi sans cache aveugle (`no-cache` + empreinte du fichier) : un
  visiteur ne peut pas recevoir l'ancienne version par erreur.
- **Le CV publié n'est jamais perdu** : un envoi refusé (mauvais type, trop gros, panne) ne modifie rien. Le brouillon
  précédent n'est supprimé que si le nouveau est bien enregistré (même transaction).
- Une seule version peut être publiée à la fois : c'est la base de données elle-même qui l'impose.
- Le fichier téléchargé est nommé par le serveur (« CV-Prenom-Nom.pdf »), jamais d'après le nom envoyé.
- Les anciennes versions et les brouillons ne sont accessibles qu'aux administrateurs connectés.
- Barre de progression pendant l'envoi, messages d'erreur clairs (fichier trop gros, PDF invalide, serveur injoignable).

Taille maximale : `CV_MAX_SIZE_MB` dans `server/.env` (5 Mo par défaut).

## Médiathèque

- Formats : **JPEG, PNG, WebP, AVIF et PDF**. Le SVG est refusé volontairement (il peut contenir du code actif).
- Un **texte alternatif** décrit chaque image pour les lecteurs d'écran.
- **Visibilité** : une image est publique par défaut, un PDF privé. Un fichier privé n'est jamais servi aux visiteurs.
- **Remplacer** un fichier garde son identifiant (les contenus qui l'utilisent restent valides) mais change son adresse
  publique, donc aucune ancienne copie en cache ne peut persister.
- **Supprimer** est refusé tant que le fichier est utilisé (image de projet, galerie, photo du profil, article,
  certification, CV) : l'écran indique alors où il est utilisé.
- Taille maximale : `MEDIA_MAX_SIZE_MB` dans `server/.env` (5 Mo par défaut).

## Sécurité des fichiers téléversés

| Risque | Mesure |
|---|---|
| Faux type (HTML ou programme déguisé en image ou en PDF) | le type est déterminé d'après le **contenu** (signature des octets), jamais l'extension ni le type annoncé |
| PDF avec JavaScript, lancement de programme, fichier joint | refusés (recherche de ces éléments actifs). Limite : un PDF peut les compresser ; la visionneuse du navigateur reste isolée |
| PDF tronqué ou fabriqué | refusé (signature et marqueur de fin obligatoires) |
| Nom de fichier piégé (`../../x`, caractères de contrôle) | le fichier est enregistré sous un **UUID** généré par le serveur ; le nom d'origine n'est qu'un libellé nettoyé |
| Traversée de dossier / accès à un fichier quelconque | les clés de stockage doivent être des UUID ; le chemin final est vérifié ; les adresses publiques refusent tout autre format |
| Exécution d'un fichier envoyé | aucun fichier n'est exécuté ni servi par un serveur web : il est lu et renvoyé par l'API, avec `X-Content-Type-Options: nosniff` |
| Fichier privé divulgué | seuls les fichiers publics sont servis aux visiteurs ; un fichier privé et une adresse inconnue donnent le même `404` |
| Envoi de fichier énorme | taille limitée à la réception, un seul fichier par envoi |
| Écriture interrompue | enregistrement atomique ; si la base échoue, le fichier est retiré |

## Stockage et sauvegardes

- Les fichiers sont rangés dans le dossier `STORAGE_LOCAL_PATH` (`server/storage/` par défaut), **ignoré par Git** : ni
  CV, ni image téléversée ne se retrouve jamais dans le dépôt.
- En production, ce dossier doit se trouver sur un **disque durable** (volume persistant), sinon les fichiers disparaissent
  à chaque redéploiement. Une variante de stockage objet (S3) pourra être ajoutée sans changer le reste du code.
- **Sauvegarde** : la base MySQL et le dossier de stockage forment un tout et doivent être sauvegardés ensemble
  (export de la base + copie du dossier, chiffrés, hors du dépôt). Restaurer l'un sans l'autre laisserait des références
  vers des fichiers absents. La mise en place automatique et la procédure de restauration testée sont prévues en Phase 11.

## Limites connues

- Les écrans de gestion des contenus (projets, compétences, articles, profil, réglages) ne sont pas encore là.
- Le site public lit encore ses contenus (hors bouton de CV) dans des fichiers : son raccordement à l'API accompagne
  l'arrivée de chaque écran de gestion.
- L'aperçu du CV s'appuie sur la visionneuse PDF du navigateur ; un lien d'ouverture dans un nouvel onglet est fourni.
- Le contrôle des éléments actifs d'un PDF est une défense supplémentaire, pas une garantie.
