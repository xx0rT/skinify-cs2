import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Cake, ArrowRight, X } from 'lucide-react';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   AgeVerificationModal — first-visit 18+ gate.

   Visual language matches the rest of the app: token-based card surface,
   accent CTA, label-eyebrow + clean typography. No gradient hero, no
   purple/pink branding — those clash with the marketplace's design.

   Stored under `localStorage.skinify_age_verified` (kept the legacy
   `ageVerified` key in sync so existing visitors aren't re-prompted).
   ───────────────────────────────────────────────────────────────────────── */
const AgeVerificationModal: React.FC = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const verified =
        localStorage.getItem('skinify_age_verified') ||
        localStorage.getItem('ageVerified');
      if (!verified) setOpen(true);
    } catch {
      /* private mode — show the gate. */
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const confirm = () => {
    try {
      localStorage.setItem('skinify_age_verified', '1');
      localStorage.setItem('ageVerified', 'true');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const decline = () => {
    /* Send the visitor somewhere benign; window.close() only works if the
       tab was script-opened, so navigation is the reliable fallback. */
    try {
      window.location.href = 'https://www.google.com/';
    } catch {
      /* ignore */
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="age-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="Age verification"
          className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4"
        >
          <motion.div
            key="age-card"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={spring}
            className="card w-full max-w-md relative overflow-hidden"
          >
            {/* Accent top stripe — single-pixel cue without overwhelming the card */}
            <div
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{
                background:
                  'linear-gradient(90deg, rgb(var(--accent)), rgb(var(--accent) / 0.55) 60%, transparent)',
              }}
              aria-hidden
            />

            <div className="p-6 sm:p-8">
              {/* Medallion */}
              <div className="relative w-14 h-14 rounded-2xl grid place-items-center bg-accent-soft mb-5">
                <ShieldCheck size={22} strokeWidth={2.4} className="text-accent" />
              </div>

              <span className="label-eyebrow">Age check</span>
              <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-ink leading-tight mt-1.5">
                Are you 18 or older?
              </h2>
              <p className="text-[13.5px] text-ink-muted font-medium leading-relaxed mt-3">
                Skinify is a marketplace for CS2 in-game items. By continuing
                you confirm you're old enough to trade virtual goods in your
                jurisdiction.
              </p>

              {/* Bullet cues — three short, factual lines */}
              <ul className="mt-5 space-y-2.5">
                {[
                  { Icon: Cake, text: 'Must be 18+ (or local age of majority)' },
                  { Icon: ShieldCheck, text: 'Escrow-protected, peer-to-peer trades' },
                  { Icon: ArrowRight, text: 'Continue to access the marketplace' },
                ].map(({ Icon, text }, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-[12.5px] text-ink-muted font-medium"
                  >
                    <span className="shrink-0 w-5 h-5 rounded-full bg-subtle grid place-items-center mt-0.5">
                      <Icon size={11} strokeWidth={2.4} className="text-ink" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>

              {/* CTAs */}
              <div className="mt-6 flex flex-col sm:flex-row-reverse gap-2">
                <motion.button
                  whileTap={tap}
                  whileHover={{ scale: 1.01 }}
                  onClick={confirm}
                  className="flex-1 h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center justify-center gap-2"
                  style={{ boxShadow: '0 12px 26px -12px rgb(var(--accent) / 0.55)' }}
                >
                  Yes, I'm 18 or older
                  <ArrowRight size={14} strokeWidth={2.6} />
                </motion.button>
                <motion.button
                  whileTap={tap}
                  onClick={decline}
                  className="sm:w-auto h-12 px-5 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink font-semibold text-[13.5px] inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <X size={13} strokeWidth={2.4} />
                  No, leave
                </motion.button>
              </div>

              <p className="text-[11px] text-ink-dim font-medium leading-relaxed text-center mt-5">
                Confirming agrees to the{' '}
                <a href="/terms" className="text-accent hover:opacity-80 font-bold">
                  Terms
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-accent hover:opacity-80 font-bold">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AgeVerificationModal;
