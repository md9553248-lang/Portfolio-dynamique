import { describe, expect, it } from 'vitest';
import { formatDate, formatMonthYear, formatPeriod } from './format';

describe('format', () => {
  it('formate un mois et une année en français', () => {
    expect(formatMonthYear('2026-05')).toBe('mai 2026');
  });

  it('formate une date complète sans décalage de fuseau horaire', () => {
    expect(formatDate('2026-09-18')).toBe('18 septembre 2026');
  });

  it('formate une période terminée et une période en cours', () => {
    expect(formatPeriod('2025-07', '2025-09')).toBe('juillet 2025 – septembre 2025');
    expect(formatPeriod('2025-07', null)).toBe('juillet 2025 – aujourd’hui');
  });
});
