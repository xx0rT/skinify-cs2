import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { weaponCategories } from '../data/weaponCategories';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { useCurrencyStore } from '../store/currencyStore';
import { MOCK_MARKET_ITEMS } from '../data/mockMarketItems';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   WeaponCategoriesIndexPage — /weapons

   Lands at the top of the browse funnel:
     /weapons   →   pick a category
     /weapons/:category   →   pick a weapon
     /weapons/:category/:weapon   →   browse skins

   Clean grid — no icons, no rainbow chips. Each category tile shows its
   name, description, weapon count, listings count, and lowest price.
   ───────────────────────────────────────────────────────────────────────── */

const WeaponCategoriesIndexPage: React.FC = () => {
  const navigate = useNavigate();
  const { items: liveItems } = useMarketplaceItems();
  const { formatPrice } = useCurrencyStore();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const items = useMemo(
    () => (liveItems && liveItems.length > 0 ? liveItems : MOCK_MARKET_ITEMS) as any[],
    [liveItems],
  );

  const enriched = useMemo(() => {
    return Object.values(weaponCategories).map((c) => {
      const catName = c.name.toLowerCase();
      const matches = items.filter((it) => {
        const t = String(it.type || '').toLowerCase();
        if (catName === 'rifles') return t.includes('rifle') || t.includes('sniper');
        if (catName === 'smgs') return t.includes('smg') || t.includes('submachine');
        if (catName === 'pistols') return t.includes('pistol');
        if (catName === 'knives') return t.includes('knife') || t.includes('karambit') || t.includes('bayonet');
        if (catName === 'gloves') return t.includes('glove');
        if (catName === 'heavy') return t.includes('heavy') || t.includes('shotgun') || t.includes('machine');
        return t.includes(catName);
      });
      const prices = matches.map((m) => Number(m.price || 0)).filter((p) => p > 0);
      return {
        name: c.name,
        description: c.description,
        weaponCount: c.weapons.length,
        listings: matches.length,
        floor: prices.length ? Math.min(...prices) : 0,
      };
    });
  }, [items]);

  const totalListings = enriched.reduce((s, c) => s + c.listings, 0);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <LandingNav />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 pt-4 pb-16 space-y-5">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-muted"
          aria-label="Breadcrumb"
        >
          <button onClick={() => navigate('/marketplace')} className="hover:text-ink transition-colors">
            Market
          </button>
          <ChevronRight size={12} strokeWidth={2.4} className="text-ink-dim" />
          <span className="text-ink font-bold">Categories</span>
        </motion.nav>

        {/* Title row */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex items-end justify-between gap-4 flex-wrap"
        >
          <div>
            <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-none">
              All categories
            </h1>
            <p className="text-[13px] text-ink-muted font-medium mt-2">
              {Object.keys(weaponCategories).length} categories
              {totalListings > 0 && (
                <>
                  {' '}· <span className="text-ink font-bold tabular-nums">{totalListings.toLocaleString()}</span> listings
                </>
              )}
            </p>
          </div>
        </motion.div>

        {/* Category grid */}
        <motion.div
          initial="hidden"
          animate="shown"
          variants={{
            hidden: {},
            shown: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
        >
          {enriched.map((c) => (
            <motion.button
              key={c.name}
              variants={{
                hidden: { opacity: 0, y: 14 },
                shown: { opacity: 1, y: 0, transition: spring },
              }}
              whileHover={{ y: -4 }}
              whileTap={tap}
              onClick={() => navigate(`/weapons/${encodeURIComponent(c.name)}`)}
              className="group relative card p-5 sm:p-6 text-left overflow-hidden transition-shadow"
            >
              <motion.div
                aria-hidden
                className="absolute top-0 left-0 h-[2px] bg-accent"
                initial={{ width: 0 }}
                whileHover={{ width: '100%' }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              />

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-dim">
                  {c.weaponCount} weapons
                </div>
                <motion.div
                  className="text-ink-dim group-hover:text-accent transition-colors"
                  whileHover={{ x: 3 }}
                >
                  <ChevronRight size={14} strokeWidth={2.4} />
                </motion.div>
              </div>

              <div className="text-[20px] sm:text-[22px] font-bold text-ink tracking-tight leading-tight">
                {c.name}
              </div>
              <p className="text-[13px] text-ink-muted font-medium mt-2 leading-relaxed line-clamp-2">
                {c.description}
              </p>

              <div className="mt-5 pt-4 border-t border-line flex items-end justify-between gap-2">
                <div>
                  <div className="label-meta">Listings</div>
                  <div className="text-[15px] font-bold text-ink tracking-tight tabular-nums leading-none mt-1">
                    {c.listings}
                  </div>
                </div>
                <div className="text-right">
                  <div className="label-meta">From</div>
                  <div className="text-[15px] font-bold text-ink tracking-tight tabular-nums leading-none mt-1">
                    {c.floor > 0 ? formatPrice(c.floor) : '—'}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default WeaponCategoriesIndexPage;
