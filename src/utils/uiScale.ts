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
  const z = clamped / 100;
  root.style.setProperty('transition', 'zoom 160ms ease-out');
  if (clamped === 100) {
    root.style.removeProperty('zoom');
    root.style.removeProperty('width');
    return;
  }
  root.style.setProperty('zoom', String(z));
  root.style.removeProperty('width');

  /* Chromium re-derives the layout width under zoom so the page keeps
     filling the viewport. WebKit (iOS Safari) does not — it lays the
     page out at the original viewport width and renders it scaled,
     which leaves a growing gap on the right below 100% (and overflow
     above it). Measure instead of UA-sniffing: if the zoomed root no
     longer spans the visual viewport, stretch its layout width by the
     inverse of the zoom so `layout × zoom = viewport` again. The
     percentage stays correct across rotations, so no resize listener
     is needed. */
  requestAnimationFrame(() => {
    const rendered = root.getBoundingClientRect().width;
    if (Math.abs(rendered - window.innerWidth) > 1) {
      root.style.setProperty('width', `${100 / z}%`);
    }
  });
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
