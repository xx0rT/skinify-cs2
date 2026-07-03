import React from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  Store,
  Tag,
} from 'lucide-react';
import { spring, tap } from '../lib/motion';
import { openSearchPalette } from './SearchPalette';
import { useCartStore } from '../store/cartStore';
import { useT } from '../lib/useT';

/**
 * MobileTabBar — bottom-anchored primary nav (mobile only).
 *
 * Rebuilt to match the skins.com 4-tab layout the user shipped as
 * reference: Market · Search · Sell · Cart. Each tab is icon + label,
 * label sits directly under the icon. Active tab tints both the icon
 * and the label in the accent colour; inactive tabs stay muted. No
 * center-floating "+" any more — the design called for a flat tab row.
 *
 * Layout uses CSS grid (`grid-cols-4`) so every tab gets exactly the
 * same horizontal slot regardless of label length. That fixes the
 * uneven spacing the old `justify-between` flex row had when the
 * "Sign in" label was wider than its peers.
 *
 * Hidden on md+ where LandingNav already does the job at the top.
 */

const MobileTabBar: React.FC = () => {
  const { pathname } = useLocation();
  const { getItemCount } = useCartStore();
  const cartCount = getItemCount();
  const t = useT();

  /* Helper: does the current URL belong to this tab? */
  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  /* `Market` is active for the landing page AND /marketplace — they're
     functionally the same destination from the user's perspective. */
  const marketActive =
    pathname === '/' ||
    /^\/[a-z]{2}\/?$/.test(pathname) ||
    isActive('/marketplace');

  return (
    <nav
      className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-2 pb-[env(safe-area-inset-bottom)] pt-2 bg-bg/95 backdrop-blur-md border-t border-line"
      aria-label="Primary"
    >
      <div className="grid grid-cols-4 items-center max-w-[480px] mx-auto">
        <TabButton
          Icon={Store}
          label={t('tabbar.market', 'Market')}
          to="/marketplace"
          active={marketActive}
        />
        <TabButton
          Icon={Search}
          label={t('tabbar.search', 'Search')}
          onClick={openSearchPalette}
        />
        <TabButton
          Icon={Tag}
          label={t('tabbar.sell', 'Sell')}
          to="/profile?tab=inventory"
          /* "Sell" is active when on the inventory tab specifically.
             We can't easily inspect search params here; cheap approximation
             is `/profile` + the listings/inventory tab routes. */
          active={
            isActive('/profile') &&
            /tab=(inventory|listings)/.test(window.location.search)
          }
        />
        <TabButton
          Icon={ShoppingBag}
          label={t('tabbar.cart', 'Cart')}
          to="/cart"
          active={isActive('/cart')}
          badge={cartCount}
        />
      </div>
    </nav>
  );
};

const TabButton: React.FC<{
  Icon: React.ComponentType<any>;
  label: string;
  to?: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number;
}> = ({ Icon, label, to, onClick, active, badge }) => {
  /* Active tabs go full accent on BOTH icon + label (matches the
     reference). Inactive use ink-muted so they recede. */
  const iconColor = active ? 'text-accent' : 'text-ink-muted';
  const labelColor = active ? 'text-accent' : 'text-ink-muted';

  const inner = (
    <>
      {/* Soft pill glides between tabs via a shared layoutId. */}
      {active && (
        <motion.span
          layoutId="mobile-tabbar-pill"
          className="absolute inset-x-2 inset-y-0.5 rounded-2xl bg-accent-soft"
          transition={spring}
          aria-hidden
        />
      )}
      <motion.div
        className="relative"
        animate={active ? { scale: 1.1, y: -1 } : { scale: 1, y: 0 }}
        transition={spring}
      >
        <Icon
          size={22}
          strokeWidth={active ? 2.4 : 2}
          className={`${iconColor} transition-colors`}
        />
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-on-accent grid place-items-center text-[9.5px] font-bold">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </motion.div>
      <span
        className={`relative text-[11px] font-semibold tracking-tight ${labelColor} transition-colors`}
      >
        {label}
      </span>
    </>
  );

  /* `flex-col` + `gap-1` is the icon-over-label stack from the
     reference. Each cell is full-width inside its grid track so the
     tap target is comfortably large even on small phones. */
  const cls =
    'relative flex flex-col items-center justify-center gap-1 py-2 rounded-2xl active:bg-subtle/60 transition-colors';

  if (to) {
    return (
      <Link to={to} className={cls} aria-label={label}>
        {inner}
      </Link>
    );
  }
  return (
    <motion.button
      whileTap={tap}
      onClick={onClick}
      className={cls}
      aria-label={label}
    >
      {inner}
    </motion.button>
  );
};

export default MobileTabBar;
