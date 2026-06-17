import { useEffect } from 'react';

/* ─────────────────────────────────────────────────────────────────────────
   useBodyScrollLock — prevent the page from scrolling while a modal is
   open. Uses a process-wide ref counter so multiple stacked modals (e.g.
   deposit modal opening a confirm-listing dialog) cooperate cleanly:
   only the first lock writes `overflow: hidden` and only the last
   release restores the previous value.

   Pass a falsy `active` to release the lock (useful when a parent always
   renders the modal but it might be in the "closed" state — pass
   `isOpen` directly). The hook also restores the previous overflow on
   unmount so a component that unmounts mid-modal doesn't leave the body
   stuck.

   Why a ref counter instead of just stacking effects: nested modals
   would each write/restore `overflow` independently, and the inner
   modal's cleanup would restore the *empty* string (the value the outer
   modal had captured before the inner one opened was "hidden", not the
   true original). The counter ensures the original page-scroll state
   is what gets restored when the last modal closes.
   ───────────────────────────────────────────────────────────────────────── */

let lockCount = 0;
let originalOverflow = '';

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [active]);
}
