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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-black rounded-2xl shadow-2xl w-full border-2 border-purple-500/40 flex flex-col"
          style={{
            maxWidth: '900px',
            maxHeight: '85vh',
            boxShadow: '0 0 60px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(168, 85, 247, 0.15)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-between p-6 border-b border-purple-500/20 flex-shrink-0 bg-gradient-to-r from-purple-900/10 to-pink-900/10"
            style={{
              boxShadow: '0 4px 20px rgba(168, 85, 247, 0.15)'
            }}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">
                {getTotalItemCount()} {getTotalItemCount() === 1 ? 'item' : 'items'} for sale
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors text-purple-400 hover:text-purple-300"
            >
              <X size={24} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-6 space-y-4">
            {groupedItems.map((group, index) => (
              <motion.div
                key={`${group.name}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-900/80 rounded-xl p-4 border-2 border-purple-500/20 hover:border-purple-500/40 transition-all"
                style={{
                  boxShadow: '0 0 15px rgba(168, 85, 247, 0.08)'
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-20 h-20 rounded-lg bg-black/60 flex-shrink-0 border border-purple-500/15 p-2"
                    style={{
                      boxShadow: '0 0 12px rgba(168, 85, 247, 0.15)'
                    }}
                  >
                    <img
                      src={group.image}
                      alt={group.name}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-purple-400 text-sm mb-1 font-medium">
                          {group.type || 'Item'} {group.rarity}
                        </p>
                        <h3 className="text-white font-bold text-lg truncate">
                          {group.name}
                        </h3>
                        {group.wear && (
                          <p className="text-purple-300/60 text-xs mt-1">{group.wear}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-purple-400 text-sm mb-1">Your Price</p>
                        <p className="text-white font-bold text-2xl">
                          {group.isLoadingPrice ? (
                            <span className="text-purple-400 animate-pulse">...</span>
                          ) : (
                            formatPrice(group.price)
                          )}
                        </p>
                        {!group.isLoadingPrice && (
                          <p className="text-purple-300/60 text-xs mt-1">
                            Steam: {formatPrice(group.marketPrice)}
                          </p>
                        )}
                      </div>
                    </div>

                    {!group.isLoadingPrice && (
                      <>
                        <div className="mb-4">
                          <input
                            type="range"
                            min={MIN_PERCENTAGE}
                            max={MAX_PERCENTAGE}
                            step={1}
                            value={group.pricePercentage}
                            onChange={(e) => handlePriceChange(index, parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb-purple"
                            style={{
                              background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${
                                ((group.pricePercentage - MIN_PERCENTAGE) / (MAX_PERCENTAGE - MIN_PERCENTAGE)) * 100
                              }%, #374151 ${
                                ((group.pricePercentage - MIN_PERCENTAGE) / (MAX_PERCENTAGE - MIN_PERCENTAGE)) * 100
                              }%, #374151 100%)`,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {React.createElement(getPriceRecommendation(group.pricePercentage).icon, {
                              size: 20,
                              className: getPriceRecommendation(group.pricePercentage).color,
                            })}
                            <span className={`font-medium ${getPriceRecommendation(group.pricePercentage).color}`}>
                              {getPriceRecommendation(group.pricePercentage).text}
                            </span>
                          </div>
                          <span className="text-white font-bold text-xl">
                            {group.pricePercentage > 0 ? '+' : ''}
                            {group.pricePercentage.toFixed(0)}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between mb-4 text-sm">
                          <span className="text-purple-300/70">Steam Market Price:</span>
                          <span className="text-purple-400 font-semibold">{formatPrice(group.marketPrice)}</span>
                        </div>

                        <div className="flex items-center justify-between mb-4">
                          <span className="text-purple-400 text-sm font-medium">Quantity</span>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleQuantityChange(index, -1)}
                              disabled={group.selectedQuantity <= 1}
                              className="w-8 h-8 flex items-center justify-center bg-purple-500/20 hover:bg-purple-500/30 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors border border-purple-500/30"
                            >
                              <Minus size={16} className="text-purple-300" />
                            </button>
                            <span className="text-white font-bold text-lg min-w-[60px] text-center">
                              {group.selectedQuantity} / {group.quantity}
                            </span>
                            <button
                              onClick={() => handleQuantityChange(index, 1)}
                              disabled={group.selectedQuantity >= group.quantity}
                              className="w-8 h-8 flex items-center justify-center bg-purple-500/20 hover:bg-purple-500/30 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors border border-purple-500/30"
                            >
                              <Plus size={16} className="text-purple-300" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <button
                          onClick={() => setShowInfoModal(index)}
                          onMouseEnter={() => setHoveredButton({index, type: 'info'})}
                          onMouseLeave={() => setHoveredButton(null)}
                          className="p-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors text-purple-400 border border-purple-500/20"
                        >
                          <Info size={18} />
                        </button>
                        {hoveredButton?.index === index && hoveredButton?.type === 'info' && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 border border-purple-500/30 rounded text-xs text-purple-300 whitespace-nowrap z-50">
                            Item Info
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setShowDescriptionModal(index)}
                          onMouseEnter={() => setHoveredButton({index, type: 'description'})}
                          onMouseLeave={() => setHoveredButton(null)}
                          className="p-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors text-purple-400 border border-purple-500/20"
                        >
                          <FileText size={18} />
                        </button>
                        {hoveredButton?.index === index && hoveredButton?.type === 'description' && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 border border-purple-500/30 rounded text-xs text-purple-300 whitespace-nowrap z-50">
                            Set Description
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setShowVisibilityModal(index)}
                          onMouseEnter={() => setHoveredButton({index, type: 'visibility'})}
                          onMouseLeave={() => setHoveredButton(null)}
                          className="p-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors text-purple-400 border border-purple-500/20"
                        >
                          <Globe size={18} />
                        </button>
                        {hoveredButton?.index === index && hoveredButton?.type === 'visibility' && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 border border-purple-500/30 rounded text-xs text-purple-300 whitespace-nowrap z-50">
                            Listing Visibility
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setShowListingTypeModal(index)}
                          onMouseEnter={() => setHoveredButton({index, type: 'listing'})}
                          onMouseLeave={() => setHoveredButton(null)}
                          className="p-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors text-purple-400 border border-purple-500/20"
                        >
                          <ShoppingCart size={18} />
                        </button>
                        {hoveredButton?.index === index && hoveredButton?.type === 'listing' && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 border border-purple-500/30 rounded text-xs text-purple-300 whitespace-nowrap z-50">
                            Listing Type
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => openSteamMarket(group.name)}
                          onMouseEnter={() => setHoveredButton({index, type: 'steam'})}
                          onMouseLeave={() => setHoveredButton(null)}
                          className="p-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors text-purple-400 border border-purple-500/20"
                        >
                          <LinkIcon size={18} />
                        </button>
                        {hoveredButton?.index === index && hoveredButton?.type === 'steam' && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 border border-purple-500/30 rounded text-xs text-purple-300 whitespace-nowrap z-50">
                            View on Steam
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemoveGroup(index)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors text-red-400 ml-auto border border-red-500/30"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div
            className="border-t border-purple-500/20 p-6 bg-gradient-to-r from-purple-900/10 to-pink-900/10 flex-shrink-0"
            style={{
              boxShadow: '0 -4px 20px rgba(168, 85, 247, 0.15)'
            }}
          >
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 mb-4 flex items-start gap-3">
              <Info size={20} className="text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-purple-300 text-sm">
                We've updated {groupedItems.length} price{groupedItems.length !== 1 ? 's' : ''} to the closest market value
              </p>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-purple-300">
                <span>Subtotal</span>
                <span className="font-medium text-white">{formatPrice(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between text-purple-300">
                <span>Sale Fee ({SALE_FEE_PERCENTAGE}%)</span>
                <span className="font-medium text-red-400">- {formatPrice(calculateSaleFee())}</span>
              </div>
              <div
                className="flex justify-between text-white text-xl font-bold pt-3 border-t border-purple-500/20"
                style={{
                  textShadow: '0 0 8px rgba(168, 85, 247, 0.4)'
                }}
              >
                <span>Total Earnings</span>
                <span className="text-purple-300">{formatPrice(calculateTotalEarnings())}</span>
              </div>
            </div>

            <button
              onClick={() => setShowConfirmation(true)}
              disabled={isSubmitting || groupedItems.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all shadow-lg"
              style={{
                boxShadow: isSubmitting || groupedItems.length === 0
                  ? 'none'
                  : '0 0 30px rgba(168, 85, 247, 0.5), 0 4px 20px rgba(168, 85, 247, 0.3)'
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  Listing Items...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Sell Items
                </span>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {showInfoModal !== null && groupedItems[showInfoModal] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowInfoModal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-2xl w-full border-2 border-purple-500/30 shadow-2xl"
            style={{ boxShadow: '0 0 50px rgba(168, 85, 247, 0.3)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">{groupedItems[showInfoModal].name}</h3>
              <button
                onClick={() => setShowInfoModal(null)}
                className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
              >
                <X size={24} className="text-purple-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-6">
                <div className="w-48 h-48 bg-black/60 rounded-lg p-4 border border-purple-500/20 flex-shrink-0">
                  <img
                    src={groupedItems[showInfoModal].image}
                    alt={groupedItems[showInfoModal].name}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-purple-400 text-sm mb-1">Type</p>
                    <p className="text-white font-semibold">{groupedItems[showInfoModal].type || 'N/A'}</p>
                  </div>
                  {groupedItems[showInfoModal].rarity && (
                    <div>
                      <p className="text-purple-400 text-sm mb-1">Rarity</p>
                      <p className="text-white font-semibold">{groupedItems[showInfoModal].rarity}</p>
                    </div>
                  )}
                  {groupedItems[showInfoModal].wear && (
                    <div>
                      <p className="text-purple-400 text-sm mb-1">Wear</p>
                      <p className="text-white font-semibold">{groupedItems[showInfoModal].wear}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-purple-400 text-sm mb-1">Steam Market Price</p>
                    <p className="text-white font-bold text-xl">{formatPrice(groupedItems[showInfoModal].marketPrice)}</p>
                  </div>
                  <div>
                    <p className="text-purple-400 text-sm mb-1">Your Price</p>
                    <p className="text-white font-bold text-xl">{formatPrice(groupedItems[showInfoModal].price)}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showDescriptionModal !== null && groupedItems[showDescriptionModal] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowDescriptionModal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-md w-full border-2 border-purple-500/30 shadow-2xl"
            style={{ boxShadow: '0 0 50px rgba(168, 85, 247, 0.3)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Set Description</h3>
              <button
                onClick={() => setShowDescriptionModal(null)}
                className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
              >
                <X size={20} className="text-purple-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-purple-400 text-sm mb-2 block">
                  Description ({groupedItems[showDescriptionModal].description?.length || 0}/32)
                </label>
                <textarea
                  value={groupedItems[showDescriptionModal].description || ''}
                  onChange={(e) => handleDescriptionChange(showDescriptionModal, e.target.value)}
                  maxLength={32}
                  placeholder="Enter item description..."
                  className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                  rows={3}
                />
              </div>
              <button
                onClick={() => setShowDescriptionModal(null)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white py-3 rounded-lg font-semibold transition-all"
              >
                Save Description
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showVisibilityModal !== null && groupedItems[showVisibilityModal] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowVisibilityModal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-md w-full border-2 border-purple-500/30 shadow-2xl"
            style={{ boxShadow: '0 0 50px rgba(168, 85, 247, 0.3)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Listing Visibility</h3>
              <button
                onClick={() => setShowVisibilityModal(null)}
                className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
              >
                <X size={20} className="text-purple-400" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  handleVisibilityChange(showVisibilityModal, 'public');
                  setShowVisibilityModal(null);
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  groupedItems[showVisibilityModal].visibility === 'public'
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-gray-800/50 border-purple-500/30 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Globe size={24} className="text-purple-400" />
                  <div className="flex-1">
                    <p className="text-white font-semibold">Public Listing</p>
                    <p className="text-purple-300/70 text-sm">Show on marketplace</p>
                  </div>
                  {groupedItems[showVisibilityModal].visibility === 'public' && (
                    <CheckCircle size={20} className="text-green-400" />
                  )}
                </div>
              </button>

              <button
                onClick={() => {
                  handleVisibilityChange(showVisibilityModal, 'private');
                  setShowVisibilityModal(null);
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  groupedItems[showVisibilityModal].visibility === 'private'
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-gray-800/50 border-purple-500/30 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LinkIcon size={24} className="text-purple-400" />
                  <div className="flex-1">
                    <p className="text-white font-semibold">Private Listing</p>
                    <p className="text-purple-300/70 text-sm">Share via unique URL</p>
                  </div>
                  {groupedItems[showVisibilityModal].visibility === 'private' && (
                    <CheckCircle size={20} className="text-green-400" />
                  )}
                </div>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {showListingTypeModal !== null && groupedItems[showListingTypeModal] && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4"
          onClick={() => setShowListingTypeModal(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-md w-full border-2 border-purple-500/30 shadow-2xl"
            style={{ boxShadow: '0 0 50px rgba(168, 85, 247, 0.3)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Listing Type</h3>
              <button
                onClick={() => setShowListingTypeModal(null)}
                className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
              >
                <X size={20} className="text-purple-400" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  handleListingTypeChange(showListingTypeModal, 'buy_now');
                  setShowListingTypeModal(null);
                }}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                  groupedItems[showListingTypeModal].listingType === 'buy_now'
                    ? 'bg-purple-500/20 border-purple-500'
                    : 'bg-gray-800/50 border-purple-500/30 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart size={24} className="text-purple-400" />
                  <div className="flex-1">
                    <p className="text-white font-semibold">Buy Now</p>
                    <p className="text-purple-300/70 text-sm">Fixed price listing</p>
                  </div>
                  {groupedItems[showListingTypeModal].listingType === 'buy_now' && (
                    <CheckCircle size={20} className="text-green-400" />
                  )}
                </div>
              </button>

              <div className="space-y-2">
                <p className="text-purple-400 text-sm font-semibold px-2">Auction Duration</p>
                {([1, 3, 7, 14] as const).map((duration) => (
                  <button
                    key={duration}
                    onClick={() => {
                      handleListingTypeChange(showListingTypeModal, 'auction', duration);
                      setShowListingTypeModal(null);
                    }}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      groupedItems[showListingTypeModal].listingType === 'auction' &&
                      groupedItems[showListingTypeModal].auctionDuration === duration
                        ? 'bg-purple-500/20 border-purple-500'
                        : 'bg-gray-800/50 border-purple-500/30 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle size={24} className="text-purple-400" />
                      <div className="flex-1">
                        <p className="text-white font-semibold">Auction - {duration} {duration === 1 ? 'Day' : 'Days'}</p>
                        <p className="text-purple-300/70 text-sm">Users can bid on this item</p>
                      </div>
                      {groupedItems[showListingTypeModal].listingType === 'auction' &&
                       groupedItems[showListingTypeModal].auctionDuration === duration && (
                        <CheckCircle size={20} className="text-green-400" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
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
