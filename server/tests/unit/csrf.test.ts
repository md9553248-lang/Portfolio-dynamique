import { describe, expect, it } from 'vitest';
import { computeCsrfToken, verifyCsrfToken } from '../../src/modules/auth/csrf.js';

describe('jeton CSRF', () => {
  it('est stable pour une même session et un même secret', () => {
    expect(computeCsrfToken('secret', 'session-1')).toBe(computeCsrfToken('secret', 'session-1'));
  });

  it('change avec la session et avec le secret', () => {
    const token = computeCsrfToken('secret', 'session-1');
    expect(computeCsrfToken('secret', 'session-2')).not.toBe(token);
    expect(computeCsrfToken('autre', 'session-1')).not.toBe(token);
  });

  it('est vérifié correctement', () => {
    const token = computeCsrfToken('secret', 'session-1');
    expect(verifyCsrfToken('secret', 'session-1', token)).toBe(true);
    expect(verifyCsrfToken('secret', 'session-2', token)).toBe(false);
    expect(verifyCsrfToken('secret', 'session-1', 'invalide')).toBe(false);
  });

  it('refuse un jeton absent ou de longueur différente sans planter', () => {
    expect(verifyCsrfToken('secret', 'session-1', undefined)).toBe(false);
    expect(verifyCsrfToken('secret', 'session-1', '')).toBe(false);
    expect(verifyCsrfToken('secret', 'session-1', 'x'.repeat(500))).toBe(false);
  });
});
