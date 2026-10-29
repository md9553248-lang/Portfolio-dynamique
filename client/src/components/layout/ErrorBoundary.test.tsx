import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Boom(): never {
  throw new Error('plantage volontaire');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('affiche une page d’erreur adaptée au lieu d’une page blanche', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Une erreur est survenue' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toBeTruthy();
  });

  it('n’affiche pas le détail technique de l’erreur au visiteur', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.queryByText(/plantage volontaire/)).toBeNull();
  });

  it('affiche le contenu normalement quand il n’y a pas d’erreur', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary>
          <p>Contenu normal</p>
        </ErrorBoundary>
      </MemoryRouter>,
    );
    expect(screen.getByText('Contenu normal')).toBeTruthy();
  });
});
