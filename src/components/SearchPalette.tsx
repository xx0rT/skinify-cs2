import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  X,
  TrendingUp,
  Package,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { useHotItems } from '../hooks/useHotItems';
import { useCurrencyStore } from '../store/currencyStore';
import { CachedImage } from './ui/CachedImage';
import { rarityColor } from './ui/SkinCard';
import { spring } from '../lib/motion';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

/**
 * SearchPalette — Linear/Cmd-K style global search.
 *
 * Opens via:
 *   - ⌘K / Ctrl+K from anywhere
 *   - any element calling `openSearchPalette()` (exported below)
 *
 * Closes via:
 *   - Esc
 *   - backdrop click
 *   - selecting a result
 *
 * Index: live marketplace items + hot items. Filter is a plain
 * lowercase substring match on name + market_name + type. Cheap, no debounce
 * needed for sub-hundred-item lists; we cap visible results at 20.
 */

let _setOpen: ((open: boolean) => void) | null = null;
export const openSearchPalette = () => _setOpen?.(true);
export const closeSearchPalette = () => _setOpen?.(false);

/* ─────────────────────────────────────────────────────────────────────────
   Static page registry — let users jump straight to a top-level page from
   the search bar instead of having to discover them through the nav.
   Tags expand the keyword surface so e.g. "rules" finds Terms, "help"
   finds FAQ, etc.
   ───────────────────────────────────────────────────────────────────────── */
interface PageRef {
  title: string;
  subtitle: string;
  to: string;
  tags: string[];
}
const PAGES: PageRef[] = [
  { title: 'Marketplace', subtitle: 'Browse every live CS2 listing', to: '/marketplace', tags: ['market', 'browse', 'shop', 'buy', 'items'] },
  { title: 'My profile', subtitle: 'Inventory, balance, listings, orders', to: '/profile', tags: ['account', 'me', 'wallet', 'inventory'] },
  { title: 'Cart', subtitle: 'Review and check out', to: '/cart', tags: ['checkout', 'basket'] },
  { title: 'Wishlist', subtitle: 'Saved items', to: '/profile?tab=wishlist', tags: ['favorites', 'saved', 'liked'] },
  { title: 'Balance & top-up', subtitle: 'Deposit funds, manage payouts', to: '/profile?tab=balance', tags: ['wallet', 'deposit', 'money', 'fund', 'payout', 'top up'] },
  { title: 'My listings', subtitle: 'Items you have for sale', to: '/profile?tab=listings', tags: ['sell', 'sold', 'sales'] },
  { title: 'Orders', subtitle: 'Active and past trades', to: '/profile?tab=orders', tags: ['trades', 'purchases', 'history'] },
  { title: 'Settings', subtitle: 'Account, notifications, currency', to: '/profile?tab=settings', tags: ['preferences', 'currency', 'theme', 'notifications'] },
  { title: 'FAQ', subtitle: 'Common questions answered', to: '/faq', tags: ['help', 'support', 'questions'] },
  { title: 'Support', subtitle: 'Open a ticket, get help', to: '/support', tags: ['contact', 'help', 'ticket'] },
  { title: 'Contact', subtitle: 'Reach the team', to: '/contact', tags: ['email', 'help'] },
  { title: 'How escrow works', subtitle: 'Trade-back protection explained', to: '/dispute-resolution', tags: ['escrow', 'dispute', 'protection', 'refund'] },
  { title: 'Terms of Service', subtitle: 'Rules of using Skinify', to: '/terms', tags: ['rules', 'legal', 'tos'] },
  { title: 'Privacy Policy', subtitle: 'How we handle your data', to: '/privacy', tags: ['legal', 'gdpr', 'data'] },
  { title: 'Changelog', subtitle: 'What\'s new', to: '/changelog', tags: ['release', 'updates', 'news'] },
];

export const SearchPalette: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { items } = useMarketplaceItems();
  const { hotItems } = useHotItems(8);
  const { formatPrice } = useCurrencyStore();

  // Register global opener
  useEffect(() => {
    _setOpen = setOpen;
    return () => {
      if (_setOpen === setOpen) _setOpen = null;
    };
  }, []);

  // ⌘K / Ctrl+K listener + Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isCmdK) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll while open (via shared hook so stacked modals
  // don't clobber each other's overflow restore).
  useBodyScrollLock(open);
  useEffect(() => {
    if (open) {
      // microtask focus — modal renders, then we focus
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset query when closing so reopen is clean
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const all = useMemo(() => {
    const live = items || [];
    const hot = hotItems || [];
    // De-dupe by id, prefer hot version
    const map = new Map<string, any>();
    [...live, ...hot].forEach((it: any) => {
      if (!map.has(it.id)) map.set(it.id, it);
    });
    return Array.from(map.values());
  }, [items, hotItems]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return all
      .filter((it: any) => {
        const name = (it.name || it.market_name || '').toLowerCase();
        const type = (it.type || '').toLowerCase();
        return name.includes(q) || type.includes(q);
      })
      .slice(0, 20);
  }, [all, query]);

  const pageResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return PAGES.filter((p) => {
      const haystack =
        p.title.toLowerCase() + ' ' + p.subtitle.toLowerCase() + ' ' + p.tags.join(' ');
      return haystack.includes(q);
    }).slice(0, 6);
  }, [query]);

  const trending = useMemo(() => (hotItems || []).slice(0, 6), [hotItems]);

  const handleSelect = (id: string) => {
    setOpen(false);
    navigate(`/item/${id}`);
  };

  const handleSelectPage = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[80] bg-ink/40 backdrop-blur-sm"
          />

          {/*
            Panel — wrapped in a fixed full-width centering layer.
            We CANNOT put `-translate-x-1/2` on the framer-animated motion.div
            because framer's `animate={{ y, scale }}` writes its own inline
            `transform`, overriding the Tailwind translate and slamming the
            panel back to `left: 50%` (i.e. the right half of the screen).
            Outer fixed layer handles the centering with flex; inner motion.div
            only owns the entrance animation.
          */}
          <div className="fixed inset-x-0 top-[10vh] z-[81] flex justify-center px-3 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={spring}
              className="w-full max-w-[640px] pointer-events-auto"
            >
            {/* Wrapper provides the soft accent glow — rendered as an
                absolutely-positioned blurred shadow so it doesn't affect
                layout. Intensity scales with the input's focus state. */}
            <div className="relative">
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-1.5 rounded-[28px] transition-opacity duration-300"
                style={{
                  background:
                    'radial-gradient(60% 70% at 50% 0%, rgb(var(--accent) / 0.35), transparent 70%)',
                  filter: 'blur(18px)',
                  opacity: 0.9,
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-3xl"
                style={{
                  boxShadow:
                    '0 0 0 1px rgb(var(--accent) / 0.35), 0 0 0 4px rgb(var(--accent) / 0.10), 0 24px 60px -20px rgb(var(--accent) / 0.45)',
                }}
              />
              <div className="card-elevated overflow-hidden relative">
              {/* Search input */}
              <div className="flex items-center gap-3 h-14 px-4 border-b border-line">
                <Search size={18} strokeWidth={2} className="text-accent shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search skins, pages, settings…"
                  className="flex-1 bg-transparent outline-none text-ink placeholder:text-ink-dim text-[15px] font-medium"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-lg bg-subtle hover:bg-bg grid place-items-center text-ink-muted hover:text-ink transition-colors"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Results — animate the whole block on query change so it
                  feels like a true live search, not a static panel. */}
              <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={query.trim() || '__idle__'}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {query.trim() ? (
                      results.length === 0 && pageResults.length === 0 ? (
                        <EmptyState
                          Icon={Package}
                          title="No matches"
                          sub={`Nothing found for "${query.trim()}". Try a weapon, skin name, or page.`}
                        />
                      ) : (
                        <div>
                          {pageResults.length > 0 && (
                            <>
                              <SectionHeader Icon={FileText} label="Pages" />
                              <ul className="px-2 pb-1">
                                {pageResults.map((p, i) => (
                                  <PageRow
                                    key={p.to}
                                    page={p}
                                    index={i}
                                    onSelect={() => handleSelectPage(p.to)}
                                  />
                                ))}
                              </ul>
                            </>
                          )}
                          {results.length > 0 && (
                            <>
                              <SectionHeader Icon={Package} label="Items" />
                              <ul className="px-2 pb-2">
                                {results.map((it: any, i: number) => (
                                  <ResultRow
                                    key={it.id}
                                    item={it}
                                    index={i}
                                    formatPrice={formatPrice}
                                    onSelect={() => handleSelect(it.id)}
                                  />
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      )
                    ) : (
                      <div>
                        <SectionHeader Icon={FileText} label="Jump to" />
                        <ul className="px-2 pb-1">
                          {PAGES.slice(0, 5).map((p, i) => (
                            <PageRow
                              key={p.to}
                              page={p}
                              index={i}
                              onSelect={() => handleSelectPage(p.to)}
                            />
                          ))}
                        </ul>
                        <SectionHeader Icon={TrendingUp} label="Trending now" />
                        {trending.length === 0 ? (
                          <EmptyState
                            Icon={TrendingUp}
                            title="Start typing"
                            sub="Search by skin name, weapon, rarity, or page."
                          />
                        ) : (
                          <ul className="px-2 pb-2">
                            {trending.map((it: any, i: number) => (
                              <ResultRow
                                key={it.id}
                                item={it}
                                index={i}
                                formatPrice={formatPrice}
                                onSelect={() => handleSelect(it.id)}
                              />
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer hint row */}
              <div className="h-10 px-4 border-t border-line flex items-center justify-between text-[11.5px] text-ink-dim font-semibold">
                <span className="flex items-center gap-3">
                  <Hint k="↵">Open</Hint>
                  <Hint k="Esc">Close</Hint>
                </span>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate(query.trim() ? '/marketplace' : '/marketplace');
                  }}
                  className="flex items-center gap-1 text-ink-muted hover:text-ink transition-colors"
                >
                  Browse all listings <ArrowRight size={12} strokeWidth={2.2} />
                </button>
              </div>
            </div>
            </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

const ResultRow: React.FC<{
  item: any;
  index?: number;
  formatPrice: (n: number) => string;
  onSelect: () => void;
}> = ({ item, index = 0, formatPrice, onSelect }) => {
  const color = rarityColor(item.rarity);
  const name = item.name || item.market_name || '';
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        delay: Math.min(index * 0.025, 0.2),
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <button
        onClick={onSelect}
        className="w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-subtle transition-colors text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-subtle grid place-items-center overflow-hidden shrink-0">
          {item.image ? (
            <CachedImage src={item.image} alt={name} className="w-[88%] h-[88%] object-contain" />
          ) : (
            <Package size={16} className="text-ink-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
            <span
              className="text-[10px] uppercase tracking-wider font-bold truncate"
              style={{ color }}
            >
              {item.rarity || 'Standard'}
            </span>
            {item.condition && (
              <span className="text-[10.5px] text-ink-dim font-semibold truncate">
                · {item.condition}
              </span>
            )}
          </div>
          <div className="text-[13.5px] font-bold text-ink truncate tracking-tight">{name}</div>
        </div>
        <div className="text-right shrink-0 min-w-[80px]">
          <div className="text-[13.5px] font-bold text-ink tracking-tight tabular-nums">
            {formatPrice(item.price || 0)}
          </div>
        </div>
      </button>
    </motion.li>
  );
};

const PageRow: React.FC<{
  page: PageRef;
  index: number;
  onSelect: () => void;
}> = ({ page, index, onSelect }) => (
  <motion.li
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      duration: 0.22,
      delay: Math.min(index * 0.025, 0.2),
      ease: [0.4, 0, 0.2, 1],
    }}
  >
    <button
      onClick={onSelect}
      className="group w-full flex items-center gap-3 p-2 rounded-2xl hover:bg-accent-soft transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-accent-soft grid place-items-center shrink-0">
        <FileText size={15} strokeWidth={2.2} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold text-ink truncate tracking-tight">
          {page.title}
        </div>
        <div className="text-[11.5px] text-ink-muted font-medium truncate">
          {page.subtitle}
        </div>
      </div>
      <ChevronRight
        size={14}
        strokeWidth={2.4}
        className="text-ink-dim group-hover:text-accent transition-colors shrink-0"
      />
    </button>
  </motion.li>
);

const SectionHeader: React.FC<{ Icon: React.ComponentType<any>; label: string }> = ({
  Icon,
  label,
}) => (
  <div className="flex items-center gap-2 px-5 pt-4 pb-2">
    <Icon size={12} strokeWidth={2.2} className="text-ink-dim" />
    <span className="label-eyebrow">{label}</span>
  </div>
);

const EmptyState: React.FC<{
  Icon: React.ComponentType<any>;
  title: string;
  sub: string;
}> = ({ Icon, title, sub }) => (
  <div className="py-12 text-center px-6">
    <Icon size={22} className="mx-auto text-ink-muted mb-3" strokeWidth={2} />
    <p className="text-[14px] font-bold text-ink tracking-tight">{title}</p>
    <p className="text-[12.5px] text-ink-muted font-medium mt-1">{sub}</p>
  </div>
);

const Hint: React.FC<{ k: string; children: React.ReactNode }> = ({ k, children }) => (
  <span className="flex items-center gap-1.5">
    <kbd className="inline-flex items-center text-[10px] font-bold tracking-wide text-ink-muted px-1.5 py-0.5 rounded-md bg-subtle">
      {k}
    </kbd>
    <span>{children}</span>
  </span>
);

export default SearchPalette;
