import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Edit3,
  TrendingUp,
  ShoppingBag,
  Check,
  Plus,
  Image as ImageIcon,
  Globe,
  Layers,
  Star,
  MessageSquareText,
  Info,
  Save,
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
  layout?: ShopLayout | null;
  custom_domain?: string | null;
}

/* Shape of the layout JSON stored on user_shops.layout. Older shops
   created before this column existed will have `null` here — the
   editor seeds the default shape lazily on first save. */
export interface ShopLayout {
  banner_url?: string;
  accent?: string;
  tagline?: string;
  card_style?: 'tile' | 'list' | 'compact';
  sections?: ShopSection[];
}

export interface ShopSection {
  id: 'hero' | 'featured' | 'listings' | 'reviews' | 'about';
  visible: boolean;
  settings?: Record<string, any>;
}

const DEFAULT_SECTIONS: ShopSection[] = [
  { id: 'hero',     visible: true },
  { id: 'featured', visible: true },
  { id: 'listings', visible: true },
  { id: 'reviews',  visible: false },
  { id: 'about',    visible: false, settings: { body: '' } },
];

const SECTION_LABELS: Record<ShopSection['id'], { label: string; sub: string }> = {
  hero:     { label: 'Hero banner',     sub: 'Banner image + tagline at the top' },
  featured: { label: 'Featured items',  sub: 'Hand-picked listings carousel' },
  listings: { label: 'All listings',    sub: 'Full marketplace grid for your shop' },
  reviews:  { label: 'Reviews',         sub: 'Feedback from buyers' },
  about:    { label: 'About me',        sub: 'Free-form text block (markdown)' },
};

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
          .select('id, shop_name, shop_url, description, total_views, total_sales, total_revenue, is_active, layout, custom_domain')
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

      {/* Layout editor — banner, accent, sections, card style. Save
          writes to user_shops.layout (JSONB). */}
      <ShopLayoutEditor
        shopId={shop.id}
        initialLayout={shop.layout || null}
        onSaved={(layout) => setShop({ ...shop, layout })}
      />

      {/* Custom domain manager — placeholder for now. UI shows the
          current value + a help link explaining the DNS step. Wiring
          the actual provisioning (Vercel domain API) is a follow-up. */}
      <CustomDomainCard
        shopId={shop.id}
        initialDomain={shop.custom_domain || null}
        shopUrl={shop.shop_url}
        onSaved={(domain) => setShop({ ...shop, custom_domain: domain })}
      />
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

/* ─────────────────────────────────────────────────────────────────────────
   ShopLayoutEditor — sectioned editor.

   Lets a shop owner:
     - Upload (paste URL of) a banner image
     - Pick an accent color
     - Write a tagline shown under shop name
     - Toggle sections on/off (hero / featured / listings / reviews /
       about) and reorder them
     - Edit the About section's body text inline
     - Pick a card-style preset for their listings (tile / list / compact)

   The state lives in a single ShopLayout object that we save as a
   JSONB blob to user_shops.layout. The public shop page reads the
   same object to render. Older shops with no layout saved get the
   DEFAULT_SECTIONS shape on first edit.

   Reorder is buttons-based (up/down arrows) rather than drag-and-drop
   to keep the implementation small. Adding react-beautiful-dnd or
   dnd-kit later is a drop-in replacement of the section list.
   ───────────────────────────────────────────────────────────────────────── */
const ShopLayoutEditor: React.FC<{
  shopId: string;
  initialLayout: ShopLayout | null;
  onSaved: (layout: ShopLayout) => void;
}> = ({ shopId, initialLayout, onSaved }) => {
  const { addToast } = useToastStore();
  /* Seed local state from the saved layout, padded with any sections
     that aren't in the saved blob (e.g. shops that saved before we
     added a new section). We dedupe by id and append defaults missing
     from the saved order so the editor stays forward-compatible. */
  const seedSections = (): ShopSection[] => {
    const saved = initialLayout?.sections || [];
    const out: ShopSection[] = saved.map((s) => ({ ...s }));
    DEFAULT_SECTIONS.forEach((d) => {
      if (!out.find((s) => s.id === d.id)) out.push({ ...d });
    });
    return out;
  };
  const [bannerUrl, setBannerUrl] = useState(initialLayout?.banner_url || '');
  const [accent, setAccent] = useState(initialLayout?.accent || '#7c3aed');
  const [tagline, setTagline] = useState(initialLayout?.tagline || '');
  const [cardStyle, setCardStyle] = useState<NonNullable<ShopLayout['card_style']>>(
    initialLayout?.card_style || 'tile',
  );
  const [sections, setSections] = useState<ShopSection[]>(seedSections);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  /* Flip the dirty flag on any local mutation so the Save CTA can
     visually wake up. Cheap recomputation on render. */
  useEffect(() => {
    setDirty(true);
  }, [bannerUrl, accent, tagline, cardStyle, sections]);
  /* Reset dirty after the initial mount (above effect fires on first
     paint). */
  useEffect(() => {
    setDirty(false);
  }, []);

  const toggleSection = (id: ShopSection['id']) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
    );
  };

  const moveSection = (id: ShopSection['id'], dir: -1 | 1) => {
    setSections((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const setAboutBody = (body: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === 'about' ? { ...s, settings: { ...(s.settings || {}), body } } : s,
      ),
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const layout: ShopLayout = {
        banner_url: bannerUrl.trim() || undefined,
        accent,
        tagline: tagline.trim() || undefined,
        card_style: cardStyle,
        sections,
      };
      const { error } = await supabase
        .from('user_shops')
        .update({ layout, updated_at: new Date().toISOString() })
        .eq('id', shopId);
      if (error) throw error;
      onSaved(layout);
      setDirty(false);
      addToast({
        type: 'success',
        title: 'Layout saved',
        message: 'Your changes are live on the public shop page.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Could not save',
        message: err?.message || 'Try again',
      });
    } finally {
      setSaving(false);
    }
  };

  const aboutBody = sections.find((s) => s.id === 'about')?.settings?.body || '';

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="card p-5 md:p-6 space-y-5"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className="label-eyebrow">Customize</span>
          <h3 className="text-[17px] font-bold tracking-tight text-ink mt-1.5 leading-none">
            Shop layout & branding
          </h3>
          <p className="text-[12.5px] text-ink-muted font-medium mt-1.5">
            Banner, accent color, sections — everything buyers see on your public page.
          </p>
        </div>
        <motion.button
          whileTap={tap}
          whileHover={!saving && dirty ? { scale: 1.02 } : undefined}
          onClick={save}
          disabled={saving || !dirty}
          className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          style={dirty ? { boxShadow: '0 8px 20px -10px rgb(var(--accent) / 0.6)' } : undefined}
        >
          <Save size={13} strokeWidth={2.4} />
          {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </motion.button>
      </div>

      {/* Banner + accent + tagline */}
      <div className="grid md:grid-cols-2 gap-4">
        <FieldGroup
          label="Banner image URL"
          hint="Paste a direct image URL (PNG/JPG). Recommended size 1600×400."
        >
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-subtle grid place-items-center shrink-0 overflow-hidden">
              {bannerUrl ? (
                <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={14} strokeWidth={2.4} className="text-ink-muted" />
              )}
            </div>
            <input
              value={bannerUrl}
              onChange={(e) => setBannerUrl(e.target.value)}
              placeholder="https://i.imgur.com/your-banner.jpg"
              className="flex-1 h-10 px-3.5 rounded-full bg-subtle outline-none text-ink text-[13px] font-medium placeholder:text-ink-dim focus:ring-2 focus:ring-accent transition-shadow"
            />
          </div>
          {bannerUrl && (
            <div className="mt-2 aspect-[4/1] rounded-2xl bg-subtle overflow-hidden">
              {/* Live preview so the seller can sanity-check before saving */}
              <img
                src={bannerUrl}
                alt="Banner preview"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </FieldGroup>

        <FieldGroup
          label="Accent color"
          hint="Used for buttons, badges, and the active state on your public page."
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="w-10 h-10 rounded-2xl bg-subtle border-0 cursor-pointer shrink-0"
            />
            <input
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              placeholder="#7c3aed"
              className="flex-1 h-10 px-3.5 rounded-full bg-subtle outline-none text-ink font-mono text-[13px] uppercase focus:ring-2 focus:ring-accent transition-shadow"
              maxLength={7}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAccent(c)}
                className="w-7 h-7 rounded-full ring-2 ring-transparent hover:ring-ink-muted transition-shadow"
                style={{
                  background: c,
                  boxShadow: accent === c ? '0 0 0 2px rgb(var(--ink) / 0.45)' : undefined,
                }}
                aria-label={`Use ${c}`}
              />
            ))}
          </div>
        </FieldGroup>
      </div>

      <FieldGroup label="Tagline" hint="A one-liner shown under your shop name.">
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Boutique CS2 skins · low floats · fair prices"
          maxLength={80}
          className="w-full h-11 px-4 rounded-full bg-subtle outline-none text-ink text-[13.5px] font-medium placeholder:text-ink-dim focus:ring-2 focus:ring-accent transition-shadow"
        />
        <div className="text-[10.5px] text-ink-dim font-bold tabular-nums mt-1 text-right">
          {tagline.length}/80
        </div>
      </FieldGroup>

      {/* Card style picker */}
      <FieldGroup
        label="Card style"
        hint="How the listings grid is laid out on your public shop."
      >
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'tile',    label: 'Tile',    sub: 'Large image cards' },
              { id: 'compact', label: 'Compact', sub: 'Dense grid' },
              { id: 'list',    label: 'List',    sub: 'Horizontal rows' },
            ] as const
          ).map((c) => {
            const active = cardStyle === c.id;
            return (
              <motion.button
                whileTap={tap}
                key={c.id}
                onClick={() => setCardStyle(c.id)}
                className={`text-left p-3 rounded-2xl border-2 transition-colors ${
                  active
                    ? 'border-accent bg-accent-soft'
                    : 'border-line bg-subtle hover:bg-bg'
                }`}
              >
                <div className="text-[13px] font-bold text-ink tracking-tight">{c.label}</div>
                <div className="text-[11px] text-ink-muted font-medium mt-0.5">{c.sub}</div>
              </motion.button>
            );
          })}
        </div>
      </FieldGroup>

      {/* Sections — toggle + reorder */}
      <FieldGroup
        label="Page sections"
        hint="Toggle off any section you don't want shown. Reorder with the arrows."
      >
        <div className="space-y-1.5">
          {sections.map((s, i) => {
            const meta = SECTION_LABELS[s.id];
            const Icon = SECTION_ICONS[s.id];
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-2.5 rounded-2xl transition-colors ${
                  s.visible ? 'bg-subtle' : 'bg-subtle/50 opacity-70'
                }`}
              >
                <div className="icon-chip-sm bg-accent-soft shrink-0">
                  <Icon size={13} strokeWidth={2.4} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-bold text-ink truncate">{meta.label}</div>
                  <div className="text-[11px] text-ink-muted font-medium truncate">{meta.sub}</div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => moveSection(s.id, -1)}
                    disabled={i === 0}
                    className="h-7 w-7 rounded-full bg-bg hover:bg-bg/70 grid place-items-center text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveSection(s.id, 1)}
                    disabled={i === sections.length - 1}
                    className="h-7 w-7 rounded-full bg-bg hover:bg-bg/70 grid place-items-center text-ink-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => toggleSection(s.id)}
                    className={`h-7 w-7 rounded-full grid place-items-center transition-colors ${
                      s.visible
                        ? 'bg-accent text-on-accent'
                        : 'bg-bg text-ink-muted hover:text-ink'
                    }`}
                    aria-label={s.visible ? 'Hide section' : 'Show section'}
                    title={s.visible ? 'Hide' : 'Show'}
                  >
                    {s.visible ? <Eye size={12} strokeWidth={2.6} /> : <EyeOff size={12} strokeWidth={2.4} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* About-section body editor — only visible when About is enabled */}
        {sections.find((s) => s.id === 'about')?.visible && (
          <div className="mt-3 rounded-2xl bg-subtle p-3">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim mb-2">
              About body
            </div>
            <textarea
              value={aboutBody}
              onChange={(e) => setAboutBody(e.target.value)}
              placeholder="Tell buyers about your shop, trading hours, dispute policy…"
              rows={4}
              maxLength={800}
              className="w-full bg-bg rounded-2xl p-3 outline-none text-ink text-[13px] font-medium placeholder:text-ink-dim focus:ring-2 focus:ring-accent resize-y transition-shadow"
            />
            <div className="text-[10.5px] text-ink-dim font-bold tabular-nums mt-1 text-right">
              {aboutBody.length}/800
            </div>
          </div>
        )}
      </FieldGroup>
    </motion.section>
  );
};

const SECTION_ICONS: Record<ShopSection['id'], React.ComponentType<any>> = {
  hero:     ImageIcon,
  featured: Star,
  listings: Layers,
  reviews:  MessageSquareText,
  about:    Info,
};

const FieldGroup: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div>
    <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim mb-1.5">
      {label}
    </div>
    {children}
    {hint && (
      <div className="text-[11px] text-ink-dim font-medium mt-1.5 leading-relaxed">{hint}</div>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   CustomDomainCard — placeholder for the custom-domain feature.

   For now this only persists the value to user_shops.custom_domain
   and shows a status line telling the user what DNS record they need
   to add. Actually provisioning the domain (calling the Vercel /
   Netlify domain API to attach it + auto-issue an SSL cert) needs to
   be wired up in a backend edge function — that's the follow-up turn.

   Why the placeholder ships now: the DB column exists, the UI shape is
   stable, and saving the value is harmless. When the backend lands
   later, the only thing that changes is the verification status line.
   ───────────────────────────────────────────────────────────────────────── */
const CustomDomainCard: React.FC<{
  shopId: string;
  initialDomain: string | null;
  shopUrl: string;
  onSaved: (domain: string | null) => void;
}> = ({ shopId, initialDomain, shopUrl, onSaved }) => {
  const { addToast } = useToastStore();
  const [domain, setDomain] = useState(initialDomain || '');
  const [saving, setSaving] = useState(false);

  const isValid = (d: string) =>
    /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(d.trim());

  const save = async () => {
    const trimmed = domain.trim().toLowerCase();
    if (trimmed && !isValid(trimmed)) {
      addToast({
        type: 'error',
        title: 'Invalid domain',
        message: 'Enter a bare domain like myshop.com (no https://, no path).',
      });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_shops')
        .update({
          custom_domain: trimmed || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', shopId);
      if (error) throw error;
      onSaved(trimmed || null);
      addToast({
        type: 'success',
        title: trimmed ? 'Domain saved' : 'Domain removed',
        message: trimmed
          ? `Next: add a CNAME at your registrar pointing ${trimmed} to cname.skinify.gg`
          : 'You can re-add a custom domain anytime.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Could not save',
        message: err?.message || 'Try again',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="card p-5 md:p-6 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="icon-chip bg-accent-soft">
          <Globe size={16} strokeWidth={2.4} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="label-eyebrow">Custom domain</span>
          <h3 className="text-[16px] font-bold tracking-tight text-ink mt-1 leading-none">
            Use your own domain
          </h3>
        </div>
      </div>

      <p className="text-[12.5px] text-ink-muted font-medium leading-relaxed">
        Point a domain you already own at your Skinify shop. Your shop will be
        reachable at <span className="font-mono text-ink">https://yourdomain.com</span> instead
        of <span className="font-mono">skinify.gg/shop/{shopUrl}</span>.
      </p>

      <div className="flex items-center gap-2">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="myshop.com"
          className="flex-1 h-11 px-4 rounded-full bg-subtle outline-none text-ink text-[13.5px] font-medium placeholder:text-ink-dim focus:ring-2 focus:ring-accent transition-shadow"
        />
        <motion.button
          whileTap={tap}
          onClick={save}
          disabled={saving}
          className="h-11 px-5 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Saving…' : 'Save'}
        </motion.button>
      </div>

      {domain.trim() && isValid(domain.trim()) && (
        <div className="card-flat p-4 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
            DNS setup (one-time)
          </div>
          <ol className="space-y-2.5 text-[12.5px] text-ink font-medium">
            <li className="flex items-start gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-accent-soft text-accent text-[10px] font-bold grid place-items-center tabular-nums mt-0.5">
                1
              </span>
              <span>
                Sign in to your domain registrar (GoDaddy, Namecheap, Cloudflare,
                etc.) and open DNS settings for <span className="font-mono">{domain.trim()}</span>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-accent-soft text-accent text-[10px] font-bold grid place-items-center tabular-nums mt-0.5">
                2
              </span>
              <span>
                Add a <span className="font-mono font-bold">CNAME</span> record:{' '}
                <span className="font-mono text-ink-muted">@</span> → <span className="font-mono text-ink-muted">cname.skinify.gg</span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="shrink-0 w-5 h-5 rounded-full bg-accent-soft text-accent text-[10px] font-bold grid place-items-center tabular-nums mt-0.5">
                3
              </span>
              <span>
                Wait 5–30 minutes for DNS to propagate. We auto-issue a free
                SSL certificate once your record resolves.
              </span>
            </li>
          </ol>
          <div className="text-[10.5px] text-ink-dim font-medium leading-relaxed">
            Status verification + automatic SSL provisioning are rolling out shortly —
            for now, save the domain here and email <span className="font-mono text-ink">support@skinify.gg</span> with
            your shop URL and we'll attach it manually within 24h.
          </div>
        </div>
      )}
    </motion.section>
  );
};

export default MyShopTab;
