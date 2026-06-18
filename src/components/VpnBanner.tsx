import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, X } from 'lucide-react';
import { spring } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   VpnBanner — soft, dismissible notice that appears when our IP
   detection flags the user's connection as a VPN / datacenter exit.

   Why soft, not blocking:
     - The free-tier signal we have (api.country.is + optional IPHub)
       has real false positives. iCloud Private Relay, corporate VPNs,
       Starlink, and CGNAT'd mobile carriers all sometimes flag.
     - Blocking those legitimate users hurts more than the fraud
       prevention we get. A banner gives the user agency: dismiss if
       it's a false positive, act on it if not.

   Lifecycle:
     - Listens for the `skinify:vpn-detected` event fired by App.tsx's
       boot effect.
     - Reads localStorage `skinify_vpn_dismissed` so dismissals stick
       across reloads (per browser, not per session — re-warns once
       the user opens a fresh browser/session).
   ───────────────────────────────────────────────────────────────────────── */

const DISMISS_KEY = 'skinify_vpn_dismissed';
/* Long dismiss window — once a user has said "yes I'm using a VPN
   on purpose" we don't badger them again for a week. */
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const VpnBanner: React.FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    /* If the boot effect already flipped the global before we mounted,
       respect it. */
    if ((window as any).__skinifyVpn === true) {
      maybeShow();
    }
    const onDetected = () => maybeShow();
    window.addEventListener('skinify:vpn-detected', onDetected);
    return () => window.removeEventListener('skinify:vpn-detected', onDetected);

    function maybeShow() {
      try {
        const raw = localStorage.getItem(DISMISS_KEY);
        if (raw) {
          const ts = Number(raw);
          if (Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS) {
            return; // recently dismissed — skip
          }
        }
      } catch {
        /* private mode — ignore, show the banner */
      }
      setShow(true);
    }
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode — no-op */
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="vpn-banner"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ ...spring, mass: 0.6 }}
          /* Pinned just below the navbar (z-50 < navbar's z-55). Full
             width on mobile, centered card on desktop. */
          className="fixed left-2 right-2 sm:left-1/2 sm:-translate-x-1/2 top-[72px] z-[50] sm:max-w-[640px] w-auto"
        >
          <div
            className="card-elevated p-3 sm:p-4 flex items-start gap-3"
            style={{
              boxShadow:
                '0 20px 40px -16px rgba(20,16,40,0.35), 0 6px 16px -6px rgba(20,16,40,0.25)',
            }}
          >
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 grid place-items-center shrink-0">
              <ShieldAlert size={16} strokeWidth={2.4} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-ink tracking-tight">
                VPN or proxy detected
              </div>
              <p className="text-[12px] text-ink-muted font-medium mt-1 leading-relaxed">
                For accurate pricing in your local currency and to help us prevent
                fraud, please turn off your VPN before depositing or trading.
              </p>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="h-8 w-8 shrink-0 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors"
            >
              <X size={14} strokeWidth={2.4} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VpnBanner;
