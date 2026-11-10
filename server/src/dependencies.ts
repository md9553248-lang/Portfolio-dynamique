import type { Pool } from 'mysql2/promise';
import { createMysqlAuditRepository } from './modules/audit/audit.mysql.js';
import type { AuditRepository } from './modules/audit/audit.repository.js';
import { createMysqlAuthRepository } from './modules/auth/auth.mysql.js';
import type { AuthRepository } from './modules/auth/auth.repository.js';
import { createMysqlContactRepository } from './modules/contact/contact.mysql.js';
import type { ContactRepository } from './modules/contact/contact.repository.js';
import { createMysqlContentRepository } from './modules/content/content.mysql.js';
import type { ContentRepository } from './modules/content/content.repository.js';
import { createMysqlCvRepository } from './modules/cv/cv.mysql.js';
import type { CvRepository } from './modules/cv/cv.repository.js';
import { createMysqlDashboardRepository } from './modules/dashboard/dashboard.mysql.js';
import type { DashboardRepository } from './modules/dashboard/dashboard.repository.js';
import { createMysqlMediaRepository } from './modules/media/media.mysql.js';
import type { MediaRepository } from './modules/media/media.repository.js';

/** Tout ce dont l'application a besoin à l'extérieur (base de données). Facilite les tests. */
export interface AppDependencies {
  content: ContentRepository;
  contact: ContactRepository;
  auth: AuthRepository;
  media: MediaRepository;
  cv: CvRepository;
  dashboard: DashboardRepository;
  audit: AuditRepository;
  /** Vérifie que la base de données répond. Lève une erreur sinon. */
  ping: () => Promise<void>;
}

export function createMysqlDependencies(pool: Pool): AppDependencies {
  return {
    content: createMysqlContentRepository(pool),
    contact: createMysqlContactRepository(pool),
    auth: createMysqlAuthRepository(pool),
    media: createMysqlMediaRepository(pool),
    cv: createMysqlCvRepository(pool),
    dashboard: createMysqlDashboardRepository(pool),
    audit: createMysqlAuditRepository(pool),
    ping: async () => {
      await pool.query('SELECT 1');
    },
  };
}
