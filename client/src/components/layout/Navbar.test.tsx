import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Navbar } from './Navbar';

afterEach(cleanup);

const LINKS = [
  { label: 'Projets', href: '/projets' },
  { label: 'Contact', href: '/contact' },
];

describe('Navbar', () => {
  it('affiche les liens et signale la page courante', () => {
    render(<Navbar brand="Portfolio" links={LINKS} currentHref="/projets" />);
    expect(screen.getByRole('link', { name: 'Projets' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: 'Contact' }).getAttribute('aria-current')).toBeNull();
  });

  it('ouvre et ferme le menu mobile avec aria-expanded', () => {
    render(<Navbar brand="Portfolio" links={LINKS} />);
    const button = screen.getByRole('button', { name: 'Ouvrir le menu' });
    expect(button.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(button);
    expect(
      screen.getByRole('button', { name: 'Fermer le menu' }).getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('se ferme avec Échap et redonne le focus au bouton', () => {
    render(<Navbar brand="Portfolio" links={LINKS} />);
    const button = screen.getByRole('button', { name: 'Ouvrir le menu' });
    fireEvent.click(button);

    fireEvent.keyDown(document, { key: 'Escape' });

    const closed = screen.getByRole('button', { name: 'Ouvrir le menu' });
    expect(closed.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(closed);
  });
});
