import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from './App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Accueil', () => {
  it('affiche le nom, la navigation et le contenu principal', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Mouhamed Diagne' })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: 'Navigation principale' })).toBeTruthy();
    expect(screen.getByRole('main')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Voir mes projets/ }).getAttribute('href')).toBe('/projets');
  });

  it('met en avant les projets publiés et jamais les brouillons', () => {
    renderAt('/');
    expect(screen.getByRole('link', { name: 'API REST de gestion de stock' })).toBeTruthy();
    expect(screen.queryByText('Projet en brouillon')).toBeNull();
  });

  it('n’affiche aucun bouton de téléchargement tant qu’aucun CV n’est publié', () => {
    renderAt('/');
    expect(screen.getByText('CV bientôt disponible')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Télécharger/ })).toBeNull();
  });

  it('signale clairement le contenu de démonstration', () => {
    renderAt('/');
    expect(screen.getAllByRole('note').length).toBeGreaterThan(0);
  });
});

describe('Projets', () => {
  it('liste uniquement les projets publiés et filtre par catégorie', () => {
    renderAt('/projets');
    expect(screen.getByText('4 projets affichés')).toBeTruthy();
    expect(screen.queryByText('Projet en brouillon')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Front-end' }));
    expect(screen.getByText('2 projets affichés')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Front-end' }).getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(screen.getByText('1 projet affiché')).toBeTruthy();
  });

  it('affiche le détail d’un projet publié', () => {
    renderAt('/projets/api-gestion-stock');
    expect(
      screen.getByRole('heading', { level: 1, name: 'API REST de gestion de stock' }),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Difficultés et solutions' })).toBeTruthy();
  });

  it('renvoie une page introuvable pour un brouillon ou un projet inconnu', () => {
    renderAt('/projets/projet-en-brouillon');
    expect(screen.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeTruthy();
    cleanup();
    renderAt('/projets/inexistant');
    expect(screen.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeTruthy();
  });
});

describe('Autres pages', () => {
  it('affiche une page 404 pour une URL inconnue', () => {
    renderAt('/une/page/inconnue');
    expect(screen.getByRole('heading', { level: 1, name: 'Page introuvable' })).toBeTruthy();
  });

  it('n’affiche pas les compétences masquées', () => {
    renderAt('/competences');
    expect(screen.getByText('React')).toBeTruthy();
    expect(screen.queryByText('Compétence masquée')).toBeNull();
  });

  it('n’affiche pas les articles en brouillon', () => {
    renderAt('/actualites');
    expect(screen.getByRole('link', { name: 'Premiers pas vers une API sécurisée' })).toBeTruthy();
    expect(screen.queryByText('Article en brouillon')).toBeNull();
  });

  it('présente la formation réelle sans bandeau de démonstration', () => {
    renderAt('/formations');
    expect(screen.getByText('Université Alioune Diop de Bambey (UADB), Sénégal')).toBeTruthy();
    expect(screen.queryByRole('note')).toBeNull();
  });

  it('affiche les pages légales provisoires', () => {
    renderAt('/confidentialite');
    expect(screen.getByRole('heading', { level: 1, name: 'Confidentialité' })).toBeTruthy();
    cleanup();
    renderAt('/mentions-legales');
    expect(screen.getByRole('heading', { level: 1, name: 'Mentions légales' })).toBeTruthy();
  });
});

describe('Contact', () => {
  it('signale les champs invalides sans rien envoyer', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/contact');

    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le message' }));

    expect(screen.getAllByRole('alert')).toHaveLength(4);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepte un formulaire valide, annonce le mode démonstration et n’envoie rien', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderAt('/contact');

    fireEvent.change(screen.getByLabelText(/^Nom/), { target: { value: 'Awa Ndiaye' } });
    fireEvent.change(screen.getByLabelText(/Adresse e-mail/), { target: { value: 'awa@exemple.com' } });
    fireEvent.change(screen.getByLabelText(/^Sujet/), { target: { value: 'Proposition de stage' } });
    fireEvent.change(screen.getByLabelText(/^Message/), {
      target: { value: 'Bonjour, je souhaite échanger avec vous.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Envoyer le message' }));

    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(screen.getByText(/Mode démonstration/)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Guide de style', () => {
  it('indique que l’API est disponible quand /api/health répond', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    renderAt('/guide-de-style');
    expect(await screen.findByText('API disponible')).toBeTruthy();
  });

  it('indique que l’API est indisponible en cas d’échec réseau', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));
    renderAt('/guide-de-style');
    expect(await screen.findByText('API indisponible')).toBeTruthy();
  });
});
