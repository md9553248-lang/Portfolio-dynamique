import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

afterEach(cleanup);

describe('Button', () => {
  it('est de type "button" par défaut (ne soumet pas un formulaire par accident)', () => {
    render(<Button>Valider</Button>);
    expect(screen.getByRole('button', { name: 'Valider' }).getAttribute('type')).toBe('button');
  });

  it('devient un lien simple pour une ancre ou une adresse externe', () => {
    render(<Button href="#contact">Me contacter</Button>);
    expect(screen.getByRole('link', { name: 'Me contacter' }).getAttribute('href')).toBe('#contact');
  });

  it('utilise le routeur pour un chemin interne', () => {
    render(
      <MemoryRouter>
        <Button href="/projets">Projets</Button>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Projets' }).getAttribute('href')).toBe('/projets');
  });

  it('appelle onClick au clic', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Cliquer</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Cliquer' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('en chargement : désactivé, signalé aux lecteurs d’écran et sans clic', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Envoyer
      </Button>,
    );
    const button = screen.getByRole('button', { name: /Envoyer/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
