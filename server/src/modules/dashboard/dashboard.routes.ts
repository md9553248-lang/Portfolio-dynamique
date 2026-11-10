import { Router } from 'express';
import { asyncHandler } from '../../http/async-handler.js';
import type { DashboardRepository } from './dashboard.repository.js';

export function createDashboardRouter(repo: DashboardRepository): Router {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      const [stats, recentActivity] = await Promise.all([repo.getStats(), repo.getRecentActivity()]);
      res.setHeader('Cache-Control', 'no-store');
      res.json({ data: { ...stats, recentActivity } });
    }),
  );

  return router;
}
