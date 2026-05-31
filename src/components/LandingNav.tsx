import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from 'framer-motion';
import {
  LogOut,
  Heart,
  Menu,
  Monitor,
  Moon,
  Package,
  Plus,
  Search,
  Settings as SettingsIcon,
  ShoppingBag,
  Store,
  Sun,
  TrendingUp,
  User as UserIcon,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBalanceStore } from '../store/balanceStore';
import { useCartStore } from '../store/cartStore';
import { useCurrencyStore } from '../store/currencyStore';
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
        className={`sticky top-0 z-40 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          scrolled
            ? 'bg-bg/85 backdrop-blur-xl shadow-[0_4px_24px_-12px_rgba(20,16,40,0.18)]'
            : 'bg-transparent backdrop-blur-0'
        }`}
      >
        <div
          className={`max-w-[1480px] mx-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            /* At top: extra side breathing room + roomy vertical padding,
               makes the card-style nav feel like a floating pill. On scroll
               it docks tightly to the viewport edge for content focus. */
            scrolled ? 'px-3 sm:px-6 py-1.5' : 'px-4 sm:px-8 py-3.5'
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
          {/*
            RESPONSIVE LAYOUT:
            - md+ : true 3-column grid (auto/1fr/auto) with the full search pill in the middle.
            - sub-md : a single flex row (logo | spacer | search icon | cart | menu).
              We never try to fit the full pill on a 360px screen — it would
              squish the actions or shove the logo offscreen.
          */}
          <div className="card h-16 px-1.5 sm:px-3 flex lg:grid items-center gap-1 sm:gap-2 lg:gap-3 lg:grid-cols-[1fr_auto_1fr]">
            {/* LEFT — logo + (lg+) nav links */}
            <div className="flex items-center gap-2 min-w-0 lg:justify-self-start">
              <Link
                to="/"
                className="flex items-center gap-2.5 shrink-0 px-1 sm:px-2"
                aria-label="Skinify home"
              >
                <div className="icon-chip bg-accent text-on-accent">
                  <img
                    src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                    alt=""
                    className="w-6 h-6"
                  />
                </div>
                <span className="text-[16px] font-bold text-ink tracking-tight hidden lg:inline">
                  Skinify
                </span>
              </Link>

              <nav className="hidden xl:flex items-center gap-1 ml-2">
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

            {/* SPACER for sub-lg flex layout — collapses on lg+ where grid takes over */}
            <div className="flex-1 lg:hidden" aria-hidden />

            {/* CENTER — search.
                lg+ : full pill, anchored in the grid's geometric middle.
                sub-lg : single icon button (still opens the same palette). */}
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.01 }}
              onClick={openSearchPalette}
              aria-label="Search"
              className="hidden lg:flex w-[360px] xl:w-[420px] h-11 px-4 rounded-full bg-subtle hover:bg-subtle/70 items-center gap-3 text-ink-muted hover:text-ink transition-colors lg:justify-self-center"
            >
              <Search size={18} strokeWidth={2} className="shrink-0" />
              <span className="text-[13.5px] font-medium truncate text-left flex-1">
                Search skins, weapons, collections…
              </span>
              <kbd className="hidden xl:inline-flex items-center text-[10.5px] font-bold tracking-wider text-ink-muted px-1.5 py-0.5 rounded-md bg-surface ring-1 ring-line">
                ⌘K
              </kbd>
            </motion.button>
            <motion.button
              whileTap={tap}
              onClick={openSearchPalette}
              aria-label="Search"
              className="lg:hidden icon-chip hover:bg-bg transition-colors"
            >
              <Search size={18} strokeWidth={2} className="text-ink-muted" />
            </motion.button>

            {/* RIGHT — actions. md+ shows the full stack; sub-md keeps just
                cart + drawer trigger to save horizontal space. */}
            <div className="flex items-center gap-1 shrink-0 lg:justify-self-end">
              <motion.button
                whileTap={tap}
                onClick={openDepositModal}
                className="hidden lg:flex h-11 px-4 rounded-full bg-accent text-on-accent text-[13.5px] font-bold items-center gap-1.5 hover:opacity-90 transition-opacity"
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
                className="hidden lg:grid icon-chip hover:bg-bg transition-colors"
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

              {/* Theme menu — md+ only (moved into drawer on mobile) */}
              <div className="relative hidden lg:block" ref={themeMenuRef}>
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

              {/* UserProfile dropdown — md+ only; drawer surfaces it on mobile */}
              <div className="pl-1 hidden lg:block">
                {user ? <UserProfile /> : <SteamLogin />}
              </div>

              {/* Mobile drawer trigger */}
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
              className="fixed right-0 top-0 bottom-0 z-50 w-[300px] max-w-[88vw] bg-elevated p-5 lg:hidden overflow-y-auto scrollbar-thin"
            >
              <div className="flex items-center justify-between mb-5">
                <span className="text-[16px] font-bold text-ink tracking-tight">Menu</span>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="icon-chip hover:bg-subtle"
                  aria-label="Close menu"
                >
                  <X size={18} className="text-ink-muted" />
                </button>
              </div>

              {/* Refill — primary action moved here from the top bar */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  openDepositModal();
                }}
                className="w-full h-12 mb-4 rounded-full bg-accent text-on-accent text-[14px] font-bold flex items-center justify-center gap-1.5"
                style={{ boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.6)' }}
              >
                <Plus size={15} strokeWidth={2.6} />
                Add funds
              </button>

              {/* Primary nav */}
              <nav className="space-y-0.5">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.label}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className="h-11 px-3 rounded-2xl flex items-center text-[14.5px] font-semibold text-ink-muted hover:bg-subtle hover:text-ink transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              {/* Secondary actions */}
              <div className="mt-4 pt-4 border-t border-line space-y-0.5">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    if (!user) {
                      addToast({
                        type: 'warning',
                        title: 'Login required',
                        message: 'Please log in to view your wishlist.',
                      });
                      return;
                    }
                    navigate('/profile?tab=wishlist');
                  }}
                  className="w-full h-11 px-3 rounded-2xl flex items-center gap-3 text-[14px] font-semibold text-ink-muted hover:bg-subtle hover:text-ink transition-colors"
                >
                  <Heart size={16} strokeWidth={2} />
                  Wishlist
                </button>

                {/* Theme — segmented */}
                <div className="px-3 py-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim mb-2">
                    Theme
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'light', label: 'Light', Icon: Sun },
                        { id: 'dark', label: 'Dark', Icon: Moon },
                        { id: 'auto', label: 'Auto', Icon: Monitor },
                      ] as const
                    ).map(({ id, label, Icon }) => {
                      const active = mode === id;
                      return (
                        <button
                          key={id}
                          onClick={() => setMode(id)}
                          className={`h-10 rounded-2xl flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-colors ${
                            active
                              ? 'bg-accent text-on-accent'
                              : 'bg-subtle text-ink-muted hover:text-ink'
                          }`}
                        >
                          <Icon size={13} strokeWidth={active ? 2.4 : 2.2} />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Account — flat list on mobile (no nested dropdown) so
                  it doesn't get cut off by the drawer's width. */}
              <div className="mt-4 pt-4 border-t border-line">
                {user ? (
                  <MobileAccountPanel onNavigate={() => setMenuOpen(false)} />
                ) : (
                  <SteamLogin />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   MobileAccountPanel — flat replacement for the UserProfile dropdown when
   it lives inside the mobile drawer. The desktop dropdown is too narrow
   for a 300px drawer and got clipped; here we render the same content
   inline so nothing gets cut off.
   ───────────────────────────────────────────────────────────────────────── */

const MobileAccountPanel: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => {
  const { user, logout } = useAuthStore();
  const { balance, pendingBalance } = useBalanceStore();
  const { formatPrice } = useCurrencyStore();
  const navigate = useNavigate();

  if (!user) return null;

  const go = (path: string) => {
    onNavigate();
    navigate(path);
  };

  const initial = (user.displayName || 'U').charAt(0).toUpperCase();

  return (
    <div className="space-y-3">
      {/* Identity row */}
      <div className="flex items-center gap-3 px-1">
        <div className="relative w-11 h-11 rounded-full bg-accent text-on-accent grid place-items-center overflow-hidden shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[14px] font-bold tracking-tight">{initial}</span>
          )}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-elevated ${
              user.tradeLink ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold text-ink truncate tracking-tight leading-tight">
            {user.displayName}
          </div>
          <div className="text-[11px] text-ink-dim font-mono truncate mt-0.5">
            {user.steamId}
          </div>
        </div>
      </div>

      {/* Balance tile */}
      <button
        onClick={() => go('/profile?tab=balance')}
        className="w-full card-flat p-3 text-left hover:bg-subtle/60 transition-colors"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
            Balance
          </span>
          {Number(pendingBalance || 0) > 0 && (
            <span className="text-[10.5px] font-semibold text-ink-dim tabular-nums">
              +{formatPrice(Number(pendingBalance || 0))} pending
            </span>
          )}
        </div>
        <div className="text-[18px] font-bold text-ink tracking-tight tabular-nums leading-none mt-1.5">
          {formatPrice(Number(balance || 0))}
        </div>
      </button>

      {/* Quick links */}
      <nav className="space-y-0.5">
        {[
          { Icon: UserIcon, label: 'Profile', to: '/profile' },
          { Icon: Package, label: 'Inventory', to: '/profile?tab=inventory' },
          { Icon: ShoppingBag, label: 'My listings', to: '/profile?tab=listings' },
          { Icon: TrendingUp, label: 'Trades', to: '/profile?tab=trades' },
          { Icon: Store, label: 'My shop', to: '/profile?tab=shop' },
          { Icon: SettingsIcon, label: 'Settings', to: '/profile?tab=settings' },
        ].map(({ Icon, label, to }) => (
          <button
            key={label}
            onClick={() => go(to)}
            className="w-full h-11 px-3 rounded-2xl flex items-center gap-3 text-[13.5px] font-semibold text-ink-muted hover:bg-subtle hover:text-ink transition-colors"
          >
            <Icon size={15} strokeWidth={2.2} />
            {label}
          </button>
        ))}
      </nav>

      {/* Sign out */}
      <button
        onClick={() => {
          onNavigate();
          logout();
        }}
        className="w-full h-11 px-3 rounded-2xl flex items-center gap-3 text-[13.5px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
      >
        <LogOut size={15} strokeWidth={2.2} />
        Sign out
      </button>
    </div>
  );
};

export default LandingNav;
