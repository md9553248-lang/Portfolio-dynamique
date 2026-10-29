import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  getCurrentTheme,
  initTheme,
  readStoredTheme,
  storeTheme,
} from './theme';

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('thème', () => {
  it('applique le thème sombre par défaut', () => {
    expect(initTheme()).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('respecte le thème mémorisé par le visiteur', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(initTheme()).toBe('light');
    expect(getCurrentTheme()).toBe('light');
  });

  it('ignore une valeur mémorisée invalide', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'violet');
    expect(readStoredTheme()).toBeNull();
    expect(initTheme()).toBe('dark');
  });

  it('mémorise le thème choisi', () => {
    storeTheme('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });

  it('continue de fonctionner si le stockage du navigateur est indisponible', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('stockage bloqué');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('stockage bloqué');
    });
    expect(readStoredTheme()).toBeNull();
    expect(() => storeTheme('light')).not.toThrow();
    applyTheme('light');
    expect(getCurrentTheme()).toBe('light');
  });
});
