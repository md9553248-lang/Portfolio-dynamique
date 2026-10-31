# Décisions d'architecture

Ce fichier garde la trace des décisions techniques. Une décision « retenue par défaut » vient de la
Phase 00 et peut être modifiée tant que la phase concernée n'est pas commencée.

| N°  | Décision                                                                                                                        | Statut                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | SPA React ; le serveur injectera les balises SEO/Open Graph et générera `sitemap.xml` (phase ultérieure)                        | Retenue par défaut                         |
| 2   | Déploiement sur une seule origine (site + API)                                                                                  | Retenue par défaut                         |
| 3   | Contenu bilingue via tables de traductions (interface FR d'abord)                                                               | Retenue par défaut                         |
| 4   | Articles en Markdown nettoyé                                                                                                    | Retenue par défaut                         |
| 5   | Accès MySQL : mysql2 + Knex                                                                                                     | Retenue par défaut (installés en Phase 04) |
| 6   | Stockage de fichiers via une interface abstraite (disque local en dev)                                                          | Retenue par défaut                         |
| 7   | Double authentification TOTP pour l'administrateur                                                                              | Retenue par défaut (Phase 06 ou 10)        |
| 8   | Hébergement cible (VPS Docker ou PaaS avec volume persistant et MySQL)                                                          | **Ouverte**                                |
| 9   | Licence du dépôt                                                                                                                | **Ouverte** (décision explicite requise)   |
| 10  | Taille maximale du CV : 5 Mo                                                                                                    | Retenue par défaut                         |
| 11  | Styles : variables CSS (tokens) + CSS Modules par composant, sans framework CSS                                                 | Phase 02, à valider                        |
| 12  | Polices auto-hébergées : Sora (titres) et Instrument Sans (texte) via `@fontsource-variable`                                    | Phase 02, à valider                        |
| 13  | Thème sombre par défaut, choix du visiteur mémorisé dans le navigateur, réglage système non suivi                               | Phase 02, à valider                        |
| 14  | Bibliothèque d'icônes : **lucide-react** (quelques icônes seulement, sans icônes de marques)                                    | Phase 03, à valider                        |
| 15  | Routage : react-router-dom, URLs en français (`/a-propos`, `/projets/<slug>`...)                                                | Phase 03, à valider                        |
| 16  | Contenus de démonstration dans `client/src/data/demo.ts`, marqués `demo: true`, affichés avec un badge « Démo »                 | Phase 03, à valider                        |
| 17  | Textes de l'interface regroupés dans `client/src/i18n/fr.ts` (anglais ajouté plus tard, sans bibliothèque pour l'instant)       | Phase 03, à valider                        |
| 18  | Aucun bouton de CV ni envoi de message tant que le backend n'existe pas : états explicites à la place                           | Phase 03, à valider                        |
| 19  | Migrations en fichiers SQL numérotés + petit exécuteur maison (mysql2), **à la place de Knex** prévu en décision 5              | Phase 04, à valider                        |
| 20  | Requêtes SQL écrites avec mysql2 en requêtes paramétrées, sans générateur de requêtes                                           | Phase 04, à valider                        |
| 21  | Deux comptes MySQL : `portfolio_app` (données) et `portfolio_migrator` (structure)                                              | Phase 04, à valider                        |
| 22  | Traductions dans des tables `*_translations` (langues `fr` et `en`)                                                             | Phase 04, à valider                        |
| 23  | Un seul CV publié, garanti par la base (colonne calculée + index unique)                                                        | Phase 04, à valider                        |
| 24  | API publique en lecture seule + formulaire de contact ; routes d'écriture après l'authentification                              | Phase 05, à valider                        |
| 25  | Contenus de démonstration en base (colonne `is_demo`) alimentés par `npm run db:seed`, jamais en production                     | Phase 05, à valider                        |
| 26  | Protection anti-spam du contact : limite de 5 envois/heure/IP, champ piège, JSON obligatoire, IP stockée sous forme d'empreinte | Phase 05, à valider                        |
| 27  | Tests HTTP avec de faux dépôts en mémoire (sans MySQL) + tests d'intégration MySQL séparés                                      | Phase 05, à valider                        |
| 28  | Le site public continue de lire ses contenus dans des fichiers jusqu'à l'étape « raccordement » (Phase 05 bis)                  | Phase 05, à valider                        |
