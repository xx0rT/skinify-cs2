import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Copy,
  ExternalLink,
  Eye,
  Edit3,
  TrendingUp,
  ShoppingBag,
  Check,
  Plus,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import { useCurrencyStore } from '../../../store/currencyStore';
import { spring, tap } from '../../../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   MyShopTab
   - If no shop exists yet → empty-state CTA "Create your shop"
   - If shop exists → 4 KPIs (views, sales, revenue, listing count)
                     + public-URL row with copy
                     + edit / preview / view-public CTAs
   ───────────────────────────────────────────────────────────────────────── */

interface Shop {
  id: string;
  shop_name: string;
  shop_url: string;
  description: string | null;
  total_views: number;
  total_sales: number;
  total_revenue: number;
  is_active: boolean;
}

const MyShopTab: React.FC<{ onNavigateToListings: () => void }> = ({
  onNavigateToListings,
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();
  const [shop, setShop] = useState<Shop | null>(null);
  const [listingCount, setListingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.steamId) return;
      setLoading(true);
      try {
        const { data: u } = await supabase
          .from('users')
          .select('id')
          .eq('steam_id', user.steamId)
          .maybeSingle();
        if (!u) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: shopRow } = await supabase
          .from('user_shops')
          .select('id, shop_name, shop_url, description, total_views, total_sales, total_revenue, is_active')
          .eq('user_id', u.id)
          .maybeSingle();

        if (cancelled) return;
        setShop(shopRow as Shop | null);

        if (shopRow) {
          const { count } = await supabase
            .from('marketplace_listings')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', u.id)
            .eq('is_active', true);
          if (!cancelled) setListingCount(count || 0);
        }
      } catch (err) {
        console.error('[my-shop] load failed', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.steamId]);

  const publicUrl = shop ? `${window.location.origin}/shop/${shop.shop_url}` : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      addToast({ type: 'success', title: 'Link copied' });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      addToast({ type: 'error', title: 'Copy failed' });
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      addToast({ type: 'warning', title: 'Enter a shop name' });
      return;
    }
    if (!user?.steamId) return;
    setCreating(true);
    try {
      const { data: u } = await supabase
        .from('users')
        .select('id')
        .eq('steam_id', user.steamId)
        .maybeSingle();
      if (!u) throw new Error('User row missing');

      // Slug from name — strip non-alphanum and lowercase
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-+|-+$)/g, '')
        .slice(0, 40) || `shop-${Date.now().toString(36)}`;

      const { data: created, error } = await supabase
        .from('user_shops')
        .insert({
          user_id: u.id,
          shop_name: name.trim(),
          shop_url: slug,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
      setShop(created as Shop);
      addToast({ type: 'success', title: 'Shop created', message: `Visit ${window.location.origin}/shop/${slug}` });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Could not create shop',
        message: err?.message || 'Try again',
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skel h-44" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skel h-28" />
          ))}
        </div>
      </div>
    );
  }

  // No shop yet → empty-state
  if (!shop) {
    return (
      <div className="card p-8 sm:p-12 text-center relative overflow-hidden max-w-[640px] mx-auto">
        <motion.div
          aria-hidden
          className="absolute -top-32 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(closest-side, rgb(var(--accent) / 0.18), transparent 65%)',
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative">
          <div className="icon-chip-lg bg-accent-soft mx-auto mb-5">
            <Store size={22} strokeWidth={2.2} className="text-accent" />
          </div>
          <span className="label-eyebrow">Storefront</span>
          <h2 className="text-[22px] sm:text-[26px] font-bold tracking-tight mt-2 leading-none">
            Open your shop
          </h2>
          <p className="text-[13.5px] text-ink-muted font-medium mt-3 max-w-md mx-auto">
            Get a public storefront URL where buyers can browse all your listings in one place.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Shop name"
              className="flex-1 h-12 px-4 rounded-2xl bg-subtle text-ink placeholder:text-ink-dim text-[14px] font-medium outline-none focus:bg-bg focus:ring-2 focus:ring-accent/30 transition-all"
            />
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.02 }}
              onClick={handleCreate}
              disabled={creating}
              className="h-12 px-6 rounded-full bg-accent text-on-accent font-bold text-[14px] flex items-center justify-center gap-1.5 disabled:opacity-60"
              style={{ boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.6)' }}
            >
              <Plus size={15} strokeWidth={2.6} />
              {creating ? 'Creating…' : 'Create shop'}
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // Shop exists → dashboard view
  return (
    <div className="space-y-4">
      {/* Hero: shop card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="card p-6 relative overflow-hidden"
      >
        <motion.div
          aria-hidden
          className="absolute -top-32 -right-24 w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(closest-side, rgb(var(--accent) / 0.14), transparent 65%)',
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="icon-chip-lg bg-accent text-on-accent shrink-0">
            <Store size={22} strokeWidth={2.4} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="label-eyebrow">Your shop</span>
            <h2 className="text-[22px] font-bold tracking-tight text-ink mt-1.5 leading-none truncate">
              {shop.shop_name}
            </h2>
            <p className="text-[12.5px] text-ink-muted font-medium mt-1.5">
              {shop.is_active ? (
                <span className="pill bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Live
                </span>
              ) : (
                <span className="pill bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  Paused
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.02 }}
              onClick={() => window.open(publicUrl, '_blank')}
              className="h-11 px-4 rounded-full bg-accent text-on-accent font-bold text-[13px] flex items-center gap-1.5"
              style={{ boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.6)' }}
            >
              <Eye size={14} strokeWidth={2.4} />
              View public
            </motion.button>
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate(`/shop/${shop.shop_url}?edit=1`)}
              className="h-11 px-4 rounded-full bg-accent text-on-accent font-bold text-[13px] flex items-center gap-1.5 transition-opacity hover:opacity-95"
            >
              <Edit3 size={14} strokeWidth={2.4} />
              Edit shop
            </motion.button>
          </div>
        </div>

        {/* Public URL row */}
        <div className="relative mt-5 card-flat p-3 flex items-center gap-3">
          <div className="icon-chip-sm bg-accent-soft">
            <ExternalLink size={13} strokeWidth={2.4} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
              Public URL
            </div>
            <div className="text-[12.5px] font-mono text-ink truncate select-text">
              {publicUrl}
            </div>
          </div>
          <motion.button
            whileTap={tap}
            onClick={handleCopy}
            className="h-9 px-3 rounded-full bg-accent text-on-accent text-[12px] font-bold flex items-center gap-1.5"
          >
            {copied ? <Check size={13} strokeWidth={2.4} /> : <Copy size={13} strokeWidth={2.4} />}
            {copied ? 'Copied' : 'Copy'}
          </motion.button>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Views"     value={(shop.total_views || 0).toLocaleString()}                    Icon={Eye} />
        <KpiCard label="Sales"     value={(shop.total_sales || 0).toLocaleString()}                    Icon={ShoppingBag} />
        <KpiCard label="Revenue"   value={formatPrice(Number(shop.total_revenue || 0))}                Icon={TrendingUp} />
        <KpiCard label="Listings"  value={listingCount.toLocaleString()}                                Icon={Store}
                 sub={listingCount === 0 ? 'Add some to your shop' : undefined} />
      </div>

      {/* Quick actions */}
      <div className="card p-5 md:p-6">
        <span className="label-eyebrow">Quick actions</span>
        <h3 className="text-[17px] font-bold tracking-tight text-ink mt-1.5 leading-none">
          Manage your shop
        </h3>
        <div className="mt-4 space-y-2">
          <ActionRow
            Icon={ShoppingBag}
            title="Manage listings"
            sub="Add, edit, or remove items from your shop"
            onClick={onNavigateToListings}
          />
          <ActionRow
            Icon={Eye}
            title="Preview shop"
            sub="See what buyers see when they visit your shop"
            onClick={() => window.open(publicUrl, '_blank')}
          />
        </div>
      </div>
    </div>
  );
};

const KpiCard: React.FC<{
  label: string;
  value: string;
  Icon: React.ComponentType<any>;
  sub?: string;
}> = ({ label, value, Icon, sub }) => (
  <motion.div whileHover={{ y: -2 }} transition={spring} className="card p-4">
    <div className="flex items-start justify-between mb-3">
      <span className="label-meta">{label}</span>
      <div className="icon-chip-sm bg-accent-soft">
        <Icon size={14} strokeWidth={2.2} className="text-accent" />
      </div>
    </div>
    <div className="text-[22px] font-bold tracking-tight tabular-nums text-ink leading-none">
      {value}
    </div>
    {sub && <div className="text-[11.5px] text-ink-dim font-medium mt-1.5">{sub}</div>}
  </motion.div>
);

const ActionRow: React.FC<{
  Icon: React.ComponentType<any>;
  title: string;
  sub: string;
  onClick: () => void;
}> = ({ Icon, title, sub, onClick }) => (
  <motion.button
    whileTap={tap}
    onClick={onClick}
    className="w-full text-left p-3 rounded-2xl hover:bg-subtle flex items-center gap-3 transition-colors"
  >
    <div className="icon-chip bg-accent-soft">
      <Icon size={16} strokeWidth={2.2} className="text-accent" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-[14px] font-bold text-ink truncate tracking-tight">{title}</div>
      <div className="text-[12px] text-ink-muted font-medium mt-0.5 truncate">{sub}</div>
    </div>
  </motion.button>
);

export default MyShopTab;
