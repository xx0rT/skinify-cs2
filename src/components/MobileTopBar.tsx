import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Plus } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBalanceStore } from '../store/balanceStore';
import { useCurrencyStore } from '../store/currencyStore';
import { openDepositModal } from './DepositModal';
import { useT } from '../lib/useT';
import { tap } from '../lib/motion';

/**
 * MobileTopBar — small fixed top bar shown only on mobile.
 *
 * Layout mirrors the skins.com reference the user shipped:
 *
 *   [logo]                                  [Log In] [Sign Up]
 *   ── OR (signed in) ──
 *   [logo]            [+ Refill]  [balance]  [bell] [avatar]
 *
 * Hidden on lg+ where the full LandingNav takes over. Scroll-direction
 * aware: hides when scrolling DOWN past 80px, reveals when scrolling
 * UP. Mirrors the desktop navbar's behaviour so mobile feels
 * consistent with the rest of the site.
 *
 * The bottom-tab Cart icon is already in MobileTabBar, so we don't
 * duplicate it up here — that would waste horizontal space on small
 * phones.
 */
const MobileTopBar: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { balance } = useBalanceStore();
  const { formatPrice } = useCurrencyStore();
  const t = useT();

  /* Scroll-direction tracker — same pattern as the desktop nav.
     At the top: always shown. Scrolling DOWN past 80px: hide.
     Scrolling UP: show. */
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (latest) => {
    const delta = latest - lastYRef.current;
    if (Math.abs(delta) < 6) return;
    lastYRef.current = latest;
    if (latest <= 80) {
      setHidden((prev) => (prev ? false : prev));
      return;
    }
    if (delta > 0) {
      setHidden((prev) => (prev ? prev : true));
    } else {
      setHidden((prev) => (prev ? false : prev));
    }
  });

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
        y: hidden || navHidden ? '-100%' : '0%',
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.7 }}
    >
      <div className="h-12 px-3 flex items-center gap-2">
        {/* Logo — small, single tap-target */}
        <Link
          to="/"
          aria-label="Skinify home"
          className="shrink-0 w-9 h-9 rounded-2xl bg-accent text-on-accent grid place-items-center overflow-hidden"
        >
          <img
            src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
            alt=""
            className="w-7 h-7"
            draggable={false}
          />
        </Link>

        {/* Spacer so the right cluster pins to the right edge. */}
        <div className="flex-1" />

        {user ? (
          /* ── Logged in — refill chip + balance pill + bell + avatar ── */
          <>
            <motion.button
              whileTap={tap}
              onClick={openDepositModal}
              className="h-9 px-3 rounded-full bg-accent text-on-accent text-[12px] font-bold inline-flex items-center gap-1"
              style={{ boxShadow: '0 6px 14px -8px rgb(var(--accent) / 0.55)' }}
              aria-label={t('nav.refill', 'Refill')}
            >
              <Plus size={13} strokeWidth={2.6} />
              <span>{t('nav.refill', 'Refill')}</span>
            </motion.button>

            <button
              type="button"
              onClick={() => navigate('/profile?tab=balance')}
              className="hidden xs:inline-flex h-9 px-2.5 rounded-full bg-subtle text-ink text-[12px] font-bold tabular-nums items-center"
              aria-label="Balance"
            >
              {formatPrice(Number(balance || 0))}
            </button>

            <button
              type="button"
              onClick={() => navigate('/profile?tab=notifications')}
              className="w-9 h-9 rounded-full bg-subtle grid place-items-center text-ink-muted hover:text-ink transition-colors"
              aria-label="Notifications"
            >
              <Bell size={15} strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="w-9 h-9 rounded-full bg-accent text-on-accent grid place-items-center overflow-hidden font-bold text-[13px]"
              aria-label="Profile"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || 'avatar'}
                  className="w-full h-full object-cover"
                />
              ) : (
                (user.displayName || 'U').charAt(0).toUpperCase()
              )}
            </button>
          </>
        ) : (
          /* ── Logged out — Log In + Sign Up cluster ── */
          <>
            <Link
              to="/auth/signin"
              className="h-9 px-3.5 rounded-full text-ink text-[12.5px] font-bold inline-flex items-center"
              style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--line))' }}
            >
              {t('auth.signin.submit', 'Log in')}
            </Link>
            <Link
              to="/auth/signup"
              className="h-9 px-3.5 rounded-full bg-accent text-on-accent text-[12.5px] font-bold inline-flex items-center"
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
