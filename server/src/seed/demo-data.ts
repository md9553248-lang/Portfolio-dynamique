/*
 * Données de DÉMONSTRATION pour voir le site fonctionner avant que l'administration existe (Phase 07).
 * Tout ce qui est marqué is_demo = 1 est fictif et pourra être supprimé en un clic.
 * Le profil et la formation sont de vraies informations (ils ne sont jamais marqués comme démo).
 */

export interface DemoProject {
  slug: string;
  category: string;
  date: string;
  featured: boolean;
  published: boolean;
  technologies: string[];
  title: string;
  shortDescription: string;
  description: string[];
  role: string;
  challenges: Array<{ problem: string; solution: string }>;
}

export const DEMO_PROJECTS: DemoProject[] = [
  {
    slug: 'api-gestion-stock',
    category: 'Back-end',
    date: '2026-06-01',
    featured: true,
    published: true,
    technologies: ['Node.js', 'Express', 'MySQL'],
    title: 'API REST de gestion de stock',
    shortDescription: 'Une API pour suivre les produits, les entrées et les sorties d’un magasin.',
    description: [
      'Exemple de projet back-end : une API REST qui expose les produits, les mouvements de stock et des statistiques simples.',
      'Les données sont stockées dans MySQL et les entrées sont validées côté serveur.',
    ],
    role: 'Développeur unique (exemple)',
    challenges: [
      {
        problem: 'Éviter les stocks négatifs quand plusieurs mouvements arrivent en même temps.',
        solution: 'Utilisation de transactions SQL pour garder des quantités cohérentes.',
      },
    ],
  },
  {
    slug: 'tableau-de-bord-statistiques',
    category: 'Front-end',
    date: '2026-04-01',
    featured: true,
    published: true,
    technologies: ['React', 'TypeScript', 'CSS'],
    title: 'Tableau de bord de statistiques',
    shortDescription: 'Un tableau de bord clair pour visualiser des indicateurs clés.',
    description: [
      'Exemple de projet front-end : une interface qui affiche des indicateurs sous forme de cartes et de graphiques accessibles.',
    ],
    role: 'Développeur front-end (exemple)',
    challenges: [
      {
        problem: 'Rendre les graphiques compréhensibles pour les lecteurs d’écran.',
        solution: 'Ajout de descriptions textuelles et d’un tableau de données équivalent.',
      },
    ],
  },
  {
    slug: 'application-mobile-suivi-taches',
    category: 'Mobile',
    date: '2026-02-01',
    featured: true,
    published: true,
    technologies: ['TypeScript', 'SQLite'],
    title: 'Application mobile de suivi de tâches',
    shortDescription: 'Une application pour organiser ses tâches, même sans connexion.',
    description: [
      'Exemple de projet mobile : une application de liste de tâches avec stockage local et synchronisation prévue.',
    ],
    role: 'Développeur mobile (exemple)',
    challenges: [
      {
        problem: 'Garder les données disponibles sans réseau.',
        solution: 'Stockage local avec une file de synchronisation à rejouer à la reconnexion.',
      },
    ],
  },
  {
    slug: 'site-vitrine-association',
    category: 'Front-end',
    date: '2025-11-01',
    featured: false,
    published: true,
    technologies: ['HTML', 'CSS', 'JavaScript'],
    title: 'Site vitrine pour une association',
    shortDescription: 'Un site simple, rapide et lisible sur téléphone.',
    description: ['Exemple de projet web : un site vitrine responsive avec formulaire de contact.'],
    role: 'Intégrateur et développeur (exemple)',
    challenges: [],
  },
  {
    slug: 'projet-en-brouillon',
    category: 'Back-end',
    date: '2026-09-01',
    featured: true,
    published: false,
    technologies: ['Node.js'],
    title: 'Projet en brouillon',
    shortDescription: 'Ce projet n’est pas publié et ne doit jamais apparaître sur le site.',
    description: ['Brouillon.'],
    role: 'Exemple',
    challenges: [],
  },
];

export const DEMO_SKILLS: Array<{
  category: string;
  name: string;
  level: 'notions' | 'intermediaire' | 'avance' | null;
  visible: boolean;
}> = [
  { category: 'Front-end', name: 'React', level: 'intermediaire', visible: true },
  { category: 'Front-end', name: 'TypeScript', level: 'intermediaire', visible: true },
  { category: 'Front-end', name: 'HTML et CSS', level: 'intermediaire', visible: true },
  { category: 'Back-end', name: 'Node.js', level: 'intermediaire', visible: true },
  { category: 'Back-end', name: 'Express', level: 'notions', visible: true },
  { category: 'Bases de données', name: 'MySQL', level: 'intermediaire', visible: true },
  { category: 'Bases de données', name: 'SQL', level: 'intermediaire', visible: true },
  { category: 'Outils', name: 'Git et GitHub', level: 'intermediaire', visible: true },
  { category: 'Outils', name: 'Docker', level: 'notions', visible: true },
  { category: 'Outils', name: 'Compétence masquée', level: null, visible: false },
];

export const DEMO_EXPERIENCE = {
  organization: 'Organisation d’exemple',
  start: '2025-07-01',
  end: '2025-09-01',
  role: 'Stage de développement (exemple)',
  description: 'Exemple d’expérience : stage au sein d’une petite équipe de développement.',
  missions: [
    'Développer des fonctionnalités d’une application web.',
    'Écrire des requêtes SQL et corriger des anomalies.',
  ],
  technologies: ['React', 'Node.js', 'MySQL'],
};

export const DEMO_CERTIFICATION = {
  name: 'Certification d’exemple',
  issuer: 'Organisme d’exemple',
  issued: '2026-03-01',
  expires: '2029-03-01',
  credentialId: 'EXEMPLE-0000',
};

export const DEMO_ARTICLES: Array<{
  slug: string;
  category: string;
  categorySlug: string;
  publishedAt: string;
  published: boolean;
  title: string;
  excerpt: string;
  paragraphs: string[];
}> = [
  {
    slug: 'premiers-pas-api-securisee',
    category: 'Sécurité',
    categorySlug: 'securite',
    publishedAt: '2026-09-18 09:00:00',
    published: true,
    title: 'Premiers pas vers une API sécurisée',
    excerpt: 'Les réflexes à prendre dès le début d’un projet pour éviter les erreurs courantes.',
    paragraphs: [
      'Exemple d’article : la sécurité d’une API se pense dès la conception, pas à la fin du projet.',
      'On valide toutes les entrées côté serveur, on garde les secrets hors du code et on limite les droits de la base de données.',
      'Ce texte est un exemple et sera remplacé par un vrai article depuis l’administration.',
    ],
  },
  {
    slug: 'organiser-un-projet-react',
    category: 'Front-end',
    categorySlug: 'front-end',
    publishedAt: '2026-08-02 09:00:00',
    published: true,
    title: 'Organiser un projet React',
    excerpt: 'Une structure de dossiers simple pour garder un projet lisible.',
    paragraphs: [
      'Exemple d’article : séparer les composants communs, les pages et les données rend un projet plus facile à maintenir.',
      'Ce texte est un exemple et sera remplacé par un vrai article depuis l’administration.',
    ],
  },
  {
    slug: 'article-en-brouillon',
    category: 'Divers',
    categorySlug: 'divers',
    publishedAt: '2026-10-01 09:00:00',
    published: false,
    title: 'Article en brouillon',
    excerpt: 'Cet article n’est pas publié et ne doit jamais apparaître sur le site.',
    paragraphs: ['Brouillon.'],
  },
];

/** Informations réelles (fournies par Mouhamed Diagne). */
export const REAL_PROFILE = {
  displayName: 'Mouhamed Diagne',
  headline: 'Développeur full-stack',
  context: 'Étudiant en Licence 2 · filière D2A · Université Alioune Diop de Bambey (UADB)',
  intro:
    'Je développe des applications de la base de données à l’interface. Je me forme pour évoluer vers l’ingénierie cloud et le DevOps.',
  about: [
    'Je m’appelle Mouhamed Diagne, développeur full-stack en formation. Je suis étudiant en Licence 2 dans la filière D2A (développement et administration des applications) à l’Université Alioune Diop de Bambey, au Sénégal.',
    'Je travaille sur toute la chaîne d’une application : bases de données, back-end et interfaces. Ce portfolio est lui-même un projet complet, pensé pour être administrable et sécurisé.',
  ],
  socialLinks: [{ platform: 'GitHub', url: 'https://github.com/md9553248-lang' }],
};

export const REAL_EDUCATION = {
  institution: 'Université Alioune Diop de Bambey (UADB), Sénégal',
  degree: 'Licence, filière D2A (développement et administration des applications)',
  description:
    'Formation en développement d’applications et en administration de systèmes et de bases de données.',
};
