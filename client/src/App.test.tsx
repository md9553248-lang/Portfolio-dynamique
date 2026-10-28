import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('affiche le titre', () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Portfolio' })).toBeTruthy();
  });

  it('indique que l’API est disponible quand /api/health répond', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    render(<App />);
    expect(await screen.findByText('API disponible')).toBeTruthy();
  });

  it('indique que l’API est indisponible en cas d’échec réseau', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));
    render(<App />);
    expect(await screen.findByText('API indisponible')).toBeTruthy();
  });
});
