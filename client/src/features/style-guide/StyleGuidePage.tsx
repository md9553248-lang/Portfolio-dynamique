import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CinemaFrame,
  Container,
  LightStreak,
  Section,
  Spinner,
  TextAreaField,
  TextField,
} from '../../components/ui';
import { usePageMeta } from '../../hooks/usePageMeta';
import { ApiStatus } from './ApiStatus';
import styles from './StyleGuidePage.module.css';

const COLORS = [
  ['Fond', '--color-bg'],
  ['Surface', '--color-surface'],
  ['Surface élevée', '--color-surface-2'],
  ['Texte', '--color-text'],
  ['Texte atténué', '--color-text-muted'],
  ['Accent (fonds)', '--color-accent'],
  ['Accent (texte)', '--color-accent-text'],
  ['Succès', '--color-success'],
  ['Avertissement', '--color-warning'],
  ['Erreur', '--color-danger'],
] as const;

const TYPE_SCALE = [
  ['Très grand titre', '--text-5xl'],
  ['Grand titre', '--text-4xl'],
  ['Titre de page', '--text-3xl'],
  ['Titre de section', '--text-2xl'],
  ['Sous-titre', '--text-xl'],
  ['Texte d’introduction', '--text-lg'],
  ['Texte courant', '--text-base'],
  ['Petit texte', '--text-sm'],
] as const;

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

function EmailFieldDemo() {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);
  const error =
    touched && !EMAIL_PATTERN.test(value)
      ? 'Saisissez une adresse e-mail valide, par exemple nom@exemple.com.'
      : undefined;

  return (
    <TextField
      label="Adresse e-mail"
      type="email"
      name="email-demo"
      autoComplete="email"
      hint="Démonstration : rien n’est envoyé."
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => setTouched(true)}
      error={error}
      required
    />
  );
}

/**
 * Page PROVISOIRE de la Phase 02 : catalogue visuel du design system.
 * Le vrai site public (accueil, projets, contact...) est construit en Phase 03.
 */
export function StyleGuidePage() {
  usePageMeta('Guide de style');

  return (
    <>
      <Container className={styles.intro}>
        <h1>Guide de style</h1>
        <p className={styles.lead}>
          Cette page présente les couleurs, les textes et les composants du site. Elle est technique
          et provisoire : le site public sera construit à la phase suivante.
        </p>
        <ApiStatus />
      </Container>

      <LightStreak />

      <Section
        id="couleurs"
        title="Couleurs"
        description="Les couleurs changent avec le thème. Utilisez le bouton en haut à droite pour comparer le thème sombre et le thème clair."
      >
        <ul className={styles.swatches}>
          {COLORS.map(([name, token]) => (
            <li key={token} className={styles.swatch}>
              <span
                className={styles.chip}
                style={{ background: `var(${token})` }}
                aria-hidden="true"
              />
              <span>{name}</span>
              <code>{token}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="typographie"
        title="Typographie"
        description="Sora pour les titres, Instrument Sans pour le texte. Les tailles s’adaptent à la largeur de l’écran."
      >
        <ul className={styles.scale}>
          {TYPE_SCALE.map(([name, token]) => (
            <li key={token} className={styles.scaleRow}>
              <span
                className={
                  token === '--text-lg' || token === '--text-base' || token === '--text-sm'
                    ? styles.body
                    : styles.display
                }
                style={{ fontSize: `var(${token})` }}
              >
                {name}
              </span>
              <code>{token}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="composants"
        title="Boutons, badges et cartes"
        description="Chaque bouton existe en trois variantes et trois tailles. Ces boutons sont des démonstrations : ils n’exécutent aucune action."
      >
        <div className={styles.stack}>
          <div className={styles.row}>
            <Button variant="primary">Voir les projets</Button>
            <Button variant="secondary">Me contacter</Button>
            <Button variant="ghost">Lire l’article</Button>
            <Button variant="primary" href="#couleurs">
              Lien d’apparence bouton
            </Button>
          </div>
          <div className={styles.row}>
            <Button size="sm">Petit</Button>
            <Button size="md">Moyen</Button>
            <Button size="lg">Grand</Button>
            <Button disabled>Désactivé</Button>
            <Button loading>Envoi en cours</Button>
          </div>
          <div className={styles.row}>
            <Badge>Neutre</Badge>
            <Badge tone="accent">React</Badge>
            <Badge tone="success">Publié</Badge>
            <Badge tone="warning">Brouillon</Badge>
            <Badge tone="danger">Erreur</Badge>
          </div>

          <div className={styles.cards}>
            <Card as="article">
              <h3>Carte simple</h3>
              <p className={styles.muted}>Pour regrouper une information sans interaction.</p>
            </Card>
            <Card as="article" interactive>
              <h3>Carte interactive</h3>
              <p className={styles.muted}>Une lueur apparaît au survol et au focus clavier.</p>
            </Card>
            <Card as="article">
              <CinemaFrame>
                <div className={styles.placeholder} />
              </CinemaFrame>
              <h3 className={styles.cardTitle}>Cadre cinéma</h3>
              <p className={styles.muted}>Format 2,39:1 pour les visuels de projets.</p>
            </Card>
          </div>
        </div>
      </Section>

      <Section
        id="formulaires"
        title="Formulaires"
        description="Chaque champ a un libellé, une aide facultative et un message d’erreur relié au champ pour les lecteurs d’écran."
      >
        <div className={styles.form}>
          <TextField label="Nom" name="nom-demo" autoComplete="name" required />
          <EmailFieldDemo />
          <TextAreaField
            label="Message"
            name="message-demo"
            hint="Décrivez votre projet en quelques lignes."
          />
          <TextField
            label="Champ en erreur (exemple figé)"
            name="erreur-demo"
            defaultValue="valeur incorrecte"
            error="Ce message explique ce qui ne va pas et comment le corriger."
          />
        </div>
      </Section>

      <Section
        id="chargement"
        title="Indicateurs de chargement"
        description="Le texte caché est lu par les lecteurs d’écran. Avec « réduire les animations » activé dans le système, l’anneau reste fixe."
      >
        <div className={styles.row}>
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
      </Section>
    </>
  );
}
