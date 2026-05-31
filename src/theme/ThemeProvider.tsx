import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { applyPalette, PaletteId, ThemeMode } from './palettes';

/**
 * Theme state lives on <html data-theme="..."> so non-React things (index.css
 * variable selectors, native form controls, color-scheme) can react to it.
 * The provider just keeps React state in sync and writes localStorage.
 *
 * Mode flow:
 *   - "auto"  → follow prefers-color-scheme (re-applies if the OS changes)
 *   - "light" / "dark" → forced
 *
 * Persisted keys:
 *   skinify.theme   = 'auto' | 'light' | 'dark'
 *   skinify.palette = PaletteId
 */

type ModePref = 'auto' | ThemeMode;

interface ThemeCtx {
  /** What the user picked (may be 'auto') */
  mode: ModePref;
  /** What's currently rendered (always 'light' | 'dark') */
  resolvedMode: ThemeMode;
  palette: PaletteId;
  setMode: (m: ModePref) => void;
  toggleMode: () => void;
  setPalette: (p: PaletteId) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const MODE_KEY = 'skinify.theme';
const PALETTE_KEY = 'skinify.palette';

const readMode = (): ModePref => {
  if (typeof localStorage === 'undefined') return 'auto';
  const v = localStorage.getItem(MODE_KEY);
  return v === 'light' || v === 'dark' || v === 'auto' ? v : 'auto';
};
const readPalette = (): PaletteId => {
  // Default is violet for every code path — matches the brand logo.
  if (typeof localStorage === 'undefined') return 'violet';

  // One-shot migration: very early users had `graphite` written to
  // localStorage when it was the default. They never picked it; it was just
  // the seed. We bump the keyed default once so those users get the brand
  // accent. The version key prevents this from re-firing on subsequent
  // visits, and a user who *explicitly* picks graphite from Settings will
  // still keep it because we only auto-migrate if the value is the stale
  // default.
  const migratedKey = 'skinify.palette.v';
  const migrated = localStorage.getItem(migratedKey);
  const v = localStorage.getItem(PALETTE_KEY) as PaletteId | null;
  if (!migrated && v === 'graphite') {
    localStorage.setItem(migratedKey, '1');
    localStorage.setItem(PALETTE_KEY, 'violet');
    return 'violet';
  }
  if (!migrated) localStorage.setItem(migratedKey, '1');
  return v ?? 'violet';
};
const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

const resolve = (pref: ModePref): ThemeMode =>
  pref === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : pref;

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ModePref>(() => readMode());
  const [palette, setPaletteState] = useState<PaletteId>(() => readPalette());
  const [resolvedMode, setResolvedMode] = useState<ThemeMode>(() => resolve(readMode()));

  // Re-resolve when the OS preference flips (only matters in 'auto')
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (mode === 'auto') setResolvedMode(systemPrefersDark() ? 'dark' : 'light');
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [mode]);

  // Reflect mode → html attribute + persist
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedMode);
  }, [resolvedMode]);

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
    setResolvedMode(resolve(mode));
  }, [mode]);

  // Apply palette whenever the resolved mode or palette changes
  useEffect(() => {
    applyPalette(palette, resolvedMode);
  }, [palette, resolvedMode]);

  useEffect(() => {
    localStorage.setItem(PALETTE_KEY, palette);
  }, [palette]);

  const setMode = useCallback((m: ModePref) => setModeState(m), []);
  const toggleMode = useCallback(() => {
    setModeState((cur) => {
      const next = resolve(cur) === 'dark' ? 'light' : 'dark';
      return next;
    });
  }, []);
  const setPalette = useCallback((p: PaletteId) => setPaletteState(p), []);

  const value = useMemo<ThemeCtx>(
    () => ({ mode, resolvedMode, palette, setMode, toggleMode, setPalette }),
    [mode, resolvedMode, palette, setMode, toggleMode, setPalette],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useTheme = (): ThemeCtx => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme must be used inside <ThemeProvider>');
  return v;
};
