import { describe, expect, it } from 'vitest';
import { ConfigError, parseEnv } from '../../src/config/env.js';

const validProduction = {
  NODE_ENV: 'production',
  CLIENT_ORIGIN: 'https://portfolio.example.com',
  DB_HOST: 'db.internal',
  DB_PORT: '3306',
  DB_NAME: 'portfolio',
  DB_USER: 'portfolio_app',
  DB_PASSWORD: 'un-mot-de-passe-de-test-solide',
  SESSION_SECRET: 'a'.repeat(48),
};

describe('parseEnv', () => {
  it('applique des valeurs par défaut en développement', () => {
    const env = parseEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.CV_MAX_SIZE_MB).toBe(5);
  });

  it('accepte une configuration de production complète', () => {
    expect(parseEnv(validProduction).NODE_ENV).toBe('production');
  });

  it('refuse de démarrer en production si la configuration manque', () => {
    expect(() => parseEnv({ NODE_ENV: 'production' })).toThrow(ConfigError);
    try {
      parseEnv({ NODE_ENV: 'production' });
    } catch (error) {
      expect((error as Error).message).toContain('SESSION_SECRET');
      expect((error as Error).message).toContain('DB_PASSWORD');
    }
  });

  it('refuse le compte MySQL root en production', () => {
    expect(() => parseEnv({ ...validProduction, DB_USER: 'root' })).toThrow(ConfigError);
  });

  it("refuse les valeurs d'exemple en production", () => {
    expect(() => parseEnv({ ...validProduction, SESSION_SECRET: 'change-me-'.repeat(5) })).toThrow(
      ConfigError,
    );
    expect(() => parseEnv({ ...validProduction, DB_PASSWORD: 'change-me-mot-de-passe' })).toThrow(
      ConfigError,
    );
  });

  it('refuse une origine http en production', () => {
    expect(() =>
      parseEnv({ ...validProduction, CLIENT_ORIGIN: 'http://portfolio.example.com' }),
    ).toThrow(ConfigError);
  });

  it("n'inclut jamais la valeur d'un secret dans le message d'erreur", () => {
    const secret = 'trop-court-secret';
    try {
      parseEnv({ ...validProduction, SESSION_SECRET: secret });
      expect.unreachable('parseEnv aurait dû échouer');
    } catch (error) {
      expect((error as Error).message).toContain('SESSION_SECRET');
      expect((error as Error).message).not.toContain(secret);
    }
  });
});
