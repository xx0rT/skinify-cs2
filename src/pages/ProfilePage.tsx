import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  FileCheck,
  Gift,
  MessageCircle,
  LayoutGrid,
  Package,
  Settings,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useBalanceStore } from '../store/balanceStore';
import { useOrderStore } from '../store/orderStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useDMStore } from '../store/dmStore';
import { useNotificationStore } from '../store/notificationStore';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import SteamLogin from '../components/auth/SteamLogin';
import { spring, tap } from '../lib/motion';
import { useT } from '../lib/useT';
import { openDepositModal } from '../components/DepositModal';

/* Use the retry-aware lazy wrapper from App.tsx so a redeploy doesn't
   strand users with a blank tab area when their browser holds the
   pre-deploy chunk hash. The plain `React.lazy` we used before would
   throw on the missing /assets/X-HASH.js and Suspense would just sit
   there forever — exactly the "tabs sometimes don't appear" bug. */
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      console.warn('[profile-lazy] first attempt failed, retrying:', err);
      await new Promise((r) => setTimeout(r, 600));
      try {
        return await factory();
      } catch (err2) {
        console.error('[profile-lazy] retry failed, force-reloading:', err2);
        try {
          const key = 'skinify_chunk_reload';
          const last = Number(sessionStorage.getItem(key) || '0');
          if (Date.now() - last > 30_000) {
            sessionStorage.setItem(key, String(Date.now()));
            window.location.reload();
          }
        } catch {
          /* sessionStorage unavailable — fall through to throw. */
        }
        throw err2;
      }
    }
  });
}

/* TabErrorBoundary — last-resort safety net for the tab content area.
   If a tab's render throws (chunk-load-after-retry, runtime error in a
   child), we show a small "Reload" card instead of a blank panel. */
class TabErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error('[tab-boundary]', error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="card p-8 text-center">
        <p className="text-[14px] text-ink font-semibold mb-1">
          Couldn't load this tab
        </p>
        <p className="text-[12.5px] text-ink-muted font-medium mb-4">
          A new version of the site is probably available.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-2"
        >
          Reload
        </button>
      </div>
    );
  }
}

const SettingsTab = lazyWithRetry(() => import('../components/profile/SettingsTab'));
const TradingPerformanceTab = lazyWithRetry(() => import('../components/profile/tabs/TradingPerformanceTab'));
const InventoryTab = lazyWithRetry(() => import('../components/profile/tabs/InventoryTab'));
const ListingsTab = lazyWithRetry(() => import('../components/profile/tabs/ListingsTab'));
const WishlistTab = lazyWithRetry(() => import('../components/profile/tabs/WishlistTab'));
const TradesTab = lazyWithRetry(() => import('../components/profile/tabs/TradesTab'));
const BalanceTab = lazyWithRetry(() => import('../components/profile/tabs/BalanceTab'));
const MyShopTab = lazyWithRetry(() => import('../components/profile/tabs/MyShopTab'));
const ReviewsTab = lazyWithRetry(() => import('../components/profile/tabs/ReviewsTab'));
/* ReferralTab reuses the standalone ReferralPage content — same
   commission dashboard, referral link generator, and payout history.
   Rendering it here lets users manage their referral program without
   leaving the profile. */
const ReferralTab = lazyWithRetry(() => import('../components/profile/tabs/ReferralTab'));

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
  | 'trades'
  | 'balance'
  | 'messages'
  | 'referral'
  | 'settings';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ComponentType<any>;
  hue?: string;
  /** When set, clicking the item navigates to the URL instead of switching
      the in-page tab. Used for first-class destinations like /messages
      that already have their own full-page layout. */
  navigate?: string;
  /** Show the matching unread counter. */
  badge?: 'messages' | 'notifications';
}

/* Six top-level tabs. Sub-pages collapse into their parent (e.g.
   Wishlist lives inside Inventory) so the sidebar stops sprawling.
   `messages` keeps its `navigate` field — clicking it routes to the
   standalone /messages page rather than swapping in-page content. */
const TABS: TabDef[] = [
  { id: 'overview',  label: 'Overview',  icon: LayoutGrid },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'listings',  label: 'Listings',  icon: ShoppingBag },
  { id: 'trades',    label: 'Trades',    icon: TrendingUp },
  { id: 'balance',   label: 'Balance',   icon: Wallet },
  { id: 'messages', label: 'Messages', icon: MessageCircle, navigate: '/messages', badge: 'messages' },
  { id: 'referral',  label: 'Referral',  icon: Gift },
  { id: 'settings',  label: 'Settings',  icon: Settings },
];

/* Sub-tabs for each parent. Empty list means no sub-tabs (e.g. Overview,
   Balance, Messages). The keys here map to the `sub` URL parameter. */
type SubId = string;
interface SubTab { id: SubId; label: string }
const SUB_TABS: Partial<Record<TabId, SubTab[]>> = {
  inventory: [
    { id: 'steam',    label: 'Steam items' },
    { id: 'wishlist', label: 'Wishlist' },
  ],
  listings: [
    { id: 'active', label: 'Active' },
    { id: 'shop',   label: 'My shop' },
  ],
  trades: [
    { id: 'history',     label: 'History' },
    { id: 'reviews',     label: 'Reviews' },
    { id: 'performance', label: 'Performance' },
  ],
  settings: [
    { id: 'profile',       label: 'Account' },
    { id: 'notifications', label: 'Notifications' },
  ],
};

/* Old tab IDs → new (tab, sub) pairs. Keeps deep links + email
   notifications working after the merge. */
const LEGACY_TAB_MAP: Record<string, { tab: TabId; sub?: SubId }> = {
  wishlist:      { tab: 'inventory', sub: 'wishlist' },
  shop:          { tab: 'listings',  sub: 'shop' },
  reviews:       { tab: 'trades',    sub: 'reviews' },
  performance:   { tab: 'trades',    sub: 'performance' },
  notifications: { tab: 'settings',  sub: 'notifications' },
  /* Notification deep-links (edge functions write these URLs). Without a
     mapping an unknown tab matched NO content block and the page rendered
     an empty column — the "blank screen" when opening a notification. */
  orders:        { tab: 'trades' },
  purchases:     { tab: 'trades' },
  sales:         { tab: 'trades' },
};

/* Every valid tab id — anything else falls back to overview instead of
   rendering an empty content area. */
const VALID_TABS: TabId[] = ['overview', 'inventory', 'listings', 'trades', 'balance', 'messages', 'referral', 'settings'];

import useDocumentMeta from '../hooks/useDocumentMeta';

const ProfilePage: React.FC = () => {
  useDocumentMeta({
    title: 'Profile · Skinify',
    description: 'Manage your Skinify account, listings, balance and trades.',
    noindex: true,
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { balance, transactions, fetchBalance, fetchTransactions } = useBalanceStore();
  const { fetchOrders } = useOrderStore();
  const { formatPrice } = useCurrencyStore();
  const tr = useT();
  const dmThreads = useDMStore((s) => s.threads);
  const notificationUnread = useNotificationStore((s) => s.unreadCount);
  const markAllNotificationsRead = useNotificationStore((s) => s.markAllAsRead);

  /* Count unread DM messages across every thread. Subscribing to
     `threads` (instead of calling `totalUnread()` once) means the badge
     updates live as messages arrive or get marked read. */
  const messagesUnread = useMemo(() => {
    let n = 0;
    for (const thread of Object.values(dmThreads)) {
      for (const m of thread.messages) {
        if (!m.read && m.fromSteamId !== 'me') n += 1;
      }
    }
    return n;
  }, [dmThreads]);

  /* Tab + sub-tab routing. We mirror state into the URL via
     ?tab=inventory&sub=wishlist so deep links survive a reload and
     the back button moves between sub-tabs naturally.

     Legacy single-tab links (?tab=wishlist) are silently rewritten to
     the new (tab, sub) pair via LEGACY_TAB_MAP. */
  const rawTab = searchParams.get('tab') || 'overview';
  const rawSub = searchParams.get('sub') || undefined;
  const remapped = LEGACY_TAB_MAP[rawTab];
  const candidate: TabId = (remapped ? remapped.tab : (rawTab as TabId)) || 'overview';
  const activeTab: TabId = VALID_TABS.includes(candidate) ? candidate : 'overview';
  const activeSub: SubId | undefined = (() => {
    /* Legacy redirect wins over an explicit sub. */
    if (remapped?.sub) return remapped.sub;
    const list = SUB_TABS[activeTab];
    if (!list || list.length === 0) return undefined;
    if (rawSub && list.find((s) => s.id === rawSub)) return rawSub;
    return list[0].id; // first sub-tab is the default
  })();
  const setActiveTab = (tab: TabId, sub?: SubId) => {
    const list = SUB_TABS[tab];
    const next: Record<string, string> = { tab };
    if (list && list.length > 0) {
      next.sub = sub || list[0].id;
    }
    setSearchParams(next);
  };
  const setActiveSub = (sub: SubId) => setActiveTab(activeTab, sub);

  /* Persistent rewrite — if the user landed on a legacy URL, update
     it in place so refreshing keeps the new shape. */
  useEffect(() => {
    if (!remapped) return;
    const next: Record<string, string> = { tab: remapped.tab };
    if (remapped.sub) next.sub = remapped.sub;
    setSearchParams(next, { replace: true });
  }, [rawTab]);

  /* Viewing the notifications tab counts as reading them — clears the
     bell / avatar badges (and syncs read-state to the backend). */
  useEffect(() => {
    if (activeTab === 'settings' && activeSub === 'notifications' && notificationUnread > 0) {
      markAllNotificationsRead();
    }
  }, [activeTab, activeSub, notificationUnread, markAllNotificationsRead]);

  useEffect(() => {
    if (!user?.steamId) return;
    fetchBalance(user.steamId);
    fetchTransactions(user.steamId);
    fetchOrders(user.steamId);
  }, [user?.steamId]);

  /* Joined date for the mobile profile card — read once from the
     users row; silently absent when the row doesn't exist yet. */
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.steamId) return;
    supabase
      .from('users')
      .select('created_at')
      .eq('steam_id', user.steamId)
      .maybeSingle()
      .then(({ data }) => setJoinedAt(data?.created_at ?? null));
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
            <span className="label-eyebrow">{tr('profile.title', 'Profile')}</span>
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

      <main className="max-w-[1480px] mx-auto px-3 sm:px-6 pt-3 sm:pt-6 lg:pt-10 pb-16">
        {/* ── Mobile tab strip (<lg) — underline tabs with icons, per the
              skins.com reference. Scrolls horizontally; the active tab
              gets an accent underline. Sticky under the mobile top bar. */}
        <div className="lg:hidden sticky sticky-below-topbar z-20 -mx-3 sm:-mx-6 px-4 sm:px-6 mb-4 bg-bg border-b border-line overflow-x-auto scrollbar-hide">
          <nav className="flex gap-6 min-w-max" aria-label="Profile sections">
            {TABS.map((t) => {
              const active = activeTab === t.id;
              const Icon = t.icon;
              const badgeCount =
                t.badge === 'messages' ? messagesUnread :
                t.badge === 'notifications' ? notificationUnread : 0;
              return (
                <button
                  key={t.id}
                  onClick={() => t.navigate ? navigate(t.navigate) : setActiveTab(t.id)}
                  className={`relative flex items-center gap-2 py-3.5 shrink-0 transition-colors ${
                    active ? 'text-ink' : 'text-ink-muted'
                  }`}
                >
                  <Icon size={16} strokeWidth={active ? 2.4 : 2} />
                  <span className="text-[14px] font-semibold tracking-tight whitespace-nowrap">
                    {t.id === 'overview'
                      ? tr('profile.title', 'Profile')
                      : tr(`profile.tab.${t.id}`, t.label)}
                  </span>
                  {badgeCount > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center tabular-nums">
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                  )}
                  {active && (
                    <motion.span
                      layoutId="profile-mobile-tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-accent"
                      transition={spring}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Layout: sidebar nav (lg+) + content ── */}
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          {/* Tab nav — vertical list in a sticky card sidebar (lg+ only;
              mobile uses the underline strip above). */}
          <motion.aside
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring}
            className="hidden lg:block card p-2 self-start sticky top-24 z-20 max-h-[calc(100vh-7rem)] overflow-y-auto"
          >
            <nav className="flex flex-col gap-0.5">
              {TABS.map((t) => {
                const active = activeTab === t.id;
                const Icon = t.icon;
                const badgeCount =
                  t.badge === 'messages' ? messagesUnread :
                  t.badge === 'notifications' ? notificationUnread : 0;
                return (
                  <motion.button
                    whileTap={tap}
                    key={t.id}
                    onClick={() => t.navigate ? navigate(t.navigate) : setActiveTab(t.id)}
                    className={`relative h-11 px-3 rounded-2xl flex items-center gap-3 transition-colors text-left w-full ${
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
                    <span className="relative text-[13.5px] font-semibold tracking-tight whitespace-nowrap flex-1">
                      {tr(`profile.tab.${t.id}`, t.label)}
                    </span>
                    {badgeCount > 0 && (
                      <span className="relative min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10.5px] font-bold grid place-items-center tabular-nums">
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </span>
                    )}
                    {active && !badgeCount && (
                      <ChevronRight
                        size={14}
                        className="relative text-ink-muted"
                      />
                    )}
                  </motion.button>
                );
              })}
            </nav>
          </motion.aside>

          {/* Content. Note: NOT wrapped in AnimatePresence mode="wait" —
              fast tab switches there could leave the queue in a state
              where a new tab's enter is held up by a half-finished exit,
              and the area would render empty (the bug reported). We
              just animate in on key change; exits are instant. The key
              includes activeSub so swapping sub-tabs re-runs the enter
              animation on the new content too. */}
          <div className="min-w-0">
            <TabErrorBoundary>
              <motion.div
                key={`${activeTab}:${activeSub || ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, mass: 0.6 }}
              >
                {activeTab === 'overview' && (
                  <OverviewTab
                    balance={Number(balance || 0)}
                    onGoTo={setActiveTab}
                    formatPrice={formatPrice}
                    user={user}
                    joinedAt={joinedAt}
                    transactions={transactions}
                  />
                )}

                {activeTab === 'balance' && (
                  <SubFrame title={tr('profile.tab.balance', 'Balance')} subtitle="Funds, lifetime totals, and transaction history">
                    <Suspense fallback={<TabSkeleton />}>
                      <BalanceTab />
                    </Suspense>
                  </SubFrame>
                )}

                {activeTab === 'inventory' && (
                  <GroupedTab
                    title={tr('profile.tab.inventory', 'Inventory')}
                    subtitle={
                      activeSub === 'wishlist'
                        ? "Skins you're watching"
                        : 'Items you own on Steam'
                    }
                    subTabs={SUB_TABS.inventory || []}
                    activeSub={activeSub}
                    onSubChange={setActiveSub}
                  >
                    <Suspense fallback={<TabSkeleton />}>
                      {activeSub === 'wishlist' ? (
                        <WishlistTab />
                      ) : (
                        <InventoryTab steamId={user.steamId} />
                      )}
                    </Suspense>
                  </GroupedTab>
                )}

                {activeTab === 'listings' && (
                  <GroupedTab
                    title={tr('profile.tab.listings', 'Listings')}
                    subtitle={
                      activeSub === 'shop'
                        ? 'Public storefront for your listings'
                        : "Skins you've put up for sale"
                    }
                    subTabs={SUB_TABS.listings || []}
                    activeSub={activeSub}
                    onSubChange={setActiveSub}
                  >
                    <Suspense fallback={<TabSkeleton />}>
                      {activeSub === 'shop' ? (
                        <MyShopTab onNavigateToListings={() => setActiveTab('listings', 'active')} />
                      ) : (
                        <ListingsTab steamId={user.steamId} />
                      )}
                    </Suspense>
                  </GroupedTab>
                )}

                {activeTab === 'trades' && (
                  <GroupedTab
                    title={tr('profile.tab.trades', 'Trades')}
                    subtitle={
                      activeSub === 'reviews'
                        ? "Feedback from people you've traded with"
                        : activeSub === 'performance'
                        ? 'Profit, volume, and trade activity over time'
                        : 'Purchases, sales, and items in escrow'
                    }
                    subTabs={SUB_TABS.trades || []}
                    activeSub={activeSub}
                    onSubChange={setActiveSub}
                  >
                    <Suspense fallback={<TabSkeleton />}>
                      {activeSub === 'reviews' ? (
                        <ReviewsTab />
                      ) : activeSub === 'performance' ? (
                        <TradingPerformanceTab />
                      ) : (
                        <TradesTab />
                      )}
                    </Suspense>
                  </GroupedTab>
                )}

                {activeTab === 'referral' && (
                  <GroupedTab
                    title={tr('profile.tab.referral', 'Referral')}
                    subtitle="Share your link, earn a cut of every friend's fees for life."
                    subTabs={[]}
                    activeSub={activeSub}
                    onSubChange={setActiveSub}
                  >
                    <Suspense fallback={<TabSkeleton />}>
                      <ReferralTab />
                    </Suspense>
                  </GroupedTab>
                )}

                {activeTab === 'settings' && (
                  <GroupedTab
                    title={tr('profile.tab.settings', 'Settings')}
                    subtitle={
                      activeSub === 'notifications'
                        ? 'Recent activity on your account'
                        : 'Account, trade link, appearance, and preferences'
                    }
                    subTabs={SUB_TABS.settings || []}
                    activeSub={activeSub}
                    onSubChange={setActiveSub}
                  >
                    <Suspense fallback={<TabSkeleton />}>
                      {activeSub === 'notifications' ? (
                        <NotificationsPanel />
                      ) : (
                        <SettingsTab />
                      )}
                    </Suspense>
                  </GroupedTab>
                )}
              </motion.div>
            </TabErrorBoundary>
          </div>
        </div>
      </main>

      <Footer slim />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   NOTIFICATIONS PANEL — real list for Settings → Notifications (the
   navbar bell lands here). Shows personal + admin-published global
   notifications; global ones can carry a redirect link.
   ───────────────────────────────────────────────────────────────────────── */

const NotificationsPanel: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { notifications, fetchNotifications, markAsRead, removeNotification } =
    useNotificationStore();

  useEffect(() => {
    if (user?.steamId) fetchNotifications(user.steamId);
  }, [user?.steamId, fetchNotifications]);

  const openLink = (url: string) => {
    if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener');
    else navigate(url);
  };

  if (notifications.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Bell size={22} className="mx-auto text-ink-muted mb-3" />
        <p className="text-[14px] text-ink-muted font-medium">
          No notifications yet — we’ll alert you when something changes.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="shown"
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.05 } } }}
      className="space-y-2"
    >
      {notifications.map((n) => {
        const linkUrl = n.metadata?.link_url || n.metadata?.action_url;
        const linkLabel = n.metadata?.link_label || 'Open';
        return (
          <motion.div
            key={n.id}
            variants={{ hidden: { opacity: 0, y: 10 }, shown: { opacity: 1, y: 0, transition: spring } }}
            onClick={() => !n.read && markAsRead(n.id)}
            className={`card p-4 flex items-start gap-3 ${n.read ? '' : 'ring-1 ring-accent/25'}`}
          >
            <div
              className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                n.read ? 'bg-line' : 'bg-accent'
              }`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13.5px] font-bold text-ink tracking-tight truncate">
                  {n.title}
                </span>
                <span className="text-[11px] text-ink-dim font-medium shrink-0">
                  {new Date(n.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[12.5px] text-ink-muted font-medium mt-0.5 whitespace-pre-wrap">
                {n.message}
              </p>
              {linkUrl && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(n.id);
                    openLink(linkUrl);
                  }}
                  className="inline-flex items-center h-8 px-3.5 mt-2 rounded-full bg-accent text-on-accent text-[12px] font-bold hover:opacity-90 transition-opacity"
                >
                  {linkLabel}
                </button>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(n.id);
              }}
              className="w-7 h-7 rounded-full grid place-items-center text-ink-dim hover:text-ink hover:bg-subtle transition-colors shrink-0"
              aria-label="Dismiss"
            >
              ×
            </button>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   OVERVIEW TAB
   ───────────────────────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────
   OVERVIEW TAB — simple skins.com-style stack (same on mobile and
   desktop): user card → identity verification → account rows →
   notifications. Rows stagger in on load and lift slightly on hover.
   ───────────────────────────────────────────────────────────────────────── */

const overviewParent = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const overviewChild = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, y: 0, transition: spring },
};

const OverviewTab: React.FC<{
  balance: number;
  onGoTo: (t: TabId, sub?: string) => void;
  formatPrice: (n: number) => string;
  user: {
    displayName?: string;
    avatarUrl?: string;
    steamLinked?: boolean;
    tradeLink?: string;
  };
  joinedAt: string | null;
  transactions: any[];
}> = ({ balance, onGoTo, formatPrice, user, joinedAt, transactions }) => {
  const tr = useT();
  const navigate = useNavigate();
  const recentTx = (transactions || []).slice(0, 6);

  return (
    <motion.div
      variants={overviewParent}
      initial="hidden"
      animate="shown"
      className="space-y-3 max-w-[860px]"
    >
      <motion.h2
        variants={overviewChild}
        className="text-[26px] font-bold tracking-tight leading-none mb-4 lg:hidden"
      >
        {tr('profile.title', 'Profile')}
      </motion.h2>

      {/* ── User card ── */}
      <motion.div
        variants={overviewChild}
        whileHover={{ y: -2 }}
        transition={spring}
        className="panel p-5 relative overflow-hidden flex items-center gap-4"
      >
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(rgb(var(--ink)) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        />
        <div className="relative w-14 h-14 rounded-2xl bg-accent text-on-accent grid place-items-center overflow-hidden font-bold text-[19px] shrink-0">
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
        <div className="relative flex-1 min-w-0">
          <div className="text-[17px] font-bold text-ink tracking-tight truncate">
            {user.displayName || 'Trader'}
          </div>
          <div className="text-[12.5px] text-ink-muted font-medium mt-0.5">
            {joinedAt
              ? `${tr('profile.joined', 'Joined')} ${new Date(joinedAt).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}`
              : 'Skinify trader'}
          </div>
        </div>
        <motion.button
          whileTap={tap}
          onClick={() => onGoTo('settings')}
          className="relative h-10 px-4 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-bold transition-colors shrink-0"
        >
          Edit
        </motion.button>
      </motion.div>

      {/* ── Balance + recent transactions ── */}
      <motion.div variants={overviewChild} className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="label-meta">{tr('profile.tab.balance', 'Balance')}</div>
            <div className="text-[26px] font-bold tracking-tight tabular-nums text-ink leading-none mt-1.5">
              {formatPrice(Number(balance || 0))}
            </div>
          </div>
          <motion.button
            whileTap={tap}
            onClick={openDepositModal}
            className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold shrink-0"
          >
            {tr('deposit', 'Deposit')}
          </motion.button>
        </div>

        {recentTx.length > 0 ? (
          <>
            {/* Recent transactions — the list fades out toward the bottom
                (gradient mask into translucent) to signal "there's more". */}
            <div className="label-eyebrow mt-6 mb-1">
              {tr('profile.recentTransactions', 'Recent transactions')}
            </div>
            <div
              className="relative"
              style={{
                maskImage:
                  recentTx.length >= 5
                    ? 'linear-gradient(to bottom, #000 55%, transparent 100%)'
                    : undefined,
                WebkitMaskImage:
                  recentTx.length >= 5
                    ? 'linear-gradient(to bottom, #000 55%, transparent 100%)'
                    : undefined,
              }}
            >
              {recentTx.map((tx: any, i: number) => {
                const isCredit = tx.type === 'deposit' || tx.type === 'sale' || tx.type === 'refund';
                return (
                  <motion.div
                    key={tx.id || i}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: Math.min(i * 0.04, 0.24) }}
                    className="kv-row border-b border-line/50 last:border-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          tx.status === 'completed'
                            ? 'bg-emerald-500'
                            : tx.status === 'pending'
                            ? 'bg-amber-500'
                            : 'bg-ink-dim'
                        }`}
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold text-ink capitalize truncate">
                          {tx.type}
                        </span>
                        <span className="block text-[11px] text-ink-dim font-medium tabular-nums">
                          {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'}
                        </span>
                      </span>
                    </div>
                    <span
                      className={`kv-value tabular-nums ${
                        isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink'
                      }`}
                    >
                      {isCredit ? '+' : '−'}
                      {formatPrice(Math.abs(Number(tx.amount || 0)))}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            <button
              onClick={() => onGoTo('balance')}
              className="mt-3 w-full h-10 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              {tr('profile.viewAllTransactions', 'View all transactions')}
              <ChevronRight size={13} strokeWidth={2.4} />
            </button>
          </>
        ) : (
          <p className="text-[12.5px] text-ink-muted font-medium mt-4">
            {tr('profile.noTransactions', 'No transactions yet.')}
          </p>
        )}
      </motion.div>

      {/* ── Identity verification ── */}
      <OverviewRow
        variants={overviewChild}
        Icon={FileCheck}
        iconClass="text-accent"
        chipClass="bg-accent-soft"
        label={tr('profile.kyc.title', 'Identity Verification')}
        text={tr('profile.kyc.text', 'Complete KYC to enjoy limitless trading.')}
        action={
          <motion.button
            whileTap={tap}
            onClick={() =>
              /* Go to Settings → Account AND flag `verify=1` so the KYC
                 section auto-launches the Sumsub flow (previously this just
                 switched tabs and did nothing). */
              navigate('/profile?tab=settings&sub=profile&verify=1')
            }
            className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold transition-opacity hover:opacity-90"
          >
            {tr('profile.kyc.cta', 'Complete')}
          </motion.button>
        }
      />

      {/* ── Your account ── */}
      <motion.div variants={overviewChild} className="label-eyebrow pt-4 pb-1">
        {tr('profile.account.title', 'Your account')}
      </motion.div>

      <OverviewRow
        variants={overviewChild}
        Icon={Users}
        label="Steam"
        text={
          user.steamLinked
            ? tr('profile.steam.linkedText', 'Your Steam account is linked — P2P trading unlocked.')
            : tr('profile.steam.linkText', 'Link your Steam account to unlock P2P trading.')
        }
        action={
          user.steamLinked ? (
            <span className="h-10 px-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[13px] font-bold grid place-items-center">
              {tr('profile.steam.linked', 'Linked')}
            </span>
          ) : (
            <motion.button
              whileTap={tap}
              onClick={() => onGoTo('settings')}
              className="h-10 px-4 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-bold transition-colors"
            >
              {tr('profile.steam.link', 'Link')}
            </motion.button>
          )
        }
      />

      <OverviewRow
        variants={overviewChild}
        Icon={TrendingUp}
        label="Trade URL"
        text={
          user.tradeLink
            ? 'Your Steam trade URL is set — you can receive items.'
            : 'Add your Steam trade URL to receive purchased items.'
        }
        action={
          <motion.button
            whileTap={tap}
            onClick={() => onGoTo('settings')}
            className="h-10 px-4 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-bold transition-colors"
          >
            {user.tradeLink ? 'Edit' : 'Add'}
          </motion.button>
        }
      />

      {/* ── Notifications ── */}
      <motion.div variants={overviewChild} className="label-eyebrow pt-4 pb-1">
        Notifications
      </motion.div>

      <OverviewRow
        variants={overviewChild}
        Icon={Bell}
        label="Trade notifications"
        text="Choose how you want to be notified about your trades and market updates."
        action={
          <motion.button
            whileTap={tap}
            onClick={() => onGoTo('settings', 'notifications')}
            className="h-10 px-4 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-bold transition-colors"
          >
            Manage
          </motion.button>
        }
      />
    </motion.div>
  );
};

/* One flat settings-style row: icon chip · uppercase label + text ·
   action on the right. Lifts on hover for a bit of life. */
const OverviewRow: React.FC<{
  variants: any;
  Icon: React.ComponentType<any>;
  label: string;
  text: React.ReactNode;
  action: React.ReactNode;
  iconClass?: string;
  chipClass?: string;
}> = ({ variants, Icon, label, text, action, iconClass = 'text-ink-muted', chipClass = '' }) => (
  <motion.div
    variants={variants}
    whileHover={{ y: -2 }}
    transition={spring}
    className="panel p-5 flex items-center gap-4"
  >
    <span className={`icon-chip shrink-0 ${chipClass}`}>
      <Icon size={18} strokeWidth={2.2} className={iconClass} />
    </span>
    <div className="flex-1 min-w-0">
      <div className="label-eyebrow">{label}</div>
      <p className="text-[13.5px] text-ink-muted font-medium mt-1 leading-relaxed">{text}</p>
    </div>
    <div className="shrink-0">{action}</div>
  </motion.div>
);


/* BalanceTab + TradesTab moved to ./tabs/BalanceTab.tsx and ./tabs/TradesTab.tsx */

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────────────────── */

const SubFrame: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => {
  const trShared = useT();
  return (
  <div className="space-y-4">
    <div>
      <span className="label-eyebrow">{trShared('profile.title', 'Profile')}</span>
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
};

/* GroupedTab — SubFrame plus a pill row of sub-tabs. Used for the four
   tabs that now host multiple related views (Inventory, Listings,
   Trades, Settings). Active sub is highlighted with a shared layoutId
   so the highlight pill slides between sub-tabs. */
const GroupedTab: React.FC<{
  title: string;
  subtitle?: string;
  subTabs: SubTab[];
  activeSub?: SubId;
  onSubChange: (sub: SubId) => void;
  children: React.ReactNode;
}> = ({ title, subtitle, subTabs, activeSub, onSubChange, children }) => {
  const trShared = useT();
  return (
  <div className="space-y-4">
    <div>
      <span className="label-eyebrow">{trShared('profile.title', 'Profile')}</span>
      <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight mt-1.5 leading-none">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[13px] sm:text-[14px] text-ink-muted font-medium mt-1.5">{subtitle}</p>
      )}
    </div>
    {subTabs.length > 1 && (
      <div className="card p-1 inline-flex gap-1 max-w-full overflow-x-auto scrollbar-hide">
        {subTabs.map((s) => {
          const active = s.id === activeSub;
          return (
            <motion.button
              whileTap={tap}
              key={s.id}
              onClick={() => onSubChange(s.id)}
              className={`relative h-9 px-3.5 rounded-full text-[12.5px] font-bold whitespace-nowrap transition-colors ${
                active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="profile-subtab-pill"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={spring}
                />
              )}
              <span className="relative">{s.label}</span>
            </motion.button>
          );
        })}
      </div>
    )}
    {children}
  </div>
  );
};

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

export default ProfilePage;
