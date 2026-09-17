import { useEffect } from 'react';
import { useUIStore } from '../stores/useUIStore';

/**
 * Applies the `.light` class to <html> whenever theme changes.
 * :root holds the DARK palette by default (see index.css); `.light` overrides it.
 * index.html sets the class before first paint so a light-mode user never sees a dark flash.
 *
 * Mount this once, at the top of App.tsx. Components should never read
 * `theme` from localStorage directly — always go through useUIStore.
 */
export function useTheme() {
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  return { theme, toggleTheme };
}
