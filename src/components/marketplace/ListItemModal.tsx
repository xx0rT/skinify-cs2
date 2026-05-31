import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  Info,
  FileText,
  Globe,
  ShoppingCart,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Plus,
  Minus,
  Sparkles,
  Bell,
} from 'lucide-react';
import { fetchSteamMarketPrice, calculatePriceWithPercentage } from '../../utils/steamMarketApi';
import { useCurrencyStore } from '../../store/currencyStore';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { initializeWebPush, checkPushSubscription } from '../../utils/webPushNotifications';
import ConfirmationModal from '../ui/ConfirmationModal';

interface InventoryItem {
  id: string;
  name: string;
  image: string;
  rarity?: string;
  type?: string;
  wear?: string;
  statTrak?: boolean;
}

interface ListItemModalProps {
  items: InventoryItem[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmListing: (listings: ListingData[]) => Promise<void>;
}

export interface ListingData {
  itemId: string;
  price: number;
  marketPrice: number;
  description?: string;
  listingType?: 'buy_now' | 'auction';
  visibility?: 'public' | 'private';
  auctionDuration?: 1 | 3 | 7 | 14;
  privateBuyerSteamId?: string;
}

interface GroupedItem {
  name: string;
  image: string;
  rarity?: string;
  type?: string;
  wear?: string;
  items: InventoryItem[];
  quantity: number;
  selectedQuantity: number;
  price: number;
  marketPrice: number;
  pricePercentage: number;
  isLoadingPrice: boolean;
  description?: string;
  visibility: 'public' | 'private';
  listingType: 'buy_now' | 'auction';
  auctionDuration?: 1 | 3 | 7 | 14;
}

const SALE_FEE_PERCENTAGE = 2;
const MIN_PERCENTAGE = -20;
const MAX_PERCENTAGE = 50;

export const ListItemModal: React.FC<ListItemModalProps> = ({
  items,
  isOpen,
  onClose,
  onConfirmListing,
}) => {
  const { selectedCurrency, formatPrice } = useCurrencyStore();
  const { addToast } = useToastStore();
  const [groupedItems, setGroupedItems] = useState<GroupedItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState<number | null>(null);
  const [showDescriptionModal, setShowDescriptionModal] = useState<number | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState<number | null>(null);
  const [showListingTypeModal, setShowListingTypeModal] = useState<number | null>(null);
  const [hoveredButton, setHoveredButton] = useState<{index: number, type: string} | null>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && items.length > 0) {
      initializeGroupedItems();
    }
  }, [isOpen, items]);

  const initializeGroupedItems = async () => {
    const itemGroups = new Map<string, GroupedItem>();

    items.forEach((item) => {
      const key = `${item.name}-${item.wear || ''}`;

      if (itemGroups.has(key)) {
        const existing = itemGroups.get(key)!;
        existing.items.push(item);
        existing.quantity += 1;
        existing.selectedQuantity += 1;
      } else {
        itemGroups.set(key, {
          name: item.name,
          image: item.image,
          rarity: item.rarity,
          type: item.type,
          wear: item.wear,
          items: [item],
          quantity: 1,
          selectedQuantity: 1,
          price: 0,
          marketPrice: 0,
          pricePercentage: 0,
          isLoadingPrice: true,
          description: '',
          visibility: 'public',
          listingType: 'buy_now',
        });
      }
    });

    const initialGroups = Array.from(itemGroups.values());
    setGroupedItems(initialGroups);

    for (let i = 0; i < initialGroups.length; i++) {
      const group = initialGroups[i];
      const marketData = await fetchSteamMarketPrice(group.name, 'USD');

      setGroupedItems((prev) => {
        const updated = [...prev];
        if (marketData && marketData.recommendedPrice > 0) {
          const priceInUSD = marketData.recommendedPrice;
          const usdToCzkRate = 23.46;
          const priceInCZK = priceInUSD * usdToCzkRate;
          const convertedPrice = priceInCZK * selectedCurrency.rate;

          updated[i] = {
            ...updated[i],
            marketPrice: convertedPrice,
            price: convertedPrice,
            pricePercentage: 0,
            isLoadingPrice: false,
          };
        } else {
          updated[i] = {
            ...updated[i],
            marketPrice: 10,
            price: 10,
            pricePercentage: 0,
            isLoadingPrice: false,
          };
        }
        return updated;
      });
    }
  };

  const handlePriceChange = (index: number, percentage: number) => {
    setGroupedItems((prev) => {
      const updated = [...prev];
      const group = updated[index];
      const newPrice = calculatePriceWithPercentage(group.marketPrice, percentage);
      updated[index] = {
        ...group,
        price: newPrice,
        pricePercentage: percentage,
      };
      return updated;
    });
  };

  /* Direct numeric price entry — overrides the slider and recomputes the
     percentage so the slider thumb tracks the new value. Clamped to the
     same ±20%/+50% bounds the slider enforces, so listings can't go to
     absurd values that the rest of the form can't visualise. */
  const handleCustomPrice = (index: number, raw: string) => {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setGroupedItems((prev) => {
      const updated = [...prev];
      const group = updated[index];
      const base = group.marketPrice || parsed;
      const rawPct = ((parsed - base) / base) * 100;
      const pct = Math.min(MAX_PERCENTAGE, Math.max(MIN_PERCENTAGE, rawPct));
      const clamped = calculatePriceWithPercentage(base, pct);
      updated[index] = {
        ...group,
        price: clamped,
        pricePercentage: pct,
      };
      return updated;
    });
  };

  const handleQuantityChange = (index: number, delta: number) => {
    setGroupedItems((prev) => {
      const updated = [...prev];
      const group = updated[index];
      const newQuantity = Math.max(1, Math.min(group.quantity, group.selectedQuantity + delta));
      updated[index] = {
        ...group,
        selectedQuantity: newQuantity,
      };
      return updated;
    });
  };

  const handleRemoveGroup = (index: number) => {
    setGroupedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDescriptionChange = (index: number, description: string) => {
    if (description.length > 32) return;
    setGroupedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], description };
      return updated;
    });
  };

  const handleVisibilityChange = (index: number, visibility: 'public' | 'private') => {
    setGroupedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], visibility };
      return updated;
    });
  };

  const handleListingTypeChange = (index: number, listingType: 'buy_now' | 'auction', duration?: 1 | 3 | 7 | 14) => {
    setGroupedItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], listingType, auctionDuration: duration };
      return updated;
    });
  };

  const openSteamMarket = (itemName: string) => {
    const encodedName = encodeURIComponent(itemName);
    window.open(`https://steamcommunity.com/market/listings/730/${encodedName}`, '_blank');
  };

  const calculateSubtotal = () => {
    return groupedItems.reduce((sum, group) => sum + (group.price * group.selectedQuantity), 0);
  };

  const calculateSaleFee = () => {
    return calculateSubtotal() * (SALE_FEE_PERCENTAGE / 100);
  };

  const calculateTotalEarnings = () => {
    return calculateSubtotal() - calculateSaleFee();
  };

  const getTotalItemCount = () => {
    return groupedItems.reduce((sum, group) => sum + group.selectedQuantity, 0);
  };

  const handleConfirmListing = async () => {
    console.log('=== SELL ITEMS BUTTON CLICKED ===');
    console.log('Grouped items:', groupedItems.length);

    if (groupedItems.length === 0) {
      addToast('No items to list', 'error');
      return;
    }

    const { user } = useAuthStore.getState();
    console.log('User:', user);

    if (!user?.steamId) {
      addToast('Please login first', 'error');
      return;
    }

    // Try Web Push in background - don't block the listing
    console.log('Attempting Web Push initialization (non-blocking)...');
    checkPushSubscription()
      .then((isSubscribed) => {
        if (!isSubscribed) {
          console.log('Not subscribed, initializing...');
          return initializeWebPush(user.steamId);
        }
        console.log('Already subscribed to Web Push');
        return Promise.resolve(true);
      })
      .then((success) => {
        if (success) {
          console.log('Web Push enabled successfully');
        } else {
          console.log('Web Push not available, using basic notifications');
        }
      })
      .catch((error) => {
        console.warn('Web Push initialization failed (non-blocking):', error);
      });

    setIsSubmitting(true);
    console.log('Starting listing process...');

    try {
      const listingData: ListingData[] = [];

      groupedItems.forEach((group) => {
        for (let i = 0; i < group.selectedQuantity; i++) {
          if (group.items[i]) {
            listingData.push({
              itemId: group.items[i].id,
              price: group.price,
              marketPrice: group.marketPrice,
              description: group.description,
              listingType: group.listingType,
              visibility: group.visibility,
              auctionDuration: group.auctionDuration,
            });
          }
        }
      });

      console.log('Listing data prepared:', listingData);
      console.log('Calling onConfirmListing...');

      await onConfirmListing(listingData);

      console.log('Listing completed successfully!');
      addToast(`Successfully listed ${listingData.length} item(s)`, 'success');
      onClose();
    } catch (error) {
      console.error('Error listing items:', error);
      addToast('Failed to list items. Check console for details.', 'error');
    } finally {
      setIsSubmitting(false);
      console.log('=== LISTING PROCESS COMPLETE ===');
    }
  };

  const getPriceRecommendation = (percentage: number) => {
    if (percentage >= -5 && percentage <= 5) {
      return { text: 'Recommended', color: 'text-purple-400', icon: CheckCircle };
    } else if (percentage > 5) {
      return { text: 'Above Market', color: 'text-pink-400', icon: AlertCircle };
    } else {
      return { text: 'Below Market', color: 'text-violet-400', icon: AlertCircle };
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/65 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
          className="card w-full flex flex-col overflow-hidden"
          style={{ maxWidth: '900px', maxHeight: '85vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-line shrink-0 relative overflow-hidden">
            <motion.div
              aria-hidden
              className="absolute -top-24 -right-16 w-[280px] h-[280px] rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(closest-side, rgb(var(--accent) / 0.14), transparent 65%)' }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative flex items-center gap-3">
              <div className="icon-chip bg-accent-soft">
                <Sparkles className="text-accent" size={18} strokeWidth={2.2} />
              </div>
              <div>
                <span className="label-eyebrow">Sell on Skinify</span>
                <h2 className="text-[20px] font-bold text-ink tracking-tight mt-1 leading-none">
                  {getTotalItemCount()} {getTotalItemCount() === 1 ? 'item' : 'items'} for sale
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="relative h-9 w-9 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors"
            >
              <X size={16} strokeWidth={2.4} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-3">
            {groupedItems.map((group, index) => (
              <motion.div
                key={`${group.name}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, type: 'spring', stiffness: 380, damping: 30 }}
                className="card-flat p-4 transition-all hover:bg-subtle/40"
              >
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-subtle/60 shrink-0 grid place-items-center overflow-hidden">
                    <img
                      src={group.image}
                      alt={group.name}
                      className="w-[85%] h-[85%] object-contain"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] text-ink-dim font-semibold uppercase tracking-wider">
                          {group.type || 'Item'} · {group.rarity}
                        </div>
                        <h3 className="text-ink font-bold text-[16px] tracking-tight truncate mt-1 leading-tight">
                          {group.name}
                        </h3>
                        {group.wear && (
                          <p className="text-ink-muted text-[12px] font-medium mt-1">{group.wear}</p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="label-meta">Your price</div>
                        <p className="text-ink font-bold text-[22px] tracking-tight tabular-nums leading-none mt-1">
                          {group.isLoadingPrice ? (
                            <span className="text-ink-muted animate-pulse">…</span>
                          ) : (
                            formatPrice(group.price)
                          )}
                        </p>
                        {!group.isLoadingPrice && (
                          <p className="text-ink-dim text-[11.5px] font-medium mt-1">
                            Steam: {formatPrice(group.marketPrice)}
                          </p>
                        )}
                      </div>
                    </div>

                    {!group.isLoadingPrice && (
                      <>
                        <div className="mb-3">
                          <input
                            type="range"
                            min={MIN_PERCENTAGE}
                            max={MAX_PERCENTAGE}
                            step={1}
                            value={group.pricePercentage}
                            onChange={(e) => handlePriceChange(index, parseFloat(e.target.value))}
                            className="w-full h-2 rounded-full appearance-none cursor-pointer slider-thumb-purple"
                            style={{
                              background: `linear-gradient(to right, rgb(var(--accent)) 0%, rgb(var(--accent)) ${
                                ((group.pricePercentage - MIN_PERCENTAGE) / (MAX_PERCENTAGE - MIN_PERCENTAGE)) * 100
                              }%, rgb(var(--subtle)) ${
                                ((group.pricePercentage - MIN_PERCENTAGE) / (MAX_PERCENTAGE - MIN_PERCENTAGE)) * 100
                              }%, rgb(var(--subtle)) 100%)`,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {React.createElement(getPriceRecommendation(group.pricePercentage).icon, {
                              size: 14,
                              strokeWidth: 2.4,
                              className: 'text-accent',
                            })}
                            <span className="text-[12.5px] font-bold text-ink">
                              {getPriceRecommendation(group.pricePercentage).text}
                            </span>
                          </div>
                          <span className="text-ink font-bold text-[15px] tabular-nums">
                            {group.pricePercentage > 0 ? '+' : ''}
                            {group.pricePercentage.toFixed(0)}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between mb-3 text-[12.5px]">
                          <span className="text-ink-muted font-medium">Steam market price</span>
                          <span className="text-ink font-bold tabular-nums">{formatPrice(group.marketPrice)}</span>
                        </div>

                        {/* Custom-price field — fine-grained control beyond the slider.
                            Bound to the same percentage system so the slider tracks it. */}
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <span className="text-ink-muted text-[12.5px] font-semibold shrink-0">
                            Custom price
                          </span>
                          <div className="flex items-center gap-1.5 flex-1 max-w-[200px] h-9 px-3 rounded-full bg-subtle focus-within:ring-2 focus-within:ring-accent transition-all">
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              step="0.01"
                              value={Number(group.price.toFixed(2))}
                              onChange={(e) => handleCustomPrice(index, e.target.value)}
                              className="flex-1 min-w-0 bg-transparent outline-none text-ink text-[13px] font-bold tabular-nums text-right"
                              aria-label="Custom price"
                            />
                            <span className="text-[11.5px] font-bold text-ink-dim uppercase">
                              {selectedCurrency.symbol}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                          <span className="text-ink-muted text-[12.5px] font-semibold">Quantity</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleQuantityChange(index, -1)}
                              disabled={group.selectedQuantity <= 1}
                              className="h-8 w-8 rounded-full bg-subtle hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed grid place-items-center transition-colors"
                            >
                              <Minus size={13} strokeWidth={2.4} className="text-ink" />
                            </button>
                            <span className="text-ink font-bold text-[13.5px] tabular-nums min-w-[60px] text-center">
                              {group.selectedQuantity} / {group.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(index, 1)}
                              disabled={group.selectedQuantity >= group.quantity}
                              className="h-8 w-8 rounded-full bg-subtle hover:bg-bg disabled:opacity-40 disabled:cursor-not-allowed grid place-items-center transition-colors"
                            >
                              <Plus size={13} strokeWidth={2.4} className="text-ink" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Labeled action chips — each option says what it does
                        + shows its current value (Public/Private, Buy now/Auction,
                        etc.) so the user never has to guess what the icon means. */}
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      {([
                        {
                          type: 'info',
                          Icon: Info,
                          label: 'Item info',
                          value: group.wear || 'Details',
                          tone: 'neutral' as const,
                          onClick: () => setShowInfoModal(index),
                        },
                        {
                          type: 'description',
                          Icon: FileText,
                          label: 'Description',
                          value: group.description?.trim()
                            ? group.description.length > 14
                              ? `${group.description.slice(0, 14)}…`
                              : group.description
                            : 'Add note',
                          tone: group.description?.trim() ? ('active' as const) : ('neutral' as const),
                          onClick: () => setShowDescriptionModal(index),
                        },
                        {
                          type: 'visibility',
                          Icon: Globe,
                          label: 'Visibility',
                          value: group.visibility === 'private' ? 'Private link' : 'Public',
                          tone: group.visibility === 'private' ? ('active' as const) : ('neutral' as const),
                          onClick: () => setShowVisibilityModal(index),
                        },
                        {
                          type: 'listing',
                          Icon: ShoppingCart,
                          label: 'Listing type',
                          value:
                            group.listingType === 'auction'
                              ? `Auction · ${group.auctionDuration ?? 3}d`
                              : 'Buy now',
                          tone: group.listingType === 'auction' ? ('active' as const) : ('neutral' as const),
                          onClick: () => setShowListingTypeModal(index),
                        },
                        {
                          type: 'steam',
                          Icon: LinkIcon,
                          label: 'Steam market',
                          value: 'Open',
                          tone: 'neutral' as const,
                          onClick: () => openSteamMarket(group.name),
                        },
                      ]).map(({ type, Icon, label, value, tone, onClick }) => (
                        <button
                          key={type}
                          onClick={onClick}
                          className={`h-9 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
                            tone === 'active'
                              ? 'bg-accent-soft text-ink'
                              : 'bg-subtle hover:bg-bg text-ink-muted hover:text-ink'
                          }`}
                          title={`${label}: ${value}`}
                        >
                          <Icon size={12} strokeWidth={2.4} className={tone === 'active' ? 'text-accent' : ''} />
                          <span className="hidden sm:inline text-ink-dim font-medium">{label}</span>
                          <span className={`max-w-[120px] truncate ${tone === 'active' ? 'text-accent' : 'text-ink'}`}>
                            {value}
                          </span>
                        </button>
                      ))}
                      <button
                        onClick={() => handleRemoveGroup(index)}
                        title="Remove from listing"
                        className="ml-auto h-9 px-3 rounded-full bg-subtle hover:bg-rose-500/15 text-ink-muted hover:text-rose-500 inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
                      >
                        <Trash2 size={12} strokeWidth={2.4} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="border-t border-line p-5 sm:p-6 shrink-0 bg-surface/40">
            <div className="rounded-2xl bg-accent-soft p-3.5 mb-4 flex items-start gap-2.5">
              <Info size={15} strokeWidth={2.2} className="text-accent shrink-0 mt-0.5" />
              <p className="text-ink text-[13px] font-medium leading-snug">
                We've updated {groupedItems.length} price{groupedItems.length !== 1 ? 's' : ''} to the closest market value. Adjust the slider to set your own.
              </p>
            </div>

            <div className="space-y-2.5 mb-4">
              <div className="flex justify-between items-center text-[13.5px]">
                <span className="text-ink-muted font-medium">Subtotal</span>
                <span className="font-bold text-ink tabular-nums">{formatPrice(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between items-center text-[13.5px]">
                <span className="text-ink-muted font-medium">Sale fee ({SALE_FEE_PERCENTAGE}%)</span>
                <span className="font-bold text-rose-500 tabular-nums">− {formatPrice(calculateSaleFee())}</span>
              </div>
              <div className="flex justify-between items-baseline pt-3 border-t border-line">
                <span className="label-eyebrow">Total earnings</span>
                <span className="text-[22px] sm:text-[26px] font-bold text-ink tracking-tight tabular-nums leading-none">
                  {formatPrice(calculateTotalEarnings())}
                </span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              whileHover={isSubmitting || groupedItems.length === 0 ? {} : { scale: 1.01 }}
              onClick={() => setShowConfirmation(true)}
              disabled={isSubmitting || groupedItems.length === 0}
              className="w-full h-12 rounded-full bg-accent text-on-accent font-bold text-[14px] transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              style={{ boxShadow: isSubmitting || groupedItems.length === 0 ? 'none' : '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
            >
              {isSubmitting ? (
                <>
                  <Sparkles size={15} strokeWidth={2.4} className="animate-pulse" />
                  Listing items…
                </>
              ) : (
                <>
                  <Sparkles size={15} strokeWidth={2.4} />
                  Sell items
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>

      {/* ─── Item Info ─── */}
      {showInfoModal !== null && groupedItems[showInfoModal] && (
        <SubModal onClose={() => setShowInfoModal(null)} title="Item details" maxWidth={560}>
          <div className="flex gap-5">
            <div className="w-36 h-36 rounded-2xl bg-subtle/60 grid place-items-center overflow-hidden shrink-0">
              <img
                src={groupedItems[showInfoModal].image}
                alt={groupedItems[showInfoModal].name}
                className="w-[85%] h-[85%] object-contain"
              />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="text-[11px] text-ink-dim font-semibold uppercase tracking-wider">
                {groupedItems[showInfoModal].type || 'Item'}
              </div>
              <div className="text-[15px] font-bold text-ink tracking-tight leading-tight">
                {groupedItems[showInfoModal].name}
              </div>
              {groupedItems[showInfoModal].rarity && (
                <div className="text-[12px] text-ink-muted font-medium">
                  {groupedItems[showInfoModal].rarity}
                </div>
              )}
              {groupedItems[showInfoModal].wear && (
                <div className="text-[12px] text-ink-muted font-medium">
                  Wear · {groupedItems[showInfoModal].wear}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <InfoTile label="Steam market" value={formatPrice(groupedItems[showInfoModal].marketPrice)} />
            <InfoTile label="Your price" value={formatPrice(groupedItems[showInfoModal].price)} accent />
          </div>
        </SubModal>
      )}

      {/* ─── Description ─── */}
      {showDescriptionModal !== null && groupedItems[showDescriptionModal] && (
        <SubModal
          onClose={() => setShowDescriptionModal(null)}
          title="Add a note for buyers"
          subtitle="Shown under the item name in your listing. 32 characters max."
          maxWidth={460}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="label-meta">Description</span>
              <span className="text-[11px] font-bold text-ink-dim tabular-nums">
                {groupedItems[showDescriptionModal].description?.length || 0} / 32
              </span>
            </div>
            <textarea
              autoFocus
              value={groupedItems[showDescriptionModal].description || ''}
              onChange={(e) => handleDescriptionChange(showDescriptionModal, e.target.value)}
              maxLength={32}
              placeholder="e.g. low float, rare pattern, fast delivery…"
              className="w-full px-4 py-3 rounded-3xl bg-subtle outline-none text-ink placeholder:text-ink-dim text-[14px] font-medium focus:ring-2 focus:ring-accent transition-all resize-none"
              rows={3}
            />
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
            onClick={() => setShowDescriptionModal(null)}
            className="mt-4 w-full h-11 rounded-full bg-accent text-on-accent font-bold text-[13.5px]"
            style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
          >
            Save description
          </motion.button>
        </SubModal>
      )}

      {/* ─── Visibility ─── */}
      {showVisibilityModal !== null && groupedItems[showVisibilityModal] && (
        <SubModal
          onClose={() => setShowVisibilityModal(null)}
          title="Listing visibility"
          subtitle="Who can see and buy this listing?"
          maxWidth={460}
        >
          <div className="space-y-2">
            <OptionRow
              Icon={Globe}
              label="Public listing"
              sub="Anyone browsing the marketplace can find and buy it."
              active={groupedItems[showVisibilityModal].visibility === 'public'}
              onClick={() => {
                handleVisibilityChange(showVisibilityModal, 'public');
                setShowVisibilityModal(null);
              }}
            />
            <OptionRow
              Icon={LinkIcon}
              label="Private link"
              sub="Only people you share the link with can see this listing."
              active={groupedItems[showVisibilityModal].visibility === 'private'}
              onClick={() => {
                handleVisibilityChange(showVisibilityModal, 'private');
                setShowVisibilityModal(null);
              }}
            />
          </div>
        </SubModal>
      )}

      {/* ─── Listing type ─── */}
      {showListingTypeModal !== null && groupedItems[showListingTypeModal] && (
        <SubModal
          onClose={() => setShowListingTypeModal(null)}
          title="Listing type"
          subtitle="Fixed-price sale or open it up to bids."
          maxWidth={460}
        >
          <div className="space-y-2">
            <OptionRow
              Icon={ShoppingCart}
              label="Buy now"
              sub="Sell instantly at the price you set. Recommended for fast turnover."
              active={groupedItems[showListingTypeModal].listingType === 'buy_now'}
              onClick={() => {
                handleListingTypeChange(showListingTypeModal, 'buy_now');
                setShowListingTypeModal(null);
              }}
            />
          </div>
          <div className="mt-5">
            <div className="label-meta mb-2">Auction · duration</div>
            <div className="grid grid-cols-4 gap-2">
              {([1, 3, 7, 14] as const).map((duration) => {
                const isActive =
                  groupedItems[showListingTypeModal].listingType === 'auction' &&
                  groupedItems[showListingTypeModal].auctionDuration === duration;
                return (
                  <button
                    key={duration}
                    onClick={() => {
                      handleListingTypeChange(showListingTypeModal, 'auction', duration);
                      setShowListingTypeModal(null);
                    }}
                    className={`h-14 rounded-2xl text-[13px] font-bold transition-colors ${
                      isActive
                        ? 'bg-accent text-on-accent'
                        : 'bg-subtle text-ink hover:bg-bg'
                    }`}
                  >
                    {duration}d
                  </button>
                );
              })}
            </div>
            <p className="text-[11.5px] text-ink-dim font-medium mt-2">
              Highest bidder wins when the timer ends. Your set price acts as the minimum bid.
            </p>
          </div>
        </SubModal>
      )}

      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmListing}
        title="Confirm Listing"
        message={`Are you sure you want to list ${getTotalItemCount()} item${getTotalItemCount() > 1 ? 's' : ''} for sale? This action will make ${getTotalItemCount() > 1 ? 'them' : 'it'} visible on the marketplace.`}
        confirmText="Yes, List Items"
        cancelText="No, Cancel"
        variant="info"
        isProcessing={isSubmitting}
      />
    </AnimatePresence>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   Reusable sub-modal shell + option row + info tile.
   Used by the Item-info / Description / Visibility / Listing-type pickers
   so they all share the same chrome instead of each having a slightly
   different look.
   ───────────────────────────────────────────────────────────────────────── */

const SubModal: React.FC<{
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: number;
  children: React.ReactNode;
}> = ({ onClose, title, subtitle, maxWidth = 460, children }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 dark:bg-black/65 backdrop-blur-md p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.96, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.96, opacity: 0, y: 8 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
      onClick={(e) => e.stopPropagation()}
      className="card w-full p-6 sm:p-7"
      style={{ maxWidth }}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-[18px] font-bold text-ink tracking-tight leading-tight">{title}</h3>
          {subtitle && (
            <p className="text-[12.5px] text-ink-muted font-medium mt-1.5 leading-relaxed">{subtitle}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="h-9 w-9 shrink-0 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors"
        >
          <X size={15} strokeWidth={2.4} />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

const OptionRow: React.FC<{
  Icon: React.ComponentType<any>;
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}> = ({ Icon, label, sub, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full p-4 rounded-3xl text-left transition-all flex items-start gap-3 ${
      active
        ? 'bg-accent-soft ring-2 ring-accent'
        : 'bg-subtle hover:bg-bg'
    }`}
  >
    <div
      className={`icon-chip-sm shrink-0 ${active ? 'bg-accent text-on-accent' : 'bg-bg/60 text-ink-muted'}`}
    >
      <Icon size={14} strokeWidth={2.4} />
    </div>
    <div className="flex-1 min-w-0">
      <div className={`text-[14px] font-bold tracking-tight ${active ? 'text-ink' : 'text-ink'}`}>
        {label}
      </div>
      <div className="text-[12px] text-ink-muted font-medium mt-1 leading-relaxed">{sub}</div>
    </div>
    {active && (
      <CheckCircle size={16} className="text-accent shrink-0 mt-0.5" strokeWidth={2.4} />
    )}
  </button>
);

const InfoTile: React.FC<{ label: string; value: string; accent?: boolean }> = ({
  label,
  value,
  accent,
}) => (
  <div className="card-flat p-3.5">
    <div className="label-meta">{label}</div>
    <div
      className={`text-[16px] font-bold tracking-tight tabular-nums mt-1 ${
        accent ? 'text-accent' : 'text-ink'
      }`}
    >
      {value}
    </div>
  </div>
);
