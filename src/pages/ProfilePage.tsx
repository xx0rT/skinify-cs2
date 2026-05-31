import React, { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  ChevronRight,
  Coins,
  CreditCard,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  Package,
  Settings,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBalanceStore } from '../store/balanceStore';
import { useOrderStore } from '../store/orderStore';
import { useCurrencyStore } from '../store/currencyStore';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import SteamLogin from '../components/auth/SteamLogin';
import { spring, tap } from '../lib/motion';
import { openDepositModal } from '../components/DepositModal';

/* Existing sub-components — only the ones still in use by Overview/Inventory/
   Listings. The redesigned tabs live in ./tabs/*. */
const SettingsTab = lazy(() => import('../components/profile/SettingsTab'));

/* Redesigned tab components */
const TradingPerformanceTab = lazy(() => import('../components/profile/tabs/TradingPerformanceTab'));
const InventoryTab = lazy(() => import('../components/profile/tabs/InventoryTab'));
const ListingsTab = lazy(() => import('../components/profile/tabs/ListingsTab'));
const WishlistTab = lazy(() => import('../components/profile/tabs/WishlistTab'));
const TradesTab = lazy(() => import('../components/profile/tabs/TradesTab'));
const BalanceTab = lazy(() => import('../components/profile/tabs/BalanceTab'));
const MyShopTab = lazy(() => import('../components/profile/tabs/MyShopTab'));
const ReviewsTab = lazy(() => import('../components/profile/tabs/ReviewsTab'));

/* ─────────────────────────────────────────────────────────────────────────
   ProfilePage — new shell
   - LandingNav on top for visual consistency
   - Sidebar nav inside the page with tab pills
   - Overview, Balance, Trades have first-class layouts
   - Inventory / Listings / Wishlist / Shop / Reviews mount the existing
     sub-components verbatim, so logic is preserved while the chrome
     adopts the new design tokens
   ───────────────────────────────────────────────────────────────────────── */

type TabId =
  | 'overview'
  | 'performance'
  | 'inventory'
  | 'listings'
  | 'wishlist'
  | 'trades'
  | 'balance'
  | 'shop'
  | 'reviews'
  | 'notifications'
  | 'settings';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ComponentType<any>;
  hue?: string;
}

const TABS: TabDef[] = [
  { id: 'overview',      label: 'Overview',      icon: LayoutGrid },
  { id: 'performance',   label: 'Performance',   icon: Activity },
  { id: 'inventory',     label: 'Inventory',     icon: Package },
  { id: 'listings',      label: 'Listings',      icon: ShoppingBag },
  { id: 'wishlist',      label: 'Wishlist',      icon: Heart },
  { id: 'trades',        label: 'Trades',        icon: TrendingUp },
  { id: 'balance',       label: 'Balance',       icon: Wallet },
  { id: 'shop',          label: 'My shop',       icon: Store },
  { id: 'reviews',       label: 'Reviews',       icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'settings',      label: 'Settings',      icon: Settings },
];

const staggerParent = { hidden: {}, shown: { transition: { staggerChildren: 0.05 } } };
const staggerChild = {
  hidden: { opacity: 0, y: 10 },
  shown:  { opacity: 1, y: 0, transition: spring },
};

const ProfilePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { balance, pendingBalance, totalDeposited, totalSpent, fetchBalance, fetchTransactions } =
    useBalanceStore();
  const { orders, fetchOrders } = useOrderStore();
  const { formatPrice } = useCurrencyStore();

  const activeTab = (searchParams.get('tab') as TabId) || 'overview';
  const setActiveTab = (tab: TabId) => setSearchParams({ tab });

  useEffect(() => {
    if (!user?.steamId) return;
    fetchBalance(user.steamId);
    fetchTransactions(user.steamId);
    fetchOrders(user.steamId);
  }, [user?.steamId]);

  /* ───── Logged-out state ───── */
  if (!user) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="card p-10 md:p-14 text-center max-w-[640px] mx-auto mt-12"
          >
            <div className="icon-chip-lg chip-lilac mx-auto mb-5">
              <Users size={22} strokeWidth={2.2} style={{ color: 'rgb(var(--hue-lilac))' }} />
            </div>
            <span className="label-eyebrow">Profile</span>
            <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight mt-2 leading-none">
              Sign in to access your profile
            </h1>
            <p className="text-[14px] text-ink-muted font-medium mt-3 max-w-md mx-auto">
              Manage your inventory, listings, balance, and trades after signing in with Steam.
            </p>
            <div className="mt-7 flex justify-center">
              <SteamLogin />
            </div>
          </motion.div>
        </main>
        <Footer slim />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-4 pb-16">
        {/* ── Profile header card ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-5 sm:p-6 md:p-7 mb-4 relative overflow-hidden"
        >
          <motion.div
            aria-hidden
            className="absolute -top-32 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(closest-side, rgb(var(--accent) / 0.16), transparent 65%)',
            }}
            animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-subtle grid place-items-center overflow-hidden shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={28} className="text-ink-muted" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="label-eyebrow">Signed in as</span>
              <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-none mt-1.5 truncate">
                {user.displayName || 'Trader'}
              </h1>
              <div className="mt-2 flex items-center gap-2 flex-wrap text-[12.5px] text-ink-muted font-medium">
                <span className="font-mono select-text">{user.steamId}</span>
                <span>·</span>
                <a
                  href={`https://steamcommunity.com/profiles/${user.steamId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-muted hover:text-ink transition-colors"
                >
                  View Steam profile
                </a>
              </div>
            </div>

            {/* Quick stats inline */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 shrink-0">
              <div className="card-flat px-3 py-2.5 sm:min-w-[120px]">
                <div className="label-meta">Balance</div>
                <div className="text-[18px] font-bold tracking-tight tabular-nums text-ink leading-none mt-1">
                  {formatPrice(Number(balance || 0))}
                </div>
              </div>
              <div className="card-flat px-3 py-2.5 sm:min-w-[120px]">
                <div className="label-meta">Pending</div>
                <div className="text-[18px] font-bold tracking-tight tabular-nums text-ink leading-none mt-1">
                  {formatPrice(Number(pendingBalance || 0))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Layout: sidebar nav (lg+) / horizontal pill scroller (<lg) + content ── */}
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          {/*
            Tab nav.
            On lg+ : vertical list in a sticky card sidebar (classic dashboard).
            On <lg : horizontal scrolling pill bar — same buttons, laid out
                     left-to-right with `flex` and `overflow-x-auto`. The
                     `lg:flex-col` + `lg:overflow-y-auto` switch handles both
                     modes with one nav node.
          */}
          <motion.aside
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring}
            className="card lg:p-2 p-1.5 self-start lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto overflow-x-auto scrollbar-hide"
          >
            <nav className="flex lg:flex-col gap-1 lg:gap-0.5">
              {TABS.map((t) => {
                const active = activeTab === t.id;
                const Icon = t.icon;
                return (
                  <motion.button
                    whileTap={tap}
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`relative h-10 lg:h-11 px-3 rounded-2xl flex items-center gap-2.5 lg:gap-3 transition-colors text-left shrink-0 lg:w-full lg:shrink ${
                      active ? 'text-ink' : 'text-ink-muted hover:bg-subtle hover:text-ink'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="profile-tab-pill"
                        className="absolute inset-0 rounded-2xl bg-accent-soft"
                        transition={spring}
                      />
                    )}
                    <Icon
                      size={16}
                      strokeWidth={active ? 2.4 : 2}
                      // Single-color icons (no rainbow hue tints). Active uses
                      // the brand accent; inactive inherits text-ink-muted from
                      // the parent button.
                      className={`relative shrink-0 ${active ? 'text-accent' : ''}`}
                    />
                    <span className="relative text-[13px] lg:text-[13.5px] font-semibold tracking-tight whitespace-nowrap lg:flex-1">
                      {t.label}
                    </span>
                    {active && (
                      <ChevronRight
                        size={14}
                        className="relative text-ink-muted hidden lg:block"
                      />
                    )}
                  </motion.button>
                );
              })}
            </nav>
          </motion.aside>

          {/* Content */}
          <div className="min-w-0">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ ...spring, mass: 0.6 }}
              >
                {activeTab === 'overview' && (
                  <OverviewTab
                    balance={Number(balance || 0)}
                    pendingBalance={Number(pendingBalance || 0)}
                    totalDeposited={Number(totalDeposited || 0)}
                    totalSpent={Number(totalSpent || 0)}
                    ordersCount={orders?.length || 0}
                    recentOrders={orders?.slice(0, 4) || []}
                    onGoTo={setActiveTab}
                    formatPrice={formatPrice}
                  />
                )}

                {activeTab === 'performance' && (
                  <SubFrame title="Trading performance" subtitle="Profit, volume, and trade activity over time">
                    <Suspense fallback={<TabSkeleton />}>
                      <TradingPerformanceTab />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'balance' && (
                  <SubFrame title="Balance" subtitle="Funds, lifetime totals, and transaction history">
                    <Suspense fallback={<TabSkeleton />}>
                      <BalanceTab />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'trades' && (
                  <SubFrame title="Trades" subtitle="Purchases, sales, and items in escrow">
                    <Suspense fallback={<TabSkeleton />}>
                      <TradesTab />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'inventory' && (
                  <SubFrame title="Inventory" subtitle="Items you own on Steam">
                    <Suspense fallback={<TabSkeleton />}>
                      <InventoryTab steamId={user.steamId} />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'listings' && (
                  <SubFrame title="Listings" subtitle="Skins you've put up for sale">
                    <Suspense fallback={<TabSkeleton />}>
                      <ListingsTab steamId={user.steamId} />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'wishlist' && (
                  <SubFrame title="Wishlist" subtitle="Skins you're watching">
                    <Suspense fallback={<TabSkeleton />}>
                      <WishlistTab />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'shop' && (
                  <SubFrame title="My shop" subtitle="Public storefront for your listings">
                    <Suspense fallback={<TabSkeleton />}>
                      <MyShopTab onNavigateToListings={() => setActiveTab('listings')} />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'reviews' && (
                  <SubFrame title="Reviews" subtitle="Feedback from people you've traded with">
                    <Suspense fallback={<TabSkeleton />}>
                      <ReviewsTab />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'notifications' && (
                  <SubFrame title="Notifications" subtitle="Recent activity on your account">
                    <div className="card p-8 text-center">
                      <Bell size={22} className="mx-auto text-ink-muted mb-3" />
                      <p className="text-[14px] text-ink-muted font-medium">
                        No notifications yet — we’ll alert you when something changes.
                      </p>
                    </div>
                  </SubFrame>
                )}

                {activeTab === 'settings' && (
                  <SubFrame title="Settings" subtitle="Account, trade link, appearance, and preferences">
                    <Suspense fallback={<TabSkeleton />}>
                      <SettingsTab />
                    </Suspense>
                  </SubFrame>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      <Footer slim />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   OVERVIEW TAB
   ───────────────────────────────────────────────────────────────────────── */

const OverviewTab: React.FC<{
  balance: number;
  pendingBalance: number;
  totalDeposited: number;
  totalSpent: number;
  ordersCount: number;
  recentOrders: any[];
  onGoTo: (t: TabId) => void;
  formatPrice: (n: number) => string;
}> = ({ balance, pendingBalance, totalDeposited, totalSpent, ordersCount, recentOrders, onGoTo, formatPrice }) => {
  const earned = Math.max(0, balance + pendingBalance - totalDeposited + totalSpent);

  const tiles = [
    { label: 'Available', value: formatPrice(balance), Icon: Wallet, hue: 'mint',  sub: 'Spendable now' },
    { label: 'Pending',   value: formatPrice(pendingBalance), Icon: Coins, hue: 'lemon', sub: 'Releases after 8 days' },
    { label: 'Deposited', value: formatPrice(totalDeposited), Icon: ArrowDownToLine, hue: 'sky', sub: 'Lifetime top-ups' },
    { label: 'Spent',     value: formatPrice(totalSpent), Icon: ArrowUpFromLine, hue: 'rose', sub: 'Lifetime purchases' },
  ];

  return (
    <div className="space-y-4">
      {/* Stat tiles */}
      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="shown"
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {tiles.map((t) => (
          <motion.div key={t.label} variants={staggerChild} whileHover={{ y: -2 }} transition={spring} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <span className="label-meta">{t.label}</span>
              {/* Single-color icon chip — accent-soft bg + accent stroke
                  instead of per-tile hues (used to be rainbow). */}
              <div className="icon-chip-sm bg-accent-soft">
                <t.Icon size={14} strokeWidth={2.2} className="text-accent" />
              </div>
            </div>
            <div className="text-[22px] font-bold tracking-tight tabular-nums text-ink leading-none">
              {t.value}
            </div>
            {t.sub && <div className="text-[11.5px] text-ink-dim font-medium mt-1.5">{t.sub}</div>}
          </motion.div>
        ))}
      </motion.div>

      {/* Performance + Quick links */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <motion.div variants={staggerChild} initial="hidden" animate="shown" className="card p-5 md:p-6 flex flex-col">
          <div className="flex items-end justify-between mb-4">
            <div>
              <span className="label-eyebrow">Performance</span>
              <h2 className="text-[17px] font-bold tracking-tight mt-1.5 leading-none">
                Lifetime
              </h2>
            </div>
            <span className="pill bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              +{formatPrice(Math.max(0, earned))} earned
            </span>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="card-flat p-4">
              <div className="label-meta">Net flow</div>
              <div className="text-[22px] font-bold tracking-tight tabular-nums text-ink leading-none mt-1.5">
                {formatPrice(Math.max(0, earned))}
              </div>
              <div className="text-[11.5px] text-ink-dim font-medium mt-1.5">
                Deposits + sales − purchases
              </div>
            </div>
            <div className="card-flat p-4">
              <div className="label-meta">Activity</div>
              <div className="text-[22px] font-bold tracking-tight tabular-nums text-ink leading-none mt-1.5">
                {ordersCount}
              </div>
              <div className="text-[11.5px] text-ink-dim font-medium mt-1.5">
                Orders all-time
              </div>
            </div>
          </div>
          <motion.button
            whileTap={tap}
            onClick={() => onGoTo('performance')}
            className="mt-4 h-10 px-4 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            View detailed performance <ChevronRight size={13} strokeWidth={2.4} />
          </motion.button>
        </motion.div>

        <motion.div variants={staggerChild} initial="hidden" animate="shown" className="card p-5 md:p-6">
          <span className="label-eyebrow">Shortcuts</span>
          <h2 className="text-[17px] font-bold tracking-tight mt-1.5 leading-none mb-4">
            Quick actions
          </h2>
          <div className="space-y-2">
            <QuickAction
              Icon={CreditCard}
              hue="lemon"
              label="Refill balance"
              sub="Add funds via card, bank or crypto"
              onClick={openDepositModal}
            />
            <QuickAction
              Icon={Package}
              hue="sky"
              label="Browse inventory"
              sub="See what you own on Steam"
              onClick={() => onGoTo('inventory')}
            />
            <QuickAction
              Icon={ShoppingBag}
              hue="peach"
              label="Manage listings"
              sub="Edit or remove items for sale"
              onClick={() => onGoTo('listings')}
            />
            <QuickAction
              Icon={Store}
              hue="sand"
              label="Customize your shop"
              sub="Tweak your public storefront"
              onClick={() => onGoTo('shop')}
            />
          </div>
        </motion.div>
      </div>

      {/* Recent orders */}
      <motion.div variants={staggerChild} initial="hidden" animate="shown" className="card p-5 md:p-6">
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div>
            <span className="label-eyebrow">Activity</span>
            <h2 className="text-[17px] font-bold tracking-tight mt-1.5 leading-none">
              Recent orders
            </h2>
          </div>
          <button
            onClick={() => onGoTo('trades')}
            className="text-[13px] text-ink-muted hover:text-ink font-semibold flex items-center gap-1 transition-colors"
          >
            All trades <ChevronRight size={13} />
          </button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-10 text-center">
            <Activity size={22} className="mx-auto text-ink-muted mb-2" />
            <p className="text-[13.5px] text-ink-muted font-medium">
              You don't have any orders yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {recentOrders.map((o) => (
              <li key={o.id} className="py-3 flex items-center gap-3">
                <div className="icon-chip bg-accent-soft">
                  <ShoppingBag
                    size={16}
                    strokeWidth={2.2}
                    className="text-accent"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-ink truncate tracking-tight">
                    Order #{String(o.id).slice(-6).toUpperCase()}
                  </div>
                  <div className="text-[11.5px] text-ink-dim font-medium mt-0.5">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                  </div>
                </div>
                <span className="pill bg-subtle text-ink-muted">{o.status || 'pending'}</span>
                <div className="text-right shrink-0 min-w-[100px]">
                  <div className="text-[14px] font-bold tabular-nums text-ink tracking-tight">
                    {formatPrice(Number(o.total_amount || 0))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 text-[11.5px] text-ink-dim font-medium">
          {ordersCount} total order{ordersCount === 1 ? '' : 's'} on this account.
        </div>
      </motion.div>
    </div>
  );
};

/* BalanceTab + TradesTab moved to ./tabs/BalanceTab.tsx and ./tabs/TradesTab.tsx */

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */

const SubFrame: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div className="space-y-4">
    <div>
      <span className="label-eyebrow">Profile</span>
      <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight mt-1.5 leading-none">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[13px] sm:text-[14px] text-ink-muted font-medium mt-1.5">{subtitle}</p>
      )}
    </div>
    {children}
  </div>
);

const TabSkeleton: React.FC = () => (
  <div className="space-y-3">
    <div className="skel h-12" />
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skel" style={{ aspectRatio: '5 / 6.4' }} />
      ))}
    </div>
  </div>
);

const QuickAction: React.FC<{
  Icon: React.ComponentType<any>;
  hue: string;
  label: string;
  sub: string;
  onClick: () => void;
}> = ({ Icon, label, sub, onClick }) => (
  // `hue` param kept for source-compat but no longer used — every action
  // now renders with the brand accent for visual consistency.
  <motion.button
    whileTap={tap}
    onClick={onClick}
    className="w-full text-left p-3 rounded-2xl hover:bg-subtle flex items-center gap-3 transition-colors"
  >
    <div className="icon-chip bg-accent-soft">
      <Icon size={18} strokeWidth={2.2} className="text-accent" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[14px] font-bold text-ink truncate tracking-tight">{label}</div>
      <div className="text-[12px] text-ink-muted font-medium mt-0.5 truncate">{sub}</div>
    </div>
    <ChevronRight size={14} className="text-ink-muted shrink-0" />
  </motion.button>
);

const SummaryRow: React.FC<{ label: string; value: string; hueTip?: string }> = ({
  label,
  value,
  hueTip,
}) => (
  <div className="flex items-start justify-between gap-3">
    <div className="min-w-0">
      <div className="text-[13px] text-ink-muted font-medium truncate">{label}</div>
      {hueTip && <div className="text-[11.5px] text-ink-dim font-medium mt-0.5">{hueTip}</div>}
    </div>
    <div className="text-[14.5px] font-bold tracking-tight tabular-nums text-ink shrink-0">{value}</div>
  </div>
);

export default ProfilePage;
