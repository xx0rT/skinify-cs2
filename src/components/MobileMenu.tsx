import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftRight,
  ChevronRight,
  Gift,
  Headphones,
  Landmark,
  Receipt,
  ShoppingBag,
  Tag,
  User,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBalanceStore } from '../store/balanceStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { openDepositModal } from './DepositModal';
import { spring, tap } from '../lib/motion';

/**
 * MobileMenu — full-screen drawer opened from the top-bar hamburger.
 *
 * Mirrors the skins.com mobile menu: avatar + name, a balance card with
 * a Deposit button, a Withdraw Funds row, then the account nav list
 * (Profile / Transactions / Buy Orders / Listings / Trades / Support)
 * and a Rewards shortcut at the bottom.
 *
 * The panel springs in from the right while its sections stagger up
 * into place; exit slides back out. Opens via the module-level
 * `openMobileMenu()` helper — same pattern as DepositModal so any
 * component can trigger it without prop drilling.
 */

let _openSetter: ((v: boolean) => void) | null = null;
export const openMobileMenu = () => _openSetter?.(true);

const panelVariants = {
  hidden: { x: '100%' },
  shown: {
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 320,
      damping: 34,
      mass: 0.8,
      when: 'beforeChildren',
      staggerChildren: 0.045,
      delayChildren: 0.04,
    },
  },
  exit: {
    x: '100%',
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, transition: { duration: 0.1 } },
} as const;

const MobileMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { balance } = useBalanceStore();
  const { formatPrice } = useCurrencyStore();

  useEffect(() => {
    _openSetter = setOpen;
    return () => {
      _openSetter = null;
    };
  }, []);

  useBodyScrollLock(open);

  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="shown"
          exit="exit"
          className="lg:hidden fixed inset-0 z-[70] bg-bg overflow-y-auto"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className="px-5 max-w-[480px] mx-auto">
            {/* Close */}
            <motion.div variants={itemVariants} className="flex justify-end">
              <motion.button
                whileTap={tap}
                onClick={() => setOpen(false)}
                className="w-10 h-10 grid place-items-center text-ink-muted hover:text-ink transition-colors -mr-2"
                aria-label="Close menu"
              >
                <X size={22} strokeWidth={2.2} />
              </motion.button>
            </motion.div>

            {user ? (
              <>
                {/* Avatar + name */}
                <motion.div variants={itemVariants} className="mt-2">
                  <div className="w-14 h-14 rounded-2xl bg-accent text-on-accent grid place-items-center overflow-hidden font-bold text-[20px]">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName || 'avatar'}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      (user.displayName || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <h2 className="mt-4 text-[28px] font-bold tracking-tight text-ink leading-none truncate">
                    {user.displayName || 'Trader'}
                  </h2>
                </motion.div>

                {/* Balance card */}
                <motion.div
                  variants={itemVariants}
                  className="mt-6 rounded-2xl bg-surface ring-1 ring-line p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="label-meta">Balance</div>
                    <div className="mt-1.5 text-[24px] font-bold tracking-tight tabular-nums text-ink leading-none">
                      {formatPrice(Number(balance || 0))}
                    </div>
                  </div>
                  <motion.button
                    whileTap={tap}
                    onClick={() => {
                      setOpen(false);
                      openDepositModal();
                    }}
                    className="h-11 px-5 rounded-xl bg-accent text-on-accent text-[14px] font-bold shrink-0"
                  >
                    Deposit
                  </motion.button>
                </motion.div>

                {/* Withdraw funds */}
                <motion.button
                  variants={itemVariants}
                  type="button"
                  onClick={() => go('/profile?tab=balance')}
                  className="mt-2 w-full rounded-2xl bg-surface ring-1 ring-line px-4 py-3.5 flex items-center gap-3 text-left active:bg-subtle transition-colors"
                >
                  <Landmark size={18} strokeWidth={2} className="text-ink-muted shrink-0" />
                  <span className="flex-1 text-[14.5px] font-semibold text-ink">
                    Withdraw Funds
                  </span>
                  <ChevronRight size={16} strokeWidth={2.2} className="text-ink-muted shrink-0" />
                </motion.button>

                {/* Nav list */}
                <nav className="mt-6 space-y-1">
                  <MenuRow Icon={User} label="Profile" onClick={() => go('/profile')} />
                  <MenuRow
                    Icon={Receipt}
                    label="Transactions"
                    onClick={() => go('/profile?tab=balance')}
                  />
                  <MenuRow
                    Icon={ShoppingBag}
                    label="Buy Orders"
                    onClick={() => go('/profile?tab=trades&sub=history')}
                  />
                  <MenuRow
                    Icon={Tag}
                    label="Listings"
                    onClick={() => go('/profile?tab=listings')}
                  />
                  <MenuRow
                    Icon={ArrowLeftRight}
                    label="Trades"
                    onClick={() => go('/profile?tab=trades')}
                  />
                  <MenuRow Icon={Headphones} label="Support" onClick={() => go('/support')} />
                </nav>

                {/* Brand shortcuts */}
                <motion.div
                  variants={itemVariants}
                  className="mt-8 pt-6 border-t border-line space-y-1"
                >
                  <button
                    type="button"
                    onClick={() => go('/rewards')}
                    className="w-full py-3 flex items-center gap-3 text-left active:bg-subtle rounded-2xl px-2 -mx-2 transition-colors"
                  >
                    <span className="w-9 h-9 rounded-xl bg-subtle text-ink grid place-items-center shrink-0">
                      <Gift size={16} strokeWidth={2.2} />
                    </span>
                    <span className="text-[14.5px] font-semibold text-ink">Rewards</span>
                  </button>
                </motion.div>
              </>
            ) : (
              <>
                {/* Logged out — sign in / sign up CTAs + support */}
                <motion.div variants={itemVariants} className="mt-2">
                  <h2 className="text-[28px] font-bold tracking-tight text-ink leading-tight">
                    Welcome to Skinify
                  </h2>
                  <p className="mt-2 text-[14px] text-ink-muted font-medium">
                    Sign in to trade skins, track prices and manage your balance.
                  </p>
                </motion.div>
                <motion.div variants={itemVariants} className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => go('/auth/signin')}
                    className="h-12 rounded-xl text-ink text-[14px] font-bold ring-1 ring-line"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => go('/auth/signup')}
                    className="h-12 rounded-xl bg-accent text-on-accent text-[14px] font-bold"
                  >
                    Sign up
                  </button>
                </motion.div>
                <nav className="mt-8 space-y-1">
                  <MenuRow
                    Icon={ShoppingBag}
                    label="Marketplace"
                    onClick={() => go('/marketplace')}
                  />
                  <MenuRow Icon={Headphones} label="Support" onClick={() => go('/support')} />
                </nav>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const MenuRow: React.FC<{
  Icon: React.ComponentType<any>;
  label: string;
  onClick: () => void;
}> = ({ Icon, label, onClick }) => (
  <motion.button
    variants={itemVariants}
    type="button"
    onClick={onClick}
    className="w-full py-3.5 flex items-center gap-3.5 text-left active:bg-subtle rounded-2xl px-2 -mx-2 transition-colors"
  >
    <Icon size={19} strokeWidth={2} className="text-ink-muted shrink-0" />
    <span className="text-[15px] font-semibold text-ink">{label}</span>
  </motion.button>
);

export default MobileMenu;
