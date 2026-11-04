import argon2 from 'argon2';
import { describe, expect, it } from 'vitest';
import { createArgon2Hasher } from '../../src/modules/auth/password-hasher.js';

/* Tests avec le VRAI Argon2id (un peu plus lents que les autres). */
describe('createArgon2Hasher', () => {
  const hasher = createArgon2Hasher();

  it('produit une empreinte Argon2id, jamais le mot de passe lui-même', async () => {
    const hash = await hasher.hash('Une phrase de passe très longue 2026');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(hash).not.toContain('phrase');
  });

  it('vérifie le bon mot de passe et refuse les autres', async () => {
    const hash = await hasher.hash('Une phrase de passe très longue 2026');
    expect(await hasher.verify(hash, 'Une phrase de passe très longue 2026')).toBe(true);
    expect(await hasher.verify(hash, 'Une phrase de passe très longue 2027')).toBe(false);
  });

  it('génère une empreinte différente à chaque fois (sel aléatoire)', async () => {
    const first = await hasher.hash('Une phrase de passe très longue 2026');
    const second = await hasher.hash('Une phrase de passe très longue 2026');
    expect(first).not.toBe(second);
  });

  it('refuse une empreinte illisible sans planter', async () => {
    expect(await hasher.verify('pas-une-empreinte', 'motdepasse')).toBe(false);
    expect(await hasher.verify('', 'motdepasse')).toBe(false);
  });

  it('détecte une empreinte faite avec des paramètres plus faibles', async () => {
    const fresh = await hasher.hash('Une phrase de passe très longue 2026');
    const weak = await argon2.hash('Une phrase de passe très longue 2026', {
      type: argon2.argon2id,
      memoryCost: 4096,
      timeCost: 1,
      parallelism: 1,
    });
    expect(hasher.needsRehash(fresh)).toBe(false);
    expect(hasher.needsRehash(weak)).toBe(true);
  });
});
