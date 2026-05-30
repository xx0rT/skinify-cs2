import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from 'framer-motion';
import {
  Search,
  ShoppingBag,
  Heart,
  Sun,
  Moon,
  Monitor,
  Plus,
  Menu,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useToastStore } from '../store/toastStore';
import SteamLogin from './auth/SteamLogin';
import UserProfile from './auth/UserProfile';
import { useTheme } from '../theme/ThemeProvider';
import { tap } from '../lib/motion';
import { openSearchPalette } from './SearchPalette';
import { openDepositModal } from './DepositModal';

/**
 * LandingNav — top-only, no sidebar. Sits on the page background (not
 * floating), uses .card surface so it adopts the theme. Search lives at the
 * center, primary nav on the left, account controls on the right.
 *
 * Mobile: collapses to logo + search icon + menu drawer.
 */

const NAV_LINKS = [
  { label: 'Market', to: '/marketplace' },
  { label: 'Sell', to: '/profile?tab=inventory' },
  { label: 'Bonuses', to: '/bonuses' },
  { label: 'FAQ', to: '/faq' },
];

export const LandingNav: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getItemCount } = useCartStore();
  const { addToast } = useToastStore();
  const { resolvedMode, mode, setMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement | null>(null);

  // Scroll-shrink: the navbar collapses its vertical padding + tightens the
  // glass surface once you've scrolled past ~24px. Cheap state flip, no
  // re-render storm because we throttle on a motion value, not raw scroll.
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (latest) => {
    const next = latest > 24;
    if (next !== scrolled) setScrolled(next);
  });

  const cartCount = getItemCount();

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const ThemeIcon = resolvedMode === 'dark' ? Moon : Sun;

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-bg/85 backdrop-blur-xl shadow-[0_4px_24px_-12px_rgba(20,16,40,0.18)]'
            : 'bg-bg/60 backdrop-blur-md'
        }`}
      >
        <div
          className={`max-w-[1480px] mx-auto px-4 sm:px-6 transition-all duration-300 ${
            scrolled ? 'py-1.5' : 'py-3'
          }`}
        >
          {/*
            3-column grid keeps the search VISUALLY centered regardless of
            how wide the left (logo + nav) or right (actions) cells become.
            Both side cells are 1fr so they balance each other; the search
            sits in the auto middle cell at a fixed max width. Without this,
            flex-1 would push the search left/right whenever a side cell
            changes size (e.g. logged out vs logged in).
          */}
          <div className="card grid items-center gap-3 h-16 px-3 grid-cols-[1fr_auto_1fr]">
            {/* LEFT — logo + nav */}
            <div className="flex items-center gap-2 min-w-0 justify-self-start">
              <Link
                to="/"
                className="flex items-center gap-2.5 shrink-0 px-2"
                aria-label="Skinify home"
              >
                <div className="icon-chip bg-accent text-on-accent">
                  <img
                    src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                    alt=""
                    className="w-6 h-6"
                  />
                </div>
                <span className="text-[16px] font-bold text-ink tracking-tight hidden sm:inline">
                  Skinify
                </span>
              </Link>

              <nav className="hidden lg:flex items-center gap-1 ml-2">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    className="h-10 px-3.5 rounded-full text-[14px] font-semibold text-ink-muted hover:text-ink hover:bg-subtle transition-colors flex items-center"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* CENTER — search (anchored in geometric middle, fixed width).
                Opens the global ⌘K palette instead of navigating. */}
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.01 }}
              onClick={openSearchPalette}
              className="w-[260px] sm:w-[360px] md:w-[420px] h-11 px-4 rounded-full bg-subtle hover:bg-subtle/70 flex items-center gap-3 text-ink-muted hover:text-ink transition-colors justify-self-center"
            >
              <Search size={18} strokeWidth={2} className="shrink-0" />
              <span className="text-[13.5px] font-medium truncate text-left flex-1">
                Search skins, weapons, collections…
              </span>
              {/* Distinct chip with hairline border so it's visible in light
                  theme — surface-color alone reads as invisible on the bg. */}
              <kbd className="hidden md:inline-flex items-center text-[10.5px] font-bold tracking-wider text-ink-muted px-1.5 py-0.5 rounded-md bg-surface ring-1 ring-line">
                ⌘K
              </kbd>
            </motion.button>

            {/* RIGHT — actions */}
            <div className="flex items-center gap-1 shrink-0 justify-self-end">
              <motion.button
                whileTap={tap}
                onClick={openDepositModal}
                className="hidden sm:flex h-11 px-4 rounded-full bg-accent text-on-accent text-[13.5px] font-bold items-center gap-1.5 hover:opacity-90 transition-opacity"
                style={{ boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.6)' }}
              >
                <Plus size={15} strokeWidth={2.6} />
                Refill
              </motion.button>

              <motion.button
                whileTap={tap}
                onClick={() => {
                  if (!user) {
                    addToast({
                      type: 'warning',
                      title: 'Login required',
                      message: 'Please log in to view your wishlist.',
                    });
                    return;
                  }
                  navigate('/profile?tab=inventory');
                }}
                aria-label="Wishlist"
                className="icon-chip hover:bg-bg transition-colors"
              >
                <Heart size={18} strokeWidth={2} className="text-ink-muted" />
              </motion.button>

              <motion.button
                whileTap={tap}
                onClick={() => navigate('/cart')}
                aria-label="Cart"
                className="icon-chip hover:bg-bg transition-colors relative"
              >
                <ShoppingBag size={18} strokeWidth={2} className="text-ink-muted" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-on-accent grid place-items-center text-[10px] font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </motion.button>

              {/* Theme menu */}
              <div className="relative" ref={themeMenuRef}>
                <motion.button
                  whileTap={tap}
                  onClick={() => setThemeMenuOpen((v) => !v)}
                  aria-label="Theme"
                  className="icon-chip hover:bg-bg transition-colors"
                >
                  <ThemeIcon size={18} strokeWidth={2} className="text-ink-muted" />
                </motion.button>
                <AnimatePresence>
                  {themeMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.96 }}
                      transition={{ duration: 0.16 }}
                      className="card-elevated absolute right-0 mt-2 w-44 p-1.5 z-50"
                    >
                      {(
                        [
                          { id: 'light', label: 'Light', Icon: Sun },
                          { id: 'dark', label: 'Dark', Icon: Moon },
                          { id: 'auto', label: 'System', Icon: Monitor },
                        ] as const
                      ).map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          onClick={() => {
                            setMode(id);
                            setThemeMenuOpen(false);
                          }}
                          className={`w-full h-10 px-3 rounded-2xl flex items-center gap-2.5 text-[13px] font-semibold transition-colors ${
                            mode === id
                              ? 'bg-accent-soft text-ink'
                              : 'text-ink-muted hover:bg-subtle hover:text-ink'
                          }`}
                        >
                          <Icon size={15} strokeWidth={2.2} />
                          {label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="pl-1 hidden sm:block">
                {user ? <UserProfile /> : <SteamLogin />}
              </div>

              {/* Mobile menu */}
              <motion.button
                whileTap={tap}
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="icon-chip hover:bg-bg transition-colors lg:hidden"
              >
                <Menu size={18} strokeWidth={2} className="text-ink-muted" />
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-50 bg-ink/40 lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-[280px] max-w-[88vw] bg-elevated p-5 lg:hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-[16px] font-bold text-ink">Menu</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="icon-chip hover:bg-subtle"
                  aria-label="Close menu"
                >
                  <X size={18} className="text-ink-muted" />
                </button>
              </div>
              <nav className="space-y-1">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className="block h-11 px-3 rounded-2xl flex items-center text-[14.5px] font-semibold text-ink-muted hover:bg-subtle hover:text-ink transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 pt-6 border-t border-line">
                {user ? <UserProfile /> : <SteamLogin />}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default LandingNav;
