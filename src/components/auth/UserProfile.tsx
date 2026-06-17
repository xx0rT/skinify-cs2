import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronDown,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  Settings,
  ShoppingBag,
  TrendingUp,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBalanceStore } from '../../store/balanceStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { useToastStore } from '../../store/toastStore';
import { useDMStore } from '../../store/dmStore';
import { useNotificationStore } from '../../store/notificationStore';
import { spring, tap } from '../../lib/motion';
import { openDepositModal } from '../DepositModal';

/**
 * UserProfile — header avatar dropdown.
 *
 * Visual hierarchy (top → bottom):
 *   1. Identity block (avatar + name + steamid) — the "who"
 *   2. Balance hero with inline Refill — the "what's mine"
 *   3. Optional trade-link warning strip — only if missing
 *   4. Quiet menu of profile shortcuts — the "where to go"
 *   5. Sign out — the "exit"
 *
 * Trigger is intentionally minimal (avatar + chevron, no inline name) so the
 * header reads cleanly across a busy nav.
 */

const UserProfile: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { balance, pendingBalance, fetchBalance } = useBalanceStore();
  const { formatPrice } = useCurrencyStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dmThreads = useDMStore((s) => s.threads);
  const notificationUnread = useNotificationStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  /* Live-derive unread DM count so the badge updates as messages
     arrive or get read elsewhere in the app. */
  const messagesUnread = React.useMemo(() => {
    let n = 0;
    for (const t of Object.values(dmThreads)) {
      for (const m of t.messages) {
        if (!m.read && m.fromSteamId !== 'me') n += 1;
      }
    }
    return n;
  }, [dmThreads]);

  const totalBadge = messagesUnread + notificationUnread;

  useEffect(() => {
    if (user?.steamId) {
      fetchBalance(user.steamId);
      fetchNotifications(user.steamId);
    }
  }, [user?.steamId]);

  useEffect(() => {
    /* Outside-click handler — attached on `click` (not `mousedown`) so it
       runs AFTER React's onClick toggles `open`. Using `mousedown` here
       races with the trigger button: the listener saw the click on the
       trigger as "outside the menu" (the menu didn't exist yet on the
       first click) and immediately closed the just-opened state. */
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!user) return null;

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const initial = (user.displayName || 'U').charAt(0).toUpperCase();
  const tradeReady = Boolean(user.tradeLink);
  const pending = Number(pendingBalance || 0);

  return (
    <div className="relative" ref={wrapRef}>
      {/* ── Trigger — minimal: avatar + caret ──────────────── */}
      <motion.button
        type="button"
        whileTap={tap}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        className={`relative h-11 pl-1.5 pr-2 rounded-full flex items-center gap-1 transition-colors ${
          open ? 'bg-subtle' : 'hover:bg-subtle'
        }`}
      >
        <span className="relative w-9 h-9 rounded-full bg-accent text-on-accent grid place-items-center overflow-hidden shrink-0">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[13px] font-bold tracking-tight">{initial}</span>
          )}
          {/* Unread badge — preferred over the trade-link dot when there are
              messages or notifications waiting. Falls back to the status
              dot when nothing is unread. */}
          {totalBadge > 0 ? (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center tabular-nums ring-2 ring-bg"
              aria-label={`${totalBadge} unread`}
            >
              {totalBadge > 99 ? '99+' : totalBadge}
            </span>
          ) : (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-bg ${
                tradeReady ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              aria-hidden
            />
          )}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2.4}
          className={`text-ink-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={spring}
            className="absolute right-0 top-full mt-2 z-50 w-[300px] card-elevated overflow-hidden"
            role="menu"
          >
            {/* ── 1. Identity ─────────────────────────────── */}
            <div className="p-4 pb-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-accent text-on-accent grid place-items-center overflow-hidden shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[14px] font-bold tracking-tight">{initial}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-bold text-ink truncate tracking-tight leading-tight">
                  {user.displayName}
                </div>
                <a
                  href={`https://steamcommunity.com/profiles/${user.steamId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-ink-dim hover:text-ink-muted font-medium truncate select-text font-mono mt-0.5 inline-block transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {user.steamId}
                </a>
              </div>
            </div>

            {/* ── 2. Balance hero ─────────────────────────── */}
            <div className="px-2 pb-2">
              <div className="card-flat p-4">
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => go('/profile?tab=balance')}
                    className="text-left flex-1 min-w-0 group"
                  >
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
                      Available balance
                    </div>
                    <div className="text-[22px] font-bold text-ink tabular-nums tracking-tight leading-none mt-1 group-hover:text-accent transition-colors">
                      {formatPrice(Number(balance || 0))}
                    </div>
                  </button>
                  <motion.button
                    whileTap={tap}
                    whileHover={{ scale: 1.04 }}
                    onClick={() => {
                      setOpen(false);
                      openDepositModal();
                    }}
                    className="shrink-0 h-9 w-9 rounded-full bg-accent text-on-accent grid place-items-center"
                    style={{ boxShadow: '0 6px 16px -6px rgb(var(--accent) / 0.6)' }}
                    aria-label="Add funds"
                    title="Add funds"
                  >
                    <Plus size={15} strokeWidth={2.6} />
                  </motion.button>
                </div>
                {pending > 0 && (
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-line">
                    <span className="text-ink-muted font-medium">Pending release</span>
                    <span className="text-ink font-bold tabular-nums">
                      {formatPrice(pending)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── 3. Trade-link warning (only when missing) ── */}
            {!tradeReady && (
              <button
                onClick={() => go('/profile?tab=settings')}
                className="w-full mx-2 mb-2 px-3 py-2.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/15 flex items-center gap-2.5 transition-colors text-left"
                style={{ width: 'calc(100% - 1rem)' }}
              >
                <AlertTriangle
                  size={14}
                  strokeWidth={2.4}
                  className="text-amber-600 dark:text-amber-400 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold text-ink leading-tight tracking-tight">
                    Add your Steam trade URL
                  </div>
                  <div className="text-[10.5px] text-ink-muted font-medium mt-0.5">
                    Required to receive purchased items
                  </div>
                </div>
              </button>
            )}

            {/* ── 4. Navigation ─────────────────────────────
                Matches the consolidated 6-tab profile sidebar. Old
                top-level entries (Wishlist, My shop, Notifications)
                now live as sub-tabs inside their parent and aren't
                worth surfacing here — keeps the dropdown short. */}
            <div className="px-2 pt-1 pb-1.5 border-t border-line">
              <nav className="space-y-px">
                <Item Icon={UserIcon}    label="Overview"  onClick={() => go('/profile?tab=overview')} />
                <Item Icon={Package}     label="Inventory" onClick={() => go('/profile?tab=inventory')} />
                <Item Icon={ShoppingBag} label="Listings"  onClick={() => go('/profile?tab=listings')} />
                <Item Icon={TrendingUp}  label="Trades"    onClick={() => go('/profile?tab=trades')} />
                <Item Icon={MessageCircle} label="Messages" badge={messagesUnread} onClick={() => go('/messages')} />
                <Item Icon={Settings}    label="Settings"  onClick={() => go('/profile?tab=settings')} />
              </nav>
            </div>

            {/* ── 5. Sign out ─────────────────────────────── */}
            <div className="px-2 pb-2 pt-1 border-t border-line">
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                  addToast({ type: 'info', title: 'Signed out' });
                  navigate('/');
                }}
                className="group w-full h-10 px-2.5 rounded-2xl flex items-center gap-3 text-ink-muted hover:bg-rose-500/10 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
              >
                <LogOut
                  size={15}
                  strokeWidth={2.2}
                  className="shrink-0 group-hover:text-rose-700 dark:group-hover:text-rose-300 transition-colors"
                />
                <span className="text-[13px] font-semibold tracking-tight">Sign out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Quiet menu row — single-color icon + label, hover fills the row. Drops the
 * hue-tinted icon chip from the previous version because seven colored
 * chips in a stacked list was visual noise that competed with the action
 * itself.
 */
const Item: React.FC<{
  Icon: React.ComponentType<any>;
  label: string;
  onClick: () => void;
  badge?: number;
}> = ({ Icon, label, onClick, badge }) => (
  <button
    onClick={onClick}
    className="w-full h-9 px-2.5 rounded-xl flex items-center gap-3 hover:bg-subtle transition-colors text-left group"
    role="menuitem"
  >
    <Icon
      size={15}
      strokeWidth={2}
      className="text-ink-muted group-hover:text-ink transition-colors shrink-0"
    />
    <span className="flex-1 text-[13px] font-semibold text-ink tracking-tight">{label}</span>
    {badge && badge > 0 ? (
      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10.5px] font-bold grid place-items-center tabular-nums shrink-0">
        {badge > 99 ? '99+' : badge}
      </span>
    ) : null}
  </button>
);

export default UserProfile;
