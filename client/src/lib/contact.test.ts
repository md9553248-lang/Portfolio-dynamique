import { describe, expect, it } from 'vitest';
import { CONTACT_LIMITS, validateContactForm } from './contact';

const valid = {
  name: 'Awa Ndiaye',
  email: 'awa@exemple.com',
  subject: 'Proposition de stage',
  message: 'Bonjour, je souhaite échanger avec vous.',
};

describe('validateContactForm', () => {
  it('accepte des valeurs correctes', () => {
    expect(validateContactForm(valid)).toEqual({});
  });

  it('refuse un formulaire vide', () => {
    const errors = validateContactForm({ name: '', email: '', subject: '', message: '' });
    expect(Object.keys(errors).sort()).toEqual(['email', 'message', 'name', 'subject']);
  });

  it('ignore les espaces en début et fin de saisie', () => {
    expect(validateContactForm({ ...valid, name: '   ' }).name).toBeDefined();
  });

  it('refuse une adresse e-mail invalide', () => {
    expect(validateContactForm({ ...valid, email: 'pas-un-email' }).email).toBeDefined();
    expect(validateContactForm({ ...valid, email: 'a@b' }).email).toBeDefined();
  });

  it('refuse un message trop court ou trop long', () => {
    expect(validateContactForm({ ...valid, message: 'court' }).message).toBeDefined();
    expect(
      validateContactForm({ ...valid, message: 'x'.repeat(CONTACT_LIMITS.message + 1) }).message,
    ).toBeDefined();
  });

  it('refuse un nom trop long', () => {
    expect(
      validateContactForm({ ...valid, name: 'x'.repeat(CONTACT_LIMITS.name + 1) }).name,
    ).toBeDefined();
  });
});
