import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, X, TrendingUp, Package } from 'lucide-react';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import { useHotItems } from '../hooks/useHotItems';
import { useCurrencyStore } from '../store/currencyStore';
import { CachedImage } from './ui/CachedImage';
import { rarityColor } from './ui/SkinCard';
import { spring } from '../lib/motion';

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

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // microtask focus — modal renders, then we focus
      setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        document.body.style.overflow = prev;
      };
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

  const trending = useMemo(() => (hotItems || []).slice(0, 6), [hotItems]);

  const handleSelect = (id: string) => {
    setOpen(false);
    navigate(`/item/${id}`);
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
            <div className="card-elevated overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 h-14 px-4 border-b border-line">
                <Search size={18} strokeWidth={2} className="text-ink-muted shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search skins, weapons, collections…"
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

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
                {query.trim() ? (
                  results.length === 0 ? (
                    <EmptyState
                      Icon={Package}
                      title="No matches"
                      sub={`Nothing found for "${query.trim()}". Try a weapon or skin name.`}
                    />
                  ) : (
                    <ul className="p-2">
                      {results.map((it: any) => (
                        <ResultRow
                          key={it.id}
                          item={it}
                          formatPrice={formatPrice}
                          onSelect={() => handleSelect(it.id)}
                        />
                      ))}
                    </ul>
                  )
                ) : (
                  <div>
                    <SectionHeader Icon={TrendingUp} label="Trending now" />
                    {trending.length === 0 ? (
                      <EmptyState
                        Icon={TrendingUp}
                        title="Start typing"
                        sub="Search by skin name, weapon, or rarity."
                      />
                    ) : (
                      <ul className="p-2">
                        {trending.map((it: any) => (
                          <ResultRow
                            key={it.id}
                            item={it}
                            formatPrice={formatPrice}
                            onSelect={() => handleSelect(it.id)}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )}
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
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

const ResultRow: React.FC<{
  item: any;
  formatPrice: (n: number) => string;
  onSelect: () => void;
}> = ({ item, formatPrice, onSelect }) => {
  const color = rarityColor(item.rarity);
  const name = item.name || item.market_name || '';
  return (
    <li>
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
    </li>
  );
};

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
