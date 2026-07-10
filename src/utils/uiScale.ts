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
  const clamped = clamp(scale);
  const z = clamped / 100;

  /* Zoom the ROOT DOCUMENT ELEMENT (<html>), not #root.

     Why: `zoom` on a normal flow box (#root) leaves that box's width
     computed against the UNZOOMED containing block, so at any scale ≠ 1
     the box no longer matches the viewport and a strip shows on the right.
     Worse, `zoom` on #root does not scale `position: fixed` descendants
     (the navbar), which are sized to the true viewport — so they drift out
     of alignment when zoomed in.

     Zooming <html> instead makes the viewport itself the zoomed containing
     block: everything, including fixed elements, scales uniformly, the page
     width always equals 100vw at every scale, and there is no gap on either
     side — zoomed in OR out. No width compensation is needed. */
  const html = document.documentElement as HTMLElement;
  // Clear any legacy overrides we used to put on #root.
  const root = document.getElementById('root') as HTMLElement | null;
  if (root) {
    root.style.removeProperty('zoom');
    root.style.removeProperty('width');
    root.style.removeProperty('max-width');
  }

  html.style.setProperty('transition', 'zoom 160ms ease-out');
  if (clamped === 100) {
    html.style.removeProperty('zoom');
  } else {
    html.style.setProperty('zoom', String(z));
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
