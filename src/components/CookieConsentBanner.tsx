import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { spring, tap } from '../lib/motion';
import { useT } from '../lib/useT';
import {
  grantAnalyticsConsent,
  declineAnalyticsConsent,
  hasStoredConsentChoice,
} from '../utils/gtag';

/* CookieConsentBanner — small bottom bar, shown once until the visitor
   picks Accept or Decline. Only gates GA4 (analytics); nothing
   essential (auth, cart, Stripe) depends on this choice. Skipped
   entirely if GA isn't configured, since there's nothing to consent to. */
const CookieConsentBanner: React.FC = () => {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) return;
    if (!hasStoredConsentChoice()) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    grantAnalyticsConsent();
    setVisible(false);
  };
  const decline = () => {
    declineAnalyticsConsent();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={spring}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-[380px] z-[95] panel p-4 shadow-2xl"
          role="dialog"
          aria-label="Cookie consent"
        >
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-accent-soft text-accent grid place-items-center shrink-0">
              <Cookie size={16} strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink tracking-tight">
                {t('cookies.title', 'We use analytics cookies')}
              </p>
              <p className="text-[12px] text-ink-muted font-medium mt-1 leading-relaxed">
                {t(
                  'cookies.body',
                  'We use Google Analytics to see how visitors use Skinify. No data is shared with advertisers.',
                )}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3.5">
            <motion.button
              whileTap={tap}
              onClick={decline}
              className="flex-1 h-9 rounded-full bg-subtle hover:bg-bg text-ink text-[12.5px] font-semibold transition-colors"
            >
              {t('cookies.decline', 'Decline')}
            </motion.button>
            <motion.button
              whileTap={tap}
              onClick={accept}
              className="flex-1 h-9 rounded-full bg-accent text-on-accent text-[12.5px] font-bold hover:opacity-95 transition-opacity"
            >
              {t('cookies.accept', 'Accept')}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsentBanner;
