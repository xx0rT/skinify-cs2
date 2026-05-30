import React, { Suspense, lazy, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  RefreshCw,
  Settings,
  ShoppingBag,
  Store,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useBalanceStore } from '../store/balanceStore';
import { useOrderStore } from '../store/orderStore';
import { useCurrencyStore } from '../store/currencyStore';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import SteamLogin from '../components/auth/SteamLogin';
import { spring, tap } from '../lib/motion';
import { openDepositModal } from '../components/DepositModal';

/* Existing sub-components — kept; they slot into their tabs. They use raw
   Tailwind so they pick up the theme colors via the CSS-variable utilities. */
const InventoryManager = lazy(() => import('../components/profile/InventoryManager'));
const MarketplaceListingsManager = lazy(() => import('../components/profile/MarketplaceListingsManager'));
const WishlistManager = lazy(() => import('../components/profile/WishlistManager'));
const ShopManager = lazy(() => import('../components/profile/ShopManager'));
const UserReviews = lazy(() => import('../components/profile/UserReviews'));
const TradingPerformanceChart = lazy(() => import('../components/profile/TradingPerformanceChart'));
const SettingsTab = lazy(() => import('../components/profile/SettingsTab'));

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
  { id: 'overview',      label: 'Overview',      icon: LayoutGrid, hue: 'lilac' },
  { id: 'inventory',     label: 'Inventory',     icon: Package,    hue: 'sky' },
  { id: 'listings',      label: 'Listings',      icon: ShoppingBag,hue: 'peach' },
  { id: 'wishlist',      label: 'Wishlist',      icon: Heart,      hue: 'rose' },
  { id: 'trades',        label: 'Trades',        icon: TrendingUp, hue: 'mint' },
  { id: 'balance',       label: 'Balance',       icon: Wallet,     hue: 'lemon' },
  { id: 'shop',          label: 'My shop',       icon: Store,      hue: 'sand' },
  { id: 'reviews',       label: 'Reviews',       icon: Users,      hue: 'stone' },
  { id: 'notifications', label: 'Notifications', icon: Bell,       hue: 'sky' },
  { id: 'settings',      label: 'Settings',      icon: Settings,   hue: 'stone' },
];

const staggerParent = { hidden: {}, shown: { transition: { staggerChildren: 0.05 } } };
const staggerChild = {
  hidden: { opacity: 0, y: 10 },
  shown:  { opacity: 1, y: 0, transition: spring },
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { balance, pendingBalance, totalDeposited, totalSpent, transactions, fetchBalance, fetchTransactions } =
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
        <Footer />
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
          className="card p-6 md:p-7 mb-4 relative overflow-hidden"
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
          <div className="relative flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-subtle grid place-items-center overflow-hidden shrink-0">
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

        {/* ── Layout: sidebar nav + content ───────────────────── */}
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <motion.aside
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring}
            className="card p-2 self-start lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin"
          >
            <nav className="space-y-0.5">
              {TABS.map((t) => {
                const active = activeTab === t.id;
                const Icon = t.icon;
                return (
                  <motion.button
                    whileTap={tap}
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`relative w-full h-11 px-3 rounded-2xl flex items-center gap-3 transition-colors text-left ${
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
                      size={18}
                      strokeWidth={active ? 2.4 : 2}
                      className="relative shrink-0"
                      style={active ? { color: `rgb(var(--hue-${t.hue || 'lilac'}))` } : undefined}
                    />
                    <span className="relative flex-1 text-[13.5px] font-semibold tracking-tight">
                      {t.label}
                    </span>
                    {active && <ChevronRight size={14} className="relative text-ink-muted" />}
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

                {activeTab === 'balance' && (
                  <BalanceTab
                    balance={Number(balance || 0)}
                    pendingBalance={Number(pendingBalance || 0)}
                    totalDeposited={Number(totalDeposited || 0)}
                    totalSpent={Number(totalSpent || 0)}
                    transactions={transactions || []}
                    formatPrice={formatPrice}
                    onRefresh={() => {
                      if (user.steamId) {
                        fetchBalance(user.steamId);
                        fetchTransactions(user.steamId);
                        addToast({ type: 'info', title: 'Balance refreshed' });
                      }
                    }}
                  />
                )}

                {activeTab === 'trades' && (
                  <TradesTab
                    orders={orders || []}
                    formatPrice={formatPrice}
                    onBrowse={() => navigate('/marketplace')}
                  />
                )}

                {activeTab === 'inventory' && (
                  <SubFrame title="Inventory" subtitle="Items you own on Steam">
                    <Suspense fallback={<TabSkeleton />}>
                      <InventoryManager steamId={user.steamId} />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'listings' && (
                  <SubFrame title="Listings" subtitle="Skins you've put up for sale">
                    <Suspense fallback={<TabSkeleton />}>
                      <MarketplaceListingsManager steamId={user.steamId} />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'wishlist' && (
                  <SubFrame title="Wishlist" subtitle="Skins you're watching">
                    <Suspense fallback={<TabSkeleton />}>
                      <WishlistManager />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'shop' && (
                  <SubFrame title="My shop" subtitle="Public storefront for your listings">
                    <Suspense fallback={<TabSkeleton />}>
                      <ShopManager onNavigateToListings={() => setActiveTab('listings')} />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'reviews' && (
                  <SubFrame title="Reviews" subtitle="Feedback from people you've traded with">
                    <Suspense fallback={<TabSkeleton />}>
                      <UserReviews userId={user.steamId} />
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

      <Footer />
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
              <div className={`icon-chip-sm chip-${t.hue}`}>
                <t.Icon size={14} strokeWidth={2.2} style={{ color: `rgb(var(--hue-${t.hue}))` }} />
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
        <motion.div variants={staggerChild} initial="hidden" animate="shown" className="card p-5 md:p-6">
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
          <Suspense fallback={<div className="skel h-48" />}>
            <TradingPerformanceChart />
          </Suspense>
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
                <div className="icon-chip chip-mint">
                  <ShoppingBag
                    size={16}
                    strokeWidth={2.2}
                    style={{ color: 'rgb(var(--hue-mint))' }}
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

/* ─────────────────────────────────────────────────────────────────────────
   BALANCE TAB
   ───────────────────────────────────────────────────────────────────────── */

const BalanceTab: React.FC<{
  balance: number;
  pendingBalance: number;
  totalDeposited: number;
  totalSpent: number;
  transactions: any[];
  formatPrice: (n: number) => string;
  onRefresh: () => void;
}> = ({ balance, pendingBalance, totalDeposited, totalSpent, transactions, formatPrice, onRefresh }) => {
  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-6 md:p-8 relative overflow-hidden"
        >
          <motion.div
            aria-hidden
            className="absolute -top-32 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(closest-side, rgb(var(--accent) / 0.16), transparent 65%)',
            }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="label-eyebrow">Available balance</span>
              <button
                onClick={onRefresh}
                className="icon-chip-sm hover:bg-bg transition-colors"
                title="Refresh"
              >
                <RefreshCw size={13} strokeWidth={2.2} className="text-ink-muted" />
              </button>
            </div>
            <div className="text-[34px] sm:text-[44px] font-bold tracking-tight leading-none tabular-nums text-ink">
              {formatPrice(balance)}
            </div>
            <div className="text-[13px] text-ink-muted font-medium mt-1.5">
              + {formatPrice(pendingBalance)} pending release
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                onClick={openDepositModal}
                className="h-12 px-6 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center gap-2"
                style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
              >
                <ArrowDownToLine size={15} strokeWidth={2.4} />
                Add funds
              </motion.button>
              <motion.button
                whileTap={tap}
                whileHover={{ scale: 1.02 }}
                className="h-12 px-6 rounded-full bg-subtle hover:bg-bg text-ink font-semibold text-[14px] flex items-center gap-2 transition-colors"
              >
                <ArrowUpFromLine size={15} strokeWidth={2.2} />
                Withdraw
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="card p-6"
        >
          <span className="label-eyebrow">Account summary</span>
          <div className="mt-4 space-y-3">
            <SummaryRow label="Lifetime deposited" value={formatPrice(totalDeposited)} />
            <SummaryRow label="Lifetime spent"     value={formatPrice(totalSpent)} />
            <SummaryRow label="Pending"            value={formatPrice(pendingBalance)} hueTip="Released 8 days after each sale" />
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.1 }}
        className="card p-5 md:p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="label-eyebrow">History</span>
            <h2 className="text-[17px] font-bold tracking-tight mt-1.5 leading-none">
              Recent transactions
            </h2>
          </div>
        </div>
        {transactions.length === 0 ? (
          <div className="py-10 text-center">
            <Coins size={22} className="mx-auto text-ink-muted mb-2" />
            <p className="text-[13.5px] text-ink-muted font-medium">
              No transactions yet.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {transactions.slice(0, 12).map((tx: any) => {
              const positive = ['deposit', 'sale', 'refund'].includes(String(tx.type));
              return (
                <li key={tx.id} className="py-3 flex items-center gap-3">
                  <div className={`icon-chip-sm ${positive ? 'chip-mint' : 'chip-rose'}`}>
                    {positive ? (
                      <ArrowDownToLine size={14} strokeWidth={2.2} style={{ color: 'rgb(var(--hue-mint))' }} />
                    ) : (
                      <ArrowUpFromLine size={14} strokeWidth={2.2} style={{ color: 'rgb(var(--hue-rose))' }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-ink truncate tracking-tight">
                      {tx.description || tx.type}
                    </div>
                    <div className="text-[11.5px] text-ink-dim font-medium mt-0.5">
                      {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                    </div>
                  </div>
                  <div className="text-right shrink-0 min-w-[100px]">
                    <div
                      className={`text-[14px] font-bold tabular-nums tracking-tight ${
                        positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink'
                      }`}
                    >
                      {positive ? '+' : '−'}
                      {formatPrice(Number(tx.amount || 0))}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </motion.div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   TRADES TAB
   ───────────────────────────────────────────────────────────────────────── */

const TradesTab: React.FC<{
  orders: any[];
  formatPrice: (n: number) => string;
  onBrowse: () => void;
}> = ({ orders, formatPrice, onBrowse }) => {
  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="card p-5 md:p-6"
      >
        <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
          <div>
            <span className="label-eyebrow">All trades</span>
            <h2 className="text-[17px] font-bold tracking-tight mt-1.5 leading-none">
              {orders.length} order{orders.length === 1 ? '' : 's'}
            </h2>
          </div>
          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.02 }}
            onClick={onBrowse}
            className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold flex items-center gap-1.5"
            style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
          >
            Browse market <ChevronRight size={13} strokeWidth={2.4} />
          </motion.button>
        </div>
        {orders.length === 0 ? (
          <div className="py-12 text-center">
            <TrendingUp size={22} className="mx-auto text-ink-muted mb-2" />
            <p className="text-[14px] text-ink-muted font-medium">
              No trades yet — start with the marketplace.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id} className="py-3 flex items-center gap-3">
                <div className="icon-chip chip-mint">
                  <ShoppingBag size={16} strokeWidth={2.2} style={{ color: 'rgb(var(--hue-mint))' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-ink truncate tracking-tight">
                    Order #{String(o.id).slice(-6).toUpperCase()}
                  </div>
                  <div className="text-[11.5px] text-ink-dim font-medium mt-0.5">
                    {o.created_at ? new Date(o.created_at).toLocaleString() : '—'}
                  </div>
                </div>
                <span className="pill bg-subtle text-ink-muted">{o.status || 'pending'}</span>
                <div className="text-right shrink-0 min-w-[110px]">
                  <div className="text-[14px] font-bold tabular-nums text-ink tracking-tight">
                    {formatPrice(Number(o.total_amount || 0))}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
};

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
}> = ({ Icon, hue, label, sub, onClick }) => (
  <motion.button
    whileTap={tap}
    onClick={onClick}
    className="w-full text-left p-3 rounded-2xl hover:bg-subtle flex items-center gap-3 transition-colors"
  >
    <div className={`icon-chip chip-${hue}`}>
      <Icon size={18} strokeWidth={2.2} style={{ color: `rgb(var(--hue-${hue}))` }} />
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
