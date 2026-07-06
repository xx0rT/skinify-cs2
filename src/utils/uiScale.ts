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

let resizeHooked = false;

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

  /* Engines disagree on how zoom on the root affects the initial
     containing block. Chromium lays the root out at viewport/zoom CSS
     px so the scaled result fills the screen. WebKit keeps the layout
     at the raw viewport width, so the scaled page underflows (<100%,
     gap on the right) or overflows (>100%). We can't probe this via
     getBoundingClientRect — its zoom semantics ALSO differ per engine
     (that ambiguity caused a desktop gap at 130%). Instead compare the
     root's layout width (offsetWidth, engine-agnostic CSS px) against
     both hypotheses and only compensate when it matches the buggy one.
     Compensation is an exact pixel width so it can't be re-scaled by
     whichever base the engine resolves percentages against. */
  requestAnimationFrame(() => {
    if (!root.style.zoom) return;
    const layout = root.offsetWidth;
    const correct = window.innerWidth / z;
    const buggy = window.innerWidth;
    if (Math.abs(layout - buggy) < Math.abs(layout - correct)) {
      root.style.setProperty('width', `${Math.round(window.innerWidth / z)}px`);
    }
  });

  /* Pixel widths don't track rotations / window resizes — re-run the
     measurement whenever the viewport changes. */
  if (!resizeHooked) {
    resizeHooked = true;
    let t: ReturnType<typeof setTimeout> | undefined;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => applyUiScale(getUiScale()), 120);
    });
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
