import 'dotenv/config';
import { ConfigError, parseEnv } from '../config/env.js';
import { createAppPool } from '../db/pool.js';
import { seedDemoData } from '../seed/seed-demo.js';

/**
 * Insère des contenus de démonstration (marqués « démo ») pour voir le site fonctionner.
 *   npm run db:seed          : insère les données si elles n'existent pas encore
 *   npm run db:seed -- --reset : supprime les données de démonstration puis les recrée
 */
async function main(): Promise<void> {
  const env = parseEnv(process.env);
  if (env.NODE_ENV === 'production') {
    console.error(
      'Refus : les données de démonstration ne doivent jamais être insérées en production.',
    );
    process.exitCode = 1;
    return;
  }

  const reset = process.argv.includes('--reset');
  const pool = createAppPool(env);
  const connection = await pool.getConnection();
  try {
    const inserted = await seedDemoData(connection, { reset });
    console.log(
      inserted
        ? 'Données de démonstration insérées.'
        : 'Les données de démonstration existent déjà (utilisez « -- --reset » pour les recréer).',
    );
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  if (error instanceof ConfigError) {
    console.error(error.message);
  } else {
    const { code, message } = error as { code?: string; message?: string };
    console.error(`Erreur : ${code ?? 'inconnue'} ${message ?? ''}`.trim());
  }
  process.exitCode = 1;
});
