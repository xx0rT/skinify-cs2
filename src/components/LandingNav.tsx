import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValueEvent, useScroll } from 'framer-motion';
import {
  Bell,
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
import { useNotificationStore } from '../store/notificationStore';
import { useDMStore } from '../store/dmStore';
import { useTranslationStore } from '../store/translationStore';
import SteamLogin from './auth/SteamLogin';
import UserProfile from './auth/UserProfile';
import { useTheme } from '../theme/ThemeProvider';
import { tap } from '../lib/motion';
import { openSearchPalette } from './SearchPalette';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { CachedImage } from './ui/CachedImage';
import { openDepositModal } from './DepositModal';
import CartDropdown from './CartDropdown';

/**
 * LandingNav — top-only, no sidebar. Sits on the page background (not
 * floating), uses .card surface so it adopts the theme. Search lives at the
 * center, primary nav on the left, account controls on the right.
 *
 * Mobile: collapses to logo + search icon + menu drawer.
 */

/* Nav links — `key` references a translation key so the label
   renders in the user's current language. Component reads it via `t()`. */
const NAV_LINKS: { key: string; fallback: string; to: string }[] = [
  { key: 'nav.market', fallback: 'Market', to: '/marketplace' },
  { key: 'nav.sell', fallback: 'Sell', to: '/profile?tab=inventory' },
  { key: 'nav.bonuses', fallback: 'Bonuses', to: '/bonuses' },
  { key: 'nav.faq', fallback: 'FAQ', to: '/faq' },
];

export const LandingNav: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getItemCount } = useCartStore();
  const { addToast } = useToastStore();
  const { t } = useTranslationStore();
  const { resolvedMode, mode, setMode } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  /* Scroll behaviour — direction-aware "full vs gradient" state.
       - At the very top of the page (≤ 24px): full chrome (solid bg +
         accent under-glow).
       - Scrolling DOWN past 24px: collapse into the gradient state so
         the bar fades out underneath the content.
       - Scrolling UP anywhere on the page: re-promote to the full
         chrome state, even mid-page. Mirrors the Instagram / Twitter
         pattern — when the user pulls back up they want the controls
         back.

     `lastYRef` holds the previous scrollY so we can derive direction
     without re-rendering on every pixel. The 6px hysteresis stops a
     jittery wheel / trackpad from flipping the state every frame.

     We use the functional form of `setScrolled` so the callback isn't
     reading a stale captured value of `scrolled` from a previous
     render — that bug used to cause the bar to "freeze" in whatever
     state it had on first scroll. */
  const [scrolled, setScrolled] = useState(false);
  const lastYRef = useRef(0);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (latest) => {
    const prev = lastYRef.current;
    const delta = latest - prev;

    /* Ignore micro-movements so we don't toggle the state on every
       wheel tick or rubber-band bounce. 6px is comfortable for both
       trackpads (high-freq small deltas) and mice (chunky deltas). */
    if (Math.abs(delta) < 6) return;
    lastYRef.current = latest;

    /* At the top of the page: always full chrome, regardless of
       direction. Bail early so we don't fight the direction logic. */
    if (latest <= 24) {
      setScrolled((prevState) => (prevState ? false : prevState));
      return;
    }

    /* At the BOTTOM of the page: don't toggle at all. Both mobile
       Safari's rubber-band bounce and macOS trackpad inertia cause
       scrollY to oscillate by a few pixels once you hit the max, and
       the direction logic below would flip the state on each bounce.
       Freezing the state as soon as we're within ~64px of the bottom
       keeps whatever the last real-scroll state was. */
    const doc = document.documentElement;
    const maxY = Math.max(0, doc.scrollHeight - doc.clientHeight);
    if (maxY > 0 && latest >= maxY - 64) {
      return;
    }

    /* Past the threshold, direction decides:
         scroll DOWN  → gradient (translucent fade)
         scroll UP    → full chrome */
    if (delta > 0) {
      setScrolled((prevState) => (prevState ? prevState : true));
    } else {
      setScrolled((prevState) => (prevState ? false : prevState));
    }
  });

  // Full-screen modals (listing, etc.) dispatch `skinify:nav-hidden` to
  // make the nav step out of the way — fixes the listing modal colliding
  // with the navbar. The event payload is a boolean.
  const [navHidden, setNavHidden] = useState(false);
  useEffect(() => {
    const onHide = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setNavHidden(Boolean(detail));
    };
    window.addEventListener('skinify:nav-hidden', onHide as EventListener);
    return () => window.removeEventListener('skinify:nav-hidden', onHide as EventListener);
  }, []);

  const cartCount = getItemCount();

  /* Combined unread badge for the navbar bell — site notifications +
     unread DMs, mirrored live from the stores. */
  const notifUnread = useNotificationStore((s) => s.unreadCount);
  const dmThreads = useDMStore((s) => s.threads);
  const dmUnread = React.useMemo(() => {
    let n = 0;
    for (const th of Object.values(dmThreads)) {
      for (const msg of th.messages) {
        if (!msg.read && msg.fromSteamId !== 'me') n += 1;
      }
    }
    return n;
  }, [dmThreads]);
  const bellCount = (Number(notifUnread) || 0) + dmUnread;

  return (
    <>
      <header
        /* Hidden on phones — MobileTabBar handles primary nav at the
           bottom of the viewport on <lg screens. Full-bleed: spans the
           viewport edge-to-edge with no rounded "island" — at the top
           it's an opaque surface flush to the screen; as the user scrolls
           down it eases into a transparent gradient so content can flow
           underneath without a hard band. */
        style={{
          /* Two visual states:
               not scrolled  →  fully filled background. A soft accent
                                glow sits just below the bar (separate
                                ::after-style child element) so the bar
                                feels "lit from below" while the page
                                content slides under it.
               scrolled      →  gradient that fades from solid at the
                                top to transparent at the bottom. No
                                glow — the gradient itself carries the
                                seam, and a glow would look noisy.
             No bottom hairline in either state (the previous accent
             line was too visible at the very top of the page). */
          background: scrolled
            ? 'linear-gradient(to bottom, rgb(var(--bg)) 0%, rgb(var(--bg) / 0.96) 35%, rgb(var(--bg) / 0.55) 70%, rgb(var(--bg) / 0.15) 90%, rgb(var(--bg) / 0) 100%)'
            : 'rgb(var(--bg))',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          transform: navHidden ? 'translateY(-100%)' : 'translateY(0)',
          pointerEvents: navHidden ? 'none' : 'auto',
        }}
        className="hidden lg:block sticky top-0 z-[55] transition-[transform,background,backdrop-filter] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      >
        {/* Bottom glow — only visible in the FILLED (not-scrolled)
            state. `plus-lighter` blends the accent color additively so
            it brightens the page beneath rather than overlaying it.
            That looks great in dark mode but blows out to near-white
            on a light background, so on light theme we cut the alpha
            in half and let the strip be a soft purple halo rather than
            a glaring bloom. */}
        <div
          aria-hidden
          className="absolute left-0 right-0 top-full h-10 pointer-events-none transition-opacity duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            opacity: scrolled ? 0 : 1,
            background:
              resolvedMode === 'dark'
                ? 'radial-gradient(120% 100% at 50% 0%, rgb(var(--accent) / 0.32) 0%, rgb(var(--accent) / 0.10) 35%, transparent 70%)'
                : 'radial-gradient(120% 100% at 50% 0%, rgb(var(--accent) / 0.14) 0%, rgb(var(--accent) / 0.05) 35%, transparent 70%)',
            mixBlendMode: 'plus-lighter',
          }}
        />
        <div
          className={`w-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            /* Edge-to-edge container — no max-width, no card pill. Just
               horizontal padding that tightens on scroll. */
            scrolled ? 'px-4 sm:px-8 py-2' : 'px-4 sm:px-8 py-3'
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
          {/* Bar itself — no card chrome (no rounded island). Just a flat
              full-width row inside the gradient header so the navbar feels
              docked to the page rather than floating. */}
          <div className="max-w-[1480px] mx-auto h-14 flex lg:grid items-center gap-1 sm:gap-2 lg:gap-3 lg:grid-cols-[1fr_auto_1fr]">
            {/* LEFT — logo + (lg+) nav links */}
            <div className="flex items-center gap-2 min-w-0 lg:justify-self-start">
              {/* Bare-image logo (no chip, no static wordmark). On hover,
                  the "Skinify" wordmark slides out from behind the icon.
                  Lifted hover state to the Link so the icon scale and the
                  wordmark slide-out animate together — `whileHover` on
                  nested motion children only fires when the pointer is
                  directly over that child, which is the wrong scope. */}
              <LogoLink />

              <NavLinksRow />
            </div>

            {/* SPACER for sub-lg flex layout — collapses on lg+ where grid takes over */}
            <div className="flex-1 lg:hidden" aria-hidden />

            {/* CENTER — inline search.
                lg+ : real <input> with a results dropdown below it.
                sub-lg : icon button (still uses the legacy modal). */}
            <div className="hidden lg:block lg:justify-self-center w-[360px] xl:w-[420px]">
              <NavInlineSearch />
            </div>
            <NavIconButton
              onClick={openSearchPalette}
              aria-label="Search"
              className="lg:hidden"
            >
              <Search size={18} strokeWidth={2} className="text-ink-muted" />
            </NavIconButton>

            {/* RIGHT — actions. md+ shows the full stack; sub-md keeps just
                cart + drawer trigger to save horizontal space. */}
            <div className="flex items-center gap-1 shrink-0 lg:justify-self-end">
              {/* Refill — lifts on hover with a soft accent glow and a
                  one-shot shine sweep so it visibly invites a click. */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                whileHover={{ y: -2, scale: 1.03 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                onClick={openDepositModal}
                className="hidden lg:flex h-11 px-4 rounded-full bg-accent text-on-accent text-[13.5px] font-bold items-center gap-1.5 relative overflow-hidden group"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.7)' }}
              >
                <motion.span
                  aria-hidden
                  initial={{ x: '-130%', rotate: 12 }}
                  whileHover={{ x: '130%' }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-y-0 w-1/2 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                  }}
                />
                <motion.span
                  className="inline-flex relative"
                  whileHover={{ rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 16 }}
                >
                  <Plus size={15} strokeWidth={2.6} />
                </motion.span>
                <span className="relative">{t('nav.refill') !== 'nav.refill' ? t('nav.refill') : 'Refill'}</span>
              </motion.button>

              <NavIconButton
                onClick={() => {
                  if (!user) {
                    addToast({
                      type: 'warning',
                      title: 'Login required',
                      message: 'Please log in to see your notifications.',
                    });
                    return;
                  }
                  navigate('/profile?tab=settings&sub=notifications');
                }}
                aria-label="Notifications"
                className="hidden lg:grid relative"
              >
                <Bell size={18} strokeWidth={2} className="text-ink-muted group-hover:text-ink transition-colors" />
                {bellCount > 0 && (
                  <motion.span
                    key={bellCount}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                    className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white grid place-items-center text-[9.5px] font-bold leading-none"
                  >
                    {bellCount > 9 ? '9+' : bellCount}
                  </motion.span>
                )}
              </NavIconButton>

              {/* Cart — dropdown preview + "Open cart" CTA. Amazon /
                  Steam pattern. Clicking the icon toggles the mini
                  preview; the CTA inside navigates to /cart. */}
              <CartDropdown>
                <span className="icon-chip relative group hover:bg-subtle transition-colors">
                  <ShoppingBag size={18} strokeWidth={2} className="text-ink-muted group-hover:text-ink transition-colors" />
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 16 }}
                      className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white grid place-items-center text-[9.5px] font-bold leading-none"
                    >
                      {cartCount > 9 ? '9+' : cartCount}
                    </motion.span>
                  )}
                </span>
              </CartDropdown>

              {/* UserProfile dropdown — md+ only; drawer surfaces it on mobile */}
              <div className="pl-1 hidden lg:block">
                {user ? <UserProfile /> : <NavSignInButton />}
              </div>

              {/* Mobile drawer trigger */}
              <NavIconButton
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                className="lg:hidden"
              >
                <Menu size={18} strokeWidth={2} className="text-ink-muted" />
              </NavIconButton>
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
                {t('nav.refill') !== 'nav.refill' ? t('nav.refill') : 'Add funds'}
              </button>

              {/* Primary nav */}
              <nav className="space-y-0.5">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.key}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className="h-11 px-3 rounded-2xl flex items-center text-[14.5px] font-semibold text-ink-muted hover:bg-subtle hover:text-ink transition-colors"
                  >
                    {t(l.key) !== l.key ? t(l.key) : l.fallback}
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
   NavLinksRow — primary marketplace links with a shared "magnet pill"
   that slides between items as the user hovers. The pill is rendered
   once and animated with framer-motion's `layoutId`, so the highlight
   morphs smoothly between targets instead of fading in/out separately
   on each. An animated underline tracks the same hovered index so the
   active state reads even before the pointer settles.
   ───────────────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────
   LogoLink — bare-image logo with a hover-driven wordmark that slides out
   from behind the icon. Hover state lives on the parent <Link> via React
   state (not whileHover on individual children) so the icon scale, the
   slide-out maxWidth, and the inner x-offset all animate together when
   the pointer enters the link anywhere.

   maxWidth (not width) because framer-motion can't tween to/from `auto`.
   120px is enough for the 7-letter "Skinify" wordmark with breathing room.
   ───────────────────────────────────────────────────────────────────────── */
const LogoLink: React.FC = () => {
  const [hovered, setHovered] = useState(false);

  /* Wordmark-only animation. The icon stays perfectly still — no
     scale, no tilt — and the "Skinify" text rolls out letter by
     letter from behind it on hover.

     Implementation:
       - Outer container animates its `width` so layout reflows
         smoothly as the wordmark grows.
       - Each character is its own motion.span. They stagger out
         left-to-right (variants), springing in from a small left
         offset + 0 opacity + slight downward y so they appear to
         tumble out of the icon, not fade in flat.
       - Exit reverses the order (rightmost letter leaves first) so
         the wordmark visually retracts back into the icon. */
  const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const EASE_IN: [number, number, number, number] = [0.65, 0, 0.35, 1];

  const containerVariants = {
    rest: { width: 0, marginLeft: 0 },
    hover: { width: 96, marginLeft: 10 },
  };

  const letterStaggerParent = {
    rest: {
      transition: {
        staggerChildren: 0.025,
        staggerDirection: -1, // exit right-to-left
      },
    },
    hover: {
      transition: {
        delayChildren: 0.08, // wait for container to open a touch
        staggerChildren: 0.035,
      },
    },
  };

  const letterChild = {
    rest: { x: -8, y: 4, opacity: 0 },
    hover: { x: 0, y: 0, opacity: 1 },
  };

  return (
    <Link
      to="/"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      onTouchEnd={() => setHovered(false)}
      className="relative flex items-center shrink-0 px-1 sm:px-2 outline-none"
      aria-label="Skinify home"
    >
      <img
        src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
        alt="Skinify"
        className="w-8 h-8 relative z-10 select-none"
        draggable={false}
      />

      <motion.span
        aria-hidden
        className="hidden lg:inline-block overflow-hidden whitespace-nowrap"
        variants={containerVariants}
        animate={hovered ? 'hover' : 'rest'}
        initial="rest"
        transition={{
          duration: hovered ? 0.42 : 0.28,
          ease: hovered ? EASE_OUT : EASE_IN,
        }}
      >
        <motion.span
          className="inline-flex text-[16px] font-bold text-ink tracking-tight"
          variants={letterStaggerParent}
        >
          {'Skinify'.split('').map((char, i) => (
            <motion.span
              key={i}
              variants={letterChild}
              transition={{ type: 'spring', stiffness: 420, damping: 26, mass: 0.5 }}
              className="inline-block"
            >
              {char}
            </motion.span>
          ))}
        </motion.span>
      </motion.span>
    </Link>
  );
};

const NavLinksRow: React.FC = () => {
  const { t } = useTranslationStore();
  const [hovered, setHovered] = useState<number | null>(null);
  /* Track the previous hovered index so we can choose the underline's
     transform-origin based on direction. Moving rightward → underline
     grows from the left edge (origin-left). Moving leftward → grows
     from the right edge (origin-right). This mirrors how an eye reads
     the motion: the line always "trails" the pointer. */
  const [prevHovered, setPrevHovered] = useState<number | null>(null);

  return (
    <nav
      className="hidden xl:flex items-center gap-1 ml-2 relative"
      onMouseLeave={() => {
        setPrevHovered(hovered);
        setHovered(null);
      }}
    >
      {NAV_LINKS.map((l, i) => {
        const active = hovered === i;
        /* Direction of travel:
             - first hover after a mouse-leave (prev === null)  → grow from left (default).
             - moving rightward (prev < current)                → grow from left.
             - moving leftward (prev > current)                 → grow from right. */
        const growFromRight =
          active && prevHovered != null && prevHovered > i;
        return (
          <Link
            key={l.key}
            to={l.to}
            onMouseEnter={() => {
              setPrevHovered(hovered);
              setHovered(i);
            }}
            className="relative h-10 px-3.5 rounded-full text-[14px] font-semibold flex items-center transition-colors"
            style={{ color: active ? 'rgb(var(--ink))' : undefined }}
          >
            {active && (
              <motion.span
                layoutId="nav-link-pill"
                className="absolute inset-0 rounded-full bg-subtle"
                transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.6 }}
                aria-hidden
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {t(l.key) !== l.key ? t(l.key) : l.fallback}
              <motion.span
                aria-hidden
                className={`absolute -bottom-1 left-0 right-0 h-[2px] rounded-full bg-accent ${
                  growFromRight ? 'origin-right' : 'origin-left'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: active ? 1 : 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   NavIconButton — shared chip-style icon button used by the right-side
   actions in the navbar. Hover lifts the chip slightly, the background
   warms toward the subtle surface, and (when `iconSpin` is set) the
   icon inside rotates a quarter turn. Tapping squashes it briefly.

   Wrapping these in one component keeps every action in the right rail
   feeling identical instead of each implementing its own springs.
   ───────────────────────────────────────────────────────────────────────── */
const NavIconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { iconSpin?: boolean }
> = ({ children, className = '', iconSpin, ...rest }) => (
  <motion.button
    {...(rest as any)}
    whileHover={{ y: -1.5, scale: 1.06 }}
    whileTap={{ scale: 0.92 }}
    transition={{ type: 'spring', stiffness: 460, damping: 20 }}
    className={`icon-chip relative group hover:bg-subtle transition-colors ${className}`}
  >
    <motion.span
      className="inline-flex"
      whileHover={iconSpin ? { rotate: 90 } : undefined}
      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
    >
      {children}
    </motion.span>
  </motion.button>
);

/* ─────────────────────────────────────────────────────────────────────────
   NavInlineSearch — the navbar search input that filters items as the
   user types and renders a result list directly below the input. No
   modal: matches happen in-place, Enter routes to the full marketplace
   with the query pre-applied.
   ───────────────────────────────────────────────────────────────────────── */
const NavInlineSearch: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslationStore();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { items } = useMarketplaceItems();

  /* While the search dropdown is mounted, disable scroll-anchoring on
     the document root. Without this, the browser's anchoring algorithm
     latches onto a stable element and tries to keep it visually still
     as the dropdown's result list changes height — which means each
     keystroke (and each letter deleted) nudges window.scrollY a few
     pixels upward. `overflow-anchor: none` on the wrapper isn't
     enough; the anchor lives in the document scroll container. */
  useEffect(() => {
    if (!focused) return;
    const prev = document.documentElement.style.overflowAnchor;
    document.documentElement.style.overflowAnchor = 'none';
    return () => {
      document.documentElement.style.overflowAnchor = prev;
    };
  }, [focused]);

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
          onChange={(e) => {
            /* Lock the scroll position around the state update so the
               browser's scroll-anchoring can't nudge the page when the
               dropdown's result list grows or shrinks under the input.
               Without this, each keystroke (typing OR deleting) caused
               the page to drift upward letter-by-letter because the
               dropdown's height change repositioned the anchor element.
               We snap back on the next frame AND once more on the
               following frame to cover layout-after-paint adjustments. */
            const y = window.scrollY;
            setQ(e.target.value);
            requestAnimationFrame(() => {
              if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
              requestAnimationFrame(() => {
                if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
              });
            });
          }}
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
          placeholder={t('nav.search.placeholder') !== 'nav.search.placeholder' ? t('nav.search.placeholder') : 'Search skins, weapons, collections…'}
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
                {t('nav.search.noMatches') !== 'nav.search.noMatches' ? t('nav.search.noMatches') : 'No matches for'} "{q}"
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
              {t('nav.search.seeAll') !== 'nav.search.seeAll' ? t('nav.search.seeAll') : 'See all results for'} "{q}" →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const NavSignInButton: React.FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const { t } = useTranslationStore();
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
      {t('nav.signin') !== 'nav.signin' ? t('nav.signin') : 'Sign in'}
    </motion.button>
  );
};

export default LandingNav;
