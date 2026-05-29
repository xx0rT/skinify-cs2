import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, DollarSign, Eye, Trash2, CreditCard as Edit3, RefreshCw, Star, TrendingUp, Filter, Search, Grid2x2 as Grid, List, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ListItemModal, ListingData } from '../marketplace/ListItemModal';
import { useToastStore } from '../../store/toastStore';

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
  stickers?: string[];
  listed_for_sale: boolean;
  listing_price?: number;
  last_updated: string;
}

interface InventoryManagerProps {
  steamId: string;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({ steamId }) => {
  const { user } = useAuthStore();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const { addToast } = useToastStore();
  
  // List an item for sale
  const handleListItem = async (item: InventoryItem, listingInfo: ListingData, skipToast: boolean = false) => {
    try {
      console.log('=== LISTING ITEM ===');
      console.log('Item:', item.name);
      console.log('Price:', listingInfo.price);
      console.log('Asset ID:', item.asset_id);
      console.log('Listing Info:', listingInfo);

      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const listingData: any = {
        steam_id: steamId,
        asset_id: item.asset_id,
        market_hash_name: item.market_name,
        item_name: item.name,
        item_type: item.type,
        rarity: item.rarity,
        condition: item.condition,
        price: listingInfo.price,
        image_url: item.image,
        float_value: item.float,
        pattern_template: item.pattern,
        stickers: item.stickers,
        description: listingInfo.description || `${item.condition} ${item.name} - ${item.type}`,
        listing_type: listingInfo.listingType === 'auction' ? 'auction' : 'standard',
      };

      if (listingInfo.listingType === 'auction' && listingInfo.auctionDuration) {
        const auctionEndTime = new Date();
        auctionEndTime.setDate(auctionEndTime.getDate() + listingInfo.auctionDuration);
        listingData.auction_end_time = auctionEndTime.toISOString();
        listingData.minimum_bid = listingInfo.price;
      }

      if (listingInfo.visibility === 'private') {
        listingData.listing_type = 'private';
      }

      console.log('Sending listing data:', listingData);

      const response = await fetch(`${supabaseUrl}/functions/v1/marketplace-listings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData)
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Listing created successfully:', result);

        setInventory(prev => prev.map(invItem =>
          invItem.id === item.id
            ? { ...invItem, listed_for_sale: true, listing_price: listingInfo.price }
            : invItem
        ));

        if (!skipToast) {
          const listingTypeText = listingInfo.listingType === 'auction' ? ' as auction' : '';
          const visibilityText = listingInfo.visibility === 'private' ? ' (private)' : '';
          addToast(`${item.name} listed for ${listingInfo.price.toLocaleString('cs-CZ')} Kč${listingTypeText}${visibilityText}!`, 'success');
        }
      } else {
        const errorText = await response.text();
        console.error('Listing failed - Response:', errorText);

        let errorMessage = 'Failed to list item';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Failed to list item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addToast(`Failed to list ${item.name}: ${errorMessage}`, 'error');
      throw error;
    }
  };

  // Toggle item selection
  const toggleItemSelection = (itemId: string) => {
    const item = inventory.find(inv => inv.id === itemId);
    // Don't allow selecting already-listed items
    if (item?.listed_for_sale) {
      addToast('This item is already listed in the marketplace', 'warning');
      return;
    }

    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Select/Deselect all visible items
  const toggleSelectAll = () => {
    const selectableItems = filteredInventory.filter(item => item.tradable && item.marketable && !item.listed_for_sale);
    if (selectedItems.length === selectableItems.length && selectableItems.length > 0) {
      setSelectedItems([]);
    } else {
      setSelectedItems(selectableItems.map(item => item.id));
    }
  };

  const openBulkListModal = () => {
    setShowListModal(true);
  };

  const handleConfirmListing = async (listings: ListingData[]) => {
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const listing of listings) {
      const item = inventory.find(inv => inv.id === listing.itemId);
      if (item) {
        try {
          await handleListItem(item, listing, true);
          successCount++;
        } catch (error) {
          failCount++;
          errors.push(item.name);
        }
      }
    }

    if (successCount > 0 && failCount === 0) {
      addToast(`Successfully listed ${successCount} item${successCount > 1 ? 's' : ''} for sale!`, 'success');
    } else if (successCount > 0 && failCount > 0) {
      addToast(`Listed ${successCount} item${successCount > 1 ? 's' : ''}, ${failCount} failed`, 'warning');
    } else if (failCount > 0) {
      addToast(`Failed to list ${failCount} item${failCount > 1 ? 's' : ''}`, 'error');
    }

    setSelectedItems([]);
    await fetchInventory();
  };

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('=== FETCHING USER INVENTORY ===');

      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      // Load cached prices from localStorage
      const cacheKey = `inventory_prices_${steamId}`;
      const cachedPricesStr = localStorage.getItem(cacheKey);
      const cachedPrices: Record<string, number> = cachedPricesStr ? JSON.parse(cachedPricesStr) : {};

      const response = await fetch(`${supabaseUrl}/functions/v1/user-inventory?steamId=${steamId}`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();

        // Fetch user's active listings to check which items are already listed
        const listingsResponse = await fetch(`${supabaseUrl}/functions/v1/marketplace-listings?steamId=${steamId}&userOnly=true`, {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          }
        });

        let listedAssetIds = new Set<string>();
        if (listingsResponse.ok) {
          const listingsData = await listingsResponse.json();
          listedAssetIds = new Set(listingsData.items.map((item: any) => item.asset_id));
          console.log('Already listed asset IDs:', Array.from(listedAssetIds));
        }

        // Transform API response to our inventory format
        const inventoryItems: InventoryItem[] = data.items
          .filter((item: any) => {
            // Filter out items with missing critical data
            if (!item || !item.name || !item.image) {
              console.warn('Skipping item with missing critical data:', item);
              return false;
            }
            return true;
          })
          .map((item: any) => {
            const assetId = item.assetid || item.id;
            const isListed = listedAssetIds.has(assetId);

            // Use cached price if available, otherwise use new price and cache it
            let priceEstimate = item.price_estimate || 0;
            if (cachedPrices[assetId]) {
              priceEstimate = cachedPrices[assetId];
            } else if (priceEstimate > 0) {
              cachedPrices[assetId] = priceEstimate;
            }

            return {
              id: item.id || `${assetId}_${Date.now()}`,
              asset_id: assetId,
              name: item.name,
              market_name: item.market_name || item.name,
              type: item.type || 'Unknown',
              rarity: item.rarity || 'Consumer Grade',
              condition: item.condition || 'Not Painted',
              image: item.image,
              price_estimate: priceEstimate,
              tradable: item.tradable !== false,
              marketable: item.marketable !== false,
              float: item.float,
              pattern: item.pattern,
              stickers: Array.isArray(item.stickers) ? item.stickers : [],
              listed_for_sale: isListed,
              last_updated: new Date().toISOString()
            };
          });

        // Save updated cached prices
        localStorage.setItem(cacheKey, JSON.stringify(cachedPrices));

        setInventory(inventoryItems);
        console.log(`API returned ${data.items.length} items`);
        console.log(`Loaded ${inventoryItems.length} inventory items after filtering (${Array.from(listedAssetIds).length} already listed)`);

        // Log any items with stickers for debugging
        const itemsWithStickers = inventoryItems.filter(item => item.stickers && item.stickers.length > 0);
        if (itemsWithStickers.length > 0) {
          console.log(`Found ${itemsWithStickers.length} items with stickers:`, itemsWithStickers.map(i => ({
            name: i.name,
            stickers: i.stickers.length,
            hasImage: !!i.image,
            hasName: !!i.name
          })));
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch inventory');
      }
    } catch (error) {
      console.error('Inventory fetch error:', error);
      setError(error instanceof Error ? error.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (steamId) {
      fetchInventory();
    }
  }, [steamId]);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.condition.toLowerCase().includes(searchQuery.toLowerCase());

    let result = false;
    switch (filter) {
      case 'listed':
        result = item.listed_for_sale && matchesSearch;
        break;
      case 'tradable':
        result = item.tradable && matchesSearch;
        break;
      case 'valuable':
        result = item.price_estimate > 1000 && matchesSearch;
        break;
      default:
        result = matchesSearch;
    }

    // Debug: Log filtered out items
    if (!result && inventory.length > 0 && filter === 'all' && !searchQuery) {
      console.warn('Item filtered out:', {
        name: item.name,
        matchesSearch,
        filter,
        searchQuery,
        hasStickers: item.stickers && item.stickers.length > 0
      });
    }

    return result;
  });


  const getRarityColor = (rarity: string) => {
    const rarityLower = rarity.toLowerCase();
    if (rarityLower.includes('exceedingly rare') || rarityLower.includes('★')) return 'text-yellow-400 border-yellow-400/30';
    if (rarityLower.includes('covert')) return 'text-red-400 border-red-400/30';
    if (rarityLower.includes('classified')) return 'text-purple-400 border-purple-400/30';
    if (rarityLower.includes('restricted')) return 'text-pink-400 border-pink-400/30';
    if (rarityLower.includes('mil-spec')) return 'text-blue-400 border-blue-400/30';
    return 'text-gray-400 border-gray-400/30';
  };

  const totalValue = filteredInventory.reduce((sum, item) => sum + item.price_estimate, 0);

  if (loading) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700/50 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading your Steam inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-400 mb-2">Inventory Load Failed</h3>
        <p className="text-gray-300 mb-4">{error}</p>
        <button
          onClick={fetchInventory}
          className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center space-x-2 mx-auto"
        >
          <RefreshCw size={16} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inventory Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
            <Package className="w-7 h-7 text-blue-500 mr-3" />
            Steam Inventory
          </h2>
          <div className="flex items-center space-x-6 text-sm">
            <span className="text-gray-400">
              {filteredInventory.length} of {inventory.length} items • Total value: {totalValue.toLocaleString('cs-CZ')} Kč
            </span>
            {selectedItems.length > 0 && (
              <span className="text-purple-400 font-medium">
                {selectedItems.length} selected
              </span>
            )}
            <button
              onClick={fetchInventory}
              className="text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1"
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* View Controls and Bulk Actions */}
        <div className="flex items-center space-x-4">
          {selectedItems.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={openBulkListModal}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
              >
                <DollarSign size={16} />
                <span>List {selectedItems.length} Items</span>
              </button>
              <button
                onClick={() => setSelectedItems([])}
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-all duration-300"
              >
                Clear
              </button>
            </div>
          )}
          <div className="flex items-center space-x-2 bg-gray-700/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedItems.length === filteredInventory.filter(item => item.tradable && item.marketable && !item.listed_for_sale).length && filteredInventory.filter(item => item.tradable && item.marketable && !item.listed_for_sale).length > 0}
              onChange={toggleSelectAll}
              className="w-5 h-5 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-800 cursor-pointer"
            />
            <span className="text-gray-300 font-medium">Select All</span>
          </label>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search your items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="all">All Items</option>
          <option value="listed">Listed for Sale</option>
          <option value="tradable">Tradable</option>
          <option value="valuable">High Value (&gt;1000 Kč)</option>
        </select>
      </div>

      {/* Inventory Grid/List */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
        {filteredInventory.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {searchQuery ? 'No items match your search' : 'No CS2 items found'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery 
                ? 'Try a different search term'
                : 'Make sure your Steam inventory is public to see your CS2 items here'
              }
            </p>
            <button
              onClick={() => window.open(`https://steamcommunity.com/profiles/${steamId}/inventory/`, '_blank')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center space-x-2 mx-auto"
            >
              <ExternalLink size={16} />
              <span>View on Steam</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredInventory.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  if (item.tradable && item.marketable && !item.listed_for_sale) {
                    toggleItemSelection(item.id);
                  }
                }}
                className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${
                  item.listed_for_sale
                    ? 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-green-500/30 opacity-70 cursor-not-allowed'
                    : selectedItems.includes(item.id)
                    ? 'bg-gradient-to-br from-blue-900/40 to-purple-900/40 border border-blue-500/50 shadow-lg shadow-blue-500/20 cursor-pointer transform hover:scale-105'
                    : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 hover:border-blue-500/40 cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-blue-500/10'
                }`}
              >
                {/* Selection indicator */}
                {selectedItems.includes(item.id) && !item.listed_for_sale && (
                  <div className="absolute top-2 left-2 z-10 bg-blue-500 rounded-full p-1">
                    <CheckCircle size={14} className="text-white" />
                  </div>
                )}

                {/* Listed badge */}
                {item.listed_for_sale && (
                  <div className="absolute top-2 right-2 z-10 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle size={10} />
                    LISTED
                  </div>
                )}

                <div className="p-4">
                  {/* Item Image */}
                  <div className="relative aspect-square bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <img
                      src={item.image}
                      alt={item.name}
                      className="relative z-10 max-w-[85%] max-h-[85%] object-contain transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>

                  {/* Item Info */}
                  <div className="space-y-2">
                    <h4 className="text-white font-semibold text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-blue-400 transition-colors">
                      {item.name}
                    </h4>

                    {/* Condition & Type */}
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <span className="bg-gray-700/50 px-2 py-0.5 rounded">{item.condition}</span>
                      <span className="text-gray-600">•</span>
                      <span className="bg-gray-700/50 px-2 py-0.5 rounded truncate">{item.type}</span>
                    </div>

                    {/* Float & Pattern */}
                    {(item.float || item.pattern) && (
                      <div className="text-[10px] text-gray-500 space-y-0.5 bg-gray-800/30 rounded px-2 py-1">
                        {item.float && <div>Float: {parseFloat(item.float).toFixed(4)}</div>}
                        {item.pattern && <div>Pattern: {item.pattern}</div>}
                      </div>
                    )}

                    {/* Rarity Badge */}
                    <div className={`text-[10px] font-bold px-2 py-1 rounded-md border inline-block ${getRarityColor(item.rarity)}`}>
                      {item.rarity}
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-700/50">
                      <span className="text-xs text-gray-400 font-medium">Est. Value</span>
                      <span className="text-sm font-bold text-green-400">
                        {item.price_estimate.toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {filteredInventory.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 hover:bg-gray-700/30 transition-all duration-300 group"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-white font-medium group-hover:text-blue-400 transition-colors">
                      {item.name}
                    </h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <span>{item.condition}</span>
                      <span>•</span>
                      <span>{item.type}</span>
                      <span>•</span>
                      <span className={getRarityColor(item.rarity).split(' ')[0]}>
                        {item.rarity}
                      </span>
                    </div>
                    {(item.float || item.pattern) && (
                      <div className="text-xs text-gray-500 mt-1 flex items-center space-x-3">
                        {item.float && <span>Float: {parseFloat(item.float).toFixed(6)}</span>}
                        {item.pattern && <span>Pattern: {item.pattern}</span>}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">
                      {item.price_estimate.toLocaleString('cs-CZ')} Kč
                    </div>
                    {item.listed_for_sale && item.listing_price && (
                      <div className="text-sm text-blue-400">
                        Listed: {item.listing_price.toLocaleString('cs-CZ')} Kč
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {item.listed_for_sale ? (
                      <div className="flex items-center space-x-1 text-green-400">
                        <CheckCircle size={16} />
                        <span className="text-sm">Listed</span>
                      </div>
                    ) : item.tradable ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const price = prompt(`List ${item.name} for sale. Enter price in Kč:`, item.price_estimate.toString());
                          if (price && !isNaN(Number(price)) && Number(price) > 0) {
                            handleListItem(item, Number(price));
                          }
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm transition-all duration-300 flex items-center space-x-1"
                      >
                        <Plus size={14} />
                        <span>Sell</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-1 text-gray-500">
                        <Clock size={16} />
                        <span className="text-sm">Trade Hold</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={fetchInventory}
          className="bg-blue-600 hover:bg-blue-500 text-white py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
        >
          <RefreshCw size={18} />
          <span>Refresh Inventory</span>
        </button>
        
        <button
          onClick={() => window.open(`https://steamcommunity.com/my/inventory/`, '_blank')}
          className="bg-gray-600 hover:bg-gray-500 text-white py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
        >
          <ExternalLink size={18} />
          <span>Open Steam Inventory</span>
        </button>
        
        <button
          onClick={() => window.open(`https://steamcommunity.com/profiles/${steamId}/inventory/`, '_blank')}
          className="bg-gray-600 hover:bg-gray-500 text-white py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
        >
          <ExternalLink size={18} />
          <span>View Profile</span>
        </button>
      </div>

      <ListItemModal
        items={inventory.filter(item => selectedItems.includes(item.id)).map(item => ({
          id: item.id,
          name: item.name,
          image: item.image,
          rarity: item.rarity,
          type: item.type,
          wear: item.condition,
        }))}
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        onConfirmListing={handleConfirmListing}
      />
    </div>
  );
};

export default InventoryManager;