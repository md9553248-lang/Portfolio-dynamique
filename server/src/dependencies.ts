import type { Pool } from 'mysql2/promise';
import { createMysqlAuthRepository } from './modules/auth/auth.mysql.js';
import type { AuthRepository } from './modules/auth/auth.repository.js';
import { createMysqlContactRepository } from './modules/contact/contact.mysql.js';
import type { ContactRepository } from './modules/contact/contact.repository.js';
import { createMysqlContentRepository } from './modules/content/content.mysql.js';
import type { ContentRepository } from './modules/content/content.repository.js';

/** Tout ce dont l'application a besoin à l'extérieur (base de données). Facilite les tests. */
export interface AppDependencies {
  content: ContentRepository;
  contact: ContactRepository;
  auth: AuthRepository;
  /** Vérifie que la base de données répond. Lève une erreur sinon. */
  ping: () => Promise<void>;
}

export function createMysqlDependencies(pool: Pool): AppDependencies {
  return {
    content: createMysqlContentRepository(pool),
    contact: createMysqlContactRepository(pool),
    auth: createMysqlAuthRepository(pool),
    ping: async () => {
      await pool.query('SELECT 1');
    },
  };
}
