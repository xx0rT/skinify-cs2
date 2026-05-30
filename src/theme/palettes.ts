/**
 * Accent palettes — 7 user-selectable accents, each with a light and dark
 * variant. Dark variants are intentionally desaturated so they don't glow.
 *
 * Each palette ships three tokens that map to CSS variables:
 *   --accent       primary accent (button bg, dot, fills)
 *   --accent-soft  faint background tint of the accent
 *   --on-accent    text/icon color that contrasts the primary accent
 *
 * Values are space-separated RGB channels (matches index.css convention).
 */

export type ThemeMode = 'light' | 'dark';
export type PaletteId =
  | 'graphite'
  | 'sky'
  | 'violet'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'crimson';

export interface PaletteTokens {
  accent: string;        // "r g b"
  accentSoft: string;
  onAccent: string;
}

export interface Palette {
  id: PaletteId;
  name: string;
  light: PaletteTokens;
  dark: PaletteTokens;
}

export const palettes: Palette[] = [
  {
    id: 'graphite',
    name: 'Graphite',
    light: { accent: '38 38 42',   accentSoft: '230 228 224', onAccent: '255 255 255' },
    dark:  { accent: '210 210 215', accentSoft: '50 50 55',   onAccent: '18 18 20' },
  },
  {
    id: 'sky',
    name: 'Sky',
    light: { accent: '60 110 180', accentSoft: '224 234 248', onAccent: '255 255 255' },
    dark:  { accent: '140 184 230', accentSoft: '34 50 74',   onAccent: '14 18 28' },
  },
  {
    id: 'violet',
    name: 'Violet',
    // Tuned to the brand logo (#8B49F2). Vibrant in light, dimmed in dark
    // so it doesn't glare against the near-black bg.
    light: { accent: '139 73 242',  accentSoft: '237 226 255', onAccent: '255 255 255' },
    dark:  { accent: '181 135 255', accentSoft: '52 38 92',    onAccent: '20 14 32' },
  },
  {
    id: 'emerald',
    name: 'Emerald',
    light: { accent: '40 130 90',  accentSoft: '222 238 228', onAccent: '255 255 255' },
    dark:  { accent: '130 200 160', accentSoft: '30 58 46',   onAccent: '12 24 18' },
  },
  {
    id: 'amber',
    name: 'Amber',
    light: { accent: '180 130 30', accentSoft: '244 234 200', onAccent: '255 255 255' },
    dark:  { accent: '218 188 90', accentSoft: '60 50 24',    onAccent: '24 20 8' },
  },
  {
    id: 'rose',
    name: 'Rose',
    light: { accent: '188 90 130', accentSoft: '248 222 234', onAccent: '255 255 255' },
    dark:  { accent: '225 165 195', accentSoft: '70 38 56',   onAccent: '28 14 22' },
  },
  {
    id: 'crimson',
    name: 'Crimson',
    light: { accent: '170 60 65',  accentSoft: '246 222 222', onAccent: '255 255 255' },
    dark:  { accent: '220 140 140', accentSoft: '70 38 38',   onAccent: '28 14 14' },
  },
];

export const paletteById = (id: PaletteId): Palette =>
  palettes.find((p) => p.id === id) ?? palettes[0];

/** Apply a palette to the <html> element by setting CSS variables. */
export function applyPalette(id: PaletteId, mode: ThemeMode) {
  const p = paletteById(id);
  const t = mode === 'dark' ? p.dark : p.light;
  const root = document.documentElement;
  root.style.setProperty('--accent', t.accent);
  root.style.setProperty('--accent-soft', t.accentSoft);
  root.style.setProperty('--on-accent', t.onAccent);
}
