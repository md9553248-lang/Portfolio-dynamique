import type { Article, Certification, Education, Experience, Project, Skill } from './types';

/*
 * DONNÉES DE DÉMONSTRATION.
 * Tout ce qui porte `demo: true` est un exemple fictif. Ces données seront remplacées par la base
 * MySQL (Phase 04) et l'API (Phase 05), puis gérées depuis l'administration (Phase 07).
 */

export const projects: Project[] = [
  {
    slug: 'api-gestion-stock',
    title: 'API REST de gestion de stock',
    shortDescription: 'Une API pour suivre les produits, les entrées et les sorties d’un magasin.',
    description: [
      'Exemple de projet back-end : une API REST qui expose les produits, les mouvements de stock et des statistiques simples.',
      'Les données sont stockées dans MySQL et les entrées sont validées côté serveur.',
    ],
    category: 'Back-end',
    date: '2026-06',
    role: 'Développeur unique (exemple)',
    technologies: ['Node.js', 'Express', 'MySQL'],
    challenges: [
      {
        problem: 'Éviter les stocks négatifs quand plusieurs mouvements arrivent en même temps.',
        solution: 'Utilisation de transactions SQL pour garder des quantités cohérentes.',
      },
    ],
    featured: true,
    status: 'published',
    demo: true,
  },
  {
    slug: 'tableau-de-bord-statistiques',
    title: 'Tableau de bord de statistiques',
    shortDescription: 'Un tableau de bord clair pour visualiser des indicateurs clés.',
    description: [
      'Exemple de projet front-end : une interface qui affiche des indicateurs sous forme de cartes et de graphiques accessibles.',
    ],
    category: 'Front-end',
    date: '2026-04',
    role: 'Développeur front-end (exemple)',
    technologies: ['React', 'TypeScript', 'CSS'],
    challenges: [
      {
        problem: 'Rendre les graphiques compréhensibles pour les lecteurs d’écran.',
        solution: 'Ajout de descriptions textuelles et d’un tableau de données équivalent.',
      },
    ],
    featured: true,
    status: 'published',
    demo: true,
  },
  {
    slug: 'application-mobile-suivi-taches',
    title: 'Application mobile de suivi de tâches',
    shortDescription: 'Une application pour organiser ses tâches, même sans connexion.',
    description: [
      'Exemple de projet mobile : une application de liste de tâches avec stockage local et synchronisation prévue.',
    ],
    category: 'Mobile',
    date: '2026-02',
    role: 'Développeur mobile (exemple)',
    technologies: ['TypeScript', 'SQLite'],
    challenges: [
      {
        problem: 'Garder les données disponibles sans réseau.',
        solution: 'Stockage local avec une file de synchronisation à rejouer à la reconnexion.',
      },
    ],
    featured: true,
    status: 'published',
    demo: true,
  },
  {
    slug: 'site-vitrine-association',
    title: 'Site vitrine pour une association',
    shortDescription: 'Un site simple, rapide et lisible sur téléphone.',
    description: ['Exemple de projet web : un site vitrine responsive avec formulaire de contact.'],
    category: 'Front-end',
    date: '2025-11',
    role: 'Intégrateur et développeur (exemple)',
    technologies: ['HTML', 'CSS', 'JavaScript'],
    challenges: [],
    featured: false,
    status: 'published',
    demo: true,
  },
  {
    slug: 'projet-en-brouillon',
    title: 'Projet en brouillon',
    shortDescription: 'Ce projet n’est pas publié et ne doit jamais apparaître sur le site.',
    description: ['Brouillon.'],
    category: 'Back-end',
    date: '2026-09',
    role: 'Exemple',
    technologies: ['Node.js'],
    challenges: [],
    featured: true,
    status: 'draft',
    demo: true,
  },
];

export const skillCategories = ['Front-end', 'Back-end', 'Bases de données', 'Outils'] as const;

export const skills: Skill[] = [
  { name: 'React', category: 'Front-end', level: 'intermediaire', order: 1, visible: true, demo: true },
  { name: 'TypeScript', category: 'Front-end', level: 'intermediaire', order: 2, visible: true, demo: true },
  { name: 'HTML et CSS', category: 'Front-end', level: 'intermediaire', order: 3, visible: true, demo: true },
  { name: 'Node.js', category: 'Back-end', level: 'intermediaire', order: 4, visible: true, demo: true },
  { name: 'Express', category: 'Back-end', level: 'notions', order: 5, visible: true, demo: true },
  { name: 'MySQL', category: 'Bases de données', level: 'intermediaire', order: 6, visible: true, demo: true },
  { name: 'SQL', category: 'Bases de données', level: 'intermediaire', order: 7, visible: true, demo: true },
  { name: 'Git et GitHub', category: 'Outils', level: 'intermediaire', order: 8, visible: true, demo: true },
  { name: 'Docker', category: 'Outils', level: 'notions', order: 9, visible: true, demo: true },
  { name: 'Compétence masquée', category: 'Outils', order: 10, visible: false, demo: true },
];

export const experiences: Experience[] = [
  {
    id: 'experience-demo-1',
    role: 'Stage de développement (exemple)',
    organization: 'Organisation d’exemple',
    start: '2025-07',
    end: '2025-09',
    description: 'Exemple d’expérience : stage au sein d’une petite équipe de développement.',
    missions: [
      'Développer des fonctionnalités d’une application web.',
      'Écrire des requêtes SQL et corriger des anomalies.',
    ],
    technologies: ['React', 'Node.js', 'MySQL'],
    demo: true,
  },
];

/** Informations réelles (fournies par Mouhamed Diagne). */
export const education: Education[] = [
  {
    id: 'uadb-d2a',
    institution: 'Université Alioune Diop de Bambey (UADB), Sénégal',
    degree: 'Licence, filière D2A (développement et administration des applications)',
    status: 'En cours (fin de Licence 2)',
    description:
      'Formation en développement d’applications et en administration de systèmes et de bases de données.',
    demo: false,
  },
];

export const certifications: Certification[] = [
  {
    id: 'certification-demo-1',
    name: 'Certification d’exemple',
    issuer: 'Organisme d’exemple',
    issuedAt: '2026-03',
    expiresAt: '2029-03',
    credentialId: 'EXEMPLE-0000',
    demo: true,
  },
];

export const articles: Article[] = [
  {
    slug: 'premiers-pas-api-securisee',
    title: 'Premiers pas vers une API sécurisée',
    excerpt: 'Les réflexes à prendre dès le début d’un projet pour éviter les erreurs courantes.',
    date: '2026-09-18',
    category: 'Sécurité',
    paragraphs: [
      'Exemple d’article : la sécurité d’une API se pense dès la conception, pas à la fin du projet.',
      'On valide toutes les entrées côté serveur, on garde les secrets hors du code et on limite les droits de la base de données.',
      'Ce texte est un exemple et sera remplacé par un vrai article depuis l’administration.',
    ],
    status: 'published',
    demo: true,
  },
  {
    slug: 'organiser-un-projet-react',
    title: 'Organiser un projet React',
    excerpt: 'Une structure de dossiers simple pour garder un projet lisible.',
    date: '2026-08-02',
    category: 'Front-end',
    paragraphs: [
      'Exemple d’article : séparer les composants communs, les pages et les données rend un projet plus facile à maintenir.',
      'Ce texte est un exemple et sera remplacé par un vrai article depuis l’administration.',
    ],
    status: 'published',
    demo: true,
  },
  {
    slug: 'article-en-brouillon',
    title: 'Article en brouillon',
    excerpt: 'Cet article n’est pas publié et ne doit jamais apparaître sur le site.',
    date: '2026-10-01',
    category: 'Divers',
    paragraphs: ['Brouillon.'],
    status: 'draft',
    demo: true,
  },
];
