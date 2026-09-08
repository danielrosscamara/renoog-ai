import { useEffect } from 'react';
import { useUIStore } from '../stores/useUIStore';

/**
 * Applies the `.dark` class to <html> whenever theme changes.
 * :root holds the LIGHT palette by default (see index.css); `.dark` overrides it.
 *
 * Mount this once, at the top of App.tsx. Components should never read
 * `theme` from localStorage directly — always go through useUIStore.
 */
export function useTheme() {
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return { theme, toggleTheme };
}