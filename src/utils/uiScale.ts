/* ─────────────────────────────────────────────────────────────────────────
   uiScale — user-adjustable interface zoom ("font size / DPI").

   The design system uses px-based type sizes, so rem scaling wouldn't
   reach most text. CSS zoom scales the whole layout uniformly and is
   supported by every current browser (Chrome/Edge/Safari always,
   Firefox 126+). Persisted in localStorage and applied on boot.
   ───────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'skinify_ui_scale';

export const UI_SCALES = [
  { value: 90, label: 'Small' },
  { value: 100, label: 'Default' },
  { value: 110, label: 'Large' },
  { value: 125, label: 'Extra large' },
] as const;

export type UiScale = (typeof UI_SCALES)[number]['value'];

export function getUiScale(): UiScale {
  try {
    const raw = Number(localStorage.getItem(STORAGE_KEY));
    if (UI_SCALES.some((s) => s.value === raw)) return raw as UiScale;
  } catch {
    /* private mode */
  }
  return 100;
}

export function applyUiScale(scale: UiScale): void {
  const root = document.documentElement as HTMLElement & { style: CSSStyleDeclaration };
  if (scale === 100) {
    root.style.removeProperty('zoom');
  } else {
    root.style.setProperty('zoom', String(scale / 100));
  }
}

export function setUiScale(scale: UiScale): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(scale));
  } catch {
    /* private mode */
  }
  applyUiScale(scale);
}
