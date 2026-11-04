import { describe, expect, it } from 'vitest';
import { deriveSecret } from '../../src/utils/secrets.js';

describe('deriveSecret', () => {
  it('donne un secret stable par usage et différent d’un usage à l’autre', () => {
    const base = 'a'.repeat(48);
    expect(deriveSecret(base, 'csrf')).toBe(deriveSecret(base, 'csrf'));
    expect(deriveSecret(base, 'csrf')).not.toBe(deriveSecret(base, 'ip-hash'));
    expect(deriveSecret(base, 'csrf')).not.toContain(base);
  });
});
