import { useCallback, useState } from 'react';
import { applyTheme, getCurrentTheme, storeTheme, type Theme } from '../lib/theme';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getCurrentTheme);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    storeTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(getCurrentTheme() === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
}
