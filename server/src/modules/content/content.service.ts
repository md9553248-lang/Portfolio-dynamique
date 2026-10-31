import { NotFoundError } from '../../http/errors.js';
import type { ContentRepository } from './content.repository.js';
import type { Locale } from './content.types.js';

export function createContentService(repo: ContentRepository) {
  return {
    async getProfile(locale: Locale) {
      const profile = await repo.getProfile(locale);
      if (!profile) throw new NotFoundError('Le profil n’est pas encore configuré.');
      return profile;
    },
    listProjects: (options: Parameters<ContentRepository['listProjects']>[0]) =>
      repo.listProjects(options),
    async getProject(slug: string, locale: Locale) {
      const project = await repo.getProject(slug, locale);
      if (!project) throw new NotFoundError('Projet introuvable.');
      return project;
    },
    listSkills: () => repo.listSkills(),
    listExperiences: (locale: Locale) => repo.listExperiences(locale),
    listEducations: (locale: Locale) => repo.listEducations(locale),
    listCertifications: () => repo.listCertifications(),
    listArticles: (locale: Locale) => repo.listArticles(locale),
    async getArticle(slug: string, locale: Locale) {
      const article = await repo.getArticle(slug, locale);
      if (!article) throw new NotFoundError('Article introuvable.');
      return article;
    },
    getPublicSettings: () => repo.getPublicSettings(),
    getCvStatus: () => repo.getCvStatus(),
  };
}

export type ContentService = ReturnType<typeof createContentService>;
