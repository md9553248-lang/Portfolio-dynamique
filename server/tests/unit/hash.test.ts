import { describe, expect, it } from 'vitest';
import { hmacHash } from '../../src/utils/hash.js';

describe('hmacHash', () => {
  it('produit toujours la même empreinte hexadécimale de 64 caractères', () => {
    const first = hmacHash('secret', '203.0.113.7');
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(hmacHash('secret', '203.0.113.7')).toBe(first);
  });

  it('change avec la valeur et avec le secret', () => {
    expect(hmacHash('secret', '203.0.113.7')).not.toBe(hmacHash('secret', '203.0.113.8'));
    expect(hmacHash('secret', '203.0.113.7')).not.toBe(hmacHash('autre', '203.0.113.7'));
  });

  it('ne contient pas la valeur d’origine', () => {
    expect(hmacHash('secret', '203.0.113.7')).not.toContain('203');
  });
});
