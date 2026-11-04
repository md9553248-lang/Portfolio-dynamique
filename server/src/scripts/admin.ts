import 'dotenv/config';
import { ConfigError, parseEnv } from '../config/env.js';
import { createAppPool } from '../db/pool.js';
import { createLogger } from '../logging/logger.js';
import { createMysqlAuthRepository } from '../modules/auth/auth.mysql.js';
import { createAuthService } from '../modules/auth/auth.service.js';
import { createArgon2Hasher } from '../modules/auth/password-hasher.js';
import { ValidationError } from '../http/errors.js';
import { promptHidden, promptLine } from './prompt.js';

/*
 * Gestion du compte administrateur en ligne de commande.
 *   npm run admin:create         : crée le premier administrateur
 *   npm run admin:set-password   : redéfinit un mot de passe oublié (ferme toutes les sessions)
 * Aucun mot de passe n'est passé en argument, enregistré dans un fichier ou affiché.
 * Il n'existe volontairement aucune route d'inscription publique.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function askPassword(): Promise<string> {
  console.log('Choisissez un mot de passe d’au moins 12 caractères (une phrase de passe est idéale).');
  const password = await promptHidden('Mot de passe : ');
  const confirmation = await promptHidden('Confirmez le mot de passe : ');
  if (password !== confirmation) throw new Error('Les deux mots de passe sont différents.');
  return password;
}

async function main(): Promise<void> {
  const command = process.argv[2];
  if (command !== 'create' && command !== 'set-password') {
    console.error('Usage : npm run admin:create   |   npm run admin:set-password');
    process.exitCode = 1;
    return;
  }
  if (!process.stdin.isTTY) {
    console.error('Ce script doit être lancé dans un terminal interactif (il demande un mot de passe masqué).');
    process.exitCode = 1;
    return;
  }

  const env = parseEnv(process.env);
  const pool = createAppPool(env);
  const repo = createMysqlAuthRepository(pool);
  const service = createAuthService({
    repo,
    hasher: createArgon2Hasher(),
    ipHashSecret: 'commande-en-ligne',
    absoluteSessionSeconds: 1,
    idleSessionSeconds: 1,
    logger: createLogger('silent'),
  });

  try {
    if (command === 'create') {
      if ((await repo.countUsers()) > 0 && !process.argv.includes('--allow-additional')) {
        console.error(
          'Un compte administrateur existe déjà. Pour un mot de passe oublié, utilisez « npm run admin:set-password ».',
        );
        process.exitCode = 1;
        return;
      }
      const email = (await promptLine('Adresse e-mail : ')).toLowerCase();
      if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new Error('Adresse e-mail invalide.');
      const displayName = await promptLine('Nom affiché : ');
      if (displayName.length < 2 || displayName.length > 100) throw new Error('Nom affiché : 2 à 100 caractères.');

      const password = await askPassword();
      await service.createAdmin({ email, displayName, password });
      console.log(`Compte administrateur créé pour ${email}. Vous pouvez maintenant vous connecter sur /admin/connexion.`);
      return;
    }

    const email = (await promptLine('Adresse e-mail du compte : ')).toLowerCase();
    const password = await askPassword();
    const done = await service.resetPassword({ email, password });
    console.log(
      done
        ? 'Mot de passe modifié. Toutes les sessions de ce compte ont été fermées.'
        : 'Aucun compte ne correspond à cette adresse.',
    );
    if (!done) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  if (error instanceof ValidationError) {
    console.error(Object.values(error.fields ?? {}).join('\n'));
  } else if (error instanceof ConfigError || error instanceof Error) {
    const { code } = error as { code?: string };
    console.error(code === 'ER_DUP_ENTRY' ? 'Un compte existe déjà avec cette adresse e-mail.' : error.message);
  } else {
    console.error('Erreur inconnue.');
  }
  process.exitCode = 1;
});
