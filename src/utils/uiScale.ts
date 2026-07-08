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

  /* Scale #root, not <html>, so zoomed content lives in a normal flow box.

     The gap: `zoom: z` makes an element occupy z× its physical space. With
     `#root { width: 100% }` the root computes 100% of the *unzoomed*
     containing block and zoom then shrinks it to z×100%, so at z<1 a strip
     on the right (where the body background shows through) is left
     uncovered. We compensate by widening the root to `100% / z` *before*
     zoom — at z=0.85 that is ~117.6%, which renders back to exactly 100%
     of the viewport after zoom. At z=1 we clear the override entirely. */
  const root = document.getElementById('root') as HTMLElement | null;
  const target = root || (document.documentElement as HTMLElement);

  target.style.setProperty('transition', 'zoom 160ms ease-out');
  if (clamped === 100) {
    target.style.removeProperty('zoom');
    target.style.removeProperty('width');
    target.style.removeProperty('max-width');
  } else {
    target.style.setProperty('zoom', String(z));
    /* Widen so the zoomed box refills the viewport (at z=0.85 → ~117.6%,
       which renders back to 100vw after zoom). The global CSS rule
       `#root { max-width: 100vw }` would otherwise CLAMP this widened
       value straight back to 100vw — cancelling the compensation and
       leaving the right-hand gap (most visible on mobile). Override
       max-width here so the compensation actually takes effect. */
    target.style.setProperty('width', `${100 / z}%`);
    target.style.setProperty('max-width', `${100 / z}%`);
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
