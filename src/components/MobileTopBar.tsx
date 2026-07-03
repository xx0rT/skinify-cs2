import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, Plus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBalanceStore } from '../store/balanceStore';
import { useCurrencyStore } from '../store/currencyStore';
import { openDepositModal } from './DepositModal';
import { openMobileMenu } from './MobileMenu';
import { useT } from '../lib/useT';
import { tap } from '../lib/motion';

/**
 * MobileTopBar — small fixed top bar shown only on mobile.
 *
 * Layout mirrors the skins.com reference the user shipped:
 *
 *   [logo]                                  [Log In] [Sign Up]
 *   ── OR (signed in) ──
 *   [logo]              [$0.00 | +]  [bell]  [hamburger]
 *
 * The balance + deposit form ONE combined pill (balance segment opens
 * the balance tab, the accent "+" square opens the deposit modal).
 * The hamburger opens the full-screen MobileMenu drawer.
 *
 * Hidden on lg+ where the full LandingNav takes over. Always pinned
 * on screen while scrolling — mobile users rely on the balance +
 * menu being reachable at all times (matches the skins.com app feel).
 * Only full-screen modals (via the nav-hidden event) may hide it.
 */
const MobileTopBar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { balance } = useBalanceStore();
  const { formatPrice } = useCurrencyStore();
  const t = useT();

  /* Listen for the same nav-hide event the desktop nav reacts to so
     full-screen modals (listing, deposit) hide the top bar too. */
  const [navHidden, setNavHidden] = useState(false);
  useEffect(() => {
    const onHide = (e: Event) => setNavHidden(Boolean((e as CustomEvent).detail));
    window.addEventListener('skinify:nav-hidden', onHide as EventListener);
    return () => window.removeEventListener('skinify:nav-hidden', onHide as EventListener);
  }, []);

  return (
    <motion.header
      className="lg:hidden fixed left-0 right-0 top-0 z-[55] border-b border-line bg-bg/92 backdrop-blur-md"
      style={{
        /* Stack the iOS safe-area inset on top of our own padding so
           the bar sits below the dynamic island / notch. */
        paddingTop: 'env(safe-area-inset-top)',
      }}
      animate={{
        y: navHidden ? '-100%' : '0%',
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.7 }}
    >
      <div className="h-14 px-4 flex items-center gap-2.5">
        {/* Logo — small, single tap-target */}
        <Link
          to="/"
          aria-label="Skinify home"
          className="shrink-0 w-10 h-10 rounded-2xl bg-accent text-on-accent grid place-items-center overflow-hidden"
        >
          <img
            src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
            alt=""
            className="w-8 h-8"
            draggable={false}
          />
        </Link>

        {/* Spacer so the right cluster pins to the right edge. */}
        <div className="flex-1" />

        {user ? (
          /* ── Logged in — [balance | +] combined pill + bell + menu ── */
          <>
            <div className="flex items-center h-10 rounded-xl overflow-hidden bg-subtle ring-1 ring-line/60">
              <button
                type="button"
                onClick={() => navigate('/profile?tab=balance')}
                className="h-full pl-3.5 pr-3 text-ink text-[13.5px] font-bold tabular-nums font-mono"
                aria-label="Balance"
              >
                {formatPrice(Number(balance || 0))}
              </button>
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={openDepositModal}
                className="w-10 h-full bg-accent text-on-accent grid place-items-center"
                aria-label={t('nav.refill', 'Deposit')}
              >
                <Plus size={17} strokeWidth={2.6} />
              </motion.button>
            </div>

            <motion.button
              whileTap={{ scale: 0.88 }}
              type="button"
              onClick={() => navigate('/profile?tab=notifications')}
              className="w-10 h-10 grid place-items-center text-ink-muted hover:text-ink transition-colors"
              aria-label="Notifications"
            >
              <Bell size={20} strokeWidth={2} />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.88 }}
              type="button"
              onClick={openMobileMenu}
              className="w-10 h-10 grid place-items-center text-ink hover:text-ink transition-colors"
              aria-label="Menu"
            >
              <Menu size={22} strokeWidth={2.2} />
            </motion.button>
          </>
        ) : (
          /* ── Logged out — Log In + Sign Up cluster ── */
          <>
            <Link
              to="/auth/signin"
              className="h-10 px-4 rounded-full text-ink text-[13px] font-bold inline-flex items-center"
              style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--line))' }}
            >
              {t('auth.signin.submit', 'Log in')}
            </Link>
            <Link
              to="/auth/signup"
              className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center"
              style={{ boxShadow: '0 8px 18px -10px rgb(var(--accent) / 0.55)' }}
            >
              {t('auth.signup.submit', 'Sign up')}
            </Link>
          </>
        )}
      </div>
    </motion.header>
  );
};

export default MobileTopBar;
