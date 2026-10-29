/**
 * Textes de l'interface en français, regroupés par zone.
 * Ils sont centralisés ici pour pouvoir ajouter l'anglais plus tard sans rechercher les phrases
 * dans tous les composants (internationalisation complète prévue dans une phase ultérieure).
 */
export const fr = {
  nav: {
    about: 'À propos',
    projects: 'Projets',
    skills: 'Compétences',
    experiences: 'Expériences',
    education: 'Formations',
    certifications: 'Certifications',
    news: 'Actualités',
    contact: 'Contact',
  },
  demo: {
    badge: 'Démo',
    notice:
      'Contenu de démonstration : ces éléments sont des exemples fictifs. Ils seront remplacés par mes vrais contenus depuis l’administration.',
  },
  pages: {
    home: {
      description:
        'Portfolio de Mouhamed Diagne, développeur full-stack en formation : projets, compétences et parcours.',
    },
    about: {
      title: 'À propos',
      description: 'Présentation, parcours et objectifs de Mouhamed Diagne.',
    },
    projects: {
      title: 'Projets',
      intro: 'Une sélection de projets, avec les technologies utilisées et les difficultés rencontrées.',
      description: 'Projets réalisés par Mouhamed Diagne, avec technologies et retours d’expérience.',
    },
    skills: {
      title: 'Compétences',
      intro: 'Les technologies et outils que j’utilise, regroupés par domaine.',
      description: 'Compétences en développement front-end, back-end, bases de données et outils.',
    },
    experiences: {
      title: 'Expériences',
      intro: 'Mon parcours professionnel : missions et technologies utilisées.',
      description: 'Expériences professionnelles et missions réalisées.',
    },
    education: {
      title: 'Formations',
      intro: 'Mon parcours de formation.',
      description: 'Parcours de formation de Mouhamed Diagne.',
    },
    certifications: {
      title: 'Certifications',
      intro: 'Les certifications obtenues, avec leur organisme et leur date.',
      description: 'Certifications obtenues par Mouhamed Diagne.',
    },
    news: {
      title: 'Actualités',
      intro: 'Articles et notes sur ce que j’apprends et construis.',
      description: 'Articles et actualités de Mouhamed Diagne.',
    },
    contact: {
      title: 'Contact',
      intro: 'Une question, une opportunité, un projet ? Écrivez-moi.',
      description: 'Contacter Mouhamed Diagne.',
    },
    privacy: {
      title: 'Confidentialité',
      description: 'Politique de confidentialité du site.',
    },
    legal: {
      title: 'Mentions légales',
      description: 'Mentions légales du site.',
    },
    notFound: {
      title: 'Page introuvable',
      text: 'La page demandée n’existe pas ou a été déplacée.',
    },
    error: {
      title: 'Une erreur est survenue',
      text: 'Un problème inattendu s’est produit. Vous pouvez revenir à l’accueil.',
    },
  },
} as const;
