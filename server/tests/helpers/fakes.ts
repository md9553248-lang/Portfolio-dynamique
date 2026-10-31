import { vi } from 'vitest';
import { createApp, type AppOptions } from '../../src/app.js';
import type { AppDependencies } from '../../src/dependencies.js';
import type { ContactRepository } from '../../src/modules/contact/contact.repository.js';
import { createLogger } from '../../src/logging/logger.js';
import type { ContentRepository } from '../../src/modules/content/content.repository.js';
import type {
  ArticleDto,
  ProfileDto,
  ProjectDto,
} from '../../src/modules/content/content.types.js';

export const IP_HASH_SECRET = 'secret-de-test';

export const SAMPLE_PROJECTS: ProjectDto[] = [
  {
    slug: 'api-gestion-stock',
    title: 'API REST de gestion de stock',
    shortDescription: 'Une API pour suivre un stock.',
    description: ['Premier paragraphe.', 'Second paragraphe.'],
    category: 'Back-end',
    date: '2026-06',
    role: 'Développeur unique',
    technologies: ['Node.js', 'Express', 'MySQL'],
    challenges: [{ problem: 'Un problème', solution: 'Une solution' }],
    cover: null,
    gallery: [],
    featured: true,
    demo: true,
  },
  {
    slug: 'tableau-de-bord',
    title: 'Tableau de bord',
    shortDescription: 'Un tableau de bord.',
    description: ['Un paragraphe.'],
    category: 'Front-end',
    date: '2026-04',
    role: null,
    technologies: ['React'],
    challenges: [],
    cover: null,
    gallery: [],
    featured: false,
    demo: true,
  },
];

export const SAMPLE_PROFILE: ProfileDto = {
  displayName: 'Mouhamed Diagne',
  headline: 'Développeur full-stack',
  context: null,
  intro: null,
  about: ['Un paragraphe.'],
  publicEmail: null,
  publicPhone: null,
  photo: null,
  socialLinks: [{ platform: 'GitHub', url: 'https://github.com/exemple' }],
};

export const SAMPLE_ARTICLE: ArticleDto = {
  slug: 'premier-article',
  title: 'Premier article',
  excerpt: 'Résumé.',
  date: '2026-09-18',
  category: 'Sécurité',
  demo: true,
  content: 'Contenu.',
  seoTitle: null,
  seoDescription: null,
};

/** Fausses dépendances en mémoire : les tests HTTP tournent sans MySQL. */
export function createFakeDeps(overrides: Partial<AppDependencies> = {}) {
  const spies = {
    listProjects: vi.fn<ContentRepository['listProjects']>(async ({ category, featured }) =>
      SAMPLE_PROJECTS.filter(
        (project) =>
          (category === undefined || project.category === category) &&
          (featured === undefined || project.featured === featured),
      ),
    ),
    getProject: vi.fn<ContentRepository['getProject']>(
      async (slug) => SAMPLE_PROJECTS.find((project) => project.slug === slug) ?? null,
    ),
    insertMessage: vi.fn<ContactRepository['insertMessage']>(async () => 1),
    ping: vi.fn(async () => {}),
  };

  const content: ContentRepository = {
    getProfile: async () => SAMPLE_PROFILE,
    listProjects: spies.listProjects,
    getProject: spies.getProject,
    listSkills: async () => [
      {
        category: 'Front-end',
        skills: [{ name: 'React', level: 'intermediaire', icon: null, demo: true }],
      },
    ],
    listExperiences: async () => [],
    listEducations: async () => [],
    listCertifications: async () => [],
    listArticles: async () => [SAMPLE_ARTICLE],
    getArticle: async (slug) => (slug === SAMPLE_ARTICLE.slug ? SAMPLE_ARTICLE : null),
    getPublicSettings: async () => ({ 'site.default_theme': 'dark' }),
    getCvStatus: async () => ({ available: false, updatedAt: null }),
  };

  const deps: AppDependencies = {
    content,
    contact: { insertMessage: spies.insertMessage },
    ping: spies.ping,
    ...overrides,
  };
  return { deps, spies };
}

export function createTestApp(
  depsOverrides: Partial<AppDependencies> = {},
  optionOverrides: Partial<AppOptions> = {},
) {
  const fake = createFakeDeps(depsOverrides);
  const app = createApp({
    clientOrigin: 'http://localhost:5173',
    logger: createLogger('silent'),
    deps: fake.deps,
    ipHashSecret: IP_HASH_SECRET,
    ...optionOverrides,
  });
  return { app, ...fake };
}
