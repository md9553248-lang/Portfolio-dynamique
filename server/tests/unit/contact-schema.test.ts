import { describe, expect, it } from 'vitest';
import { contactSchema, hasControlChars } from '../../src/modules/contact/contact.schema.js';

describe('hasControlChars', () => {
  it('détecte les caractères de contrôle', () => {
    expect(hasControlChars('bon\u0000jour', true)).toBe(true);
    expect(hasControlChars('bon\u001Bjour', false)).toBe(true);
    expect(hasControlChars('bon\u007Fjour', true)).toBe(true);
  });

  it('autorise ou non les retours à la ligne selon le champ', () => {
    expect(hasControlChars('ligne 1\nligne 2', true)).toBe(false);
    expect(hasControlChars('ligne 1\nligne 2', false)).toBe(true);
    expect(hasControlChars('Éléphant à Dakar 🙂', false)).toBe(false);
  });
});

describe('contactSchema', () => {
  const valid = {
    name: 'Awa Ndiaye',
    email: 'awa@exemple.com',
    subject: 'Stage',
    message: 'Bonjour, je souhaite échanger.',
  };

  it('accepte un message valide et nettoie les espaces', () => {
    const result = contactSchema.safeParse({ ...valid, name: '  Awa  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Awa');
  });

  it('refuse un message avec un caractère nul', () => {
    expect(
      contactSchema.safeParse({ ...valid, message: 'Bonjour\u0000 tout le monde' }).success,
    ).toBe(false);
  });

  it('refuse les champs inconnus', () => {
    expect(contactSchema.safeParse({ ...valid, isAdmin: true }).success).toBe(false);
  });
});
