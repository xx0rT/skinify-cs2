import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Star,
  ShoppingBag,
  Heart,
  MessageCircle,
  ExternalLink,
  Sparkles,
  Search,
  Copy,
  Check,
  TrendingUp,
  Package,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { useCurrencyStore } from '../store/currencyStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import { useOnlineStatusStore } from '../store/onlineStatusStore';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { SkinCard } from '../components/ui/SkinCard';
import { spring, tap } from '../lib/motion';

const UserReviews = lazy(() => import('../components/profile/UserReviews'));

/* ─────────────────────────────────────────────────────────────────────────
   UserProfilePage — public-facing trader profile

   - Hero card: avatar, display name, online dot, member-since, copy steamid,
     primary stats (Rating · Deals · Reply)
   - Tabbed: Listings · Reviews · About
   - Listings tab: search + sort + SkinCard grid
   - Theme tokens (card / accent / ink) — no legacy gray chrome
   ───────────────────────────────────────────────────────────────────────── */

interface UserListing {
  id: string;
  asset_id: string;
  item_name: string;
  market_hash_name: string;
  item_type: string;
  rarity: string;
  condition: string;
  price: number;
  image_url: string;
  float_value?: string;
  stickers?: string[];
  description?: string;
  views: number;
  created_at: string;
}

interface UserProfile {
  uuid: string;
  steamId: string;
  displayName: string;
  avatarUrl: string;
  memberSince: string;
  lastLogin: string;
  totalTrades: number;
  rating: number;
  totalReviews: number;
}

type TabId = 'listings' | 'reviews' | 'about';
type SortKey = 'newest' | 'price-asc' | 'price-desc';

const UserProfilePage: React.FC = () => {
  const { steamId } = useParams<{ steamId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { formatPrice } = useCurrencyStore();
  const { addToast } = useToastStore();
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { getUserStatus } = useOnlineStatusStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<UserListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>('listings');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [copied, setCopied] = useState(false);

  const isOwn = user?.steamId === steamId;
  const status = steamId ? getUserStatus(steamId) : 'offline';
  const isOnline = status === 'online';

  useEffect(() => {
    window.scrollTo(0, 0);
    if (steamId) {
      fetchProfile();
      fetchListings();
    }
  }, [steamId]);

  const fetchProfile = async () => {
    if (!steamId) return;
    setLoading(true);
    setError(null);
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('steam_id', steamId)
        .maybeSingle();
      if (userError) throw userError;
      if (!userData) throw new Error('User not found');

      const { data: statsData } = await supabase
        .from('user_stats')
        .select('average_rating, total_reviews')
        .eq('user_id', userData.id)
        .maybeSingle();

      const { count: tradesCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .or(`buyer_steam_id.eq.${steamId},seller_steam_id.eq.${steamId}`);

      setProfile({
        uuid: userData.id,
        steamId: userData.steam_id,
        displayName: userData.display_name || `Trader_${userData.steam_id.slice(-6)}`,
        avatarUrl:
          userData.avatar_url ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${userData.steam_id}`,
        memberSince: userData.created_at || new Date().toISOString(),
        lastLogin: userData.last_login || new Date().toISOString(),
        totalTrades: tradesCount || 0,
        rating: Number(statsData?.average_rating || 0),
        totalReviews: Number(statsData?.total_reviews || 0),
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchListings = async () => {
    if (!steamId) return;
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(
        `${supabaseUrl}/functions/v1/marketplace-listings?steamId=${steamId}&userOnly=true`,
        {
          headers: { Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        },
      );
      if (!res.ok) throw new Error('Failed to fetch listings');
      const data = await res.json();
      const mapped: UserListing[] = (data.items || []).map((it: any) => ({
        id: it.id,
        asset_id: it.asset_id,
        item_name: it.name || it.item_name,
        market_hash_name: it.market_name || it.market_hash_name,
        item_type: it.type || it.item_type || 'Unknown',
        rarity: it.rarity || 'Consumer Grade',
        condition: it.condition || 'Factory New',
        price: Number(it.price || 0),
        image_url: it.image || it.image_url || '',
        float_value: it.float,
        stickers: it.stickers,
        description: it.description,
        views: Number(it.views || 0),
        created_at: it.listed_at || it.created_at || new Date().toISOString(),
      }));
      setListings(mapped);
    } catch {
      setListings([]);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = listings.filter((l) => !q || l.item_name.toLowerCase().includes(q));
    if (sort === 'newest')
      arr = [...arr].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sort === 'price-asc') arr = [...arr].sort((a, b) => a.price - b.price);
    if (sort === 'price-desc') arr = [...arr].sort((a, b) => b.price - a.price);
    return arr;
  }, [listings, query, sort]);

  const totals = useMemo(() => {
    const totalValue = listings.reduce((s, l) => s + l.price, 0);
    const totalViews = listings.reduce((s, l) => s + l.views, 0);
    return {
      count: listings.length,
      totalValue,
      totalViews,
    };
  }, [listings]);

  const handleAddCart = (l: UserListing) => {
    addItem({
      id: l.id,
      name: l.item_name,
      market_name: l.market_hash_name,
      type: l.item_type,
      condition: l.condition,
      price: l.price,
      image: l.image_url,
      rarity: l.rarity,
      seller: { steamId: steamId!, name: profile?.displayName || 'Unknown' },
    } as any);
    addToast({ type: 'success', title: 'Added to cart', message: l.item_name });
  };

  const handleWish = (l: UserListing) => {
    if (!user) {
      addToast({ type: 'warning', title: 'Sign in', message: 'Sign in to use wishlist.' });
      return;
    }
    toggleItem(
      {
        id: l.id,
        name: l.item_name,
        price: l.price,
        image: l.image_url,
        condition: l.condition,
        rarity: l.rarity,
        type: l.item_type,
        seller: { steamId: steamId!, name: profile?.displayName || 'Unknown' },
      } as any,
      user.steamId,
    );
  };

  const copySteamId = () => {
    if (!steamId) return;
    navigator.clipboard.writeText(steamId);
    setCopied(true);
    addToast({ type: 'success', title: 'Steam ID copied' });
    setTimeout(() => setCopied(false), 1600);
  };

  const memberSinceLabel = useMemo(() => {
    if (!profile?.memberSince) return '—';
    const d = new Date(profile.memberSince);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  }, [profile?.memberSince]);

  /* ─── Loading / error ─── */
  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-4 pb-16 space-y-4">
          <div className="skel h-9 w-32" />
          <div className="skel h-44" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skel" style={{ aspectRatio: '5 / 6.4' }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-4 pb-16">
          <div className="card p-12 text-center mt-12 max-w-xl mx-auto">
            <Package size={26} className="mx-auto text-ink-muted mb-3" />
            <p className="text-[15px] font-bold text-ink">{error || 'User not found'}</p>
            <p className="text-[13px] text-ink-muted font-medium mt-1.5">
              The trader you're looking for doesn't exist on Skinify.
            </p>
            <motion.button
              whileTap={tap}
              onClick={() => navigate('/marketplace')}
              className="mt-5 h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px]"
            >
              Back to marketplace
            </motion.button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-4 pb-16 space-y-4">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted overflow-x-auto scrollbar-hide"
          aria-label="Breadcrumb"
        >
          <button onClick={() => navigate('/marketplace')} className="hover:text-ink transition-colors whitespace-nowrap">
            Market
          </button>
          <ChevronRight size={12} strokeWidth={2.4} className="text-ink-dim shrink-0" />
          <span className="text-ink font-bold whitespace-nowrap">Sellers</span>
          <ChevronRight size={12} strokeWidth={2.4} className="text-ink-dim shrink-0" />
          <span className="text-ink font-bold whitespace-nowrap">{profile.displayName}</span>
        </motion.nav>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="card p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative w-24 h-24 rounded-3xl bg-subtle grid place-items-center overflow-hidden shrink-0">
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.steamId}`;
                }}
              />
              <span
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ring-2 ring-surface ${
                  isOnline ? 'bg-emerald-500' : 'bg-ink-dim'
                }`}
                title={isOnline ? 'Online' : 'Offline'}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight leading-none truncate">
                  {profile.displayName}
                </h1>
                <span className="pill bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">Verified</span>
                {isOwn && <span className="pill bg-accent-soft text-accent">You</span>}
              </div>

              <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[12.5px] text-ink-muted font-medium">
                <span>Member since {memberSinceLabel}</span>
                <span>·</span>
                <button
                  onClick={copySteamId}
                  className="inline-flex items-center gap-1 hover:text-ink transition-colors"
                >
                  <span className="font-mono">{profile.steamId}</span>
                  {copied ? (
                    <Check size={11} strokeWidth={2.4} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Copy size={11} strokeWidth={2.4} />
                  )}
                </button>
              </div>

              {/* Action row */}
              <div className="mt-4 flex flex-wrap gap-2">
                {!isOwn && (
                  <>
                    <motion.button
                      whileTap={tap}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        if (!user) {
                          addToast({ type: 'warning', title: 'Sign in', message: 'Sign in to chat.' });
                          return;
                        }
                        addToast({ type: 'info', title: 'Chat', message: `Opening chat with ${profile.displayName}` });
                      }}
                      className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5"
                      style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
                    >
                      <MessageCircle size={13} strokeWidth={2.4} />
                      Message
                    </motion.button>
                  </>
                )}
                <motion.a
                  whileTap={tap}
                  href={`https://steamcommunity.com/profiles/${profile.steamId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-10 px-4 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink size={13} strokeWidth={2.2} />
                  Steam profile
                </motion.a>
              </div>
            </div>

            {/* Quick stats — right rail on desktop, inline grid on mobile */}
            <div className="grid grid-cols-3 gap-2 sm:min-w-[280px] shrink-0">
              <StatTile
                label="Rating"
                value={profile.rating > 0 ? profile.rating.toFixed(1) : '—'}
                icon={<Star size={11} strokeWidth={2.4} className="fill-amber-400 text-amber-400" />}
              />
              <StatTile label="Trades" value={profile.totalTrades.toLocaleString()} />
              <StatTile label="Listings" value={String(totals.count)} />
            </div>
          </div>
        </motion.section>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.05 }}
          className="flex items-center gap-1 p-1 card max-w-fit"
        >
          {([
            { id: 'listings' as TabId, label: `Listings · ${totals.count}` },
            { id: 'reviews' as TabId,  label: `Reviews · ${profile.totalReviews}` },
            { id: 'about' as TabId,    label: 'About' },
          ]).map((t) => {
            const active = tab === t.id;
            return (
              <motion.button
                whileTap={tap}
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative h-9 px-3.5 rounded-full text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
                  active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="user-tab-pill"
                    className="absolute inset-0 rounded-full bg-accent"
                    transition={spring}
                  />
                )}
                <span className="relative">{t.label}</span>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ ...spring, mass: 0.6 }}
          >
            {tab === 'listings' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex-1 min-w-[200px] flex items-center gap-2 h-11 px-4 rounded-full bg-subtle">
                    <Search size={14} strokeWidth={2} className="text-ink-muted shrink-0" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search this seller's items…"
                      className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[13.5px] font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-1 p-1 rounded-full bg-subtle">
                    {([
                      { k: 'newest' as SortKey,     l: 'New' },
                      { k: 'price-asc' as SortKey,  l: 'Price ↑' },
                      { k: 'price-desc' as SortKey, l: 'Price ↓' },
                    ]).map((o) => {
                      const active = sort === o.k;
                      return (
                        <motion.button
                          whileTap={tap}
                          key={o.k}
                          onClick={() => setSort(o.k)}
                          className={`relative h-8 px-3 rounded-full text-[12px] font-semibold transition-colors ${
                            active ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="user-sort-pill"
                              className="absolute inset-0 rounded-full bg-accent"
                              transition={spring}
                            />
                          )}
                          <span className="relative">{o.l}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="card p-12 text-center">
                    <ShoppingBag size={26} className="mx-auto text-ink-muted mb-3" />
                    <p className="text-[15px] font-bold text-ink">
                      {listings.length === 0 ? 'No listings yet' : 'No matches'}
                    </p>
                    <p className="text-[13px] text-ink-muted font-medium mt-1.5">
                      {listings.length === 0
                        ? `${profile.displayName} hasn't listed any items.`
                        : 'Try a different search.'}
                    </p>
                  </div>
                ) : (
                  <motion.div
                    layout
                    initial="hidden"
                    animate="shown"
                    variants={{
                      hidden: {},
                      shown: { transition: { staggerChildren: 0.03 } },
                    }}
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0 isolate"
                  >
                    <AnimatePresence mode="popLayout">
                      {filtered.map((l) => (
                        <motion.div
                          key={l.id}
                          layout
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            shown: { opacity: 1, y: 0, transition: spring },
                          }}
                          exit={{ opacity: 0, scale: 0.96 }}
                          transition={spring}
                        >
                          <SkinCard
                            variant="tile"
                            item={{
                              id: l.id,
                              name: l.item_name,
                              market_name: l.market_hash_name,
                              type: l.item_type,
                              rarity: l.rarity,
                              condition: l.condition,
                              price: l.price,
                              image: l.image_url,
                              float: l.float_value,
                              stickers: l.stickers,
                              views: l.views,
                            }}
                            onView={() => navigate(`/item/${l.id}`)}
                            onAddCart={() => handleAddCart(l)}
                            onToggleWish={() => handleWish(l)}
                            wished={isInWishlist(l.id)}
                            formatPrice={formatPrice}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            )}

            {tab === 'reviews' && (
              <Suspense
                fallback={
                  <div className="card p-12 text-center">
                    <div className="text-[13.5px] text-ink-muted font-medium">Loading reviews…</div>
                  </div>
                }
              >
                <UserReviews userId={profile.steamId} steamId={profile.steamId} />
              </Suspense>
            )}

            {tab === 'about' && (
              <div className="card p-6 sm:p-8 space-y-5">
                <div>
                  <span className="label-eyebrow">About</span>
                  <h2 className="text-[18px] sm:text-[20px] font-bold tracking-tight mt-1.5 leading-none">
                    {profile.displayName}
                  </h2>
                  <p className="text-[13.5px] text-ink-muted font-medium mt-3 leading-relaxed max-w-[640px]">
                    {isOwn
                      ? 'This is what other traders see when they visit your profile. Listings, reviews, and your reputation come together here.'
                      : `${profile.displayName} has been trading on Skinify since ${memberSinceLabel} and completed ${profile.totalTrades.toLocaleString()} successful trades.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Detail label="Steam ID" value={profile.steamId} mono />
                  <Detail label="Member since" value={memberSinceLabel} />
                  <Detail label="Listings value" value={formatPrice(totals.totalValue)} />
                  <Detail label="Total views" value={totals.totalViews.toLocaleString()} />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Back button at the bottom for quick return */}
        <motion.button
          whileTap={tap}
          whileHover={{ x: -2 }}
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink text-[13px] font-semibold transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={2.4} />
          Back
        </motion.button>
      </main>

      <Footer />
    </div>
  );
};

const StatTile: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({
  label,
  value,
  icon,
}) => (
  <div className="card-flat p-3 text-center">
    <div className="label-meta">{label}</div>
    <div className="mt-1 inline-flex items-center gap-1 text-[14px] font-bold text-ink tracking-tight tabular-nums">
      {icon}
      {value}
    </div>
  </div>
);

const Detail: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="card-flat p-3">
    <div className="label-meta">{label}</div>
    <div
      className={`text-[13.5px] font-bold text-ink mt-1 truncate tracking-tight ${
        mono ? 'font-mono' : ''
      }`}
    >
      {value}
    </div>
  </div>
);

export default UserProfilePage;
