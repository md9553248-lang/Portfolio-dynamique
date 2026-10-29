import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

afterEach(cleanup);

describe('Button', () => {
  it('est de type "button" par défaut (ne soumet pas un formulaire par accident)', () => {
    render(<Button>Valider</Button>);
    expect(screen.getByRole('button', { name: 'Valider' }).getAttribute('type')).toBe('button');
  });

  it('devient un lien quand href est fourni', () => {
    render(<Button href="#contact">Me contacter</Button>);
    const link = screen.getByRole('link', { name: 'Me contacter' });
    expect(link.getAttribute('href')).toBe('#contact');
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
