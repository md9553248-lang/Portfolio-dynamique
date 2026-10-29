import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TextAreaField, TextField } from './Field';

afterEach(cleanup);

describe('TextField', () => {
  it('associe le libellé au champ', () => {
    render(<TextField label="Nom" />);
    expect(screen.getByLabelText('Nom')).toBeTruthy();
  });

  it('relie l’aide et l’erreur au champ et le déclare invalide', () => {
    render(<TextField label="E-mail" hint="Exemple : nom@exemple.com" error="Adresse invalide." />);
    const input = screen.getByLabelText('E-mail');
    expect(input.getAttribute('aria-invalid')).toBe('true');

    const describedBy = (input.getAttribute('aria-describedby') ?? '').split(' ');
    const texts = describedBy.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toContain('Exemple : nom@exemple.com');
    expect(texts).toContain('Adresse invalide.');
    expect(screen.getByRole('alert').textContent).toBe('Adresse invalide.');
  });

  it('n’ajoute aucun attribut d’erreur quand le champ est valide', () => {
    render(<TextField label="Nom" />);
    const input = screen.getByLabelText('Nom');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });
});

describe('TextAreaField', () => {
  it('rend une zone de texte associée à son libellé', () => {
    render(<TextAreaField label="Message" />);
    expect(screen.getByLabelText('Message').tagName).toBe('TEXTAREA');
  });
});
