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
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { CachedImage } from './ui/CachedImage';
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
        /* Hidden on phones — MobileTabBar handles primary nav at the
           bottom of the viewport on <lg screens. */
        className={`hidden lg:block sticky top-0 z-[55] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
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

            {/* CENTER — inline search.
                lg+ : real <input> with a results dropdown below it.
                sub-lg : icon button (still uses the legacy modal). */}
            <div className="hidden lg:block lg:justify-self-center w-[360px] xl:w-[420px]">
              <NavInlineSearch />
            </div>
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
                {user ? <UserProfile /> : <NavSignInButton />}
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
                  <NavSignInButton onNavigate={() => setMenuOpen(false)} />
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

/* ─────────────────────────────────────────────────────────────────────────
   NavSignInButton — primary "Sign in" CTA shown in the navbar when no
   user is signed in. Sends users to /auth/signin where they can choose
   email/password or Steam. Replaces the prior direct-to-Steam button so
   credentialed users have a clear entry point.
   ───────────────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────
   NavInlineSearch — the navbar search input that filters items as the
   user types and renders a result list directly below the input. No
   modal: matches happen in-place, Enter routes to the full marketplace
   with the query pre-applied.
   ───────────────────────────────────────────────────────────────────────── */
const NavInlineSearch: React.FC = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { items } = useMarketplaceItems();

  /* Close the dropdown when the user clicks outside or hits Escape, OR
     when they scroll the page more than a small threshold from the
     scroll position at the moment the dropdown opened. This keeps the
     dropdown from awkwardly hovering over content the user is reading. */
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setFocused(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFocused(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  /* Auto-close when the user intentionally scrolls the page. We listen
     for wheel + touchmove (real scroll-intent gestures) rather than the
     `scroll` event — `scroll` fires for autofill, IME composition, and
     focus-triggered viewport shifts, which used to dismiss the dropdown
     on the very first keystroke. We also ignore events that originate
     inside the dropdown (the dropdown itself is scrollable). */
  useEffect(() => {
    if (!focused) return;
    const onWheel = (e: WheelEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      if (Math.abs(e.deltaY) < 4) return;
      setFocused(false);
      inputRef.current?.blur();
    };
    const onTouch = (e: TouchEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setFocused(false);
      inputRef.current?.blur();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchmove', onTouch);
    };
  }, [focused]);

  const results = (() => {
    const trimmed = q.trim().toLowerCase();
    if (!trimmed) return [] as any[];
    return (items || [])
      .filter((it: any) => {
        const name = (it.name || it.market_name || '').toLowerCase();
        const type = (it.type || '').toLowerCase();
        return name.includes(trimmed) || type.includes(trimmed);
      })
      .slice(0, 8);
  })();

  const submitFull = (next?: string) => {
    const query = (next ?? q).trim();
    if (!query) return;
    setFocused(false);
    navigate(`/marketplace?q=${encodeURIComponent(query)}`);
  };

  const open = focused && q.trim().length > 0;

  return (
    <div
      ref={wrapRef}
      className="relative"
      /* `overflow-anchor: none` stops the browser's scroll-anchoring
         from pinning to the dropdown as it grows on each keystroke,
         which was nudging the page upward letter-by-letter. */
      style={{ overflowAnchor: 'none' }}
    >
      <div
        className={`flex h-11 px-4 rounded-full bg-subtle items-center gap-3 transition-colors ${
          focused ? 'ring-2 ring-accent/30' : 'hover:bg-subtle/70'
        }`}
      >
        <Search size={18} strokeWidth={2} className="text-ink-muted shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            setFocused(true);
            /* Defensive: if the browser tries to scroll the input
               into view (which happens when the dropdown grows below),
               snap the scroll position back on the next frame. */
            const y = window.scrollY;
            requestAnimationFrame(() => {
              if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
            });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitFull();
          }}
          placeholder="Search skins, weapons, collections…"
          className="flex-1 bg-transparent outline-none text-[13.5px] font-medium text-ink placeholder:text-ink-muted min-w-0"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="text-ink-muted hover:text-ink shrink-0"
          >
            <X size={14} strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* Results dropdown — detached from input with a visible gap,
          floats on its own elevation with a soft spring entrance. */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.6 }}
            style={{
              transformOrigin: 'top center',
              overflowAnchor: 'none',
              boxShadow:
                '0 24px 48px -16px rgba(0,0,0,0.28), 0 8px 24px -8px rgba(0,0,0,0.18)',
            }}
            className="absolute top-full left-0 right-0 mt-4 rounded-3xl bg-surface border border-line max-h-[60vh] overflow-y-auto overscroll-contain z-[60]"
          >
            {results.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="p-4 text-[12.5px] text-ink-muted font-medium text-center"
              >
                No matches for "{q}"
              </motion.div>
            ) : (
              <ul className="p-1.5">
                {results.map((it: any, i: number) => (
                  <motion.li
                    key={it.id}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 + i * 0.025, duration: 0.18 }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setFocused(false);
                        navigate(`/item/${it.id}`);
                      }}
                      className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-subtle transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-subtle grid place-items-center overflow-hidden shrink-0">
                        <CachedImage
                          src={it.image}
                          alt={it.name || it.market_name}
                          className="w-[88%] h-[88%] object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-bold text-ink truncate tracking-tight">
                          {it.name || it.market_name}
                        </div>
                        <div className="text-[11px] text-ink-muted font-medium truncate">
                          {it.condition || it.rarity || ''}
                        </div>
                      </div>
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => submitFull()}
              className="w-full px-3 py-2.5 border-t border-line text-[12px] font-bold text-accent hover:bg-subtle transition-colors text-left rounded-b-3xl"
            >
              See all results for "{q}" →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NavSignInButton: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();
  return (
    <motion.button
      whileTap={tap}
      whileHover={{ scale: 1.03 }}
      onClick={() => {
        onNavigate?.();
        navigate('/auth/signin');
      }}
      className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5"
      style={{ boxShadow: '0 10px 22px -12px rgb(var(--accent) / 0.55)' }}
    >
      Sign in
    </motion.button>
  );
};

export default LandingNav;
