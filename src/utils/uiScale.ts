/* ─────────────────────────────────────────────────────────────────────────
   uiScale — user-adjustable interface zoom ("font size / DPI").

   The design system uses px-based type sizes, so rem scaling wouldn't
   reach most text. CSS zoom scales the whole layout uniformly and is
   supported by every current browser (Chrome/Edge/Safari always,
   Firefox 126+). Persisted in localStorage and applied on boot.

   Driven by a slider in Settings — value is a percentage clamped to
   [85, 130]. A short CSS transition on zoom makes dragging feel like
   a smooth continuous scale in browsers that can interpolate zoom
   (Chromium); others simply snap per step.
   ───────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'skinify_ui_scale';

export const UI_SCALE_MIN = 85;
export const UI_SCALE_MAX = 130;
export const UI_SCALE_STEP = 5;

export type UiScale = number;

function clamp(value: number): UiScale {
  if (!Number.isFinite(value)) return 100;
  return Math.min(UI_SCALE_MAX, Math.max(UI_SCALE_MIN, Math.round(value)));
}

export function getUiScale(): UiScale {
  try {
    const raw = Number(localStorage.getItem(STORAGE_KEY));
    if (raw) return clamp(raw);
  } catch {
    /* private mode */
  }
  return 100;
}

export function applyUiScale(scale: UiScale): void {
  const root = document.documentElement as HTMLElement;
  const clamped = clamp(scale);
  root.style.setProperty('transition', 'zoom 160ms ease-out');
  if (clamped === 100) {
    root.style.removeProperty('zoom');
  } else {
    root.style.setProperty('zoom', String(clamped / 100));
  }
}

export function setUiScale(scale: UiScale): void {
  const clamped = clamp(scale);
  try {
    localStorage.setItem(STORAGE_KEY, String(clamped));
  } catch {
    /* private mode */
  }
  applyUiScale(clamped);
}
