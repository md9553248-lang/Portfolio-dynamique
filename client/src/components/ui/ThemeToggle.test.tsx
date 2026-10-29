import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { THEME_STORAGE_KEY, applyTheme } from '../../lib/theme';
import { ThemeToggle } from './ThemeToggle';

beforeEach(() => {
  window.localStorage.clear();
  applyTheme('dark');
});

afterEach(cleanup);

describe('ThemeToggle', () => {
  it('bascule le thème, met à jour le libellé et mémorise le choix', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Passer au thème clair' }));
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: 'Passer au thème sombre' }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
