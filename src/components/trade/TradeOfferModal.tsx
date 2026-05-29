import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  Package,
  Loader,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import { CachedImage } from '../ui/CachedImage';

interface InventoryItem {
  id: string;
  asset_id: string;
  name: string;
  market_name: string;
  type: string;
  rarity: string;
  condition: string;
  image: string;
  price_estimate: number;
  tradable: boolean;
  marketable: boolean;
  float?: string;
  pattern?: string;
  stickers?: any[];
}

interface TradeOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientSteamId: string;
  recipientName: string;
}

const TradeOfferModal: React.FC<TradeOfferModalProps> = ({
  isOpen,
  onClose,
  recipientSteamId,
  recipientName,
}) => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const { formatPrice } = useCurrencyStore();

  const [myInventory, setMyInventory] = useState<InventoryItem[]>([]);
  const [recipientInventory, setRecipientInventory] = useState<InventoryItem[]>([]);
  const [selectedMyItems, setSelectedMyItems] = useState<string[]>([]);
  const [selectedRecipientItems, setSelectedRecipientItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [mySearch, setMySearch] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      fetchInventories();
    }
  }, [isOpen, user]);

  const fetchInventories = async () => {
    if (!user?.steamId) return;

    setLoading(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const [myInvResponse, recipientInvResponse] = await Promise.all([
        fetch(`${supabaseUrl}/functions/v1/user-inventory?steamId=${user.steamId}`, {
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${supabaseUrl}/functions/v1/user-inventory?steamId=${recipientSteamId}`, {
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (myInvResponse.ok) {
        const myData = await myInvResponse.json();
        setMyInventory(myData.items.filter((item: InventoryItem) => item.tradable));
      }

      if (recipientInvResponse.ok) {
        const recipientData = await recipientInvResponse.json();
        setRecipientInventory(recipientData.items.filter((item: InventoryItem) => item.tradable));
      }
    } catch (error) {
      console.error('Failed to fetch inventories:', error);
      addToast({
        type: 'error',
        title: 'Failed to Load',
        message: 'Could not load inventories',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMyItem = (itemId: string) => {
    setSelectedMyItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleRecipientItem = (itemId: string) => {
    setSelectedRecipientItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const getSelectedItems = (inventory: InventoryItem[], selectedIds: string[]) => {
    return inventory.filter((item) => selectedIds.includes(item.id));
  };

  const calculateTotalValue = (items: InventoryItem[]) => {
    return items.reduce((sum, item) => sum + item.price_estimate, 0);
  };

  const mySelectedItems = getSelectedItems(myInventory, selectedMyItems);
  const recipientSelectedItems = getSelectedItems(recipientInventory, selectedRecipientItems);
  const myTotalValue = calculateTotalValue(mySelectedItems);
  const recipientTotalValue = calculateTotalValue(recipientSelectedItems);
  const priceDifference = recipientTotalValue > 0
    ? ((myTotalValue - recipientTotalValue) / recipientTotalValue) * 100
    : myTotalValue > 0 ? 100 : 0;

  const isPriceBalanced = Math.abs(priceDifference) <= 15;

  const handleCreateTradeOffer = async () => {
    if (!user?.steamId) return;

    if (selectedMyItems.length === 0 || selectedRecipientItems.length === 0) {
      addToast({
        type: 'warning',
        title: 'Items Required',
        message: 'Please select items from both inventories',
      });
      return;
    }

    if (!isPriceBalanced) {
      addToast({
        type: 'warning',
        title: 'Price Imbalance',
        message: `Price difference is ${Math.abs(priceDifference).toFixed(1)}%. Must be within 15%.`,
      });
      return;
    }

    setCreating(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const offeredItems = mySelectedItems.map((item) => ({
        asset_id: item.asset_id,
        item_name: item.name,
        market_name: item.market_name,
        item_type: item.type,
        rarity: item.rarity,
        condition: item.condition,
        market_value: item.price_estimate,
        image_url: item.image,
        float_value: item.float,
        pattern_template: item.pattern,
        stickers: item.stickers || [],
      }));

      const requestedItems = recipientSelectedItems.map((item) => ({
        asset_id: item.asset_id,
        item_name: item.name,
        market_name: item.market_name,
        item_type: item.type,
        rarity: item.rarity,
        condition: item.condition,
        market_value: item.price_estimate,
        image_url: item.image,
        float_value: item.float,
        pattern_template: item.pattern,
        stickers: item.stickers || [],
      }));

      const response = await fetch(`${supabaseUrl}/functions/v1/trade-offers?action=create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initiator_steam_id: user.steamId,
          recipient_steam_id: recipientSteamId,
          offered_items: offeredItems,
          requested_items: requestedItems,
          notes: notes,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        addToast({
          type: 'success',
          title: 'Trade Offer Sent',
          message: `Your trade offer was sent to ${recipientName}`,
        });
        onClose();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create trade offer');
      }
    } catch (error) {
      console.error('Failed to create trade offer:', error);
      addToast({
        type: 'error',
        title: 'Failed to Send',
        message: error instanceof Error ? error.message : 'Failed to create trade offer',
      });
    } finally {
      setCreating(false);
    }
  };

  const filterInventory = (inventory: InventoryItem[], searchQuery: string) => {
    if (!searchQuery) return inventory;
    const query = searchQuery.toLowerCase();
    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.type.toLowerCase().includes(query) ||
        item.condition.toLowerCase().includes(query)
    );
  };

  const filteredMyInventory = filterInventory(myInventory, mySearch);
  const filteredRecipientInventory = filterInventory(recipientInventory, recipientSearch);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-900 rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden border border-purple-500/30 shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-6 border-b border-purple-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Create Trade Offer</h2>
                <p className="text-gray-300">
                  Trading with <span className="text-purple-400 font-semibold">{recipientName}</span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader className="w-8 h-8 animate-spin text-purple-500" />
              <span className="ml-3 text-gray-300">Loading inventories...</span>
            </div>
          ) : (
            <>
              {/* Inventories Side by Side */}
              <div className="grid grid-cols-2 gap-4 p-6 overflow-y-auto max-h-[50vh]">
                {/* My Inventory */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center">
                      <Package className="w-5 h-5 mr-2 text-green-400" />
                      Your Items ({selectedMyItems.length} selected)
                    </h3>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search your items..."
                      value={mySearch}
                      onChange={(e) => setMySearch(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {filteredMyInventory.map((item) => (
                      <motion.div
                        key={item.id}
                        onClick={() => toggleMyItem(item.id)}
                        whileHover={{ scale: 1.05 }}
                        className={`bg-gray-800 rounded-lg p-2 cursor-pointer border-2 transition-all ${
                          selectedMyItems.includes(item.id)
                            ? 'border-green-500 ring-2 ring-green-500/50'
                            : 'border-gray-700 hover:border-green-400'
                        }`}
                      >
                        <CachedImage
                          src={item.image}
                          alt={item.name}
                          className="w-full h-20 object-contain mb-2"
                        />
                        <p className="text-xs text-white line-clamp-2">{item.name}</p>
                        <p className="text-xs text-green-400 font-bold mt-1">
                          {formatPrice(item.price_estimate)}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Recipient Inventory */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center">
                      <Package className="w-5 h-5 mr-2 text-blue-400" />
                      {recipientName}'s Items ({selectedRecipientItems.length} selected)
                    </h3>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search their items..."
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {filteredRecipientInventory.map((item) => (
                      <motion.div
                        key={item.id}
                        onClick={() => toggleRecipientItem(item.id)}
                        whileHover={{ scale: 1.05 }}
                        className={`bg-gray-800 rounded-lg p-2 cursor-pointer border-2 transition-all ${
                          selectedRecipientItems.includes(item.id)
                            ? 'border-blue-500 ring-2 ring-blue-500/50'
                            : 'border-gray-700 hover:border-blue-400'
                        }`}
                      >
                        <CachedImage
                          src={item.image}
                          alt={item.name}
                          className="w-full h-20 object-contain mb-2"
                        />
                        <p className="text-xs text-white line-clamp-2">{item.name}</p>
                        <p className="text-xs text-blue-400 font-bold mt-1">
                          {formatPrice(item.price_estimate)}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Comparison */}
              <div className="bg-gray-800/50 border-t border-gray-700 p-6">
                <div className="grid grid-cols-3 gap-6 mb-4">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-1">You're Offering</p>
                    <p className="text-2xl font-bold text-green-400">
                      {formatPrice(myTotalValue)}
                    </p>
                  </div>

                  <div className="text-center flex flex-col items-center justify-center">
                    <ArrowRight className="w-8 h-8 text-purple-400 mb-2" />
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        isPriceBalanced
                          ? 'bg-green-500/20 border border-green-500/50'
                          : 'bg-red-500/20 border border-red-500/50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {priceDifference > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400" />
                        )}
                        <span
                          className={`text-sm font-bold ${
                            isPriceBalanced ? 'text-green-300' : 'text-red-300'
                          }`}
                        >
                          {Math.abs(priceDifference).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-1">You're Requesting</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {formatPrice(recipientTotalValue)}
                    </p>
                  </div>
                </div>

                {!isPriceBalanced && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-red-300 font-semibold">Price Difference Too Large</p>
                        <p className="text-red-400 text-sm">
                          The price difference must be within 15% for a fair trade. Adjust your selections.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Trade Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add a message with your trade offer..."
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={onClose}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-all font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTradeOffer}
                    disabled={
                      creating ||
                      selectedMyItems.length === 0 ||
                      selectedRecipientItems.length === 0 ||
                      !isPriceBalanced
                    }
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all font-semibold flex items-center justify-center space-x-2"
                  >
                    {creating ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        <span>Send Trade Offer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TradeOfferModal;
