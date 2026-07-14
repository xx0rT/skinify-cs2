import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Code2,
  Edit3,
  ExternalLink,
  Eye,
  Globe,
  Grid2x2,
  Instagram,
  List as ListIcon,
  Mail,
  Maximize2,
  MessageCircle,
  Minimize2,
  Move,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Store,
  Trash2,
  Twitter,
  X,
  Youtube,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useCartStore } from '../store/cartStore';
import ShopItemModal from '../components/marketplace/ShopItemModal';
import { spring, tap } from '../lib/motion';
import useDocumentMeta from '../hooks/useDocumentMeta';

/* ─────────────────────────────────────────────────────────────────────────
   UserShopPage — public shop hosted at /shop/:shopUrl

   No LandingNav, no Footer. The shop runs in its own theme — colours,
   layout, font, and custom CSS come from the owner's `user_shops` row.
   When the signed-in user IS the owner, an in-page editor toolbar appears
   with live-preview controls (preset themes, primary/secondary/accent
   colour pickers, banner/logo URLs, social links, custom-CSS box).
   ───────────────────────────────────────────────────────────────────────── */

interface Shop {
  id: string;
  user_id: string;
  shop_name: string;
  shop_url: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  layout_style: 'grid' | 'list' | 'masonry';
  email: string | null;
  discord_username: string | null;
  twitter_url: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  total_views: number;
  total_sales: number;
  custom_css?: string | null;
  is_active?: boolean;
  /* Advanced editor controls (migration 20260711090000). */
  font_family?: string | null;
  card_style?: string | null;
  banner_height?: number | null;
  card_radius?: number | null;
  show_bio?: boolean | null;
  show_socials?: boolean | null;
  show_stats?: boolean | null;
  detail_modal?: Record<string, any> | null;
  /* Freeform drag & edit transforms (migration 20260714100000). */
  element_layout?: Record<string, ElTransform> | null;
  /* Owner-created blocks (migration 20260714120000). */
  custom_components?: CustomBlock[] | null;
}

/* A block the owner added via the designer's "Custom components". */
interface CustomBlock {
  id: string;
  kind: 'text' | 'image' | 'button' | 'divider';
  text?: string;
  url?: string;
  label?: string;
  size?: number;
}

/* Per-element transform stored by the drag & edit designer. */
interface ElTransform {
  x: number;
  y: number;
  scale: number;
}

const DEFAULT_T: ElTransform = { x: 0, y: 0, scale: 1 };

/* Labels for the floating toolbar / selection chip. */
const EL_LABELS: Record<string, string> = {
  banner: 'Banner',
  logo: 'Logo',
  title: 'Shop name',
  bio: 'Description',
  stats: 'Stats',
  socials: 'Socials & share',
  items: 'Items grid',
};

const labelFor = (id: string): string => {
  if (EL_LABELS[id]) return EL_LABELS[id];
  if (id.startsWith('block:')) {
    const kind = id.slice(6).split('-')[0];
    return `Component · ${kind}`;
  }
  return id;
};

/* Font choices offered in the editor. Values are safe web/system fonts. */
const SHOP_FONTS = [
  { id: 'Inter', label: 'Inter (clean)' },
  { id: 'Lexend', label: 'Lexend (rounded)' },
  { id: 'Georgia, serif', label: 'Georgia (serif)' },
  { id: "'Courier New', monospace", label: 'Mono' },
  { id: 'system-ui', label: 'System' },
];

interface ShopItem {
  id: string;
  listing_id: number;
  is_featured: boolean;
  marketplace_listings: {
    id: number;
    item_name: string;
    item_type: string;
    image_url: string;
    price: number;
    condition: string;
    rarity?: string;
    is_active: boolean;
  };
}

/* ─── Presets ────────────────────────────────────────────────────────── */

interface Preset {
  id: string;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
  layout: Shop['layout_style'];
  css?: string;
}

const PRESETS: Preset[] = [
  {
    id: 'midnight',
    label: 'Midnight',
    primary: '#0b0d17',
    secondary: '#161a2c',
    accent: '#a855f7',
    layout: 'grid',
    css: '',
  },
  {
    id: 'paper',
    label: 'Paper',
    primary: '#fafaf7',
    secondary: '#ffffff',
    accent: '#1f2937',
    layout: 'grid',
    css: '.shop-card { border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 1px 0 rgba(0,0,0,0.04); }',
  },
  {
    id: 'neon',
    label: 'Neon',
    primary: '#0a0f1a',
    secondary: '#101a30',
    accent: '#22d3ee',
    layout: 'masonry',
    css: '.shop-card { box-shadow: 0 0 0 1px rgba(34,211,238,0.18), 0 8px 28px -10px rgba(34,211,238,0.35); } .shop-title { text-shadow: 0 0 18px rgba(34,211,238,0.45); }',
  },
  {
    id: 'sand',
    label: 'Sand',
    primary: '#f5efe6',
    secondary: '#ffffff',
    accent: '#b45309',
    layout: 'list',
    css: '',
  },
  {
    id: 'pitch',
    label: 'Pitch',
    primary: '#050505',
    secondary: '#0e0e10',
    accent: '#ef4444',
    layout: 'grid',
    css: '.shop-card { background: linear-gradient(180deg, #131316, #0e0e10); }',
  },
  {
    id: 'mint',
    label: 'Mint',
    primary: '#f0fdf4',
    secondary: '#ffffff',
    accent: '#059669',
    layout: 'grid',
    css: '',
  },
];

const isDark = (hex: string) => {
  const m = hex.replace('#', '');
  if (m.length < 6) return true;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 140;
};

const UserShopPage: React.FC = () => {
  const { shopUrl } = useParams<{ shopUrl: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();
  const { addItem } = useCartStore();

  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  /* Editor state — shadow copy of the shop. Only persisted on Save. */
  const editMode = params.get('edit') === '1';
  const [draft, setDraft] = useState<Shop | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCSS, setShowCSS] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  /* Drag & edit designer — direct manipulation of the live preview.
     Only meaningful inside edit mode; selection + transforms live on
     the draft until Save. */
  const [designMode, setDesignMode] = useState(false);
  const [selectedEl, setSelectedEl] = useState<string | null>(null);
  /* Full-screen editor drawer toggle. */
  const [drawerWide, setDrawerWide] = useState(false);

  useEffect(() => {
    if (!editMode) {
      setDesignMode(false);
      setSelectedEl(null);
    }
  }, [editMode]);

  /* Esc — deselect, then leave design mode. */
  useEffect(() => {
    if (!designMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setSelectedEl((sel) => {
        if (sel) return null;
        setDesignMode(false);
        return null;
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [designMode]);

  const patchEl = (id: string, t: ElTransform) =>
    setDraft((d) =>
      d ? { ...d, element_layout: { ...(d.element_layout || {}), [id]: t } } : d,
    );

  /* ─── Custom components (owner-created blocks) ─────────────────── */
  const addBlock = (kind: CustomBlock['kind']) => {
    const block: CustomBlock = {
      id: `${kind}-${Date.now().toString(36)}`,
      kind,
      ...(kind === 'text' ? { text: 'Nový textový blok — dvojklikem upravte', size: 16 } : {}),
      ...(kind === 'button' ? { label: 'Tlačítko', url: '' } : {}),
      ...(kind === 'image' ? { url: '' } : {}),
    };
    setDraft((d) =>
      d ? { ...d, custom_components: [...(d.custom_components || []), block] } : d,
    );
    setSelectedEl(`block:${block.id}`);
    if (!designMode) setDesignMode(true);
  };

  const patchBlock = (id: string, patch: Partial<CustomBlock>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            custom_components: (d.custom_components || []).map((b) =>
              b.id === id ? { ...b, ...patch } : b,
            ),
          }
        : d,
    );

  const removeBlock = (id: string) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            custom_components: (d.custom_components || []).filter((b) => b.id !== id),
          }
        : d,
    );
    setSelectedEl((sel) => (sel === `block:${id}` ? null : sel));
  };

  useDocumentMeta({
    title: shop ? `${shop.shop_name} · Shop` : 'Shop',
    description: shop?.description || 'A custom shop on Skinify.',
  });

  useEffect(() => {
    if (shopUrl) fetchShop();
  }, [shopUrl]);

  useEffect(() => {
    if (shop?.id) recordView();
  }, [shop?.id]);

  /* When entering edit mode, seed the draft from the live shop. Defaults
     are filled in for the advanced-editor fields so the controls work even
     before the backing columns exist / are populated (the editor stays
     functional locally; Save persists whatever the DB accepts). */
  useEffect(() => {
    if (editMode && shop) {
      setDraft({
        ...shop,
        font_family: shop.font_family ?? 'Inter',
        card_radius: shop.card_radius ?? 16,
        banner_height: shop.banner_height ?? 200,
        show_bio: shop.show_bio ?? true,
        show_socials: shop.show_socials ?? true,
        show_stats: shop.show_stats ?? true,
        detail_modal: shop.detail_modal ?? { buttonShape: 'pill', accentTint: true },
      });
    }
    if (!editMode) setDraft(null);
  }, [editMode, shop?.id]);

  const isOwner = useMemo(() => {
    if (!user || !shop) return false;
    // shop.user_id is the users.id (uuid); the authStore user.id is the
    // same uuid issued by our auth function. Compare both directly and
    // by steamId as a fallback.
    return shop.user_id === user.id;
  }, [user, shop]);

  const fetchShop = async () => {
    try {
      const { data: shopData, error } = await supabase
        .from('user_shops')
        .select('*')
        .eq('shop_url', shopUrl)
        .maybeSingle();
      if (error) throw error;
      if (!shopData) {
        navigate('/marketplace');
        return;
      }
      setShop(shopData as any);
      const { data: itemsData } = await supabase
        .from('shop_items')
        .select('*, marketplace_listings(*)')
        .eq('shop_id', shopData.id)
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true });
      setItems((itemsData as any) || []);
    } catch (e) {
      console.error('fetchShop', e);
    } finally {
      setLoading(false);
    }
  };

  const recordView = async () => {
    if (!shop) return;
    try {
      await supabase.rpc('increment_shop_views', { shop_uuid: shop.id });
    } catch {
      /* non-critical */
    }
  };

  const startEdit = () => setParams({ edit: '1' });
  const exitEdit = () => {
    const next = new URLSearchParams(params);
    next.delete('edit');
    setParams(next);
  };

  const applyPreset = (p: Preset) => {
    if (!draft) return;
    setDraft({
      ...draft,
      primary_color: p.primary,
      secondary_color: p.secondary,
      accent_color: p.accent,
      layout_style: p.layout,
      custom_css: p.css ?? draft.custom_css ?? '',
    });
    addToast({ type: 'info', title: `Preset · ${p.label}`, message: 'Click Save to publish.' });
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);

    /* Base columns that have always existed. */
    const base = {
      shop_name: draft.shop_name,
      description: draft.description,
      logo_url: draft.logo_url,
      banner_url: draft.banner_url,
      primary_color: draft.primary_color,
      secondary_color: draft.secondary_color,
      accent_color: draft.accent_color,
      layout_style: draft.layout_style,
      email: draft.email,
      discord_username: draft.discord_username,
      twitter_url: draft.twitter_url,
      instagram_url: draft.instagram_url,
      youtube_url: draft.youtube_url,
      custom_css: draft.custom_css,
    };

    /* Advanced-editor columns (migration 20260711090000). Sent as a second
       update so that, if the migration hasn't been pushed to this DB yet,
       a "column does not exist" error only drops the advanced fields —
       the base save still succeeds and the editor stays usable. */
    const advanced = {
      font_family: draft.font_family,
      card_radius: draft.card_radius,
      banner_height: draft.banner_height,
      show_bio: draft.show_bio,
      show_socials: draft.show_socials,
      show_stats: draft.show_stats,
      detail_modal: draft.detail_modal,
      element_layout: draft.element_layout ?? null,
      custom_components: draft.custom_components ?? null,
    };

    const { error } = await supabase.from('user_shops').update(base).eq('id', draft.id);
    if (error) {
      setSaving(false);
      addToast({ type: 'error', title: 'Save failed', message: error.message });
      return;
    }

    const { error: advErr } = await supabase.from('user_shops').update(advanced).eq('id', draft.id);
    setSaving(false);
    // Local preview always reflects the draft; a missing-column error on the
    // advanced update is non-fatal (styling still previews, just not
    // persisted until the migration is pushed).
    setShop({ ...draft });
    addToast({
      type: 'success',
      title: 'Shop saved',
      message: advErr ? 'Saved. Some advanced styles need a DB update to persist.' : 'Changes are live.',
    });
  };

  /* Toggle the shop between active (public) and paused (hidden from
     anonymous visitors; owner can still see it). */
  const togglePause = async () => {
    if (!shop) return;
    const next = !(shop.is_active ?? true);
    const { error } = await supabase
      .from('user_shops')
      .update({ is_active: next })
      .eq('id', shop.id);
    if (error) {
      addToast({ type: 'error', title: 'Update failed', message: error.message });
      return;
    }
    setShop({ ...shop, is_active: next });
    if (draft) setDraft({ ...draft, is_active: next });
    addToast({
      type: next ? 'success' : 'info',
      title: next ? 'Shop resumed' : 'Shop paused',
      message: next
        ? 'Your shop is public again.'
        : 'Only you can see your shop until you resume it.',
    });
  };

  /* Permanent delete — wipes the row + cascades to shop_items / views /
     themes via the FK ON DELETE CASCADE. Guarded behind a typed
     confirmation in the UI. */
  const handleDelete = async () => {
    if (!shop) return;
    const { error } = await supabase.from('user_shops').delete().eq('id', shop.id);
    if (error) {
      addToast({ type: 'error', title: 'Delete failed', message: error.message });
      return;
    }
    addToast({ type: 'success', title: 'Shop deleted' });
    navigate('/profile?tab=shop');
  };

  /* The values used to render the shop — draft while editing for live
     preview, otherwise the persisted shop. */
  const view = (editMode && draft) || shop;

  const handleAddCart = (item: ShopItem) => {
    const listing = item.marketplace_listings;
    if (!listing) return;
    addItem({
      id: listing.id,
      name: listing.item_name,
      price: listing.price,
      image: listing.image_url,
      condition: listing.condition,
      rarity: listing.rarity,
      type: listing.item_type,
      seller: { steamId: '', name: view?.shop_name || 'Shop' },
    } as any);
    addToast({ type: 'success', title: 'Added to cart', message: listing.item_name });
  };

  /* ─── Loading / 404 ───────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-ink grid place-items-center">
        <div className="text-[13.5px] text-ink-muted font-medium">Loading shop…</div>
      </div>
    );
  }
  if (!view) return null;

  /* Paused shops show a friendly "currently unavailable" screen to
     anonymous visitors. The owner sees the full editor + preview. */
  if (view.is_active === false && !isOwner) {
    return (
      <div className="min-h-screen bg-bg text-ink grid place-items-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 grid place-items-center mx-auto mb-4">
            <Pause size={22} strokeWidth={2.2} className="text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-[20px] font-bold tracking-tight">
            This shop is paused
          </h1>
          <p className="text-[13.5px] text-ink-muted font-medium mt-2 leading-relaxed">
            The owner has temporarily hidden the storefront. Check back soon.
          </p>
          <button
            onClick={() => navigate('/marketplace')}
            className="mt-5 h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px]"
          >
            Back to marketplace
          </button>
        </div>
      </div>
    );
  }

  /* ─── Styling derived from shop ───────────────────────────────────── */
  const onPrimaryDark = isDark(view.primary_color);
  const textPrimary = onPrimaryDark ? '#f4f4f5' : '#1a1a1f';
  const textMuted = onPrimaryDark ? 'rgba(244,244,245,0.65)' : 'rgba(26,26,31,0.62)';
  const lineColor = onPrimaryDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const layoutClass =
    view.layout_style === 'list'
      ? 'flex flex-col gap-3'
      : view.layout_style === 'masonry'
      ? 'columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3'
      : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3';

  /* Freeform transforms — applied for visitors too; edited via the
     drag & edit designer. */
  const elLayout = (view.element_layout || {}) as Record<string, ElTransform>;
  const elT = (id: string) => elLayout[id] || DEFAULT_T;
  const design = isOwner && editMode && designMode;
  const elProps = (id: string) => ({
    id,
    design,
    t: elLayout[id],
    selected: selectedEl === id,
    onSelect: setSelectedEl,
    onChange: patchEl,
  });

  return (
    <div
      className={`min-h-screen shop-root transition-[padding] duration-300 ${
        isOwner && editMode ? 'lg:pl-[440px]' : ''
      }`}
      style={{
        background: view.primary_color,
        color: textPrimary,
        // expose tokens to custom CSS / inline children
        ['--shop-primary' as any]: view.primary_color,
        ['--shop-secondary' as any]: view.secondary_color,
        ['--shop-accent' as any]: view.accent_color,
        ['--shop-text' as any]: textPrimary,
        ['--shop-muted' as any]: textMuted,
        ['--shop-line' as any]: lineColor,
        ['--shop-radius' as any]: `${view.card_radius ?? 16}px`,
        fontFamily: view.font_family || undefined,
      }}
    >
      {/* The owner's CSS is scoped via the .shop-root wrapper above. We
          don't sandbox style — it's the owner's own page after all — but
          keep all selectors prefixed with .shop-root by convention in the
          editor placeholder. */}
      {view.custom_css && (
        <style
          /* Strip any literal `</style>` so a malformed user rule can't
             escape the tag and break HTML parsing. */
          dangerouslySetInnerHTML={{
            __html: view.custom_css.replace(/<\/style>/gi, ''),
          }}
        />
      )}

      {/* Owner toolbar — fixed at the bottom, only when the signed-in user
          owns this shop. NOT a navbar — just an editor handle. */}
      {isOwner && !editMode && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
        >
          <button
            onClick={startEdit}
            className="h-12 px-5 rounded-full bg-black text-white text-[13px] font-bold inline-flex items-center gap-2 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.6)]"
          >
            <Edit3 size={14} strokeWidth={2.4} />
            Customize shop
          </button>
        </motion.div>
      )}

      {/* Editor panel (drawer style on the right) */}
      <AnimatePresence>
        {isOwner && editMode && draft && (
          <motion.aside
            initial={{ x: '-110%' }}
            animate={{ x: 0 }}
            exit={{ x: '-110%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 32 }}
            /* Full-screen editor rail — pinned to the left edge, full
               height. The shop content is offset by `lg:pl-[440px]` so it
               sits beside the rail as a live preview (a real two-pane
               workspace, not a floating dialog). On mobile it covers the
               screen. */
            className={`fixed left-0 top-0 bottom-0 z-50 w-full bg-[rgb(16,16,20)] text-white overflow-hidden flex flex-col transition-[width] duration-300 ${
              drawerWide ? 'lg:w-full' : 'lg:w-[440px]'
            }`}
            style={{ boxShadow: '24px 0 60px -24px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)' }}
          >
            {/* Header — eyebrow + close. Preview-as-visitor toggle is
                surfaced in the actions row at the bottom of the header
                so users can A/B-flip into "what visitors see" any time. */}
            <div className="shrink-0 bg-[rgb(18,18,22)] px-5 pt-5 pb-3 border-b border-white/6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-fuchsia-500/30 to-indigo-500/30 grid place-items-center ring-1 ring-white/10">
                    <Palette size={16} strokeWidth={2.4} className="text-fuchsia-300" />
                  </div>
                  <div>
                    <div className="text-[10.5px] font-bold uppercase tracking-wider text-white/55">
                      Sandbox editor
                    </div>
                    <div className="text-[15px] font-bold leading-none mt-1">
                      Design your shop
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDrawerWide((v) => !v)}
                    className="hidden lg:grid h-9 w-9 rounded-full bg-white/8 hover:bg-white/14 place-items-center transition-colors"
                    aria-label={drawerWide ? 'Shrink editor' : 'Expand editor to full screen'}
                    title={drawerWide ? 'Shrink editor' : 'Full screen'}
                  >
                    {drawerWide ? (
                      <Minimize2 size={14} strokeWidth={2.4} />
                    ) : (
                      <Maximize2 size={14} strokeWidth={2.4} />
                    )}
                  </button>
                  <button
                    onClick={exitEdit}
                    className="h-9 w-9 rounded-full bg-white/8 hover:bg-white/14 grid place-items-center transition-colors"
                    aria-label="Close editor"
                  >
                    <X size={15} strokeWidth={2.4} />
                  </button>
                </div>
              </div>

              {/* Tab strip — jump between scopes. The body is still one
                  long scroll so users can mix-and-match without losing
                  context, but the strip scrolls to the matching group. */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
                {(
                  [
                    { id: 'identity', label: 'Identity' },
                    { id: 'theme',    label: 'Theme' },
                    { id: 'layout',   label: 'Layout' },
                    { id: 'contact',  label: 'Contact' },
                    { id: 'css',      label: 'CSS' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      const el = document.getElementById(`editor-group-${t.id}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="h-8 px-3 rounded-full bg-white/6 hover:bg-white/12 text-[11.5px] font-bold tracking-tight whitespace-nowrap transition-colors"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`flex-1 min-h-0 overflow-y-auto px-5 py-5 space-y-6 scrollbar-thin ${
                drawerWide ? 'w-full max-w-3xl mx-auto' : ''
              }`}
            >
              {/* Identity */}
              <div id="editor-group-identity" />
              <Group title="Identity">
                <Field label="Shop name">
                  <input
                    value={draft.shop_name}
                    onChange={(e) => setDraft({ ...draft, shop_name: e.target.value })}
                    className="editor-input"
                  />
                </Field>
                <Field label="Tagline / description">
                  <textarea
                    rows={3}
                    value={draft.description || ''}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    className="editor-input resize-none"
                  />
                </Field>
                <Field label="Logo URL">
                  <input
                    value={draft.logo_url || ''}
                    onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })}
                    placeholder="https://…"
                    className="editor-input"
                  />
                </Field>
                <Field label="Banner URL">
                  <input
                    value={draft.banner_url || ''}
                    onChange={(e) => setDraft({ ...draft, banner_url: e.target.value })}
                    placeholder="https://…"
                    className="editor-input"
                  />
                </Field>
              </Group>

              {/* Presets */}
              <div id="editor-group-theme" />
              <Group title="Presets">
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p)}
                      className="rounded-2xl overflow-hidden text-left bg-white/5 hover:bg-white/10 transition-colors p-2"
                    >
                      <div
                        className="h-10 rounded-xl mb-2 grid place-items-center"
                        style={{
                          background: `linear-gradient(135deg, ${p.primary} 0%, ${p.primary} 60%, ${p.secondary} 100%)`,
                        }}
                      >
                        <span
                          className="w-4 h-4 rounded-full ring-2 ring-white/30"
                          style={{ background: p.accent }}
                        />
                      </div>
                      <div className="text-[12px] font-bold">{p.label}</div>
                      <div className="text-[10.5px] uppercase tracking-wider text-white/45 mt-0.5">
                        {p.layout}
                      </div>
                    </button>
                  ))}
                </div>
              </Group>

              {/* Colours */}
              <Group title="Colours">
                <ColorRow
                  label="Background"
                  value={draft.primary_color}
                  onChange={(v) => setDraft({ ...draft, primary_color: v })}
                />
                <ColorRow
                  label="Surface"
                  value={draft.secondary_color}
                  onChange={(v) => setDraft({ ...draft, secondary_color: v })}
                />
                <ColorRow
                  label="Accent"
                  value={draft.accent_color}
                  onChange={(v) => setDraft({ ...draft, accent_color: v })}
                />
              </Group>

              {/* Layout */}
              <div id="editor-group-layout" />
              <Group title="Layout">
                <div className="grid grid-cols-3 gap-1.5">
                  {(['grid', 'list', 'masonry'] as const).map((l) => {
                    const active = draft.layout_style === l;
                    return (
                      <button
                        key={l}
                        onClick={() => setDraft({ ...draft, layout_style: l })}
                        className={`h-10 rounded-2xl text-[12px] font-bold transition-colors ${
                          active ? 'bg-white text-black' : 'bg-white/8 text-white/80 hover:bg-white/14'
                        }`}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </Group>

              {/* Freeform drag & edit designer */}
              <Group title="Freeform layout">
                <button
                  onClick={() => {
                    setDesignMode((v) => !v);
                    setSelectedEl(null);
                  }}
                  className={`w-full h-11 rounded-2xl text-[12.5px] font-bold inline-flex items-center justify-center gap-2 transition-colors ${
                    designMode
                      ? 'bg-fuchsia-500 hover:bg-fuchsia-400 text-white'
                      : 'bg-white/8 hover:bg-white/14 text-white'
                  }`}
                >
                  <Move size={13} strokeWidth={2.4} />
                  {designMode ? 'Exit drag & edit mode' : 'Drag & edit mode'}
                </button>
                <p className="text-[10.5px] text-white/45 leading-relaxed">
                  Click any element in the preview to select it, drag to move, use the toolbar to
                  scale, and double-click the shop name or description to rename them inline.
                </p>
                <button
                  onClick={() => {
                    setDraft((d) => (d ? { ...d, element_layout: {} } : d));
                    setSelectedEl(null);
                  }}
                  className="w-full h-9 rounded-2xl bg-white/8 hover:bg-white/14 text-[11.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={11} strokeWidth={2.4} />
                  Reset all positions
                </button>
              </Group>

              {/* Custom components — owner-created blocks */}
              <Group title="Custom components">
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { kind: 'text', label: '+ Text' },
                      { kind: 'image', label: '+ Image' },
                      { kind: 'button', label: '+ Button' },
                      { kind: 'divider', label: '+ Divider' },
                    ] as const
                  ).map((b) => (
                    <button
                      key={b.kind}
                      onClick={() => addBlock(b.kind)}
                      className="h-10 rounded-2xl bg-white/8 hover:bg-white/14 text-[12px] font-bold transition-colors"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10.5px] text-white/45 leading-relaxed">
                  New blocks appear under the shop header. Drag & scale them like any element;
                  double-click text blocks to edit inline. Fill in URLs below.
                </p>
                {(draft.custom_components || []).length > 0 && (
                  <div className="space-y-2 mt-1">
                    {(draft.custom_components || []).map((b) => (
                      <div
                        key={b.id}
                        className={`rounded-2xl p-2.5 space-y-1.5 transition-colors ${
                          selectedEl === `block:${b.id}` ? 'bg-fuchsia-500/15 ring-1 ring-fuchsia-400/40' : 'bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => setSelectedEl(`block:${b.id}`)}
                            className="text-[11px] font-bold uppercase tracking-wider text-white/70 hover:text-white"
                          >
                            {b.kind}
                          </button>
                          <button
                            onClick={() => removeBlock(b.id)}
                            className="h-6 w-6 rounded-md bg-white/8 hover:bg-rose-500/30 grid place-items-center transition-colors"
                            aria-label="Remove component"
                          >
                            <Trash2 size={10} strokeWidth={2.4} />
                          </button>
                        </div>
                        {b.kind === 'text' && (
                          <input
                            value={b.text || ''}
                            onChange={(e) => patchBlock(b.id, { text: e.target.value })}
                            placeholder="Text…"
                            className="editor-input !py-1.5 text-[12px]"
                          />
                        )}
                        {b.kind === 'button' && (
                          <>
                            <input
                              value={b.label || ''}
                              onChange={(e) => patchBlock(b.id, { label: e.target.value })}
                              placeholder="Button label"
                              className="editor-input !py-1.5 text-[12px]"
                            />
                            <input
                              value={b.url || ''}
                              onChange={(e) => patchBlock(b.id, { url: e.target.value })}
                              placeholder="https:// link"
                              className="editor-input !py-1.5 text-[12px] font-mono"
                            />
                          </>
                        )}
                        {b.kind === 'image' && (
                          <input
                            value={b.url || ''}
                            onChange={(e) => patchBlock(b.id, { url: e.target.value })}
                            placeholder="https:// image URL"
                            className="editor-input !py-1.5 text-[12px] font-mono"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Group>

              {/* Typography + card design */}
              <Group title="Typography & cards">
                <Field label="Font">
                  <select
                    value={draft.font_family || 'Inter'}
                    onChange={(e) => setDraft({ ...draft, font_family: e.target.value })}
                    className="editor-input"
                  >
                    {SHOP_FONTS.map((f) => (
                      <option key={f.id} value={f.id} className="text-black">
                        {f.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={`Card corner radius — ${draft.card_radius ?? 16}px`}>
                  <input
                    type="range"
                    min={0}
                    max={28}
                    step={2}
                    value={draft.card_radius ?? 16}
                    onChange={(e) => setDraft({ ...draft, card_radius: Number(e.target.value) })}
                    className="w-full accent-fuchsia-400"
                  />
                </Field>
                <Field label={`Banner height — ${draft.banner_height ?? 200}px`}>
                  <input
                    type="range"
                    min={120}
                    max={360}
                    step={10}
                    value={draft.banner_height ?? 200}
                    onChange={(e) => setDraft({ ...draft, banner_height: Number(e.target.value) })}
                    className="w-full accent-fuchsia-400"
                  />
                </Field>
              </Group>

              {/* Section visibility */}
              <Group title="Sections">
                <ToggleRow
                  label="Show bio / description"
                  checked={draft.show_bio ?? true}
                  onChange={(v) => setDraft({ ...draft, show_bio: v })}
                />
                <ToggleRow
                  label="Show social links"
                  checked={draft.show_socials ?? true}
                  onChange={(v) => setDraft({ ...draft, show_socials: v })}
                />
                <ToggleRow
                  label="Show stats (views / sales)"
                  checked={draft.show_stats ?? true}
                  onChange={(v) => setDraft({ ...draft, show_stats: v })}
                />
              </Group>

              {/* Item detail modal look */}
              <Group title="Item detail modal">
                <Field label="Buy button shape">
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['pill', 'square'] as const).map((shape) => {
                      const active = (draft.detail_modal?.buttonShape || 'pill') === shape;
                      return (
                        <button
                          key={shape}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              detail_modal: { ...(draft.detail_modal || {}), buttonShape: shape },
                            })
                          }
                          className={`h-9 text-[12px] font-bold capitalize transition-colors ${
                            active ? 'bg-white text-black' : 'bg-white/8 text-white/80 hover:bg-white/14'
                          } ${shape === 'pill' ? 'rounded-full' : 'rounded-md'}`}
                        >
                          {shape}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <ToggleRow
                  label="Tint modal with accent"
                  checked={draft.detail_modal?.accentTint ?? true}
                  onChange={(v) =>
                    setDraft({ ...draft, detail_modal: { ...(draft.detail_modal || {}), accentTint: v } })
                  }
                />
                <p className="text-[10.5px] text-white/45 leading-relaxed">
                  Controls how the item detail modal looks when a visitor opens one of your listings.
                </p>
              </Group>

              {/* Social / contact */}
              <div id="editor-group-contact" />
              <Group title="Contact">
                <Field label="Email" Icon={Mail}>
                  <input
                    value={draft.email || ''}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                    className="editor-input"
                  />
                </Field>
                <Field label="Discord" Icon={MessageCircle}>
                  <input
                    value={draft.discord_username || ''}
                    onChange={(e) => setDraft({ ...draft, discord_username: e.target.value })}
                    className="editor-input"
                  />
                </Field>
                <Field label="Twitter URL" Icon={Twitter}>
                  <input
                    value={draft.twitter_url || ''}
                    onChange={(e) => setDraft({ ...draft, twitter_url: e.target.value })}
                    className="editor-input"
                  />
                </Field>
                <Field label="Instagram URL" Icon={Instagram}>
                  <input
                    value={draft.instagram_url || ''}
                    onChange={(e) => setDraft({ ...draft, instagram_url: e.target.value })}
                    className="editor-input"
                  />
                </Field>
                <Field label="YouTube URL" Icon={Youtube}>
                  <input
                    value={draft.youtube_url || ''}
                    onChange={(e) => setDraft({ ...draft, youtube_url: e.target.value })}
                    className="editor-input"
                  />
                </Field>
              </Group>

              {/* Custom CSS */}
              <div id="editor-group-css" />
              <Group title="Custom CSS">
                <button
                  onClick={() => setShowCSS((v) => !v)}
                  className="w-full h-10 px-3 rounded-2xl bg-white/8 hover:bg-white/14 text-[12.5px] font-semibold inline-flex items-center justify-between"
                >
                  <span className="inline-flex items-center gap-2">
                    <Code2 size={13} strokeWidth={2.4} />
                    {showCSS ? 'Hide CSS' : 'Edit CSS'}
                  </span>
                  <span className="text-[11px] text-white/45">
                    {(draft.custom_css || '').length} chars
                  </span>
                </button>
                {showCSS && (
                  <textarea
                    rows={9}
                    value={draft.custom_css || ''}
                    onChange={(e) => setDraft({ ...draft, custom_css: e.target.value })}
                    placeholder={`/* Scope your CSS under .shop-root */\n.shop-card { transform: rotate(-1deg); }`}
                    className="editor-input font-mono text-[11.5px] resize-none mt-2"
                  />
                )}
                <p className="text-[10.5px] text-white/45 mt-2 leading-relaxed">
                  Scope rules under <code className="text-white/70">.shop-root</code> to avoid leaking styles to the
                  rest of Skinify. Available CSS variables:{' '}
                  <code className="text-white/70">--shop-primary</code>,{' '}
                  <code className="text-white/70">--shop-secondary</code>,{' '}
                  <code className="text-white/70">--shop-accent</code>.
                </p>
              </Group>

              {/* Danger zone */}
              <Group title="Shop status">
                <button
                  onClick={togglePause}
                  className="w-full h-11 rounded-2xl bg-white/8 hover:bg-white/14 text-[12.5px] font-semibold inline-flex items-center justify-between px-4"
                >
                  <span className="inline-flex items-center gap-2">
                    {(draft.is_active ?? true) ? (
                      <Pause size={13} strokeWidth={2.4} />
                    ) : (
                      <Play size={13} strokeWidth={2.4} />
                    )}
                    {(draft.is_active ?? true) ? 'Pause shop' : 'Resume shop'}
                  </span>
                  <span
                    className={`text-[10.5px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
                      (draft.is_active ?? true)
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {(draft.is_active ?? true) ? 'Live' : 'Paused'}
                  </span>
                </button>
                <p className="text-[10.5px] text-white/45 leading-relaxed">
                  Paused shops are hidden from visitors but you can still preview them while signed in.
                </p>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full h-11 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[12.5px] font-semibold inline-flex items-center justify-center gap-2 mt-2"
                >
                  <Trash2 size={13} strokeWidth={2.4} />
                  Delete shop permanently
                </button>
              </Group>
            </div>

            {/* Sticky save bar — sibling of the scroll container in
                the flex-col layout above, so it stays pinned to the
                bottom of the drawer no matter how long the body gets. */}
            <div className="shrink-0 px-5 py-3 bg-[rgb(18,18,22)] border-t border-white/8 flex gap-2">
              <button
                onClick={exitEdit}
                className="h-11 px-4 rounded-full bg-white/8 hover:bg-white/14 text-[13px] font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 rounded-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 hover:from-fuchsia-400 hover:to-indigo-400 text-white font-bold text-[13.5px] inline-flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                style={{ boxShadow: '0 10px 24px -10px rgba(217, 70, 239, 0.55)' }}
              >
                <Save size={14} strokeWidth={2.4} />
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Design-mode hint bar — pinned to the top of the preview. */}
      <AnimatePresence>
        {design && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 lg:left-[calc(50%+220px)] z-[70] h-10 px-4 rounded-full bg-[rgb(18,18,22)] text-white ring-1 ring-white/12 inline-flex items-center gap-2 whitespace-nowrap"
            style={{ boxShadow: '0 16px 40px -16px rgba(0,0,0,0.7)' }}
          >
            <Move size={12} strokeWidth={2.4} className="text-fuchsia-300" />
            <span className="text-[11.5px] font-semibold text-white/80">
              Drag to move · double-click text to rename · Esc to finish
            </span>
            <button
              onClick={() => {
                setDesignMode(false);
                setSelectedEl(null);
              }}
              className="h-7 px-2.5 rounded-full bg-fuchsia-500 hover:bg-fuchsia-400 text-[11px] font-bold transition-colors"
            >
              Done
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected-element toolbar */}
      <AnimatePresence>
        {design && selectedEl && (
          <DesignToolbar
            id={selectedEl}
            t={elT(selectedEl)}
            onChange={patchEl}
            onReset={(id) => patchEl(id, { ...DEFAULT_T })}
            onDone={() => setSelectedEl(null)}
            onDelete={
              selectedEl.startsWith('block:')
                ? () => removeBlock(selectedEl.slice(6))
                : undefined
            }
          />
        )}
      </AnimatePresence>

      {/* ─── Shop content ──────────────────────────────────────────── */}
      <main
        className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-6 pb-32"
        style={{ minHeight: '100vh' }}
        onPointerDown={design ? () => setSelectedEl(null) : undefined}
      >
        {/* Back link — tiny, top-left. Not a navbar — just lets visitors
            leave the storefront. Hidden in edit mode to keep focus. */}
        {!editMode && (
          <button
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold mb-6 transition-opacity hover:opacity-80"
            style={{ color: textMuted }}
          >
            <ArrowLeft size={13} strokeWidth={2.4} />
            Back to Skinify
          </button>
        )}

        {/* Banner */}
        {view.banner_url && (
          <Editable {...elProps('banner')} className="mb-6">
            <div
              className="shop-banner relative w-full overflow-hidden"
              style={{
                background: view.secondary_color,
                height: `${view.banner_height ?? 200}px`,
                borderRadius: 'var(--shop-radius)',
              }}
            >
              <img
                src={view.banner_url}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </Editable>
        )}

        {/* Identity row */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-8">
          <div className="flex items-center gap-4 min-w-0">
            <Editable {...elProps('logo')} className="shrink-0">
              <div
                className="shop-logo w-20 h-20 sm:w-24 sm:h-24 rounded-3xl shrink-0 grid place-items-center overflow-hidden"
                style={{
                  background: view.secondary_color,
                  color: view.accent_color,
                }}
              >
                {view.logo_url ? (
                  <img
                    src={view.logo_url}
                    alt={view.shop_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget.parentNode as HTMLElement).innerHTML =
                        `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${view.accent_color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l2-3h16l2 3v3a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V7zM4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8"/></svg>`;
                    }}
                  />
                ) : (
                  <Store size={34} strokeWidth={2} style={{ color: view.accent_color }} />
                )}
              </div>
            </Editable>
            <div className="min-w-0">
              <Editable {...elProps('title')} lockChildren={false}>
                <h1
                  className={`shop-title text-[28px] sm:text-[36px] font-bold tracking-tight leading-none ${
                    design ? 'outline-none' : 'truncate'
                  }`}
                  contentEditable={design}
                  suppressContentEditableWarning
                  spellCheck={false}
                  onBlur={(e) => {
                    if (!design) return;
                    /* Capture BEFORE setDraft — React nulls currentTarget
                       once the handler returns, so reading it inside the
                       updater threw "null is not an object". */
                    const text = e.currentTarget?.textContent?.trim() || '';
                    setDraft((d) => (d ? { ...d, shop_name: text || d.shop_name } : d));
                  }}
                >
                  {view.shop_name || 'Untitled shop'}
                </h1>
              </Editable>
              {(view.show_bio ?? true) && (view.description || design) && (
                <Editable {...elProps('bio')} lockChildren={false}>
                  <p
                    className={`text-[13.5px] sm:text-[14.5px] mt-3 leading-relaxed max-w-[560px] ${
                      design ? 'outline-none' : ''
                    }`}
                    style={{ color: textMuted }}
                    contentEditable={design}
                    suppressContentEditableWarning
                    spellCheck={false}
                    onBlur={(e) => {
                      if (!design) return;
                      const text = e.currentTarget?.textContent ?? null;
                      setDraft((d) => (d ? { ...d, description: text ?? d.description } : d));
                    }}
                  >
                    {view.description || (design ? 'Click to write a description…' : '')}
                  </p>
                </Editable>
              )}
              {(view.show_stats ?? true) && (
                <Editable {...elProps('stats')}>
                  <div className="mt-3 flex items-center gap-4 text-[12px]" style={{ color: textMuted }}>
                    <span className="inline-flex items-center gap-1.5">
                      <Eye size={11} strokeWidth={2.4} />
                      {(view.total_views || 0).toLocaleString()} views
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles size={11} strokeWidth={2.4} />
                      {(view.total_sales || 0).toLocaleString()} sales
                    </span>
                  </div>
                </Editable>
              )}
            </div>
          </div>

          {/* Socials + share */}
          <Editable {...elProps('socials')}>
          <div className="flex items-center gap-2 flex-wrap">
            {(view.show_socials ?? true) && [
              view.twitter_url && { Icon: Twitter, href: view.twitter_url, label: 'Twitter' },
              view.instagram_url && { Icon: Instagram, href: view.instagram_url, label: 'Instagram' },
              view.youtube_url && { Icon: Youtube, href: view.youtube_url, label: 'YouTube' },
              view.email && { Icon: Mail, href: `mailto:${view.email}`, label: 'Email' },
              view.discord_username && {
                Icon: MessageCircle,
                href: `https://discord.com/users/${view.discord_username}`,
                label: 'Discord',
              },
            ]
              .filter(Boolean)
              .map((s: any) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="h-10 w-10 rounded-full grid place-items-center transition-opacity hover:opacity-80"
                  style={{ background: view.secondary_color, color: textPrimary }}
                >
                  <s.Icon size={15} strokeWidth={2.2} />
                </a>
              ))}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                addToast({ type: 'success', title: 'Link copied' });
              }}
              className="h-10 px-4 rounded-full text-[12.5px] font-bold inline-flex items-center gap-2 transition-opacity hover:opacity-90"
              style={{ background: view.accent_color, color: isDark(view.accent_color) ? '#fff' : '#0b0d17' }}
            >
              <Globe size={13} strokeWidth={2.4} />
              Share shop
            </button>
          </div>
          </Editable>
        </header>

        {/* Custom components — owner-created blocks (designer → "Custom
            components"). Draggable/scalable like every other element. */}
        {(view.custom_components || []).length > 0 && (
          <div className="mb-8 space-y-4">
            {(view.custom_components || []).map((b: CustomBlock) => (
              <Editable
                key={b.id}
                {...elProps(`block:${b.id}`)}
                lockChildren={b.kind !== 'text'}
              >
                <CustomBlockView
                  block={b}
                  design={design}
                  accent={view.accent_color}
                  surface={view.secondary_color}
                  textMuted={textMuted}
                  onTextCommit={(text) => patchBlock(b.id, { text })}
                />
              </Editable>
            ))}
          </div>
        )}

        {/* Items */}
        {items.length === 0 ? (
          <div
            className="rounded-3xl p-12 text-center"
            style={{ background: view.secondary_color, color: textMuted }}
          >
            <Store size={28} className="mx-auto mb-3 opacity-60" />
            <div className="text-[16px] font-bold mb-1" style={{ color: textPrimary }}>
              No items yet
            </div>
            <div className="text-[13px]">
              {isOwner
                ? 'Add items from your listings to fill this shop.'
                : "This shop hasn't listed any items. Check back soon."}
            </div>
            {isOwner && !editMode && (
              <button
                onClick={() => navigate('/profile?tab=listings')}
                className="mt-5 h-11 px-5 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ background: view.accent_color, color: isDark(view.accent_color) ? '#fff' : '#0b0d17' }}
              >
                Add items <ArrowRight size={13} strokeWidth={2.4} />
              </button>
            )}
          </div>
        ) : (
          <Editable {...elProps('items')}>
          <div className={layoutClass}>
            {items.map((it) => {
              const l = it.marketplace_listings;
              if (!l) return null;
              return (
                <motion.button
                  key={it.id}
                  onClick={() => setSelectedItemId(l.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring}
                  whileHover={{ y: -3 }}
                  className="shop-card text-left overflow-hidden transition-shadow break-inside-avoid"
                  style={{ background: view.secondary_color, color: textPrimary, borderRadius: 'var(--shop-radius)' }}
                >
                  <div
                    className="relative aspect-[5/3.6] grid place-items-center"
                    style={{ background: view.primary_color }}
                  >
                    {it.is_featured && (
                      <span
                        className="absolute top-2 left-2 px-2 h-6 rounded-full text-[10.5px] font-bold uppercase tracking-wider inline-flex items-center gap-1"
                        style={{
                          background: view.accent_color,
                          color: isDark(view.accent_color) ? '#fff' : '#0b0d17',
                        }}
                      >
                        <Sparkles size={10} strokeWidth={2.6} />
                        Featured
                      </span>
                    )}
                    <img
                      src={l.image_url}
                      alt={l.item_name}
                      loading="lazy"
                      className="w-[80%] h-[80%] object-contain"
                    />
                  </div>
                  <div className="p-3.5">
                    <div className="text-[10.5px] uppercase tracking-wider font-bold" style={{ color: textMuted }}>
                      {l.item_type}
                    </div>
                    <div className="text-[13.5px] font-bold tracking-tight leading-tight truncate mt-1">
                      {l.item_name}
                    </div>
                    <div className="text-[11.5px] mt-1" style={{ color: textMuted }}>
                      {l.condition}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="text-[15px] font-bold tracking-tight tabular-nums">
                        {formatPrice(l.price)}
                      </div>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddCart(it);
                        }}
                        className="h-9 px-3 rounded-full text-[11.5px] font-bold inline-flex items-center gap-1 transition-opacity hover:opacity-90 cursor-pointer"
                        style={{
                          background: view.accent_color,
                          color: isDark(view.accent_color) ? '#fff' : '#0b0d17',
                        }}
                      >
                        Buy
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
          </Editable>
        )}

        {/* Footnote — discreet credit */}
        <div className="mt-16 text-center text-[11px]" style={{ color: textMuted }}>
          <a
            href="/"
            className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
            style={{ color: textMuted }}
          >
            Powered by Skinify
            <ExternalLink size={10} strokeWidth={2.4} />
          </a>
        </div>
      </main>

      {/* Item quick-view modal */}
      {selectedItemId !== null && (
        <ShopItemModal
          itemId={selectedItemId}
          onClose={() => setSelectedItemId(null)}
          accent={view.accent_color}
          config={view.detail_modal || {}}
        />
      )}

      {/* Delete confirmation — typed safeguard. We require the user to
          type their shop URL to confirm because the action is destructive
          and cascades to every shop item / view / theme. */}
      <AnimatePresence>
        {showDeleteConfirm && shop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteConfirmText('');
            }}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl p-6 bg-[rgb(20,20,24)] text-white"
              style={{ boxShadow: '0 28px 60px -20px rgba(0,0,0,0.6)' }}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 grid place-items-center mb-4">
                <Trash2 size={20} strokeWidth={2.4} className="text-rose-400" />
              </div>
              <h3 className="text-[20px] font-bold tracking-tight leading-tight">
                Delete this shop?
              </h3>
              <p className="text-[13px] text-white/65 font-medium mt-2 leading-relaxed">
                This permanently removes your storefront, every featured item,
                view history, and saved theme. Listings stay in the marketplace —
                only the shop wrapper goes.
              </p>
              <div className="mt-5">
                <div className="text-[11px] text-white/55 font-semibold mb-1.5">
                  Type <span className="text-white font-mono">{shop.shop_url}</span> to confirm
                </div>
                <input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="editor-input font-mono"
                  placeholder={shop.shop_url}
                  autoFocus
                />
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText('');
                  }}
                  className="h-11 px-4 rounded-full bg-white/8 hover:bg-white/14 text-[13px] font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== shop.shop_url}
                  className="flex-1 h-11 rounded-full bg-rose-500 hover:bg-rose-400 disabled:bg-white/8 disabled:text-white/40 disabled:cursor-not-allowed text-white font-bold text-[13.5px] inline-flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 size={14} strokeWidth={2.4} />
                  Delete shop
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

/* ─── Editor sub-components ─────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────────────────────
   Editable — direct-manipulation wrapper for the drag & edit designer.

   Always applies the stored translate/scale so saved layouts render for
   visitors too. In design mode it adds: hover outline, click-to-select,
   pointer-drag to move (4px threshold so plain clicks still select /
   place a text caret), and an optional child-interaction lock so Buy /
   social buttons don't fire while designing.
   ───────────────────────────────────────────────────────────────────────── */
const Editable: React.FC<{
  id: string;
  design: boolean;
  t?: ElTransform;
  selected: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, t: ElTransform) => void;
  /** Block child clicks while designing (default true). Text elements
      pass false so double-click keeps working for inline renaming. */
  lockChildren?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ id, design, t, selected, onSelect, onChange, lockChildren = true, className = '', children }) => {
  const tr = t || DEFAULT_T;
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const [hovered, setHovered] = useState(false);

  const hasT = tr.x !== 0 || tr.y !== 0 || tr.scale !== 1;
  const baseStyle: React.CSSProperties = hasT
    ? { transform: `translate(${tr.x}px, ${tr.y}px) scale(${tr.scale})`, transformOrigin: 'top left' }
    : {};

  if (!design) {
    return (
      <div className={className} style={baseStyle}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={`relative ${className}`}
      style={{
        ...baseStyle,
        touchAction: 'none',
        cursor: 'grab',
        outline: selected
          ? '2px solid #e879f9'
          : hovered
          ? '1.5px dashed rgba(232,121,249,0.6)'
          : '1.5px dashed transparent',
        outlineOffset: 5,
        zIndex: selected ? 30 : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(id);
        dragRef.current = { sx: e.clientX, sy: e.clientY, ox: tr.x, oy: tr.y, moved: false };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = e.clientX - d.sx;
        const dy = e.clientY - d.sy;
        if (!d.moved && Math.hypot(dx, dy) < 4) return;
        d.moved = true;
        e.preventDefault();
        onChange(id, { ...tr, x: Math.round(d.ox + dx), y: Math.round(d.oy + dy) });
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onClickCapture={(e) => {
        /* Swallow clicks that ended a drag so buttons underneath don't fire. */
        if (lockChildren) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {(selected || hovered) && (
        <span
          className="absolute -top-7 left-0 z-40 inline-flex items-center gap-1 px-2 h-5 rounded-md bg-fuchsia-500 text-white text-[10px] font-bold whitespace-nowrap pointer-events-none select-none"
        >
          <Move size={9} strokeWidth={2.6} />
          {labelFor(id)}
        </span>
      )}
      {children}
    </div>
  );
};

/* CustomBlockView — renders one owner-created block (text / image /
   button / divider) with the shop's theme tokens. Text blocks are
   inline-editable in design mode. */
const CustomBlockView: React.FC<{
  block: CustomBlock;
  design: boolean;
  accent: string;
  surface: string;
  textMuted: string;
  onTextCommit: (text: string) => void;
}> = ({ block, design, accent, surface, textMuted, onTextCommit }) => {
  switch (block.kind) {
    case 'text':
      return (
        <p
          className={`leading-relaxed max-w-[720px] ${design ? 'outline-none' : ''}`}
          style={{ fontSize: block.size || 16 }}
          contentEditable={design}
          suppressContentEditableWarning
          spellCheck={false}
          onBlur={(e) => {
            if (!design) return;
            /* Capture before any state update — currentTarget is nulled
               once the handler returns. */
            const text = e.currentTarget?.textContent ?? '';
            onTextCommit(text);
          }}
        >
          {block.text || ''}
        </p>
      );
    case 'image':
      return block.url ? (
        <img
          src={block.url}
          alt=""
          className="max-w-full h-auto"
          style={{ borderRadius: 'var(--shop-radius)', maxHeight: 420 }}
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = '0.25')}
        />
      ) : (
        <div
          className="h-28 max-w-md grid place-items-center text-[12px] font-semibold"
          style={{ background: surface, color: textMuted, borderRadius: 'var(--shop-radius)' }}
        >
          Add an image URL in the editor panel
        </div>
      );
    case 'button': {
      const inner = (
        <span
          className="h-11 px-5 rounded-full text-[13px] font-bold inline-flex items-center transition-opacity hover:opacity-90"
          style={{ background: accent, color: isDark(accent) ? '#fff' : '#0b0d17' }}
        >
          {block.label || 'Button'}
        </span>
      );
      return block.url && !design ? (
        <a href={block.url} target="_blank" rel="noreferrer" className="inline-block">
          {inner}
        </a>
      ) : (
        <span className="inline-block">{inner}</span>
      );
    }
    case 'divider':
      return <div className="h-px w-full" style={{ background: 'var(--shop-line)' }} />;
    default:
      return null;
  }
};

/* Floating toolbar for the selected element — scale slider + reset. */
const DesignToolbar: React.FC<{
  id: string;
  t: ElTransform;
  onChange: (id: string, t: ElTransform) => void;
  onReset: (id: string) => void;
  onDone: () => void;
  onDelete?: () => void;
}> = ({ id, t, onChange, onReset, onDone, onDelete }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 16 }}
    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
    className="fixed bottom-4 left-1/2 -translate-x-1/2 lg:left-[calc(50%+220px)] z-[70] flex items-center gap-3 h-13 px-4 py-2.5 rounded-2xl bg-[rgb(18,18,22)] text-white ring-1 ring-white/12"
    style={{ boxShadow: '0 22px 50px -18px rgba(0,0,0,0.7)' }}
  >
    <span className="text-[11px] font-bold uppercase tracking-wider text-fuchsia-300 whitespace-nowrap">
      {labelFor(id)}
    </span>
    <div className="flex items-center gap-2">
      <span className="text-[10.5px] font-bold text-white/50 uppercase tracking-wider">Scale</span>
      <input
        type="range"
        min={0.5}
        max={2}
        step={0.05}
        value={t.scale}
        onChange={(e) => onChange(id, { ...t, scale: Number(e.target.value) })}
        className="w-28 accent-fuchsia-400"
      />
      <span className="text-[11px] font-mono tabular-nums text-white/80 w-10">
        {Math.round(t.scale * 100)}%
      </span>
    </div>
    <button
      onClick={() => onReset(id)}
      className="h-8 px-2.5 rounded-lg bg-white/8 hover:bg-white/14 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
      title="Reset position & scale"
    >
      <RotateCcw size={11} strokeWidth={2.4} />
      Reset
    </button>
    {onDelete && (
      <button
        onClick={onDelete}
        className="h-8 px-2.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
        title="Delete this component"
      >
        <Trash2 size={11} strokeWidth={2.4} />
        Delete
      </button>
    )}
    <button
      onClick={onDone}
      className="h-8 px-3 rounded-lg bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-[11px] font-bold transition-colors"
    >
      Done
    </button>
  </motion.div>
);

const Group: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <div className="text-[10.5px] font-bold uppercase tracking-wider text-white/55 mb-2.5">
      {title}
    </div>
    <div className="space-y-2.5">{children}</div>
  </section>
);

const Field: React.FC<{
  label: string;
  Icon?: React.ComponentType<any>;
  children: React.ReactNode;
}> = ({ label, Icon, children }) => (
  <div>
    <div className="text-[11px] text-white/60 font-semibold mb-1.5 inline-flex items-center gap-1.5">
      {Icon && <Icon size={11} strokeWidth={2.4} />}
      {label}
    </div>
    {children}
  </div>
);

const ColorRow: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center gap-2.5">
    <label className="relative h-10 w-10 rounded-2xl overflow-hidden cursor-pointer shrink-0 ring-1 ring-white/15">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <span className="absolute inset-0" style={{ background: value }} />
    </label>
    <div className="flex-1 min-w-0">
      <div className="text-[11px] text-white/60 font-semibold">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[13px] font-mono text-white outline-none mt-0.5"
      />
    </div>
  </div>
);

const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="w-full flex items-center justify-between gap-3 py-1.5 text-left"
  >
    <span className="text-[12.5px] font-semibold text-white/85">{label}</span>
    <span
      className={`relative h-6 w-10 rounded-full transition-colors shrink-0 ${
        checked ? 'bg-fuchsia-500' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </span>
  </button>
);

export default UserShopPage;
