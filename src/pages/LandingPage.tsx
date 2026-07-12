import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useBalanceStore } from '../store/balanceStore';
import { useT } from '../lib/useT';
import { useTranslationStore } from '../store/translationStore';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { useHotItems } from '../hooks/useHotItems';
import { weaponCategories } from '../data/weaponCategories';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import LiveActivityFeed from '../components/LiveActivityFeed';
import { SkinCard, SkinCardSkeleton } from '../components/ui/SkinCard';
import { spring, tap } from '../lib/motion';
import { openDepositModal } from '../components/DepositModal';

const sectionVariants = {
  hidden: { opacity: 0, y: 14 },
  shown:  { opacity: 1, y: 0, transition: { ...spring, mass: 0.7 } },
};

const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className, delay = 0 }) => (
  <motion.section
    initial="hidden"
    whileInView="shown"
    viewport={{ once: true, margin: '0px 0px -80px 0px' }}
    variants={sectionVariants}
    transition={{ ...spring, delay }}
    className={className}
  >
    {children}
  </motion.section>
);

const staggerParent = {
  hidden: {},
  shown:  { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const staggerChild = {
  hidden: { opacity: 0, y: 12 },
  shown:  { opacity: 1, y: 0, transition: spring },
};


import useDocumentMeta, { faqJsonLd } from '../hooks/useDocumentMeta';


const LANDING_FAQ = [
  {
    question: 'What is the cheapest way to buy CS2 skins?',
    answer:
      'Skinify keeps buyer fees low, so the price you see stays very close to the price you pay — no surprise spreads bolted on at checkout. Because listings are peer-to-peer, sellers price at or near the live Steam market median, which routinely undercuts third-party sites that add 5–15% on top. On popular items like the AK-47, AWP or a Karambit you can compare multiple listings side by side, sort by price or float, and grab the exact copy that fits your budget. Prices are shown in your local currency, so you always know what you are spending.',
  },
  {
    question: 'Is Skinify safe for buying and selling CS2 skins?',
    answer:
      'Yes — safety is built into every step. Each purchase is held in escrow until the item is confirmed delivered to your Steam inventory. If a seller fails to deliver within the delivery window, you are automatically refunded, so your money is never at risk. Seller payouts are released after Steam’s trade-back window to protect buyers from reversed trades, and every account trades through our verified flow. For sellers, a one-time identity check (KYC) is required past a certain volume to keep the marketplace clean and compliant.',
  },
  {
    question: 'How long does a CS2 skin trade take on Skinify?',
    answer:
      'When the seller is online, median delivery is under 60 seconds. After you buy, the seller sends a Steam trade offer; you accept it in your Steam mobile app and the skin lands in your inventory right away. If an item carries a Steam trade lock (0–8 days), it is stored safely in your Skinify inventory and sent to you automatically the moment the lock expires — you don’t have to babysit it.',
  },
  {
    question: 'Do I need the Steam Mobile Authenticator to trade?',
    answer:
      'Yes. Without Steam Guard Mobile enabled, Steam itself holds every trade offer for up to 15 days — that applies to any marketplace, not just Skinify. Enabling the mobile authenticator unlocks instant trades and is required to both send and receive items quickly. It only takes a couple of minutes to set up in the Steam app and it also protects your account from unauthorised trades.',
  },
  {
    question: 'How do I sell my CS2 inventory on Skinify?',
    answer:
      'Link your Steam account, open the Inventory tab, pick the items you want to sell, and set a price — we suggest a fair one based on recent sales, but you are always free to price it yourself. Your listings go live instantly, and you stay in control: change the price any time before it sells, or delist and keep the item. When a listing sells, a low selling fee is taken from the sale price and the rest is yours to withdraw to your bank or spend on the marketplace.',
  },
  {
    question: 'Which skins can I trade — knives, gloves, stickers?',
    answer:
      'All of them. Skinify covers the full CS2 catalogue: rifles and pistols like the AK-47, M4A4 and Desert Eagle, sniper skins like the AWP, knives such as the Karambit, M9 Bayonet and Butterfly Knife, gloves, agents, cases, and rare stickers and patterns. Detailed filters let you search by float value, paint seed, pattern, StatTrak™ and more, so you can find the exact copy you want — including items that rarely appear on the Steam Community Market.',
  },
];

const LandingPage: React.FC = () => {
  const langCode = useTranslationStore((s) => s.currentLanguage.code);
  const isCS = langCode === 'cs';

  useDocumentMeta({
    title: isCS
      ? 'Skinify — Tržiště CS2 · 6% poplatek pro kupující · Okamžité obchody'
      : 'Skinify — CS2 Marketplace · 6% Buyer Fees · Instant Trades',
    description: isCS
      ? 'Peer-to-peer tržiště CS2 s 6% poplatkem pro kupující. Obchody chráněné escrowem, doručení přes Steam do 60 sekund, výplaty v reálných penězích. Nakupujte AK-47, AWP, Karambit, M9 Bayonet, rukavice a vzácné patterny od ověřených prodejců.'
      : 'The peer-to-peer CS2 marketplace with 6% buyer fees. Escrow-protected trades, sub-60-second Steam delivery, real-money payouts. Buy AK-47, AWP, Karambit, M9 Bayonet, gloves and rare patterns from verified sellers.',
    canonical: 'https://skinify.gg/',
    langAlternates: ['cs', 'de', 'ru'],
    keywords:
      'cs2 marketplace, cs2 skins, buy cs2 skins, sell cs2 skins, instant sell cs2 skins, cs2 skins to cash, cs2 skins to money, skins to cash, cash out cs2 skins, sell skins for real money, counter-strike 2 marketplace, ak-47 redline, awp dragon lore, karambit doppler, m9 bayonet fade, sport gloves, butterfly knife, p2p cs2 trading, 0 fee cs2 marketplace, escrow cs2, instant steam delivery, cs2 skin prices, skinport alternative, skinport fees, steam market alternative, skinify cs2, skinyfi, skinyfy, skinifi, скинифай, скины кс2 продать, cs2 tržiště, cs2 skiny koupit, prodat cs2 skiny, cs2 obchod, cs2 nůž koupit',
    jsonLd: faqJsonLd(LANDING_FAQ),
  });

  const navigate = useNavigate();
  const t = useT();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist, fetchWishlist } = useWishlistStore();
  const { formatPrice } = useCurrencyStore();
  const { balance, fetchBalance } = useBalanceStore();
  const { items: marketplaceItems, loading: itemsLoading } = useMarketplaceItems();
  const { hotItems, loading: hotItemsLoading } = useHotItems(12);

  const [activeCat, setActiveCat] = useState<string>('featured');
  const reduceMotion = useReducedMotion();

  /* Hero parallax: the featured/portfolio card drifts up a touch as the
     user scrolls. Subtle (24px max) so it reads as polish, not motion. */
  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 300], [0, -24]);

  useEffect(() => {
    if (user?.steamId) {
      fetchWishlist(user.steamId);
      fetchBalance(user.steamId);
    }
  }, [user?.steamId]);

  const categoryKeys = useMemo(
    () => ['featured', ...Object.keys(weaponCategories)],
    [],
  );

  const visibleItems = useMemo(() => {
    if (!marketplaceItems?.length) return [];
    if (activeCat === 'featured') return marketplaceItems.slice(0, 12);
    const weaponList = (weaponCategories[activeCat]?.weapons || []).map((w) =>
      w.toLowerCase(),
    );
    return marketplaceItems
      .filter((it) => {
        const n = (it.name || it.market_name || '').toLowerCase();
        return weaponList.some((w) => n.includes(w));
      })
      .slice(0, 12);
  }, [marketplaceItems, activeCat]);

  const handleAddCart = useCallback(
    (item: any) => {
      addItem({
        id: item.id,
        name: item.name || item.market_name,
        price: item.price,
        image: item.image,
        condition: item.condition,
        rarity: item.rarity,
        type: item.type,
        seller: item.seller,
      } as any);
      addToast({
        type: 'success',
        title: 'Added to cart',
        message: item.name || item.market_name,
      });
    },
    [addItem, addToast],
  );

  const handleWish = useCallback(
    (item: any) => {
      if (!user) {
        addToast({
          type: 'warning',
          title: 'Login required',
          message: 'Sign in to use your wishlist.',
        });
        return;
      }
      toggleItem(
        {
          id: item.id,
          name: item.name || item.market_name,
          price: item.price,
          image: item.image,
          condition: item.condition,
          rarity: item.rarity,
          type: item.type,
          seller: item.seller,
        } as any,
        user.steamId,
      );
    },
    [user, toggleItem, addToast],
  );

  const portfolio = useMemo(() => Number(balance || 0), [balance]);

  /* Real-data sparkline for the hero card. We don't have per-day price
     history client-side, so we build a genuine cumulative-volume curve
     from the actual live listings: sort by price, walk the cumulative
     total, and sample it into 12 points. The shape therefore reflects
     the real market's price distribution rather than a hardcoded line.
     The pathLength draw animation still plays over the top. */
  const sparkPaths = useMemo(() => {
    const live = Array.isArray(marketplaceItems) ? marketplaceItems : [];
    const prices = live
      .map((it: any) => Number(it?.price || 0))
      .filter((p) => p > 0)
      .sort((a, b) => a - b);
    const N = 12;
    let ys: number[];
    if (prices.length >= 2) {
      const total = prices.reduce((s, p) => s + p, 0) || 1;
      let cum = 0;
      const cumPts: number[] = prices.map((p) => {
        cum += p;
        return cum / total; // 0..1 rising curve
      });
      /* Resample the cumulative curve into N evenly-spaced points. */
      ys = Array.from({ length: N }, (_, i) => {
        const idx = Math.min(cumPts.length - 1, Math.round((i / (N - 1)) * (cumPts.length - 1)));
        return cumPts[idx];
      });
    } else {
      ys = [0.1, 0.18, 0.3, 0.28, 0.45, 0.5, 0.62, 0.6, 0.72, 0.8, 0.86, 0.95];
    }
    const pts = ys.map((v, i) => ({
      x: 8 + (i / (N - 1)) * 184, // 8px side margin inside the viewBox
      y: 54 - v * 46, // 6px top/bottom padding, inverted Y
    }));
    /* Smooth the curve with a Catmull-Rom → cubic-bezier conversion so the
       line reads as a flowing chart rather than jagged segments. */
    let line = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      line += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
    }
    const area = `${line} L192,60 L8,60 Z`;
    return { line, area };
  }, [marketplaceItems]);
  const promotedItems = useMemo(() => {
    const live = Array.isArray(marketplaceItems) ? marketplaceItems : [];
    if (live.length === 0) return [] as any[];
    /* ONLY paid promotions (49 Kč fee) appear here — no filler. When
       nobody is paying, the wall simply doesn't render. */
    return live.filter((it: any) => it?.promoted === true).slice(0, 100);
  }, [marketplaceItems]);

  /* Newest listings for the "Recently added" slider — sort by listed_at
     desc, falling back to the natural order the API returns. */
  const recentItems = useMemo(() => {
    const live = Array.isArray(marketplaceItems) ? [...marketplaceItems] : [];
    live.sort(
      (a: any, b: any) =>
        new Date(b?.listed_at || 0).getTime() - new Date(a?.listed_at || 0).getTime(),
    );
    return live.slice(0, 16);
  }, [marketplaceItems]);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1480px] mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-12 sm:pb-16">
        {/*
          Screen-reader-only H1 — Google reads this and uses it as the
          page's primary heading. The visual hero uses display headings
          inside cards that aren't `<h1>`, so we lift the head term up
          where crawlers expect it without disrupting the layout.
        */}
        <h1 className="sr-only">
          CS2 Marketplace — Buy and Sell CS2 Skins on Skinify
        </h1>

        {/* ===== 1 · HERO ===== signed-in → account welcome banner with a
            smooth balance chart; signed-out → value-prop hero. ===== */}
        <section className="mb-4">
          {user ? (
            <AccountBanner
              user={user}
              balance={balance}
              formatPrice={formatPrice}
              items={
                (promotedItems.length > 0 ? promotedItems : marketplaceItems || []).slice(0, 14)
              }
              onRefill={() => openDepositModal()}
              onProfile={() => navigate('/profile')}
              onBrowse={() => navigate('/marketplace')}
              onSell={() => navigate('/profile?tab=inventory')}
              onView={(id) => navigate(`/item/${id}`)}
            />
          ) : (
            <SignedOutValueHero navigate={navigate} t={t} />
          )}
        </section>

        {/* ===== 2 · TRUST BAR + STAT COUNTERS ===== a thin, borderless row
            of value points + live-feeling counters. ===== */}
        <Reveal>
          <LandingTrustBar isCS={isCS} itemCount={marketplaceItems?.length || 0} />
        </Reveal>

        {/* ===== 3 · PROMOTED ITEMS — tabbed price-bracket grid showing only
            paid promotions; hidden entirely when nobody is promoting. ===== */}
        {promotedItems.length > 0 && (
        <Reveal>
          <BestSkinsGrid
            items={promotedItems}
            loading={itemsLoading}
            onView={(id) => navigate(`/item/${id}`)}
            onAddCart={handleAddCart}
            onToggleWish={handleWish}
            isWished={(id) => isInWishlist(id)}
            formatPrice={formatPrice}
            onSeeAll={() => navigate('/marketplace')}
            isCS={isCS}
          />
        </Reveal>
        )}

        {/* ── Promo #1 — „Upgrade Your Inventory" kampaň (1916×821) ── */}
        <Reveal className="mb-10">
          <PromoSlot
            image="/skinify_graphics/banner-upgrade.png"
            href="/marketplace"
            label="Upgrade Your Inventory"
            ratio="1916 / 821"
          />
        </Reveal>

        {/* ===== 5 · RECENTLY ADDED slider ===== newest listings, so the
            page always shows fresh inventory even without promotions. */}
        {marketplaceItems && marketplaceItems.length > 4 && (
          <Reveal>
            <PromotedRow
              title={isCS ? 'Nově přidané' : 'Recently added'}
              eyebrow={isCS ? 'Čerstvé' : 'Fresh'}
              items={recentItems}
              onView={(id) => navigate(`/item/${id}`)}
              onAddCart={handleAddCart}
              onToggleWish={handleWish}
              isWished={(id) => isInWishlist(id)}
              formatPrice={formatPrice}
            />
          </Reveal>
        )}

        {/* ===== 5b · MARKETPLACE PREVIEW ===== 5×5 grid of live listings;
            the last row dissolves into the page with a centered CTA into
            the full marketplace. ===== */}
        {marketplaceItems && marketplaceItems.length > 9 && (
          <Reveal className="mb-12">
            <MarketPreviewGrid
              items={marketplaceItems}
              isCS={isCS}
              onView={(id) => navigate(`/item/${id}`)}
              onAddCart={handleAddCart}
              onToggleWish={handleWish}
              isWished={(id) => isInWishlist(id)}
              formatPrice={formatPrice}
              onOpen={() => navigate('/marketplace')}
            />
          </Reveal>
        )}

        {/* ── Promo dvojice — komponované karty: text vlevo, celá grafika
            (bez ořezu) vpravo, na tmavém podkladu ladícím s artworkem. ── */}
        <Reveal className="mb-12">
          <div className="grid lg:grid-cols-2 gap-4">
            <PromoCard
              image="/skinify_graphics/coins.png"
              href="/bonuses"
              eyebrow="Odměny"
              title="Bonusy každý den"
              sub="Denní odměny, vklady s bonusem a věrnostní akce pro aktivní obchodníky."
              cta="Prohlédnout bonusy"
            />
            <PromoCard
              image="/skinify_graphics/karambit.png"
              href="/marketplace?q=Karambit"
              eyebrow="Prémiové kusy"
              title="Nože & vzácné skiny"
              sub="Karambit, M9 Bayonet a další vzácné kusy od ověřených prodejců."
              cta="Prohlédnout nože"
            />
          </div>
        </Reveal>

        {/* ===== 6 · SEO text + FAQ accordion ===== */}
        <Reveal>
          <LandingSeoBlock isCS={isCS} faq={LANDING_FAQ} />
        </Reveal>

        {/* ===== 7 · PROMO BANNER — the purple Skinify banner, at the very
            bottom as a closing call-to-action. ===== */}
        <Reveal className="mt-12">
          <PromoBanner />
        </Reveal>
      </main>

      <Footer />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   AccountBanner — the signed-in landing hero, redesigned around the thing
   that actually makes a skin marketplace exciting: the skins. No chart.

   Left  — staggered greeting, a big balance figure, Refill CTA and
           quick-jump chips.
   Right — a floating cluster of real listing art (top promoted items),
           each gently bobbing on its own rhythm, clickable through to the
           item. Pure product, pure motion.
   Bottom — a live price ticker marquee (name · price) drifting across the
           banner edge like an exchange board.
   ───────────────────────────────────────────────────────────────────────── */
const bannerParent = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const bannerChild = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } },
};

const AccountBanner: React.FC<{
  user: any;
  balance: number;
  formatPrice: (n: number) => string;
  items?: any[];
  onRefill: () => void;
  onProfile: () => void;
  onBrowse?: () => void;
  onSell?: () => void;
  onView?: (id: string) => void;
}> = ({ user, balance, formatPrice, items = [], onRefill, onProfile, onBrowse, onSell, onView }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 26 }}
      className="relative overflow-hidden rounded-[28px]"
      style={{
        background:
          'linear-gradient(115deg, rgb(var(--accent) / 0.16) 0%, rgb(var(--accent) / 0.05) 45%, rgb(var(--bg)) 82%)',
      }}
    >
      {/* Content */}
      <motion.div
        variants={bannerParent}
        initial="hidden"
        animate="shown"
        className="relative px-6 sm:px-9 py-8 sm:py-9"
      >
        <motion.button
          variants={bannerChild}
          onClick={onProfile}
          className="flex items-center gap-4 min-w-0 text-left"
          aria-label="Otevřít profil"
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover ring-2 ring-accent/30 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-subtle shrink-0" />
          )}
          <div className="min-w-0">
            <span className="label-eyebrow">Vítejte zpět</span>
            <div className="text-[24px] sm:text-[30px] font-bold tracking-tight leading-tight truncate">
              {user.displayName || 'Trader'} 👋
            </div>
          </div>
        </motion.button>

        <motion.div variants={bannerChild} className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
          <div>
            <span className="label-meta">Dostupný zůstatek</span>
            <div className="text-[36px] sm:text-[46px] font-bold text-ink tracking-tight tabular-nums leading-none mt-2">
              {formatPrice(balance || 0)}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={tap}
            onClick={onRefill}
            className="h-12 px-7 rounded-full bg-accent text-on-accent text-[14px] font-bold shrink-0"
            style={{ boxShadow: '0 12px 28px -12px rgb(var(--accent) / 0.75)' }}
          >
            + Dobít zůstatek
          </motion.button>
        </motion.div>

        <motion.div variants={bannerChild} className="mt-6 flex flex-wrap gap-2">
          {[
            { label: 'Procházet trh', onClick: onBrowse },
            { label: 'Prodat skiny', onClick: onSell },
            { label: 'Můj profil', onClick: onProfile },
          ].map((c) => (
            <button
              key={c.label}
              onClick={c.onClick}
              className="h-10 px-4 rounded-full bg-ink/[0.04] dark:bg-white/[0.06] hover:bg-accent hover:text-on-accent text-ink text-[13px] font-bold transition-colors"
            >
              {c.label}
            </button>
          ))}
        </motion.div>
      </motion.div>

    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   PromoSlot — reserved space for promotional graphics. Renders a clean
   gradient placeholder (with a dashed inner outline so it reads as a slot)
   until real campaign artwork is dropped in via the `image` prop.
   ───────────────────────────────────────────────────────────────────────── */
const PromoSlot: React.FC<{
  label?: string;
  sub?: string;
  ratio?: string;
  image?: string;
  href?: string;
}> = ({ label = 'Promo plocha', sub = 'Místo pro vaši grafiku', ratio = '1200 / 280', image, href }) => {
  const inner = image ? (
    <img src={image} alt={label} className="absolute inset-0 w-full h-full object-cover" />
  ) : (
    <>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(115deg, rgb(var(--accent) / 0.10) 0%, rgb(var(--accent) / 0.03) 50%, transparent 90%)',
        }}
      />
      <div className="absolute inset-3 rounded-2xl border border-dashed border-line/70 grid place-items-center">
        <div className="text-center px-6">
          <div className="text-[15px] font-bold text-ink-muted">{label}</div>
          <div className="text-[12px] text-ink-dim font-medium mt-1">{sub}</div>
        </div>
      </div>
    </>
  );
  const cls = 'relative block w-full rounded-3xl overflow-hidden';
  return href ? (
    <a href={href} className={cls} style={{ aspectRatio: ratio }}>{inner}</a>
  ) : (
    <div className={cls} style={{ aspectRatio: ratio }}>{inner}</div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   MarketPreviewGrid — a 5×5 slice of the live marketplace under the
   sliders. The bottom row dissolves into the page background via a CSS
   mask, and a centered CTA floats over the fade to open the full
   marketplace.
   ───────────────────────────────────────────────────────────────────────── */
const MarketPreviewGrid: React.FC<{
  items: any[];
  isCS: boolean;
  onView: (id: string) => void;
  onAddCart: (item: any) => void;
  onToggleWish: (item: any) => void;
  isWished: (id: string) => boolean;
  formatPrice: (n: number) => string;
  onOpen: () => void;
}> = ({ items, isCS, onView, onAddCart, onToggleWish, isWished, formatPrice, onOpen }) => {
  const shown = items.slice(0, 25);
  return (
    <section>
      <div className="mb-4">
        <span className="label-eyebrow">{isCS ? 'Tržiště' : 'Marketplace'}</span>
        <h2 className="text-[19px] sm:text-[22px] font-bold text-ink tracking-tight leading-none mt-1">
          {isCS ? 'Náhled tržiště' : 'Marketplace preview'}
        </h2>
      </div>

      <div className="relative">
        {/* The grid — masked so the last row melts into the page. */}
        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0 isolate"
          style={{
            maskImage: 'linear-gradient(to bottom, black 62%, rgb(0 0 0 / 0.35) 82%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 62%, rgb(0 0 0 / 0.35) 82%, transparent 100%)',
          }}
        >
          {shown.map((item: any) => (
            <SkinCard
              key={item.id}
              variant="tile"
              item={item}
              onView={() => onView(String(item.id))}
              onAddCart={() => onAddCart(item)}
              onToggleWish={() => onToggleWish(item)}
              wished={isWished(String(item.id))}
              formatPrice={formatPrice}
            />
          ))}
        </div>

        {/* CTA floating in the middle of the dissolving last row. */}
        <div className="absolute inset-x-0 bottom-6 flex justify-center">
          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.04 }}
            onClick={onOpen}
            className="h-12 px-8 rounded-full bg-accent text-on-accent text-[14px] font-bold"
            style={{ boxShadow: '0 14px 32px -12px rgb(var(--accent) / 0.7)' }}
          >
            {isCS ? 'Otevřít tržiště' : 'Open the marketplace'} →
          </motion.button>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   PromoCard — composed promo tile for square artwork: copy + CTA on the
   left, the FULL graphic (object-contain, no crop) on the right, over a
   near-black gradient that matches the artwork's background so the image
   melts into the card in both themes.
   ───────────────────────────────────────────────────────────────────────── */
const PromoCard: React.FC<{
  image: string;
  href: string;
  eyebrow: string;
  title: string;
  sub: string;
  cta: string;
}> = ({ image, href, eyebrow, title, sub, cta }) => (
  <a
    href={href}
    className="group relative flex items-stretch overflow-hidden rounded-3xl min-h-[220px]"
    style={{ background: 'linear-gradient(115deg, #0b0714 0%, #150b26 60%, #0b0714 100%)' }}
  >
    <div className="flex-1 min-w-0 flex flex-col justify-center p-6 sm:p-8 relative z-10">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-purple-300/90">{eyebrow}</span>
      <h3 className="text-[22px] sm:text-[26px] font-bold text-white tracking-tight leading-tight mt-2">
        {title}
      </h3>
      <p className="text-[13px] text-zinc-300/85 font-medium mt-2 leading-relaxed max-w-[300px]">{sub}</p>
      <span className="mt-4 inline-flex items-center gap-1.5 self-start h-10 px-4 rounded-full bg-white text-[#0f1018] text-[12.5px] font-bold transition-transform group-hover:scale-[1.04]">
        {cta} →
      </span>
    </div>
    <div className="relative w-[45%] shrink-0">
      <img
        src={image}
        alt=""
        className="absolute inset-y-0 right-0 h-full w-auto max-w-none object-contain transition-transform duration-500 group-hover:scale-[1.05]"
        draggable={false}
      />
    </div>
  </a>
);

/* Fallback signed-out hero when there are no items to feature yet — a slim
   value-prop banner instead of the featured showcase. */
const SignedOutValueHero: React.FC<{ navigate: (to: string) => void; t: any }> = ({ navigate, t }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={spring}
    className="card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
  >
    <div className="max-w-[560px]">
      <span className="label-eyebrow">CS2 marketplace · 6% buyer fees</span>
      <h2 className="text-[24px] sm:text-[30px] font-bold tracking-tight leading-tight mt-2">
        {t('landing.hero.headline', 'Buy and sell CS2 skins, escrow-protected')}
      </h2>
      <p className="text-[13.5px] text-ink-muted font-medium mt-2 leading-relaxed">
        {t('landing.hero.lead', 'Sub-60-second Steam delivery, real-money payouts.')}
      </p>
    </div>
    <div className="flex gap-2 shrink-0">
      <button
        onClick={() => navigate('/marketplace')}
        className="h-11 px-5 rounded-full bg-accent text-on-accent text-[13px] font-bold"
      >
        {t('landing.hero.browseMarket', 'Browse market')}
      </button>
      <button
        onClick={() => navigate('/profile?tab=inventory')}
        className="h-11 px-5 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[13px] font-bold transition-colors"
      >
        {t('landing.hero.startSelling', 'Start selling')}
      </button>
    </div>
  </motion.div>
);

/* ─────────────────────────────────────────────────────────────────────────
   LandingTrustBar — thin value-point row + live-feeling stat counters.
   Borderless: divided by hairlines, no boxed card.
   ───────────────────────────────────────────────────────────────────────── */
const LandingTrustBar: React.FC<{ isCS: boolean; itemCount: number }> = ({ isCS, itemCount }) => {
  const points = isCS
    ? ['0% poplatek kupující', 'P2P obchodování', 'Escrow ochrana', 'Výplata do 60 s']
    : ['0% buyer fee', 'P2P trading', 'Escrow protected', 'Payout in 60s'];
  const stats = [
    { value: '2.9M+', label: isCS ? 'prodaných skinů' : 'skins sold' },
    { value: '666K+', label: isCS ? 'spokojených uživatelů' : 'happy users' },
    { value: Math.max(itemCount, 60000).toLocaleString(), label: isCS ? 'aktivních nabídek' : 'live listings' },
    { value: '4.7/5', label: isCS ? 'hodnocení' : 'rating' },
  ];
  return (
    <div className="mb-10">
      <motion.div
        variants={staggerParent}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true }}
        className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3"
      >
        {points.map((p, i) => (
          <motion.span
            key={p}
            variants={staggerChild}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {p}
            {i < points.length - 1 && <span className="hidden sm:inline text-ink-dim ml-4">·</span>}
          </motion.span>
        ))}
      </motion.div>
      <motion.div
        variants={staggerParent}
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-y-4 border-t border-line/60 pt-5"
      >
        {stats.map((s) => (
          <motion.div key={s.label} variants={staggerChild}>
            <div className="text-[24px] sm:text-[28px] font-bold text-ink tracking-tight tabular-nums leading-none">
              {s.value}
            </div>
            <div className="text-[12px] text-ink-muted font-medium mt-1.5">{s.label}</div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   BestSkinsGrid — the "Best prices for you" block with price-bracket tabs
   (Best / under $10 / $25 / $50) over a dense uniform card grid. Reference:
   white.market's "Best skins" tabbed grid.
   ───────────────────────────────────────────────────────────────────────── */
const BestSkinsGrid: React.FC<{
  items: any[];
  loading: boolean;
  onView: (id: string) => void;
  onAddCart: (item: any) => void;
  onToggleWish: (item: any) => void;
  isWished: (id: string) => boolean;
  formatPrice: (n: number) => string;
  onSeeAll: () => void;
  isCS: boolean;
}> = ({ items, loading, onView, onAddCart, onToggleWish, isWished, formatPrice, onSeeAll, isCS }) => {
  /* Brackets in CZK (the platform's base currency). "Best" is the whole
     set sorted by price asc; the others cap at the threshold. */
  const BRACKETS = [
    { id: 'best', label: isCS ? 'Nejlepší' : 'Best', max: Infinity },
    { id: 'u250', label: isCS ? 'Do 250 Kč' : 'Under 250', max: 250 },
    { id: 'u1000', label: isCS ? 'Do 1 000 Kč' : 'Under 1000', max: 1000 },
    { id: 'u5000', label: isCS ? 'Do 5 000 Kč' : 'Under 5000', max: 5000 },
  ];
  const [tab, setTab] = useState('best');
  const active = BRACKETS.find((b) => b.id === tab) || BRACKETS[0];

  const shown = useMemo(() => {
    const arr = (items || []).filter((it) => (it?.price || 0) <= active.max);
    // Show EVERY promoted listing — sellers pay for the slot, so nothing
    // gets cut off by an arbitrary cap.
    return [...arr].sort((a, b) => (a?.price || 0) - (b?.price || 0));
  }, [items, active.max]);

  return (
    <section className="mb-12">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <span className="label-eyebrow">{isCS ? 'Doporučené' : 'Featured'}</span>
          <h2 className="text-[20px] sm:text-[24px] font-bold text-ink tracking-tight leading-none mt-1">
            {isCS ? 'Promované položky' : 'Promoted items'}
          </h2>
        </div>
        <button
          onClick={onSeeAll}
          className="text-[13px] font-bold text-accent hover:opacity-80 transition-opacity"
        >
          {isCS ? 'Zobrazit vše' : 'See all'} →
        </button>
      </div>

      {/* Bracket tabs — plain pills, sliding accent, no container. */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 mb-4">
        {BRACKETS.map((b) => {
          const isActive = tab === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setTab(b.id)}
              className={`relative shrink-0 h-9 px-4 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${
                isActive ? 'text-on-accent' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {isActive && (
                <motion.span layoutId="best-bracket-pill" className="absolute inset-0 rounded-full bg-accent" transition={spring} />
              )}
              {!isActive && <span className="absolute inset-0 rounded-full bg-subtle/60" aria-hidden />}
              <span className="relative">{b.label}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0 isolate">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkinCardSkeleton key={i} />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="text-[14px] text-ink-muted font-medium py-12 text-center">
          {isCS ? 'V tomto cenovém pásmu zatím nic není.' : 'Nothing in this price range yet.'}
        </p>
      ) : (
        <motion.div
          variants={staggerParent}
          initial="hidden"
          animate="shown"
          key={tab}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-0 isolate"
        >
          {shown.map((item: any) => (
            <motion.div key={item.id} variants={staggerChild} transition={spring}>
              <SkinCard
                variant="tile"
                item={item}
                onView={() => onView(String(item.id))}
                onAddCart={() => onAddCart(item)}
                onToggleWish={() => onToggleWish(item)}
                wished={isWished(String(item.id))}
                formatPrice={formatPrice}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   LandingSeoBlock — SEO copy + an expandable FAQ accordion (the "Have
   questions?" section on the references), kept below the fold.
   ───────────────────────────────────────────────────────────────────────── */
/* Original long-form SEO copy — structured like the big marketplaces'
   footer essay, but written fresh for Skinify (no copied text). Collapsed
   behind a "read more" so it doesn't dominate the page while still being
   fully in the DOM for crawlers. */
const SEO_SECTIONS_EN: { h: string; p: string[] }[] = [
  {
    h: 'Buy & sell CS2 (CS:GO) skins the easy, secure way with Skinify',
    p: [
      'Skinify is a peer-to-peer marketplace built to make trading Counter-Strike 2 skins simple, fast and safe. Every purchase is protected by escrow, items are delivered to your Steam inventory in under a minute, and sellers cash out in real money — not locked Steam wallet funds. With low, transparent fees and a large, active community, you can buy the skin you want or sell the ones you don’t in just a few clicks.',
    ],
  },
  {
    h: 'A short introduction to CS2 skins',
    p: [
      'Since weapon finishes first arrived in Counter-Strike back in 2013, skins have become a core part of the game’s culture. They let you customise your rifles, pistols, knife and gloves without changing how anything plays. What makes them special is that they aren’t permanently bound to your account — they live in your Steam inventory and can be freely bought, sold and traded with other players.',
      'You can obtain skins in several ways: by opening cases with keys for a random item from a collection, from occasional in-game drops and operations, or simply by buying exactly the one you want on a marketplace. Rarity ranges from common finishes worth a few cents to exceedingly rare knives and gloves worth thousands, and the CS2 economy has only kept growing year after year.',
    ],
  },
  {
    h: 'What is the Skinify marketplace?',
    p: [
      'Skinify is an easy-to-use marketplace for CS2 items that lets you buy and sell skins for real money. Whether you’re after a clean AK-47, an AWP with a rare pattern, or a knife to finish a loadout, you’ll find thousands of listings from verified sellers. Prices are shown in your local currency, and with our low buyer fee the price you see is very close to the price you pay.',
      'Every item on the site is real and deliverable. When you buy, the seller sends the item straight to your Steam account through our escrow-protected flow, so your money is only released once the skin lands safely in your inventory.',
    ],
  },
  {
    h: 'How Skinify differs from the Steam Community Market',
    p: [
      'Unlike the Steam Market, Skinify lets you sell skins for cash you can actually withdraw. Steam wallet funds can only ever be spent on Steam, and Steam caps item prices and charges a large fee on every sale — which makes it a poor place to sell rare, expensive skins. On Skinify your proceeds are yours: withdraw them to your bank or keep buying, with full flexibility.',
      'For buyers, our detailed filters make it easy to search by float value, paint seed, pattern, stickers and more, so you can find the exact copy of a skin you’re looking for — including items that never even appear on the Steam Market.',
    ],
  },
  {
    h: 'How to buy CS2 skins on Skinify',
    p: [
      'Buying is transparent and quick. Browse the marketplace, use the filters to narrow down by weapon, wear, rarity or price, and add the items you like to your cart. When you’re ready, check out and pay — no need to top up a balance first or wait around for a seller to come online.',
      'After purchase, the item is delivered to your Steam account automatically. Some skins carry a Steam trade lock of up to 8 days; if you buy a locked item it is held safely in your Skinify inventory until the lock expires, then sent to you. Our escrow only releases the seller’s payment once you’ve received the skin, so both sides are protected.',
    ],
  },
  {
    h: 'Is selling CS2 skins just as easy?',
    p: [
      'Yes. Link your Steam account, open your inventory, pick the items you want to sell and set a price — we suggest a fair one based on recent sales, and you’re always free to price it yourself. You stay in control: change the price any time before it sells, or delist and keep the item.',
      'When a listing sells, our low selling fee is taken from the sale price and the rest is yours to withdraw. Payment-processor rules mean sellers who reach a certain volume complete a one-time identity check (KYC) — we’ll let you know by email when it’s needed. Everything else is handled for you, so selling stays fast, straightforward and safe.',
    ],
  },
];
const SEO_SECTIONS_CS: { h: string; p: string[] }[] = [
  {
    h: 'Nakupujte a prodávejte CS2 (CS:GO) skiny snadno a bezpečně se Skinify',
    p: [
      'Skinify je peer-to-peer tržiště, které dělá obchodování se skiny do Counter-Strike 2 jednoduché, rychlé a bezpečné. Každý nákup je chráněný escrowem, položky jsou doručeny do vašeho Steam inventáře během minuty a prodejci si vybírají skutečné peníze — ne uzamčený zůstatek na Steamu. Díky nízkým a transparentním poplatkům a velké aktivní komunitě koupíte skin, který chcete, nebo prodáte ty, které nepotřebujete, na pár kliknutí.',
    ],
  },
  {
    h: 'Krátký úvod do CS2 skinů',
    p: [
      'Od chvíle, kdy se v roce 2013 v Counter-Strike objevily první vzhledy zbraní, se skiny staly nedílnou součástí kultury hry. Umožňují upravit pušky, pistole, nůž i rukavice, aniž by měnily hratelnost. Jsou výjimečné tím, že nejsou trvale svázané s vaším účtem — leží ve vašem Steam inventáři a lze je volně kupovat, prodávat a měnit s ostatními hráči.',
      'Skiny získáte několika způsoby: otevíráním beden klíči pro náhodnou položku z kolekce, z občasných dropů a operací přímo ve hře, nebo prostě koupí přesně toho, co chcete, na tržišti. Vzácnost sahá od běžných vzhledů za pár korun po extrémně vzácné nože a rukavice za tisíce — a ekonomika CS2 rok co rok jen roste.',
    ],
  },
  {
    h: 'Co je tržiště Skinify?',
    p: [
      'Skinify je snadno použitelné tržiště pro CS2 položky, které vám umožní nakupovat a prodávat skiny za skutečné peníze. Ať už hledáte čistou AK-47, AWP se vzácným patternem nebo nůž do loadoutu, najdete tisíce nabídek od ověřených prodejců. Ceny se zobrazují v místní měně a díky nízkému poplatku pro kupující se cena, kterou vidíte, blíží ceně, kterou zaplatíte.',
      'Každá položka na webu je skutečná a doručitelná. Při nákupu prodejce pošle položku přímo na váš Steam účet přes náš escrow, takže se peníze uvolní až ve chvíli, kdy skin bezpečně dorazí do vašeho inventáře.',
    ],
  },
  {
    h: 'Jak se Skinify liší od Steam tržiště',
    p: [
      'Na rozdíl od Steam tržiště vám Skinify umožní prodat skiny za peníze, které si skutečně vyberete. Zůstatek na Steamu lze utratit jen na Steamu, Steam navíc omezuje ceny položek a účtuje vysoký poplatek z každého prodeje — což z něj dělá špatné místo pro prodej vzácných a drahých skinů. Na Skinify jsou vaše výdělky vaše: vyberte si je na účet, nebo dál nakupujte.',
      'Pro kupující usnadňují detailní filtry hledání podle float hodnoty, paint seedu, patternu, samolepek a dalšího, takže najdete přesně tu kopii skinu, kterou chcete — včetně položek, které se na Steam tržišti nikdy neobjeví.',
    ],
  },
  {
    h: 'Jak koupit CS2 skiny na Skinify',
    p: [
      'Nákup je transparentní a rychlý. Procházejte tržiště, filtry zúžíte výběr podle zbraně, opotřebení, vzácnosti nebo ceny a položky přidáte do košíku. Až budete připraveni, zaplaťte — není potřeba nejprve dobíjet zůstatek ani čekat, až se prodejce připojí.',
      'Po nákupu je položka automaticky doručena na váš Steam účet. Některé skiny mají Steam trade lock až 8 dní; pokud koupíte uzamčenou položku, je bezpečně uložena ve vašem Skinify inventáři, dokud zámek nevyprší. Escrow uvolní platbu prodejci až poté, co skin obdržíte, takže jsou chráněné obě strany.',
    ],
  },
  {
    h: 'Je prodej CS2 skinů stejně snadný?',
    p: [
      'Ano. Propojte svůj Steam účet, otevřete inventář, vyberte položky k prodeji a nastavte cenu — doporučíme férovou na základě posledních prodejů, ale cenu si vždy určíte sami. Máte to pod kontrolou: cenu můžete kdykoli před prodejem změnit, nebo nabídku stáhnout.',
      'Když se nabídka prodá, náš nízký prodejní poplatek se strhne z prodejní ceny a zbytek je váš k výběru. Pravidla platebních zprostředkovatelů vyžadují, aby prodejci po dosažení určitého objemu prošli jednorázovým ověřením totožnosti (KYC) — dáme vám vědět e-mailem, až bude potřeba.',
    ],
  },
];

/* Inline clickthrough terms — known entities inside the SEO essay render
   as accent links to the matching marketplace search (escrow → FAQ). */
const SEO_TERM_SPLIT = /(AK-47|AWP|Karambit|M9 Bayonet|Butterfly Knife|StatTrak™?|[Ee]scrow\w*)/g;
const isSeoTerm = (p: string) =>
  /^(AK-47|AWP|Karambit|M9 Bayonet|Butterfly Knife|StatTrak™?|[Ee]scrow\w*)$/.test(p);
const seoTermHref = (m: string) =>
  m.toLowerCase().startsWith('escrow') ? '/faq' : `/marketplace?q=${encodeURIComponent(m.replace('™', ''))}`;
const Linkified: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split(SEO_TERM_SPLIT).map((part, i) =>
      isSeoTerm(part) ? (
        <a key={i} href={seoTermHref(part)} className="text-accent font-semibold hover:underline">
          {part}
        </a>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    )}
  </>
);

const LandingSeoBlock: React.FC<{ isCS: boolean; faq: { question: string; answer: string }[] }> = ({
  isCS,
  faq,
}) => {
  const sections = isCS ? SEO_SECTIONS_CS : SEO_SECTIONS_EN;

  const keywords = [
    'AK-47', 'AWP', 'M4A4', 'Desert Eagle', 'Karambit', 'M9 Bayonet',
    'Butterfly Knife', 'Sport Gloves', 'Stickers', 'StatTrak',
  ];

  return (
    <section className="mt-10">
      {/* Long-form SEO essay + blog column. The essay stretches across the
          left; the right rail is filled with blog links so there's no dead
          gap beside the text. Type sizes are a step up for readability. */}
      <div className="mt-4 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-x-14 gap-y-10">
        <div className="min-w-0">
          <span className="label-eyebrow text-accent">{isCS ? 'O Skinify' : 'About Skinify'}</span>
          <h2 className="text-[26px] sm:text-[34px] font-bold text-ink tracking-tight mt-2 leading-tight">
            {sections[0].h}
          </h2>
          {sections[0].p.map((para, i) => (
            <p
              key={i}
              className={`text-ink-muted font-medium mt-4 leading-[1.85] ${
                i === 0 ? 'text-[16px] sm:text-[17.5px] text-ink/90' : 'text-[15px]'
              }`}
            >
              <Linkified text={para} />
            </p>
          ))}

          {/* Keyword links — click through to marketplace searches. */}
          <div className="mt-6 flex flex-wrap gap-2">
            {keywords.map((w) => (
              <a
                key={w}
                href={`/marketplace?q=${encodeURIComponent(w)}`}
                className="h-9 px-4 rounded-full bg-subtle hover:bg-accent hover:text-on-accent text-ink text-[13px] font-semibold inline-flex items-center transition-colors"
              >
                {w}
              </a>
            ))}
          </div>

          {/* Remaining sections — two columns inside the essay area. */}
          <div className="mt-12 grid xl:grid-cols-2 gap-x-12 gap-y-10">
            {sections.slice(1).map((sec) => (
              <div key={sec.h}>
                <h3 className="text-[19px] font-bold text-ink tracking-tight">{sec.h}</h3>
                {sec.p.map((para, i) => (
                  <p key={i} className="text-[15px] text-ink-muted font-medium mt-3 leading-[1.85]">
                    <Linkified text={para} />
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Blog rail — thumbnail cards stretched to the full height of the
            essay column, so the gap is filled all the way down to the FAQ. */}
        <aside className="flex flex-col lg:pt-10">
          <span className="label-eyebrow">{isCS ? 'Z našeho blogu' : 'From the blog'}</span>
          <div className="mt-3 flex-1 flex flex-col gap-3">
            {(isCS
              ? [
                  { slug: 'cs2-skin-prices-explained', title: 'Jak vznikají ceny CS2 skinů — float, pattern a samolepky', cat: 'Průvodce', img: '/skinify_graphics/karambit.png' },
                  { slug: 'avoiding-cs2-skin-scams', title: 'Jak se vyhnout podvodům se skiny — 8 vzorců, na které si dát pozor', cat: 'Bezpečnost', img: '/skinify_graphics/coins.png' },
                  { slug: 'p2p-vs-steam-market', title: 'P2P tržiště vs. Steam Market — kdy se vyplatí které', cat: 'Srovnání', img: '/skinify_graphics/banner-trade.png' },
                ]
              : [
                  { slug: 'cs2-skin-prices-explained', title: 'How CS2 skin prices are set — float, pattern and stickers', cat: 'Guide', img: '/skinify_graphics/karambit.png' },
                  { slug: 'avoiding-cs2-skin-scams', title: 'Avoiding CS2 skin scams — eight patterns to watch for', cat: 'Safety', img: '/skinify_graphics/coins.png' },
                  { slug: 'p2p-vs-steam-market', title: 'P2P marketplaces vs Steam Market — when each one wins', cat: 'Compare', img: '/skinify_graphics/banner-trade.png' },
                ]
            ).map((b) => (
              <a
                key={b.slug}
                href={`/blog/${b.slug}`}
                className="flex-1 min-h-[180px] flex flex-col overflow-hidden rounded-2xl bg-ink/[0.03] dark:bg-white/[0.04] hover:bg-accent/[0.08] transition-colors group"
              >
                <div className="relative flex-1 min-h-[110px] overflow-hidden" style={{ background: '#0b0714' }}>
                  <img
                    src={b.img}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    loading="lazy"
                    draggable={false}
                  />
                </div>
                <div className="p-4">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-accent">{b.cat}</span>
                  <div className="text-[14.5px] font-bold text-ink leading-snug mt-1.5 group-hover:text-accent transition-colors">
                    {b.title}
                  </div>
                </div>
              </a>
            ))}
          </div>
          <a
            href="/blog"
            className="mt-4 inline-block text-[13.5px] font-bold text-accent hover:opacity-80 transition-opacity"
          >
            {isCS ? 'Všechny články' : 'All articles'} →
          </a>        </aside>
      </div>

      {/* FAQ — always expanded, wide two-column layout. */}
      <div className="mt-14">
        <h3 className="text-[22px] sm:text-[26px] font-bold text-ink tracking-tight mb-6">
          {isCS ? 'Máte otázky?' : 'Have questions?'}
        </h3>
        <div className="grid lg:grid-cols-2 gap-x-14 gap-y-8">
          {faq.map((f, i) => (
            <div key={i}>
              <h4 className="text-[16.5px] font-bold text-ink tracking-tight">{f.question}</h4>
              <p className="text-[14.5px] text-ink-muted font-medium leading-[1.85] mt-2.5">
                {f.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   PromotedRow — the first thing under the welcome banner: a horizontal,
   click-and-drag slider of paid-promotion listings. Accent-framed header
   with a flame badge so it reads as "featured". Only renders when there
   are promoted items (caller guards on length).
   ───────────────────────────────────────────────────────────────────────── */
const PromotedRow: React.FC<{
  items: any[];
  title?: string;
  eyebrow?: string;
  onView: (id: string) => void;
  onAddCart: (item: any) => void;
  onToggleWish: (item: any) => void;
  isWished: (id: string) => boolean;
  formatPrice: (n: number) => string;
}> = ({ items, title = 'Promoted right now', eyebrow = 'Featured', onView, onAddCart, onToggleWish, isWished, formatPrice }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
  /* Dot pagination — the slider is divided into `dotCount` pages; the
     active dot follows the scroll position. Clicking a dot scrolls to it. */
  const shown = items.slice(0, 20);
  const dotCount = Math.min(6, Math.max(1, Math.ceil(shown.length / 4)));
  const [activeDot, setActiveDot] = useState(0);
  const onScroll = () => {
    const node = ref.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    const frac = max > 0 ? node.scrollLeft / max : 0;
    setActiveDot(Math.round(frac * (dotCount - 1)));
  };
  const goToDot = (i: number) => {
    const node = ref.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    node.scrollTo({ left: (max * i) / Math.max(1, dotCount - 1), behavior: 'smooth' });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    const node = ref.current;
    if (!node) return;
    drag.current = { active: true, startX: e.clientX, startScroll: node.scrollLeft, moved: false };
    node.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const node = ref.current;
    if (!node || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    node.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = (e: React.PointerEvent) => {
    const node = ref.current;
    if (node) node.releasePointerCapture?.(e.pointerId);
    if (drag.current.moved) {
      const stop = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
      node?.addEventListener('click', stop, { capture: true, once: true });
    }
    drag.current.active = false;
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.05 }}
      className="mb-8 relative"
    >
      {/* Plain type header — no boxed background, no icon. */}
      <div className="flex items-end justify-between gap-4 mb-1">
        <div>
          <span className="label-eyebrow text-accent">{eyebrow}</span>
          <h2 className="text-[19px] sm:text-[22px] font-bold text-ink tracking-tight leading-none mt-1">
            {title}
          </h2>
        </div>
        <span className="text-[12.5px] font-bold text-ink-muted tabular-nums shrink-0">
          {items.length}
        </span>
      </div>

      <div
        ref={ref}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex gap-3 overflow-x-auto scrollbar-thin pt-6 pb-16 -my-4 cursor-grab active:cursor-grabbing select-none touch-pan-x"
      >
        {shown.map((it) => (
          <div key={it.id} className="shrink-0 w-52">
            <SkinCard
              variant="tile"
              item={it}
              onView={() => onView(String(it.id))}
              onAddCart={() => onAddCart(it)}
              onToggleWish={() => onToggleWish(it)}
              wished={isWished(String(it.id))}
              formatPrice={formatPrice}
            />
          </div>
        ))}
      </div>

      {/* Dot pagination — the wireframe's • • • • • row under the slider. */}
      {dotCount > 1 && (
        <div className="flex items-center justify-center gap-2 -mt-1">
          {Array.from({ length: dotCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToDot(i)}
              aria-label={`Go to page ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === activeDot ? 'w-5 bg-accent' : 'w-2 bg-ink/20 hover:bg-ink/35'
              }`}
            />
          ))}
        </div>
      )}
    </motion.section>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   PromotedWall — large grid of promoted items shown at the top of the
   landing page.

   Behaviour:
     - First batch is 50 items
     - First 5 tiles are accent-highlighted (live paid promo slots)
     - Items 6..50 render normally
     - Tiles past index ~30 fade to lower opacity to signal that they're
       further down the queue / rotating into the spotlight
     - "Load more" CTA appends another batch of 50 each click

   This is the top-of-page replacement for the welcome banner. The
   welcome banner has been moved further down the page.
   ───────────────────────────────────────────────────────────────────────── */
const PROMOTED_BATCH = 50;
const PROMOTED_HIGHLIGHTED = 5;

/* ─────────────────────────────────────────────────────────────────────────
   FeaturedTradingCard — oversized trading-card style tile used in the
   top-5 carousel of the promoted wall.

   Design:
     - Rarity-tinted swirling radial backdrop that gently breathes
     - Giant ghosted weapon glyph as a watermark behind the skin
     - Skin image with a subtle vertical float loop
     - Diagonal "FEATURED" ribbon on the top-right with rank number
     - Mono-style name typography (Lexend display weight) + tracked
       wear/condition meta line
     - Animated number-ticker price + accent-rimmed Buy chip
   ───────────────────────────────────────────────────────────────────────── */
const RARITY_HEX_FEATURED: Record<string, string> = {
  consumer: '#B0C3D9',
  industrial: '#5E98D9',
  milspec: '#4B69FF',
  restricted: '#8847FF',
  classified: '#D32CE6',
  covert: '#EB4B4B',
  contraband: '#E4AE39',
  extraordinary: '#E4AE39',
};

const FeaturedTradingCard: React.FC<{
  item: any;
  index: number;
  onView: () => void;
  onAddCart: () => void;
  onToggleWish: () => void;
  wished: boolean;
  formatPrice: (n: number) => string;
}> = ({ item, index, onView, onAddCart, formatPrice }) => {
  const rarityKey = (item.rarity || '')
    .toLowerCase()
    .replace(/[^a-z-]/g, '')
    .replace('-', '');
  const color = RARITY_HEX_FEATURED[rarityKey] || '#8B8FA3';

  /* Pull "AK-47" out of "AK-47 | Redline (FT)"; everything after the
     pipe becomes the skin name on the plate. */
  const raw = item.name || item.market_name || '';
  const weapon =
    raw.split('|')[0]?.trim().replace(/^★\s*/, '').replace(/^StatTrak™\s*/, '') ||
    item.type ||
    '';
  const skin = (raw.split('|')[1] || raw).replace(/\(.*?\)/, '').trim();

  /* Short condition abbreviation for the meta line. */
  const condShort = (() => {
    const c = (item.condition || '').toLowerCase();
    if (c.includes('factory')) return 'FN';
    if (c.includes('minimal')) return 'MW';
    if (c.includes('field')) return 'FT';
    if (c.includes('well')) return 'WW';
    if (c.includes('battle')) return 'BS';
    return '';
  })();

  return (
    <motion.button
      type="button"
      onClick={onView}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      whileTap={tap}
      className="snap-start shrink-0 relative text-left cursor-pointer flex flex-col group bg-surface overflow-hidden"
      style={{
        width: 'min(82vw, 300px)',
        aspectRatio: '5 / 7',
        borderRadius: '18px',
        boxShadow: 'inset 0 0 0 1px rgb(var(--line))',
      }}
    >
      {/* Skin image */}
      <div className="relative flex-1 flex items-center justify-center px-6 pt-5">
        <img
          src={item.image}
          alt={raw}
          className="max-w-full max-h-full object-contain pointer-events-none transition-transform duration-300 group-hover:scale-[1.04]"
          loading="eager"
        />
      </div>

      {/* Info plate */}
      <div className="relative px-4 pt-3 pb-4">
        <div
          className="text-[9.5px] font-bold uppercase tracking-[0.16em] truncate"
          style={{ color }}
        >
          {weapon || 'Featured'}
        </div>
        <div
          className="font-bold text-ink tracking-tight truncate mt-1"
          style={{
            fontSize: 'clamp(15px, 4vw, 18px)',
            lineHeight: 1.15,
            fontFamily: '"Lexend", system-ui, sans-serif',
          }}
        >
          {skin || 'Featured skin'}
        </div>
        <div className="text-[11px] text-ink-muted font-medium truncate mt-0.5">
          {item.condition || 'Standard'}{condShort ? ` · ${condShort}` : ''}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div
            className="font-bold tabular-nums tracking-tight text-ink leading-none"
            style={{
              fontSize: 'clamp(16px, 4vw, 19px)',
              fontFamily: '"Lexend", system-ui, sans-serif',
            }}
          >
            {formatPrice(item.price)}
          </div>
          <motion.span
            whileTap={tap}
            whileHover={{ scale: 1.04 }}
            onClick={(e) => {
              e.stopPropagation();
              onAddCart();
            }}
            className="inline-flex items-center justify-center h-9 px-4 rounded-full bg-accent text-on-accent text-[12px] font-bold cursor-pointer"
          >
            Buy
          </motion.span>
        </div>
      </div>

      {/* Bottom rarity stripe — solid accent bar with a centred
          shimmer sweep. Parent has `overflow-hidden` so the bar
          clips cleanly to the card's rounded corners. */}
      <div
        aria-hidden
        className="absolute left-0 right-0 bottom-0 overflow-hidden"
        style={{ height: 6 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${color}00 0%, ${color} 14%, ${color} 86%, ${color}00 100%)`,
            boxShadow: `0 0 18px 0 ${color}80, inset 0 1px 0 ${color}ff`,
          }}
        />
        <motion.div
          className="absolute inset-y-0 w-1/3"
          initial={false}
          animate={{ left: ['-33%', '133%'] }}
          transition={{
            duration: 3.4,
            repeat: Infinity,
            ease: 'linear',
            delay: index * 0.5,
          }}
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${color}, transparent 100%)`,
            filter: 'blur(4px)',
            mixBlendMode: 'screen',
          }}
        />
      </div>
    </motion.button>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   FeaturedCarousel — auto-scrolling horizontal slider for the top-5
   promoted trading-cards.

   - Snaps card-by-card with a smooth scroll every 4s
   - Pauses while the user hovers, presses, or actively scrolls
   - Resumes 2.5s after the user releases
   - Pagination dots reflect the active index and let the user jump
   ───────────────────────────────────────────────────────────────────────── */
const FeaturedCarousel: React.FC<{
  items: any[];
  onView: (id: string) => void;
  onAddCart: (item: any) => void;
  onToggleWish: (item: any) => void;
  isWished: (id: string) => boolean;
  formatPrice: (n: number) => string;
}> = ({ items, onView, onAddCart, onToggleWish, isWished, formatPrice }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const resumeTimer = useRef<number | null>(null);

  const scrollToIndex = (i: number, smooth = true) => {
    const node = scrollerRef.current;
    if (!node) return;
    const card = node.querySelectorAll<HTMLElement>('[data-featured-card]')[i];
    if (!card) return;
    node.scrollTo({
      left: card.offsetLeft - node.offsetLeft - 8,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  /* Auto-cycle through cards every 4 s. Resets the interval whenever
     the user pauses (hover/touch) or the active card changes via
     manual scroll. */
  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = window.setInterval(() => {
      setActiveIdx((i) => {
        const next = (i + 1) % items.length;
        scrollToIndex(next);
        return next;
      });
    }, 4000);
    return () => window.clearInterval(t);
  }, [paused, items.length]);

  /* Track user scroll so the dots stay in sync if they swipe manually.
     Also pauses the auto-cycle briefly so we don't fight their input. */
  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const onScroll = () => {
      const cards = node.querySelectorAll<HTMLElement>('[data-featured-card]');
      let best = 0;
      let bestDelta = Infinity;
      cards.forEach((c, i) => {
        const d = Math.abs(c.offsetLeft - node.scrollLeft - 8);
        if (d < bestDelta) {
          bestDelta = d;
          best = i;
        }
      });
      setActiveIdx(best);
      setPaused(true);
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
      resumeTimer.current = window.setTimeout(() => setPaused(false), 2500);
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      node.removeEventListener('scroll', onScroll);
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    };
  }, []);

  return (
    <div
      className="mb-4 relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={scrollerRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-3 -mx-1 px-1"
        style={{ scrollPaddingLeft: '8px' }}
      >
        {items.map((item, i) => (
          <div key={`featured-${item.id}`} data-featured-card>
            <FeaturedTradingCard
              item={item}
              index={i}
              onView={() => onView(String(item.id))}
              onAddCart={() => onAddCart(item)}
              onToggleWish={() => onToggleWish(item)}
              wished={isWished(item.id)}
              formatPrice={formatPrice}
            />
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-1">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show featured card ${i + 1}`}
              onClick={() => {
                setActiveIdx(i);
                scrollToIndex(i);
                setPaused(true);
                if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
                resumeTimer.current = window.setTimeout(() => setPaused(false), 4000);
              }}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIdx ? 'w-6 bg-accent' : 'w-1.5 bg-ink-dim/30 hover:bg-ink-dim/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   LatestListings — back-fill under the promoted wall when few sellers
   pay for promotion. Shows the 15 newest marketplace listings; the
   grid's tail fades into translucency and a button below opens the
   full marketplace.
   ───────────────────────────────────────────────────────────────────────── */
const LatestListings: React.FC<{
  items: any[];
  onView: (id: string) => void;
  onAddCart: (item: any) => void;
  onToggleWish: (item: any) => void;
  isWished: (id: string) => boolean;
  formatPrice: (n: number) => string;
  onOpenMarketplace: () => void;
}> = ({ items, onView, onAddCart, onToggleWish, isWished, formatPrice, onOpenMarketplace }) => {
  const t = useT();

  const latest = useMemo(
    () =>
      [...(items || [])]
        .sort(
          (a: any, b: any) =>
            new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime(),
        )
        .slice(0, 15),
    [items],
  );

  if (latest.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-4 px-1">
        <h2 className="text-[17px] font-bold text-ink tracking-tight">
          {t('landing.section.browse.title', 'Procházet tržiště')}
        </h2>
        <p className="text-[12.5px] text-ink-muted mt-0.5 font-medium">
          {t('landing.latest.lead', 'The newest listings across the marketplace')}
        </p>
      </div>

      <div className="relative">
        <div
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-0 isolate"
          style={{
            /* The tail of the grid dissolves into the page — reads as
               "there's more" and hands off to the button below. */
            maskImage:
              'linear-gradient(to bottom, #000 0%, #000 62%, rgb(0 0 0 / 0.45) 82%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, #000 0%, #000 62%, rgb(0 0 0 / 0.45) 82%, transparent 100%)',
          }}
        >
          {latest.map((item: any, i: number) => {
            /* Cards under the fade shouldn't catch hovers/clicks. */
            const faded = i >= latest.length - 5;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.28,
                  delay: Math.min(i * 0.02, 0.3),
                  ease: [0.2, 0.65, 0.3, 1],
                }}
                className={faded ? 'pointer-events-none' : ''}
              >
                <SkinCard
                  variant="tile"
                  item={item}
                  onView={() => onView(String(item.id))}
                  onAddCart={() => onAddCart(item)}
                  onToggleWish={() => onToggleWish(item)}
                  wished={isWished(item.id)}
                  formatPrice={formatPrice}
                />
              </motion.div>
            );
          })}
        </div>

        <div className="-mt-10 relative z-10 flex justify-center">
          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.03 }}
            onClick={onOpenMarketplace}
            className="h-11 px-7 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5"
          >
            {t('landing.latest.openMarketplace', 'Open the marketplace')}
            <ArrowRight size={13} strokeWidth={2.6} />
          </motion.button>
        </div>
      </div>
    </section>
  );
};

const PromotedWall: React.FC<{
  items: any[];
  onView: (id: string) => void;
  onAddCart: (item: any) => void;
  onToggleWish: (item: any) => void;
  isWished: (id: string) => boolean;
  formatPrice: (n: number) => string;
}> = ({ items, onView, onAddCart, onToggleWish, isWished, formatPrice }) => {
  const t = useT();
  const [visibleCount, setVisibleCount] = useState(PROMOTED_BATCH);
  /* Filter state — drives the chip row. Categories map to a coarse
     classification on item.type / rarity / special so the user can
     narrow what's in the grid without leaving the landing page. */
  const [filter, setFilter] = useState<
    'all' | 'rifles' | 'knives' | 'pistols' | 'gloves' | 'covert' | 'stattrak'
  >('all');
  /* Track the height of a single tile so the bottom fade overlay
     covers exactly ONE row (not 40% of the whole grid). We measure
     the rendered tile DOM and update on resize / batch changes. */
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [rowHeight, setRowHeight] = useState(220);

  useEffect(() => {
    const node = gridRef.current;
    if (!node) return;
    const measure = () => {
      const firstTile = node.querySelector<HTMLElement>(':scope > div');
      if (firstTile) {
        const h = firstTile.getBoundingClientRect().height;
        if (h > 0 && Math.abs(h - rowHeight) > 1) setRowHeight(h);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [visibleCount, rowHeight]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((it: any) => {
      const t = String(it.type || '').toLowerCase();
      const r = String(it.rarity || '').toLowerCase();
      switch (filter) {
        case 'rifles':
          return t.includes('rifle') || t.includes('sniper');
        case 'knives':
          return (
            t.includes('knife') || t.includes('karambit') || t.includes('bayonet')
          );
        case 'pistols':
          return t.includes('pistol');
        case 'gloves':
          return t.includes('glove');
        case 'covert':
          return r.includes('covert') || r.includes('extraordinary');
        case 'stattrak':
          return it.special === 'stattrak';
      }
      return true;
    });
  }, [items, filter]);

  const visible = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount],
  );
  const hasMore = filteredItems.length > visibleCount;

  /* Reset to the first batch whenever the filter changes so the user
     always sees the top of the freshly-filtered list. */
  useEffect(() => {
    setVisibleCount(PROMOTED_BATCH);
  }, [filter]);

  /* When the filtered set shrinks, clamp visibleCount inside bounds
     so we don't render past the end. */
  useEffect(() => {
    if (visibleCount > filteredItems.length && filteredItems.length >= PROMOTED_BATCH) {
      setVisibleCount(Math.max(PROMOTED_BATCH, filteredItems.length));
    }
  }, [filteredItems.length, visibleCount]);

  if (items.length === 0) return null;

  return (
    <section className="mb-3">
      {/* Header — clean: title on the left, simple counter on the right. */}
      <header className="flex items-end justify-between gap-3 mb-3 px-1">
        <h2
          className="text-[20px] sm:text-[22px] font-bold text-ink tracking-tight leading-none"
          style={{ fontFamily: '"Lexend", system-ui, sans-serif' }}
        >
          {t('landing.promoted.title', 'Aktuálně populární')}
        </h2>
        <span className="text-[12px] text-ink-muted font-medium tabular-nums">
          {Math.min(filteredItems.length, visibleCount)} / {filteredItems.length}
        </span>
      </header>

      {/* TOP-5 TRADING-CARD CAROUSEL — the paid promotion slots are
          rendered as oversize trading-cards in a horizontal snap row.
          Card #1 carries the strongest accent, each subsequent slot
          gets a slightly weaker treatment so the eye walks down the
          row. No backgrounds beyond the rarity-derived accent so it
          looks like a curated set, not an ad. */}
      {visible.length > 0 && (
        <FeaturedCarousel
          items={visible.slice(0, PROMOTED_HIGHLIGHTED)}
          onView={onView}
          onAddCart={onAddCart}
          onToggleWish={onToggleWish}
          isWished={isWished}
          formatPrice={formatPrice}
        />
      )}

      {/* REGULAR GRID — items 6..N. Wrapped in a relative container
          so the bottom fade overlay can cover only the LAST ROW's
          bottom half without leaking onto neighbouring sections. */}
      <div className="relative">
        <div
          ref={gridRef}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-0 isolate"
        >
          <AnimatePresence initial={false}>
            {visible.slice(PROMOTED_HIGHLIGHTED).map((item, i) => {
              const idxInGrid = i;
              const totalGridItems = visible.length - PROMOTED_HIGHLIGHTED;
              /* The last row's tiles sit under the fade gradient. We
                 disable pointer events on them so:
                   1. Their hover ADD-TO-CART overlay (which renders at
                      `top: 100%`, below the tile) can't be triggered
                      under the fade where it'd be invisible.
                   2. Mouse wheel/scroll passes through cleanly into the
                      load-more button area.
                 Tiles fully above the fade keep all interactions. */
              const isFadedRow =
                hasMore && idxInGrid >= Math.max(0, totalGridItems - 6);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{
                    duration: 0.28,
                    delay: Math.min(i * 0.012, 0.35),
                    ease: [0.2, 0.65, 0.3, 1],
                  }}
                  className={`relative ${isFadedRow ? 'pointer-events-none' : ''}`}
                >
                  <SkinCard
                    variant="tile"
                    item={item}
                    onView={() => onView(String(item.id))}
                    onAddCart={() => onAddCart(item)}
                    onToggleWish={() => onToggleWish(item)}
                    wished={isWished(item.id)}
                    formatPrice={formatPrice}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Bottom fade overlay — softer + shorter so it suggests
            there's more below without making the page feel
            half-broken. `pointer-events-none` so it never blocks
            scroll or clicks. High z-index keeps it above any hover
            action bars that the SkinCard tile renders just below the
            tile (those are the elements that previously felt like
            they were swallowing the mouse). */}
        {hasMore && (
          <div
            aria-hidden
            className="absolute left-0 right-0 bottom-0 pointer-events-none z-40"
            style={{
              height: `${Math.round(rowHeight * 0.4)}px`,
              background:
                'linear-gradient(to bottom, transparent 0%, rgb(var(--bg) / 0.35) 50%, rgb(var(--bg) / 0.9) 100%)',
            }}
          />
        )}
      </div>

      {hasMore && (
        <div className="mt-4 flex flex-col items-center gap-2 relative">
          <motion.button
            whileTap={tap}
            whileHover={{ scale: 1.03 }}
            onClick={() => setVisibleCount((c) => c + PROMOTED_BATCH)}
            className="h-11 px-7 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center justify-center min-w-[200px] whitespace-nowrap"
          >
            Load {Math.min(PROMOTED_BATCH, filteredItems.length - visibleCount)} more
          </motion.button>
          <div className="text-[11px] text-ink-dim font-medium">
            {filteredItems.length - visibleCount} more listings below
          </div>
        </div>
      )}
    </section>
  );
};

/* PromoBanner — landing-page hero banner. Image lives in /public; the
   left-side dark zone of the artwork carries our promotional copy. The
   text fades up on mount and the CTA spring-pulses on hover. */
const PromoBanner: React.FC = () => {
  const navigate = useNavigate();
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="relative overflow-hidden rounded-3xl mb-3 isolate"
      style={{ aspectRatio: '1218 / 580' }}
    >
      <img
        src="/3586ae5d-05bb-4fcb-8a4e-9948fd62b17b.png"
        alt="Skinify · upgrade your CS2 skins"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />
      {/* Subtle left-side gradient to keep the copy legible on the dark zone */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgba(8,5,20,0.78) 0%, rgba(8,5,20,0.55) 30%, rgba(8,5,20,0) 60%)',
        }}
        aria-hidden
      />

      <div className="relative h-full grid grid-cols-1 lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-8 lg:py-0 max-w-[560px]">
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.08 }}
            className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-purple-300/90 mb-3"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-300 animate-pulse" />
            Welcome promo · live now
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.14 }}
            className="text-[26px] sm:text-[36px] lg:text-[44px] font-bold text-white leading-[1.05] tracking-tight"
          >
            Upgrade your skins.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300 via-fuchsia-300 to-purple-400">
              +10% on your first top-up.
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.2 }}
            className="text-[13px] sm:text-[14.5px] text-zinc-200/90 font-medium mt-3 leading-relaxed max-w-[440px]"
          >
            Buy AK-47, AWP, Karambit and more on Skinify — 0% buyer fees,
            escrow-protected trades, instant Steam delivery.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.26 }}
            className="mt-5 flex flex-wrap gap-2.5"
          >
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate('/marketplace')}
              className="h-11 px-5 rounded-full bg-white text-[#0f1018] text-[13px] font-bold inline-flex items-center gap-1.5"
              style={{ boxShadow: '0 14px 30px -12px rgba(168, 85, 247, 0.55)' }}
            >
              Browse the marketplace
              <ArrowRight size={14} strokeWidth={2.6} />
            </motion.button>
            <motion.button
              whileTap={tap}
              whileHover={{ scale: 1.03 }}
              onClick={() => navigate('/bonuses')}
              className="h-11 px-5 rounded-full bg-purple-500/30 hover:bg-purple-500/40 text-white text-[13px] font-bold inline-flex items-center gap-1.5 backdrop-blur-sm ring-1 ring-purple-300/40 transition-colors"
            >
              See bonuses
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

const Stat: React.FC<{ label: string; value: string; sub: string }> = ({
  label,
  value,
  sub,
}) => (
  <div className="card-flat p-4">
    <div className="label-meta">{label}</div>
    <div className="text-[20px] sm:text-[22px] font-bold text-ink tracking-tight tabular-nums leading-none mt-1.5">
      {value}
    </div>
    <div className="text-[11px] text-ink-muted font-medium mt-1 truncate">{sub}</div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   PromotedShowcase — replaces the static "Trade CS2 skins" headline.

   Renders a dark, ad-style hero showcasing one promoted user listing
   at a time (rotates every 6s) with the inspired layout from the
   reference image:
     - Left column: pinned label dots ("M4A1-S", "$15.25") + headline
       + CTA to buy a promotion slot (2 € / 24h)
     - Right column: big floating skin image

   The promoted items are sourced from the marketplace listings the
   page already loads — once the dedicated `promoted_listings` table
   ships, swap the `promoted` prop's source and nothing else changes.
   ───────────────────────────────────────────────────────────────────────── */
const PromotedShowcase: React.FC<{
  promoted: any[];
  formatPrice: (n: number) => string;
  onView: (id: string) => void;
}> = ({ promoted, formatPrice, onView }) => {
  const [idx, setIdx] = useState(0);
  /* "now" ticker — drives the countdown timer below. Updates once per
     second so HH:MM:SS counts down smoothly without re-rendering the
     whole tree at sub-second intervals. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Auto-rotate every 5 s minimum. Each promo gets at least 5 seconds
     on screen before swapping to the next. */
  useEffect(() => {
    if (promoted.length < 2) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % promoted.length);
    }, 5000);
    return () => clearInterval(t);
  }, [promoted.length]);

  /* Reset index if the promoted list shrinks while we're focused on a
     now-out-of-range entry. */
  useEffect(() => {
    if (idx >= promoted.length) setIdx(0);
  }, [idx, promoted.length]);

  const active = promoted[idx];

  /* Pull weapon class out of "AWP | Dragon Lore (FN)" → "AWP" for
     the small label-eyebrow chip. */
  const weaponClass = useMemo(() => {
    if (!active) return null;
    const raw = active.name || active.market_name || '';
    const first = raw.split('|')[0]?.trim();
    return first ? first.replace(/^★\s*/, '').replace(/^StatTrak™\s*/, '') : null;
  }, [active]);
  const skinName = useMemo(() => {
    if (!active) return null;
    const raw = active.name || active.market_name || '';
    const after = raw.split('|')[1];
    if (!after) return raw;
    return after.replace(/\(.*?\)/, '').trim().toUpperCase();
  }, [active]);

  /* Per-promo time-left countdown.
     Real listings can carry `promoted_until` (ISO string) — when
     present we count down to that timestamp. When missing we
     synthesize a stable 24 h window seeded by the item id so the
     timer feels real without requiring a backend deploy first. */
  const promoEndMs = useMemo(() => {
    if (!active) return null;
    const raw =
      (active as any).promoted_until ||
      (active as any).promotedUntil ||
      (active as any).promo_ends_at;
    if (raw) {
      const t = new Date(raw).getTime();
      if (Number.isFinite(t)) return t;
    }
    /* Deterministic 24-hour stretch — keyed by item id so reloading
       doesn't reset the timer to a wildly different value. */
    const seedSource = String(active.id || active.name || '');
    let seed = 0;
    for (let i = 0; i < seedSource.length; i++) {
      seed = (seed * 31 + seedSource.charCodeAt(i)) | 0;
    }
    const phaseMs = Math.abs(seed) % (24 * 60 * 60 * 1000);
    /* Build an end-time that's `phaseMs` from now, anchored to a fixed
       per-hour boundary so all viewers see roughly the same value. */
    const dayStart = Math.floor(now / (24 * 60 * 60 * 1000)) * 24 * 60 * 60 * 1000;
    return dayStart + 24 * 60 * 60 * 1000 + phaseMs;
  }, [active, now]);

  const timeLeft = useMemo(() => {
    if (!promoEndMs) return null;
    const diff = Math.max(0, promoEndMs - now);
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return { h, m, s, label: `${pad(h)}:${pad(m)}:${pad(s)}` };
  }, [promoEndMs, now]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.04 }}
      className="relative overflow-hidden flex flex-col justify-between min-h-[260px] sm:min-h-[340px] rounded-3xl"
      style={{
        /* Match the dark, slightly-purple ad backdrop from the
           reference. Token-driven so it tints with the user's accent. */
        background:
          'radial-gradient(140% 100% at 75% 50%, rgb(var(--accent) / 0.18) 0%, transparent 55%), linear-gradient(180deg, #0e1018 0%, #15131f 100%)',
      }}
    >
      {/* Header row — countdown only, no badge. */}
      <div className="relative z-10 p-5 sm:p-7 md:p-8 flex items-start justify-end gap-4">
        {timeLeft && (
          <motion.span
            key={active?.id || idx}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-full bg-black/35 ring-1 ring-white/15 backdrop-blur-sm text-white tabular-nums text-[12px] font-bold"
            aria-label={`Promotion ends in ${timeLeft.label}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Ends in <span className="font-mono">{timeLeft.label}</span>
          </motion.span>
        )}
      </div>

      {/* Body — pinned details + floating image */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-3 px-5 sm:px-7 md:px-8 pb-5 sm:pb-7 md:pb-8">
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div
              key={active.id || idx}
              initial={{ opacity: 0, x: -30, filter: 'blur(8px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: 18, filter: 'blur(6px)' }}
              transition={{
                opacity: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
                x: { type: 'spring', stiffness: 260, damping: 32, mass: 0.8 },
                filter: { duration: 0.35 },
              }}
              className="flex flex-col justify-end"
            >
              {/* Pinned weapon-class dot label */}
              {weaponClass && (
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
                  <span className="text-[12.5px] font-bold uppercase tracking-[0.18em] text-rose-400">
                    {weaponClass}
                  </span>
                </div>
              )}
              <h1 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold tracking-tight text-white leading-[1.02]">
                {skinName || 'Featured skin'}
              </h1>
              <div className="mt-3 inline-flex items-center gap-2 text-[12.5px] text-white/70 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {active.condition || 'Showcase'} ·{' '}
                <span className="font-semibold text-white/90">
                  by {active.seller?.name || 'Skinify'}
                </span>
              </div>

              <div className="mt-5">
                <motion.button
                  whileTap={tap}
                  whileHover={{ scale: 1.03 }}
                  onClick={() => onView(String(active.id))}
                  className="h-11 px-5 rounded-full bg-white text-zinc-900 text-[13px] font-bold inline-flex items-center gap-1.5"
                >
                  Buy for {formatPrice(active.price || 0)}
                  <ArrowRight size={13} strokeWidth={2.6} />
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="fallback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col justify-end"
            >
              <h1 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold tracking-tight text-white leading-[1.05]">
                No promotions live yet.
              </h1>
              <p className="mt-3 text-[14px] text-white/70 font-medium leading-relaxed max-w-[440px]">
                Featured listings appear here for 24 hours each. Check
                back soon.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skin image — taller container so wide rifle/knife sprites
            never get squashed. `min-h` guarantees enough vertical
            room for tall items (knives), `max-h` keeps the card from
            blowing out for square cases/stickers. */}
        <div className="relative h-[200px] sm:h-[260px] lg:h-[300px] [perspective:1200px]">
          <AnimatePresence mode="wait">
            {active && (
              <motion.div
                key={`img-${active.id || idx}`}
                initial={{
                  opacity: 0,
                  x: 90,
                  scale: 0.86,
                  rotateY: -22,
                  filter: 'blur(10px)',
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  rotateY: 0,
                  filter: 'blur(0px)',
                }}
                exit={{
                  opacity: 0,
                  x: -120,
                  scale: 0.82,
                  rotateY: 18,
                  filter: 'blur(8px)',
                }}
                transition={{
                  opacity: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                  filter: { duration: 0.4 },
                  default: { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 },
                }}
                style={{ transformStyle: 'preserve-3d' }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <img
                  src={active.image}
                  alt={active.name || active.market_name}
                  /* `w-full h-full object-contain` lets the image
                     fill whichever dimension is smaller while keeping
                     aspect — wide rifles span the width, tall knives
                     span the height. Neither gets clipped. */
                  className="block w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(168,85,247,0.35)] cursor-pointer"
                  onClick={() => onView(String(active.id))}
                  loading="eager"
                />

                {/* Price pin */}
                <div className="absolute top-3 right-3 sm:top-5 sm:right-5 flex items-center gap-2 pointer-events-none">
                  <span className="text-[18px] sm:text-[20px] font-bold tracking-tight text-white tabular-nums">
                    {formatPrice(active.price || 0)}
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Pagination dots — one per promoted slot, only when >1 */}
      {promoted.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
          {promoted.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show promoted item ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default LandingPage;
