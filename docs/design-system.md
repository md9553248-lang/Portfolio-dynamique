# Design system

Ce document décrit l'identité visuelle et les règles à respecter pour toutes les pages (publiques
et administration). État : **Phase 02**. Le design n'a pas encore été vérifié dans un navigateur
par l'auteur du code : les captures et les contrôles Lighthouse/axe sont à faire (voir « Vérifications »).

## Concept

Un portfolio « cinématographique » sobre : fonds très sombres, une seule couleur d'accent (bleu
électrique) et **un élément signature**, le _trait de lumière_ horizontal (`LightStreak`), inspiré
des reflets anamorphiques du cinéma. Il n'apparaît que sous l'en-tête, au-dessus du pied de page et
pour séparer de grandes parties. Les cadres de médias (`CinemaFrame`) utilisent le format 2,39:1.

Règle de retenue : un seul effet lumineux global (la lueur ambiante du fond), une lueur au survol
des boutons principaux et des cartes interactives, et le trait de lumière. Rien d'autre.

## Où modifier quoi

| Je veux changer...                          | Fichier                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| Une couleur (accent, fonds, textes)         | `client/src/styles/tokens.css`                                            |
| Les polices                                 | `tokens.css` (variables `--font-*`) et imports dans `client/src/main.tsx` |
| Les tailles de texte, espacements, arrondis | `tokens.css`                                                              |
| L'apparence d'un composant                  | `client/src/components/ui/<Composant>.module.css`                         |

Pour changer la couleur d'accent, modifiez `--color-accent`, `--color-accent-hover`,
`--color-accent-text`, `--color-accent-soft`, `--color-glow` et `--color-focus` dans **les deux**
thèmes, puis vérifiez les contrastes (ci-dessous). En Phase 07, l'administration pourra surcharger
ces variables sans toucher au code.

## Thèmes

- Le thème sombre est le thème par défaut du site. Le thème clair est disponible via le bouton de
  l'en-tête.
- Le choix du visiteur est mémorisé dans le navigateur (`localStorage`, clé `portfolio-theme`) : c'est une
  simple préférence d'affichage, sans donnée personnelle. Si le stockage est bloqué, le thème fonctionne
  quand même pour la session.
- Le thème est appliqué avant le premier rendu (`initTheme()` dans `main.tsx`), sans script en ligne,
  ce qui reste compatible avec une politique CSP stricte.
- Le réglage du système (`prefers-color-scheme`) n'est volontairement pas suivi : l'identité du site est
  sombre. Cela peut changer sur simple demande.

## Typographie

- Titres : **Sora** (géométrique, caractère marqué). Texte : **Instrument Sans** (lisible, sobre).
- Polices auto-hébergées via `@fontsource-variable/*` : aucune requête vers un service externe.
- Échelle fluide `--text-sm` à `--text-5xl` (la taille s'adapte à la largeur de l'écran).
- Longueur de ligne limitée à `68ch`.
- Phrases et libellés en minuscules normales (pas de capitales d'ornement).

## Responsive

Mobile d'abord. Points de rupture (en `em`) : `40em` (640px), `48em` (768px), `64em` (1024px),
`80em` (1280px). La navigation passe d'un menu déroulant (mobile) à une barre en ligne à partir de `48em`.

## Accessibilité (règles du design system)

- Focus clavier toujours visible (`:focus-visible`) et lien d'accès rapide au contenu.
- Cibles tactiles d'au moins 44px pour les boutons principaux et champs.
- Champs : libellé obligatoire, aide et erreur reliées par `aria-describedby`, `aria-invalid`.
- Menu mobile : `aria-expanded`, `aria-controls`, fermeture par Échap avec retour du focus.
- `prefers-reduced-motion` : transitions et animations quasi supprimées globalement.
- Seules les propriétés `transform` et `opacity` sont animées pour les effets de lueur et de survol.

### Contrastes calculés (WCAG, ratio minimum 4,5:1 pour le texte)

| Paire                                       | Sombre               | Clair              |
| ------------------------------------------- | -------------------- | ------------------ |
| Texte sur fond                              | 17,35                | 17,53              |
| Texte sur surface                           | 16,27                | 18,96              |
| Texte atténué sur fond / surface            | 9,30 / 8,72          | 6,80 / 7,35        |
| Accent (texte) sur fond / surface           | 7,83 / 7,34          | 6,77 / 7,32        |
| Blanc sur bouton principal                  | 4,90                 | 6,00               |
| Blanc sur bouton principal (survol)         | 6,07                 | 7,32               |
| Texte « subtil » sur surface                | 5,86                 | 4,56               |
| Erreur / succès / avertissement sur surface | 8,41 / 10,65 / 11,12 | 6,57 / 5,69 / 6,80 |

`--color-text-subtle` ne doit être utilisé que sur `--color-bg` ou `--color-surface` (placeholders),
jamais sur `--color-surface-2` en thème clair. Les autres combinaisons (par exemple les badges sur
fond teinté) restent à contrôler avec un outil comme axe ou Lighthouse en Phase 10.

## Ce qui est volontairement reporté

- Animations d'entrée, transitions de pages et de thème, parallaxe : Phase 09.
- Bibliothèque d'icônes : choisie en Phase 03, avec les pages qui en ont besoin (seules deux icônes
  SVG intégrées existent : thème et menu).
- Personnalisation des couleurs depuis l'administration : Phase 07.
