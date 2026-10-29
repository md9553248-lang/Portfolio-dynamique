export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'portfolio-theme';
/** Thème par défaut du site. Plus tard, il pourra être défini depuis l'administration. */
export const DEFAULT_THEME: Theme = 'dark';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

function getStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    // L'accès au stockage peut être bloqué (navigation privée, réglages du navigateur).
    return undefined;
  }
}

/** Lit le thème choisi par le visiteur (préférence d'affichage uniquement, aucune donnée sensible). */
export function readStoredTheme(): Theme | null {
  try {
    const value = getStorage()?.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeTheme(theme: Theme): void {
  try {
    getStorage()?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignoré : le thème fonctionne quand même pour la session en cours.
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export function getCurrentTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : DEFAULT_THEME;
}

/** À appeler avant le premier rendu React pour éviter un flash de mauvais thème. */
export function initTheme(defaultTheme: Theme = DEFAULT_THEME): Theme {
  const theme = readStoredTheme() ?? defaultTheme;
  applyTheme(theme);
  return theme;
}
