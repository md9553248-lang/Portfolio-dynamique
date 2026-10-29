# Décisions d'architecture

Ce fichier garde la trace des décisions techniques. Une décision « retenue par défaut » vient de la
Phase 00 et peut être modifiée tant que la phase concernée n'est pas commencée.

| N°  | Décision                                                                                                 | Statut                                     |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | SPA React ; le serveur injectera les balises SEO/Open Graph et générera `sitemap.xml` (phase ultérieure) | Retenue par défaut                         |
| 2   | Déploiement sur une seule origine (site + API)                                                           | Retenue par défaut                         |
| 3   | Contenu bilingue via tables de traductions (interface FR d'abord)                                        | Retenue par défaut                         |
| 4   | Articles en Markdown nettoyé                                                                             | Retenue par défaut                         |
| 5   | Accès MySQL : mysql2 + Knex                                                                              | Retenue par défaut (installés en Phase 04) |
| 6   | Stockage de fichiers via une interface abstraite (disque local en dev)                                   | Retenue par défaut                         |
| 7   | Double authentification TOTP pour l'administrateur                                                       | Retenue par défaut (Phase 06 ou 10)        |
| 8   | Hébergement cible (VPS Docker ou PaaS avec volume persistant et MySQL)                                   | **Ouverte**                                |
| 9   | Licence du dépôt                                                                                         | **Ouverte** (décision explicite requise)   |
| 10  | Taille maximale du CV : 5 Mo                                                                             | Retenue par défaut                         |
| 11  | Styles : variables CSS (tokens) + CSS Modules par composant, sans framework CSS                          | Phase 02, à valider                        |
| 12  | Polices auto-hébergées : Sora (titres) et Instrument Sans (texte) via `@fontsource-variable`             | Phase 02, à valider                        |
| 13  | Thème sombre par défaut, choix du visiteur mémorisé dans le navigateur, réglage système non suivi        | Phase 02, à valider                        |
| 14  | Bibliothèque d'icônes : choix reporté à la Phase 03                                                      | Ouverte                                    |
