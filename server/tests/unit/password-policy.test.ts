import { describe, expect, it } from 'vitest';
import { validatePasswordStrength } from '../../src/modules/auth/password-policy.js';

const context = { email: 'jean.dupont@exemple.com', displayName: 'Éléonore Sow' };

describe('validatePasswordStrength', () => {
  it('accepte une phrase de passe longue', () => {
    expect(validatePasswordStrength('Une phrase de passe très longue 2026', context)).toBeNull();
  });

  it('refuse un mot de passe trop court', () => {
    expect(validatePasswordStrength('Court1!', context)).toContain('12 caractères');
    expect(validatePasswordStrength('a'.repeat(11) + 'b', context)).not.toContain('12 caractères');
  });

  it('refuse un mot de passe trop long (évite de saturer le serveur)', () => {
    expect(validatePasswordStrength('x1'.repeat(65), context)).toContain('128');
  });

  it('refuse les mots de passe courants, sans tenir compte de la casse', () => {
    expect(validatePasswordStrength('MotDePasse123', {})).toContain('courant');
    expect(validatePasswordStrength('azertyuiop12', {})).toContain('courant');
  });

  it('refuse un mot de passe répétitif', () => {
    expect(validatePasswordStrength('aaaaaaaaaaaaaaa', {})).toContain('répétitif');
    expect(validatePasswordStrength('abababababab', {})).toContain('répétitif');
    expect(validatePasswordStrength('🙂'.repeat(12), {})).toContain('répétitif');
  });

  it('refuse un mot de passe qui contient le nom, même sans accents ni majuscules', () => {
    expect(validatePasswordStrength('eleonoreSOW-2026-xx', context)).toContain('nom');
    expect(validatePasswordStrength('Mon-Code-Sow-2026-Z', context)).toBeNull(); // « sow » est trop court (< 4 lettres)
  });

  it('refuse un mot de passe qui contient la partie locale de l’adresse e-mail', () => {
    expect(validatePasswordStrength('dupontdupont2026', context)).toContain('adresse e-mail');
  });

  it('compte les caractères et non les unités techniques (émojis)', () => {
    expect(validatePasswordStrength('🙂a🙃b🙂c🙃d🙂e🙃f', {})).toBeNull();
  });
});
