import { Router } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import { parseOrThrow } from '../../http/validation.js';
import type { ContentService } from './content.service.js';
import { localeQuery, projectsQuery, slugParams } from './content.schemas.js';

/** Routes de lecture publiques : ne renvoient que des contenus publiés et visibles. */
export function createPublicRouter(service: ContentService): Router {
  const router = Router();

  router.get(
    '/profile',
    asyncHandler(async (req, res) => {
      const { locale } = parseOrThrow(localeQuery, req.query);
      res.json({ data: await service.getProfile(locale) });
    }),
  );

  router.get(
    '/projects',
    asyncHandler(async (req, res) => {
      const query = parseOrThrow(projectsQuery, req.query);
      res.json({ data: await service.listProjects(query) });
    }),
  );

  router.get(
    '/projects/:slug',
    asyncHandler(async (req, res) => {
      const { slug } = parseOrThrow(slugParams, req.params);
      const { locale } = parseOrThrow(localeQuery, req.query);
      res.json({ data: await service.getProject(slug, locale) });
    }),
  );

  router.get(
    '/skills',
    asyncHandler(async (_req, res) => {
      res.json({ data: await service.listSkills() });
    }),
  );

  router.get(
    '/experiences',
    asyncHandler(async (req, res) => {
      const { locale } = parseOrThrow(localeQuery, req.query);
      res.json({ data: await service.listExperiences(locale) });
    }),
  );

  router.get(
    '/educations',
    asyncHandler(async (req, res) => {
      const { locale } = parseOrThrow(localeQuery, req.query);
      res.json({ data: await service.listEducations(locale) });
    }),
  );

  router.get(
    '/certifications',
    asyncHandler(async (_req, res) => {
      res.json({ data: await service.listCertifications() });
    }),
  );

  router.get(
    '/articles',
    asyncHandler(async (req, res) => {
      const { locale } = parseOrThrow(localeQuery, req.query);
      res.json({ data: await service.listArticles(locale) });
    }),
  );

  router.get(
    '/articles/:slug',
    asyncHandler(async (req, res) => {
      const { slug } = parseOrThrow(slugParams, req.params);
      const { locale } = parseOrThrow(localeQuery, req.query);
      res.json({ data: await service.getArticle(slug, locale) });
    }),
  );

  router.get(
    '/settings',
    asyncHandler(async (_req, res) => {
      res.json({ data: await service.getPublicSettings() });
    }),
  );

  router.get(
    '/cv',
    asyncHandler(async (_req, res) => {
      res.json({ data: await service.getCvStatus() });
    }),
  );

  return router;
}
