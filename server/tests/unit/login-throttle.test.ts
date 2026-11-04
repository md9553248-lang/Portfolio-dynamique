import { describe, expect, it } from 'vitest';
import { loginDelaySeconds } from '../../src/modules/auth/login-throttle.js';

const threshold = 5;

describe('loginDelaySeconds', () => {
  it('n’impose aucun délai sous le seuil', () => {
    expect(loginDelaySeconds({ failureCount: 0, secondsSinceLast: 0, threshold })).toBe(0);
    expect(loginDelaySeconds({ failureCount: 4, secondsSinceLast: 0, threshold })).toBe(0);
  });

  it('impose 30 secondes au seuil, puis double à chaque échec', () => {
    expect(loginDelaySeconds({ failureCount: 5, secondsSinceLast: 0, threshold })).toBe(30);
    expect(loginDelaySeconds({ failureCount: 6, secondsSinceLast: 0, threshold })).toBe(60);
    expect(loginDelaySeconds({ failureCount: 7, secondsSinceLast: 0, threshold })).toBe(120);
  });

  it('plafonne le délai à 15 minutes (jamais de blocage définitif)', () => {
    expect(loginDelaySeconds({ failureCount: 15, secondsSinceLast: 0, threshold })).toBe(900);
    expect(loginDelaySeconds({ failureCount: 500, secondsSinceLast: 0, threshold })).toBe(900);
  });

  it('retire le temps déjà écoulé depuis le dernier échec', () => {
    expect(loginDelaySeconds({ failureCount: 5, secondsSinceLast: 10, threshold })).toBe(20);
    expect(loginDelaySeconds({ failureCount: 5, secondsSinceLast: 30, threshold })).toBe(0);
    expect(loginDelaySeconds({ failureCount: 5, secondsSinceLast: 999, threshold })).toBe(0);
  });
});
