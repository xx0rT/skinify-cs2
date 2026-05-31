import React from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Search,
  Plus,
  ShoppingBag,
  User as UserIcon,
} from 'lucide-react';
import { spring, tap } from '../lib/motion';
import { openSearchPalette } from './SearchPalette';
import { openDepositModal } from './DepositModal';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

/**
 * MobileTabBar — bottom-anchored primary navigation, iOS-style.
 *
 * Renders below md only. Five slots:
 *   1. Home    (/)
 *   2. Search  (opens ⌘K palette)
 *   3. Refill  (centered floating "+", primary CTA, opens deposit modal)
 *   4. Cart    (/cart with badge)
 *   5. Account (/profile)
 *
 * The center "+" is intentionally elevated and larger so it reads as the
 * affirmative action — same pattern Wolt/Strava/Robinhood use.
 *
 * Hidden on md+ where LandingNav already does the job at the top.
 *
 * Pages should add `pb-24 md:pb-0` to their main scrollers so content
 * doesn't sit under the bar. (Most reworked pages already have generous
 * pb on mobile.)
 */

const MobileTabBar: React.FC = () => {
  const { pathname } = useLocation();
  const { getItemCount } = useCartStore();
  const { user } = useAuthStore();
  const cartCount = getItemCount();

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(`${path}/`);

  return (
    <nav
      className="md:hidden fixed left-0 right-0 bottom-0 z-30 px-3 pb-[env(safe-area-inset-bottom)] pt-2 bg-bg/95 backdrop-blur-md border-t border-line"
      aria-label="Primary"
    >
      <div className="flex items-center justify-between max-w-[480px] mx-auto">
        <TabButton
          Icon={Home}
          label="Home"
          to="/"
          active={pathname === '/' || /^\/[a-z]{2}\/?$/.test(pathname)}
        />
        <TabButton
          Icon={Search}
          label="Search"
          onClick={openSearchPalette}
        />

        {/* Centered floating "+" — refill */}
        <motion.button
          whileTap={tap}
          onClick={openDepositModal}
          aria-label="Add funds"
          className="-mt-7 w-14 h-14 rounded-full bg-accent text-on-accent grid place-items-center shrink-0"
          style={{
            boxShadow:
              '0 10px 24px -6px rgb(var(--accent) / 0.65), 0 0 0 4px rgb(var(--bg))',
          }}
        >
          <Plus size={22} strokeWidth={2.6} />
        </motion.button>

        <TabButton
          Icon={ShoppingBag}
          label="Cart"
          to="/cart"
          active={isActive('/cart')}
          badge={cartCount}
        />
        <TabButton
          Icon={UserIcon}
          label={user ? 'Profile' : 'Sign in'}
          to="/profile"
          active={isActive('/profile')}
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
  const inner = (
    <>
      <div className="relative">
        <Icon
          size={20}
          strokeWidth={active ? 2.4 : 2}
          className={active ? 'text-accent' : 'text-ink-muted'}
        />
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-accent text-on-accent grid place-items-center text-[9.5px] font-bold">
            {badge > 9 ? '9+' : badge}
          </span>
        ) : null}
      </div>
      <span
        className={`text-[10px] font-bold tracking-tight ${
          active ? 'text-ink' : 'text-ink-muted'
        }`}
      >
        {label}
      </span>
    </>
  );

  const cls =
    'flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl active:bg-subtle transition-colors';

  if (to) {
    return (
      <Link to={to} className={cls} aria-label={label}>
        {inner}
      </Link>
    );
  }
  return (
    <motion.button whileTap={tap} onClick={onClick} className={cls} aria-label={label}>
      {inner}
    </motion.button>
  );
};

export default MobileTabBar;
