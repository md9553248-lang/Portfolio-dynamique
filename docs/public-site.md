# Site public

État : **Phase 03**. Les pages publiques existent et fonctionnent dans le navigateur, mais leur
contenu est **statique** : il vient de fichiers du dépôt et non de la base de données.

## Pages et adresses

| Page | Adresse |
|---|---|
| Accueil | `/` |
| À propos | `/a-propos` |
| Projets, détail d'un projet | `/projets`, `/projets/<slug>` |
| Compétences | `/competences` |
| Expériences | `/experiences` |
| Formations | `/formations` |
| Certifications | `/certifications` |
| Actualités, détail d'un article | `/actualites`, `/actualites/<slug>` |
| Contact | `/contact` |
| Confidentialité, mentions légales | `/confidentialite`, `/mentions-legales` |
| Guide de style (technique, hors navigation) | `/guide-de-style` |
| Page introuvable | toute autre adresse |

Une page d'erreur de secours (`ErrorBoundary`) s'affiche si un composant plante.

## D'où viennent les contenus

| Fichier | Contenu | Nature |
|---|---|---|
| `client/src/data/site.ts` | nom, titre, présentation, objectifs, lien GitHub | informations réelles, textes de présentation en brouillon |
| `client/src/data/demo.ts` | projets, compétences, expériences, certifications, articles | **exemples fictifs** (`demo: true`) |
| `client/src/data/demo.ts` (`education`) | formation à l'UADB | informations réelles |

Les contenus fictifs sont signalés sur le site par un badge « Démo » et un bandeau.
Ils disparaissent quand la base MySQL (Phase 04), l'API (Phase 05) et l'administration (Phase 07)
fourniront les vrais contenus. Les projets et articles en `draft` ne sont jamais affichés.

## Ce qui ne fonctionne pas encore (volontairement)

- **Formulaire de contact** : valide les champs dans le navigateur, mais n'envoie rien. Il le dit
  clairement après validation. L'envoi arrive avec le backend (Phases 05 et 08).
- **CV** : aucun bouton de téléchargement, seulement « CV bientôt disponible ». La gestion du CV
  arrive en Phase 07.
- **Photo** : les initiales sont affichées en attendant l'import d'une photo depuis l'administration.
- **Articles** : le texte est une suite de paragraphes. Le rendu Markdown nettoyé arrive avec les
  vrais articles.
- **Référencement (SEO)** : le titre et la description de chaque page sont mis à jour dans le
  navigateur. Les balises Open Graph, le sitemap et `robots.txt` sont prévus côté serveur.
- **Anglais** : les textes de l'interface sont regroupés dans `client/src/i18n/fr.ts`, ce qui
  prépare l'ajout de l'anglais, mais le changement de langue n'existe pas encore.
- **Performances** : toutes les pages sont chargées d'un bloc. Le chargement à la demande
  (`lazy`) sera examiné en Phases 09 et 10.

## Navigation et accessibilité

- Lien « Aller au contenu principal » en premier élément focusable.
- Menu en ligne à partir de 1120px de large, menu déroulant en dessous (8 pages à afficher).
- Après un changement de page : retour en haut, focus sur la zone principale, titre de l'onglet mis à jour.
- Liens vers d'autres sites : nouvel onglet, `rel="noopener noreferrer"` et mention pour les lecteurs d'écran.
- Formulaire : libellés, erreurs reliées aux champs, validation côté navigateur seulement
  (le serveur devra tout revalider).

## Pages légales

La page de confidentialité et les mentions légales sont des **textes provisoires**, signalés comme
tels sur le site. Elles doivent être complétées (hébergeur, durée de conservation) et relues avant
l'activation du formulaire de contact et la mise en ligne.
