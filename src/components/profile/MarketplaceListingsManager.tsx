import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import { supabase } from '../../lib/supabaseClient';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, CreditCard as Edit3, Trash2, Eye, Flame, DollarSign, TrendingUp, Package, Clock, Star, AlertCircle, CheckCircle, RefreshCw, Search, Filter, Grid2x2 as Grid, List, ExternalLink, Settings, X, Store, Share2, Copy } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { useToastStore } from '../../store/toastStore';

interface MarketplaceListing {
  id: number | string;
  asset_id: string;
  item_name: string;
  market_hash_name: string;
  item_type: string;
  rarity: string;
  condition: string;
  price: number;
  image_url: string;
  float_value?: string;
  pattern_template?: string;
  stickers?: string[];
  description?: string;
  is_active: boolean;
  views: number;
  created_at: string;
  updated_at: string;
  listing_type?: 'standard' | 'auction' | 'private';
  private_buyer_steam_id?: string;
  share_token?: string;
}

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
}

interface MarketplaceListingsManagerProps {
  steamId: string;
}

const MarketplaceListingsManager: React.FC<MarketplaceListingsManagerProps> = ({ steamId }) => {
  const { user } = useAuthStore();
  const { formatPrice } = useCurrencyStore();
  const { addToast } = useToastStore();
  const [activeListings, setActiveListings] = useState<MarketplaceListing[]>([]);
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [showListingModal, setShowListingModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  const [listingPrice, setListingPrice] = useState('');
  const [listingDescription, setListingDescription] = useState('');
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedListingForPromotion, setSelectedListingForPromotion] = useState<MarketplaceListing | null>(null);
  const [selectedListingsForPromotion, setSelectedListingsForPromotion] = useState<MarketplaceListing[]>([]);
  const [showBulkPromoteModal, setShowBulkPromoteModal] = useState(false);
  const [promotionProcessing, setPromotionProcessing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showBulkListingModal, setShowBulkListingModal] = useState(false);
  const [bulkListingPrices, setBulkListingPrices] = useState<{ [itemId: string]: string }>({});
  const [bulkListingDescriptions, setBulkListingDescriptions] = useState<{ [itemId: string]: string }>({});
  const [bulkListingProcessing, setBulkListingProcessing] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [userShop, setUserShop] = useState<any>(null);
  const [shopItems, setShopItems] = useState<string[]>([]);

  // Fetch user's marketplace listings
  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`=== FETCHING USER LISTINGS FOR ${steamId} ===`);
      
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      // Add cache-busting parameter to force fresh data
      const timestamp = new Date().getTime();
      const listingsUrl = `${supabaseUrl}/functions/v1/marketplace-listings?steamId=${steamId}&userOnly=true&_t=${timestamp}`;

      const response = await fetch(listingsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Debug the actual response structure
        console.log('Raw listings response:', data);
        console.log('Response keys:', Object.keys(data));
        console.log('Items array:', data.items);
        
        if (data.items && Array.isArray(data.items)) {
          // Map the response to our expected format
          const formattedListings = data.items.map((listing: any) => ({
            id: listing.id || listing.asset_id,
            asset_id: listing.asset_id,
            item_name: listing.name || listing.item_name || 'Unknown Item',
            market_hash_name: listing.market_name || listing.market_hash_name,
            item_type: listing.type || listing.item_type || 'Unknown',
            rarity: listing.rarity || 'Consumer Grade',
            condition: listing.condition || 'Factory New',
            price: typeof listing.price === 'number' ? listing.price : parseFloat(listing.price) || 0,
            image_url: listing.image || listing.image_url || 'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICfTH5s2H6IhxFcH8E2SbkCPAL-fYJ0zJyZKgdP4nzCjsLa45O',
            float_value: listing.float,
            pattern_template: listing.pattern,
            stickers: listing.stickers || [],
            description: listing.description,
            is_active: listing.is_active !== false,
            views: listing.views || 0,
            created_at: listing.created_at || listing.listed_at || new Date().toISOString(),
            updated_at: listing.updated_at || new Date().toISOString(),
            listing_type: listing.listing_type || 'standard',
            private_buyer_steam_id: listing.private_buyer_steam_id,
            share_token: listing.share_token
          }));
          
          setActiveListings(formattedListings);
          console.log(`=== LOADED ${formattedListings.length} USER LISTINGS ===`);
          console.log('Formatted listings:', formattedListings);
        } else {
          console.warn('No items array in response or items is not an array');
          setActiveListings([]);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch user listings:', errorData);
        setError(`Failed to load listings: ${errorData.error || 'Unknown error'}`);
        setActiveListings([]);
      }
    } catch (error) {
      console.error('User listings fetch error:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setActiveListings([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's inventory (items available to list)
  const fetchInventory = async () => {
    setInventoryLoading(true);
    
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/user-inventory?steamId=${steamId}`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Convert to our format and filter out already listed items
        const inventoryItems: InventoryItem[] = data.items.map((item: any) => ({
          id: item.id,
          asset_id: item.assetid || item.id,
          name: item.name,
          market_name: item.market_name,
          type: item.type,
          rarity: item.rarity,
          condition: item.condition,
          image: item.image,
          price_estimate: item.price_estimate,
          tradable: item.tradable,
          marketable: item.marketable,
          float: item.float,
          pattern: item.pattern,
          stickers: item.stickers || []
        }));
        
        // Filter out items that are already listed
        const listedAssetIds = activeListings.map(listing => listing.asset_id);
        const availableForListing = inventoryItems.filter(item => 
          !listedAssetIds.includes(item.asset_id) && item.tradable && item.marketable
        );
        
        setAvailableItems(availableForListing);
        console.log(`Found ${availableForListing.length} items available for listing`);
      } else {
        console.error('Failed to fetch inventory');
        setAvailableItems([]);
      }
    } catch (error) {
      console.error('Inventory fetch error:', error);
      setAvailableItems([]);
    } finally {
      setInventoryLoading(false);
    }
  };

  // List an item for sale
  const handleListItem = async (item: InventoryItem, price: number, description: string = '') => {
    try {
      console.log('=== LISTING ITEM ===');
      console.log('Getting credentials...');

      const credentials = getSupabaseCredentials();
      console.log('Credentials obtained:', {
        hasUrl: !!credentials.supabaseUrl,
        hasKey: !!credentials.supabaseKey,
        url: credentials.supabaseUrl?.substring(0, 30)
      });

      const { supabaseUrl, supabaseKey } = credentials;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase credentials are not available. URL: ' + !!supabaseUrl + ', Key: ' + !!supabaseKey);
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/marketplace-listings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          steam_id: steamId,
          asset_id: item.asset_id,
          market_hash_name: item.market_name,
          item_name: item.name,
          item_type: item.type,
          rarity: item.rarity,
          condition: item.condition,
          price: price,
          image_url: item.image,
          float_value: item.float,
          pattern_template: item.pattern,
          stickers: item.stickers,
          description: description || `${item.condition} ${item.name} - ${item.type}`
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Item listed successfully:', result);

        // Refresh both listings and inventory
        await fetchListings();
        await fetchInventory();

        // Close modal and reset form
        setShowListingModal(false);
        setSelectedItem(null);
        setEditingListing(null);
        setListingPrice('');
        setListingDescription('');
        setModalSearchQuery('');

        alert(`✅ ${item.name} listed for ${price.toLocaleString('cs-CZ')} Kč!`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to list item');
      }
    } catch (error) {
      console.error('Failed to list item:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`❌ Failed to list item: ${errorMessage}`);

      // Also show toast
      addToast({
        type: 'error',
        title: 'Failed to List Item',
        message: errorMessage,
        duration: 5000
      });
    }
  };

  // Remove listing
  const handleRemoveListing = async (listing: MarketplaceListing, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }

    console.log('=== REMOVING LISTING ===');
    console.log('Listing ID:', listing.id, 'Steam ID:', steamId);

    if (!confirm(`Remove ${listing.item_name} from marketplace?`)) return;

    try {
      if (!steamId) {
        throw new Error('Steam ID is missing from auth store');
      }

      // Optimistically update UI - remove item immediately
      setActiveListings(prev => prev.filter(item => item.id !== listing.id));

      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const listingIdParam = typeof listing.id === 'string' ? listing.id : listing.id.toString();

      console.log('Deleting via edge function:', listingIdParam);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/marketplace-listings?id=${listingIdParam}&steamId=${steamId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        throw new Error(errorData.error || 'Failed to delete listing');
      }

      console.log('✅ Listing deleted successfully');

      // Refresh data after successful deletion
      await Promise.all([
        fetchListings(),
        fetchInventory()
      ]);

      addToast({
        type: 'success',
        title: 'Listing Removed',
        message: `${listing.item_name} removed from marketplace`,
        duration: 3000
      });
    } catch (error) {
      console.error('Failed to remove listing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Revert optimistic update on error
      await fetchListings();

      addToast({
        type: 'error',
        title: 'Failed to Remove',
        message: errorMessage,
        duration: 4000
      });
    }
  };

  // Update listing price
  const handleUpdateListing = async (listing: MarketplaceListing, newPrice: number, newDescription: string = '') => {
    console.log('=== UPDATING LISTING ===');
    console.log('Updating listing:', listing.id, 'New price:', newPrice, 'Description:', newDescription);

    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const updateData = {
        price: newPrice,
        description: newDescription,
        updated_at: new Date().toISOString()
      };

      console.log('Sending update data:', updateData);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/marketplace-listings?steam_id=${steamId}&id=${listing.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        }
      );

      if (response.ok) {
        const result = await response.json();
        console.log('Listing updated successfully:', result);

        setActiveListings(prev => prev.map(item =>
          item.id === listing.id
            ? { ...item, price: newPrice, description: newDescription, updated_at: new Date().toISOString() }
            : item
        ));

        addToast(`${listing.item_name} updated successfully!`, 'success');
      } else {
        const errorText = await response.text();
        console.error('Update failed - Response:', errorText);
        throw new Error(errorText || 'Failed to update listing');
      }
    } catch (error) {
      console.error('Failed to update listing:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addToast(`Failed to update ${listing.item_name}: ${errorMessage}`, 'error');
      throw error;
    }
  };

  // Promote item to hot status
  const handlePromoteToHot = async (listing: MarketplaceListing) => {
    if (!user) {
      addToast({
        type: 'warning',
        title: 'Login Required',
        message: 'Please log in to promote items'
      });
      return;
    }

    setSelectedListingForPromotion(listing);
    setShowPromoteModal(true);
  };

  const handleConfirmPromotion = async () => {
    if (!selectedListingForPromotion || !user) return;

    setPromotionProcessing(true);

    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/hot-items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listing_id: selectedListingForPromotion.id,
          user_steam_id: user.steamId,
          asset_id: selectedListingForPromotion.asset_id,
          payment_method: 'balance',
          duration_hours: 24
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        addToast({
          type: 'success',
          title: '🔥 Item Promoted!',
          message: `${selectedListingForPromotion.item_name} is now a hot item for 24 hours!`,
          duration: 4000
        });

        setShowPromoteModal(false);
        setSelectedListingForPromotion(null);
        
        // Refresh listings
        await fetchListings();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to promote item');
      }
    } catch (error) {
      console.error('Failed to promote item:', error);
      addToast({
        type: 'error',
        title: 'Promotion Failed',
        message: error instanceof Error ? error.message : 'Failed to promote item'
      });
    } finally {
      setPromotionProcessing(false);
    }
  };

  // Handle listing selection for bulk promotion
  const handleListingSelection = (listing: MarketplaceListing) => {
    setSelectedListingsForPromotion(prev => {
      const exists = prev.find(l => l.id === listing.id);
      if (exists) {
        return prev.filter(l => l.id !== listing.id);
      } else {
        return [...prev, listing];
      }
    });
  };

  // Handle sharing private listing URL
  const handleShareListing = async (listing: MarketplaceListing) => {
    // Use secure token for URL to prevent brute-forcing
    const shareUrl = listing.share_token
      ? `${window.location.origin}/item/${listing.share_token}`
      : `${window.location.origin}/item/${listing.id}`;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        addToast({
          type: 'success',
          title: 'Link Copied!',
          message: listing.listing_type === 'private'
            ? 'Private listing link copied to clipboard. Share it with the buyer.'
            : 'Listing link copied to clipboard',
          duration: 3000
        });
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        addToast({
          type: 'success',
          title: 'Link Copied!',
          message: 'Listing link copied to clipboard',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Failed to copy link:', error);
      addToast({
        type: 'info',
        title: 'Share Link',
        message: shareUrl,
        duration: 8000
      });
    }
  };

  // Handle bulk promotion
  const handleBulkPromote = () => {
    if (selectedListingsForPromotion.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Items Selected',
        message: 'Please select at least one item to promote'
      });
      return;
    }
    setShowBulkPromoteModal(true);
  };

  const handleConfirmBulkPromotion = async () => {
    if (selectedListingsForPromotion.length === 0 || !user) return;

    setPromotionProcessing(true);

    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      // Promote each item
      const promotionPromises = selectedListingsForPromotion.map(listing =>
        fetch(`${supabaseUrl}/functions/v1/hot-items`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            listing_id: listing.id,
            user_steam_id: user.steamId,
            asset_id: listing.asset_id,
            payment_method: 'balance',
            duration_hours: 24
          })
        })
      );

      const results = await Promise.all(promotionPromises);
      const successCount = results.filter(r => r.ok).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        addToast({
          type: 'success',
          title: '🔥 Items Promoted!',
          message: `${successCount} item(s) promoted successfully!${failCount > 0 ? ` (${failCount} failed)` : ''}`,
          duration: 4000
        });
      }

      if (failCount > 0 && successCount === 0) {
        throw new Error('All promotions failed');
      }

      setShowBulkPromoteModal(false);
      setSelectedListingsForPromotion([]);

      // Refresh listings
      await fetchListings();
    } catch (error) {
      console.error('Failed to promote items:', error);
      addToast({
        type: 'error',
        title: 'Promotion Failed',
        message: error instanceof Error ? error.message : 'Failed to promote items'
      });
    } finally {
      setPromotionProcessing(false);
    }
  };

  // Handle item selection for bulk listing
  const handleItemSelection = (itemId: string) => {
    setIsMultiSelectMode(true);
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Handle select all/none
  const handleSelectAll = () => {
    setIsMultiSelectMode(true);
    const filteredItemIds = availableItems
      .filter(item => 
        !modalSearchQuery || 
        item.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
        item.condition.toLowerCase().includes(modalSearchQuery.toLowerCase())
      )
      .map(item => item.id);
    
    if (selectedItems.length === filteredItemIds.length) {
      setSelectedItems([]);
      setIsMultiSelectMode(false);
    } else {
      setSelectedItems(filteredItemIds);
    }
  };

  // Clear selection and exit multi-select mode
  const handleClearSelection = () => {
    setSelectedItems([]);
    setIsMultiSelectMode(false);
  };

  // Toggle multi-select mode
  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (!isMultiSelectMode) {
      setSelectedItems([]);
    }
  };

  // Open bulk listing modal
  const handleOpenBulkListing = () => {
    const selectedItemsData = availableItems.filter(item => selectedItems.includes(item.id));
    
    // Initialize prices and descriptions for selected items
    const initialPrices: { [itemId: string]: string } = {};
    const initialDescriptions: { [itemId: string]: string } = {};
    
    selectedItemsData.forEach(item => {
      initialPrices[item.id] = item.price_estimate.toString();
      initialDescriptions[item.id] = `${item.condition} ${item.name} - ${item.type}`;
    });
    
    setBulkListingPrices(initialPrices);
    setBulkListingDescriptions(initialDescriptions);
    setShowListingModal(false);
    setShowBulkListingModal(true);
  };

  // Handle bulk listing submission
  const handleBulkListingSubmit = async () => {
    const selectedItemsData = availableItems.filter(item => selectedItems.includes(item.id));
    
    // Validate all items have valid prices
    const invalidItems = selectedItemsData.filter(item => {
      const price = parseFloat(bulkListingPrices[item.id] || '0');
      return !price || price < 1;
    });
    
    if (invalidItems.length > 0) {
      alert(`Please set valid prices for all items. ${invalidItems.length} items have invalid prices.`);
      return;
    }
    
    setBulkListingProcessing(true);
    
    try {
      let successCount = 0;
      let failedItems: string[] = [];
      
      // List each item individually
      for (const item of selectedItemsData) {
        try {
          const price = parseFloat(bulkListingPrices[item.id]);
          const description = bulkListingDescriptions[item.id] || '';
          
          const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
          
          const response = await fetch(`${supabaseUrl}/functions/v1/marketplace-listings`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              steam_id: steamId,
              asset_id: item.asset_id,
              market_hash_name: item.market_name,
              item_name: item.name,
              item_type: item.type,
              rarity: item.rarity,
              condition: item.condition,
              price: price,
              image_url: item.image,
              float_value: item.float,
              pattern_template: item.pattern,
              stickers: item.stickers,
              description: description
            })
          });
          
          if (response.ok) {
            successCount++;
            console.log(`Successfully listed: ${item.name}`);
          } else {
            const errorData = await response.json();
            console.error(`Failed to list ${item.name}:`, errorData);
            failedItems.push(item.name);
          }
          
          // Add small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (itemError) {
          console.error(`Error listing ${item.name}:`, itemError);
          failedItems.push(item.name);
        }
      }
      
      // Show results
      if (successCount > 0) {
        addToast({
          type: 'success',
          title: '✅ Bulk Listing Complete!',
          message: `Successfully listed ${successCount} items${failedItems.length > 0 ? `, ${failedItems.length} failed` : ''}`,
          duration: 4000
        });
      }
      
      if (failedItems.length > 0) {
        addToast({
          type: 'warning',
          title: 'Some Items Failed',
          message: `${failedItems.length} items failed to list: ${failedItems.slice(0, 3).join(', ')}${failedItems.length > 3 ? '...' : ''}`,
          duration: 5000
        });
      }
      
      // Clean up and refresh
      setShowBulkListingModal(false);
      setSelectedItems([]);
      setBulkListingPrices({});
      setBulkListingDescriptions({});
      
      // Refresh listings and inventory
      await fetchListings();
      await fetchInventory();
      
    } catch (error) {
      console.error('Bulk listing error:', error);
      addToast({
        type: 'error',
        title: 'Bulk Listing Failed',
        message: error instanceof Error ? error.message : 'Failed to list items'
      });
    } finally {
      setBulkListingProcessing(false);
    }
  };

  useEffect(() => {
    if (steamId) {
      fetchListings();
      fetchInventory();
      fetchUserShop();
    }
  }, [steamId]);

  const fetchUserShop = async () => {
    try {
      console.log('=== FETCHING USER SHOP ===');
      console.log('Steam ID:', steamId);

      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

      const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?steam_id=eq.${steamId}&select=id`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        }
      });

      const userRecord = await userResponse.json();
      console.log('User record:', userRecord);

      if (!userRecord || userRecord.length === 0) {
        console.log('No user found for steam_id:', steamId);
        return;
      }

      const userId = userRecord[0].id;
      console.log('User ID:', userId);

      const shopResponse = await fetch(`${supabaseUrl}/rest/v1/user_shops?user_id=eq.${userId}&select=*`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        }
      });

      const shopData = await shopResponse.json();
      console.log('Shop data:', shopData);

      if (shopData && shopData.length > 0) {
        console.log('✅ Shop found:', shopData[0]);
        setUserShop(shopData[0]);

        const itemsResponse = await fetch(`${supabaseUrl}/rest/v1/shop_items?shop_id=eq.${shopData[0].id}&select=listing_id`, {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey,
            'Content-Type': 'application/json',
          }
        });

        const itemsData = await itemsResponse.json();
        console.log('Shop items:', itemsData);

        setShopItems(itemsData?.map((item: any) => item.listing_id.toString()) || []);
        console.log('Loaded shop items IDs:', itemsData?.map((item: any) => item.listing_id.toString()));
      } else {
        console.log('❌ No shop found for user');
      }
    } catch (error) {
      console.error('Error fetching user shop:', error);
    }
  };

  const toggleShopItem = async (listingId: string) => {
    if (!userShop) {
      addToast({
        type: 'warning',
        title: 'No Shop',
        message: 'Create a shop first from the My Shop tab'
      });
      return;
    }

    if (!user?.steamId) {
      addToast({
        type: 'error',
        title: 'Not Authenticated',
        message: 'Please log in to manage your shop'
      });
      return;
    }

    console.log('=== TOGGLE SHOP ITEM ===');
    console.log('Listing ID:', listingId);
    console.log('Shop ID:', userShop.id);
    console.log('User Steam ID:', user.steamId);
    console.log('Current shop items:', shopItems);

    try {
      const isInShop = shopItems.includes(listingId);
      console.log('Is in shop?', isInShop);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jtxqvctllitlhijfcsxg.supabase.co';
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseKey) {
        throw new Error('Supabase key is not configured');
      }

      // Call the edge function with steam_id for auth
      const action = isInShop ? 'remove' : 'add';
      const response = await fetch(`${supabaseUrl}/functions/v1/toggle-shop-item`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          shopId: userShop.id,
          listingId: listingId,
          steamId: user.steamId
        })
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('Request failed:', error);
        throw new Error(error.error || `Failed to ${action} item`);
      }

      const result = await response.json();
      console.log('Success:', result);

      if (isInShop) {
        setShopItems(prev => prev.filter(id => id !== listingId));
        addToast({
          type: 'success',
          title: 'Removed from Shop',
          message: 'Item removed from your shop'
        });
      } else {
        setShopItems(prev => [...prev, listingId]);
        addToast({
          type: 'success',
          title: 'Added to Shop',
          message: 'Item added to your shop'
        });
      }
    } catch (error) {
      console.error('Error toggling shop item:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update shop item'
      });
    }
  };

  const filteredListings = activeListings.filter(listing =>
    !searchQuery || 
    listing.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.item_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.condition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRarityColor = (rarity: string) => {
    const rarityLower = rarity.toLowerCase();
    if (rarityLower.includes('exceedingly rare') || rarityLower.includes('★')) return 'text-purple-400 border-purple-400/30 bg-purple-500/10';
    if (rarityLower.includes('covert')) return 'text-purple-500 border-purple-500/30 bg-purple-600/10';
    if (rarityLower.includes('classified')) return 'text-purple-400 border-purple-400/30 bg-purple-500/10';
    if (rarityLower.includes('restricted')) return 'text-purple-600 border-purple-600/30 bg-purple-700/10';
    if (rarityLower.includes('mil-spec')) return 'text-purple-300 border-purple-300/30 bg-purple-400/10';
    return 'text-gray-400 border-gray-400/30 bg-gray-500/10';
  };

  const totalListingValue = filteredListings.reduce((sum, listing) => sum + listing.price, 0);
  const totalViews = filteredListings.reduce((sum, listing) => sum + listing.views, 0);

  return (
    <div className="space-y-6">
      {/* Listings Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center">
            <ShoppingCart className="w-7 h-7 text-purple-500 mr-3" />
            My Marketplace Listings
          </h2>
          <div className="flex items-center space-x-6 text-sm">
            <span className="text-gray-400">
              {filteredListings.length} active listings • Total value: {formatPrice(totalListingValue)}
            </span>
            <span className="text-gray-400">
              {totalViews} total views
            </span>
            <button
              onClick={fetchListings}
              className="text-purple-400 hover:text-purple-300 transition-colors flex items-center space-x-1"
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-4">
          {selectedItems.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-purple-400 text-sm font-medium">
                {selectedItems.length} selected
              </span>
              <button
                onClick={handleOpenBulkListing}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
              >
                <Plus size={18} />
                <span>List Selected ({selectedItems.length})</span>
              </button>
              <button
                onClick={handleClearSelection}
                className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-lg transition-all duration-300"
              >
                Clear
              </button>
            </div>
          )}

          {/* Multi-Select Mode Toggle */}
          <button
            onClick={toggleMultiSelectMode}
            className={`px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2 ${
              isMultiSelectMode 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Package size={18} />
            <span>{isMultiSelectMode ? 'Exit Multi-Select' : 'Multi-Select Mode'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setSelectedItem(null);
                setShowListingModal(true);
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
            >
              <Plus size={18} />
              <span>List New Item</span>
            </button>

            {selectedListingsForPromotion.length > 0 && (
              <button
                onClick={handleBulkPromote}
                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
              >
                <Flame size={18} />
                <span>Promote {selectedListingsForPromotion.length} Item{selectedListingsForPromotion.length !== 1 ? 's' : ''} (€{selectedListingsForPromotion.length * 2})</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 bg-gray-700/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Shop Status Banner */}
      {!userShop && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Store className="w-6 h-6 text-purple-400" />
              <div>
                <h4 className="text-white font-semibold">Want to showcase your items in a shop?</h4>
                <p className="text-gray-400 text-sm">Create your shop in the "My Shop" tab to add items</p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/profile?tab=shop'}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition"
            >
              Create Shop
            </button>
          </div>
        </div>
      )}

      {userShop && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Store className="w-6 h-6 text-purple-400" />
            <div>
              <h4 className="text-white font-semibold">Shop Connected: {userShop.shop_name}</h4>
              <p className="text-gray-400 text-sm">Click "Add to Shop" on any listing to showcase it in your shop</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{activeListings.length}</div>
          <div className="text-gray-400 text-sm">Active Listings</div>
        </div>
        <div className="bg-purple-600/10 border border-purple-600/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{formatPrice(totalListingValue)}</div>
          <div className="text-gray-400 text-sm">Total Value</div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{totalViews}</div>
          <div className="text-gray-400 text-sm">Total Views</div>
        </div>
        <div className="bg-purple-800/10 border border-purple-800/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {activeListings.length > 0 ? Math.round(totalViews / activeListings.length) : 0}
          </div>
          <div className="text-gray-400 text-sm">Avg Views</div>
        </div>
      </div>

      {/* Listings Content */}
      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading your marketplace listings...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {searchQuery ? 'No listings match your search' : 'No Items Listed Yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchQuery 
                ? 'Try a different search term'
                : 'Make sure your Steam inventory is public to see your CS2 items here'
              }
            </p>
            <button
              onClick={() => window.open(`https://steamcommunity.com/profiles/${steamId}/inventory/`, '_blank')}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center space-x-2 mx-auto"
            >
              <ExternalLink size={16} />
              <span>View on Steam</span>
            </button>
            {!searchQuery && (
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setShowListingModal(true);
                }}
                className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center space-x-2 mx-auto"
              >
                <Plus size={16} />
                <span>List Your First Item</span>
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredListings.map((listing, index) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleListingSelection(listing)}
                className={`group relative overflow-hidden rounded-xl transition-all duration-300 ${
                  selectedListingsForPromotion.some(l => l.id === listing.id)
                    ? 'bg-gradient-to-br from-orange-900/40 to-red-900/40 border border-orange-500/50 shadow-lg shadow-orange-500/20 cursor-pointer transform hover:scale-105'
                    : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 hover:border-green-500/40 cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-green-500/10'
                }`}
              >
                {/* Selection indicator */}
                {selectedListingsForPromotion.some(l => l.id === listing.id) && (
                  <div className="absolute top-2 left-2 z-10 bg-orange-500 rounded-full p-1">
                    <CheckCircle size={14} className="text-white" />
                  </div>
                )}

                {/* Listed badge */}
                <div className="absolute top-2 right-2 z-10 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle size={10} />
                  LIVE
                </div>

                {/* Views counter */}
                <div className="absolute top-10 right-2 z-10 bg-gray-900/80 backdrop-blur-sm text-gray-300 text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1">
                  <Eye size={10} />
                  {listing.views}
                </div>

                <div className="p-4">
                  {/* Item Image */}
                  <div className="relative aspect-square bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <img
                      src={listing.image_url}
                      alt={listing.item_name}
                      className="relative z-10 max-w-[85%] max-h-[85%] object-contain transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>

                  {/* Item Info */}
                  <div className="space-y-2">
                    <h4 className="text-white font-semibold text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-green-400 transition-colors">
                      {listing.item_name}
                    </h4>

                    {/* Condition & Type */}
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <span className="bg-gray-700/50 px-2 py-0.5 rounded">{listing.condition}</span>
                      <span className="text-gray-600">•</span>
                      <span className="bg-gray-700/50 px-2 py-0.5 rounded truncate">{listing.item_type}</span>
                    </div>

                    {/* Float & Pattern */}
                    {(listing.float_value || listing.pattern_template) && (
                      <div className="text-[10px] text-gray-500 space-y-0.5 bg-gray-800/30 rounded px-2 py-1">
                        {listing.float_value && <div>Float: {parseFloat(listing.float_value).toFixed(4)}</div>}
                        {listing.pattern_template && <div>Pattern: {listing.pattern_template}</div>}
                      </div>
                    )}

                    {/* Rarity Badge */}
                    <div className={`text-[10px] font-bold px-2 py-1 rounded-md border inline-block ${getRarityColor(listing.rarity)}`}>
                      {listing.rarity}
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between pt-1 border-t border-gray-700/50">
                      <span className="text-xs text-gray-400 font-medium">Price</span>
                      <span className="text-sm font-bold text-green-400">
                        {formatPrice(listing.price)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-1 pt-2">
                      <div className="grid grid-cols-4 gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedItem({
                              id: listing.id,
                              asset_id: listing.asset_id,
                              name: listing.item_name,
                              market_name: listing.market_hash_name,
                              type: listing.item_type,
                              rarity: listing.rarity,
                              condition: listing.condition,
                              image: listing.image_url,
                              price_estimate: listing.price,
                              tradable: true,
                              marketable: true,
                              float: listing.float_value,
                              pattern: listing.pattern_template,
                              stickers: listing.stickers
                            });
                            setListingPrice(listing.price.toString());
                            setListingDescription(listing.description || '');
                            setShowListingModal(true);
                          }}
                          className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500 text-blue-400 hover:text-blue-300 rounded transition-all duration-200 flex items-center justify-center"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareListing(listing);
                          }}
                          className="p-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 hover:border-green-500 text-green-400 hover:text-green-300 rounded transition-all duration-200 flex items-center justify-center"
                          title="Share"
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePromoteToHot(listing);
                          }}
                          className="p-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 hover:border-orange-500 text-orange-400 hover:text-orange-300 rounded transition-all duration-200 flex items-center justify-center"
                          title="Promote to Hot"
                        >
                          <Flame size={14} />
                        </button>
                        <button
                          onClick={(e) => handleRemoveListing(listing, e)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-red-300 rounded transition-all duration-200 flex items-center justify-center"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {userShop && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleShopItem(listing.id);
                          }}
                          className={`w-full py-2 rounded text-[11px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                            shopItems.includes(listing.id)
                              ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300'
                              : 'bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300'
                          }`}
                        >
                          <Store size={12} />
                          <span>{shopItems.includes(listing.id) ? 'IN SHOP' : 'ADD TO SHOP'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-700/50">
            {filteredListings.map((listing, index) => (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleListingSelection(listing)}
                className={`p-4 transition-all duration-300 cursor-pointer ${
                  selectedListingsForPromotion.some(l => l.id === listing.id)
                    ? 'bg-orange-500/10 border-l-4 border-orange-500'
                    : 'hover:bg-gray-700/30'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-lg flex items-center justify-center relative">
                    <img
                      src={listing.image_url}
                      alt={listing.item_name}
                      className="max-w-full max-h-full object-contain"
                    />
                    {selectedListingsForPromotion.some(l => l.id === listing.id) && (
                      <div className="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full p-0.5">
                        <CheckCircle size={14} />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{listing.item_name}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <span>{listing.condition}</span>
                      <span>•</span>
                      <span>{listing.item_type}</span>
                      <span>•</span>
                      <span className={getRarityColor(listing.rarity).split(' ')[0]}>
                        {listing.rarity}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <div className="flex items-center space-x-1">
                        <Eye size={12} />
                        <span>{listing.views} views</span>
                      </div>
                      <span>Listed {new Date(listing.created_at).toLocaleDateString('cs-CZ')}</span>
                    </div>
                    {(listing.float_value || listing.pattern_template) && (
                      <div className="text-xs text-gray-500 mt-1 space-x-3">
                        {listing.float_value && (
                          <span>Float: {parseFloat(listing.float_value).toFixed(6)}</span>
                        )}
                        {listing.pattern_template && (
                          <span>Pattern: {listing.pattern_template}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-400 mb-1">
                      {formatPrice(listing.price)}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingListing(listing);
                          setSelectedItem({
                            id: listing.id,
                            asset_id: listing.asset_id,
                            name: listing.item_name,
                            market_name: listing.market_hash_name,
                            type: listing.item_type,
                            rarity: listing.rarity,
                            condition: listing.condition,
                            image: listing.image_url,
                            price_estimate: listing.price,
                            tradable: true,
                            marketable: true,
                            float: listing.float_value,
                            pattern: listing.pattern_template,
                            stickers: listing.stickers
                          });
                          setListingPrice(listing.price.toString());
                          setListingDescription(listing.description || '');
                          setShowListingModal(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 p-2 transition-colors"
                        title="Edit listing"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareListing(listing);
                        }}
                        className="text-green-400 hover:text-green-300 p-2 transition-colors"
                        title={listing.listing_type === 'private' ? 'Copy private link to share' : 'Copy shareable link'}
                      >
                        <Share2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePromoteToHot(listing);
                        }}
                        className="text-orange-400 hover:text-orange-300 p-2 transition-colors"
                        title="Promote to hot item ($5)"
                      >
                        <Flame size={14} />
                      </button>
                      {userShop && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleShopItem(listing.id);
                          }}
                          className={`p-2 transition-colors ${
                            shopItems.includes(listing.id)
                              ? 'text-green-400 hover:text-green-300'
                              : 'text-purple-400 hover:text-purple-300'
                          }`}
                          title={shopItems.includes(listing.id) ? 'Remove from shop' : 'Add to shop'}
                        >
                          <Store size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => handleRemoveListing(listing, e)}
                        className="text-red-400 hover:text-red-300 p-2 transition-colors"
                        title="Remove listing"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* List Item Modal */}
      <AnimatePresence>
        {showListingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gray-900 rounded-2xl w-full max-w-2xl border border-gray-700/50 max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">
                    {selectedItem ? 'Edit Listing' : 'List New Item'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowListingModal(false);
                      setSelectedItem(null);
                      setEditingListing(null);
                      setListingPrice('');
                      setListingDescription('');
                      setModalSearchQuery('');
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                {selectedItem ? (
                  /* Edit existing listing */
                  <div className="space-y-6">
                    {/* Item Preview */}
                    <div className="bg-gray-800/50 rounded-lg p-4 flex items-center space-x-4">
                      <div className="w-16 h-16 bg-gray-700/50 rounded-lg flex items-center justify-center">
                        <img 
                          src={selectedItem.image} 
                          alt={selectedItem.name}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{selectedItem.name}</h4>
                        <div className="text-gray-400 text-sm">
                          {selectedItem.condition} • {selectedItem.type}
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full border ${getRarityColor(selectedItem.rarity)} inline-block mt-1`}>
                          {selectedItem.rarity}
                        </div>
                      </div>
                    </div>

                    {/* Price Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Listing Price
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={listingPrice}
                          onChange={(e) => setListingPrice(e.target.value)}
                          placeholder="Enter price"
                          min="1"
                          className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 pr-12 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                          Kč
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Estimated value: {formatPrice(selectedItem.price_estimate)}
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        value={listingDescription}
                        onChange={(e) => setListingDescription(e.target.value)}
                        placeholder="Add details about your item..."
                        rows={3}
                        className="w-full bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setShowListingModal(false);
                          setSelectedItem(null);
                          setEditingListing(null);
                          setListingPrice('');
                          setListingDescription('');
                          setModalSearchQuery('');
                        }}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!listingPrice || parseFloat(listingPrice) < 1) {
                            alert('Please enter a valid price');
                            return;
                          }

                          try {
                            if (editingListing) {
                              await handleUpdateListing(editingListing, parseFloat(listingPrice), listingDescription);
                            } else {
                              await handleListItem(selectedItem, parseFloat(listingPrice), listingDescription);
                            }
                            setShowListingModal(false);
                            setSelectedItem(null);
                            setEditingListing(null);
                            setListingPrice('');
                            setListingDescription('');
                          } catch (error) {
                            console.error('Failed to save listing:', error);
                          }
                        }}
                        disabled={!listingPrice || parseFloat(listingPrice) < 1}
                        className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all duration-300"
                      >
                        {editingListing ? 'Update Listing' : 'List Item'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Select item to list */
                  <div className="space-y-6">
                    {/* Search Bar Inside Modal */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search your Steam inventory..."
                        value={modalSearchQuery}
                        onChange={(e) => setModalSearchQuery(e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>

                    {/* Select All/None Controls */}
                    {isMultiSelectMode && (
                      <div className="flex items-center justify-between bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedItems.length > 0 && selectedItems.length === availableItems.filter(item => 
                              !modalSearchQuery || 
                              item.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                              item.type.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                              item.condition.toLowerCase().includes(modalSearchQuery.toLowerCase())
                            ).length}
                            onChange={handleSelectAll}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <span className="text-white font-medium">
                            {selectedItems.length === 0 ? 'Select All' : 
                             selectedItems.length === availableItems.filter(item => 
                               !modalSearchQuery || 
                               item.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                               item.type.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                               item.condition.toLowerCase().includes(modalSearchQuery.toLowerCase())
                             ).length ? 'Deselect All' : 'Select All'}
                          </span>
                        </div>
                        
                        {selectedItems.length > 0 && (
                          <button
                            onClick={handleOpenBulkListing}
                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center space-x-2"
                          >
                            <Plus size={16} />
                            <span>List {selectedItems.length} Items</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="text-center">
                      <Package className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-white mb-2">Choose Item to List</h4>
                      <p className="text-gray-400">
                        Select from {availableItems.length} available items in your Steam inventory
                      </p>
                    </div>

                    {inventoryLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">Loading your inventory...</p>
                      </div>
                    ) : availableItems.length === 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-4" />
                        <p className="text-gray-400">No tradable items available for listing</p>
                        <button
                          onClick={fetchInventory}
                          className="mt-4 text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          Refresh Inventory
                        </button>
                      </div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                        {/* Inventory Stats */}
                        <div className="mb-4 text-center text-sm text-gray-400">
                          Showing {availableItems.filter(item => 
                            !modalSearchQuery || 
                            item.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                            item.type.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                            item.condition.toLowerCase().includes(modalSearchQuery.toLowerCase())
                          ).length} of {availableItems.length} items
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {availableItems
                            .filter(item => 
                              !modalSearchQuery || 
                              item.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                              item.type.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                              item.condition.toLowerCase().includes(modalSearchQuery.toLowerCase())
                            )
                            .map((item, index) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (!isMultiSelectMode) {
                                  // Single item mode
                                  setSelectedItem(item);
                                  setListingPrice(item.price_estimate.toString());
                                } else {
                                  // Multi-select mode
                                  handleItemSelection(item.id);
                                }
                              }}
                              className={`bg-gray-800/50 rounded-lg p-3 text-left hover:bg-gray-700/50 transition-all duration-300 border group relative ${
                                selectedItems.includes(item.id) 
                                  ? 'border-blue-500/50 bg-blue-500/10' 
                                  : 'border-gray-600/30 hover:border-blue-500/50'
                              }`}
                            >
                              {/* Selection Checkbox */}
                              {isMultiSelectMode && (
                                <div className="absolute top-2 left-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.includes(item.id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleItemSelection(item.id);
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 bg-gray-700/50 rounded flex items-center justify-center">
                                  <img 
                                    src={item.image} 
                                    alt={item.name}
                                    className="max-w-full max-h-full object-contain"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-white font-medium text-sm truncate group-hover:text-blue-400 transition-colors">
                                    {item.name}
                                  </div>
                                  <div className="text-gray-400 text-xs">
                                    {item.condition} • {item.type}
                                  </div>
                                  <div className={`text-xs px-2 py-1 rounded-full border ${getRarityColor(item.rarity)} inline-block mt-1`}>
                                    {item.rarity}
                                  </div>
                                  <div className="text-green-400 font-bold text-sm mt-1">
                                    {formatPrice(item.price_estimate)}
                                  </div>
                                  {item.stickers && item.stickers.length > 0 && (
                                    <div className="text-xs text-purple-400 mt-1">
                                      {item.stickers.length} sticker{item.stickers.length > 1 ? 's' : ''}
                                    </div>
                                  )}
                                  {(item.float || item.pattern) && (
                                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                      {item.float && (
                                        <div>Float: {parseFloat(item.float).toFixed(6)}</div>
                                      )}
                                      {item.pattern && (
                                        <div>Pattern: {item.pattern}</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                        
                        {availableItems.filter(item => 
                          !modalSearchQuery || 
                          item.name.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                          item.type.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
                          item.condition.toLowerCase().includes(modalSearchQuery.toLowerCase())
                        ).length === 0 && modalSearchQuery && (
                          <div className="text-center py-8">
                            <Search className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                            <p className="text-gray-400">No items found for "{modalSearchQuery}"</p>
                            <button
                              onClick={() => setModalSearchQuery('')}
                              className="text-blue-400 hover:text-blue-300 text-sm mt-2"
                            >
                              Clear search
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Promote to Hot Modal */}
      <AnimatePresence>
        {showPromoteModal && selectedListingForPromotion && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gray-900 rounded-2xl w-full max-w-md border border-orange-500/50 overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Flame className="w-6 h-6 text-orange-500 mr-2" />
                    Promote to Hot Item
                  </h3>
                  <button
                    onClick={() => {
                      setShowPromoteModal(false);
                      setSelectedListingForPromotion(null);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Item Preview */}
                <div className="bg-gray-800/50 rounded-lg p-4 mb-6 flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-700/50 rounded-lg flex items-center justify-center">
                    <img 
                      src={selectedListingForPromotion.image_url} 
                      alt={selectedListingForPromotion.item_name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-medium">{selectedListingForPromotion.item_name}</h4>
                    <div className="text-gray-400 text-sm">
                      {selectedListingForPromotion.condition} • {formatPrice(selectedListingForPromotion.price)}
                    </div>
                  </div>
                </div>

                {/* Promotion Details */}
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6 mb-6">
                  <h4 className="text-orange-300 font-bold mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Hot Item Promotion
                  </h4>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Promotion Duration:</span>
                      <span className="text-white font-medium">24 hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Promotion Fee:</span>
                      <span className="text-orange-400 font-bold">€2.00 EUR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Featured In:</span>
                      <span className="text-white font-medium">Landing Page</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded">
                    <h5 className="text-orange-300 font-semibold mb-2">🔥 Hot Item Benefits:</h5>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Featured in "Trending Now" section</li>
                      <li>• Featured in "CS2 Categories" carousel</li>
                      <li>• Higher visibility & more views</li>
                      <li>• Priority placement in search results</li>
                      <li>• Increased sales potential</li>
                    </ul>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowPromoteModal(false);
                      setSelectedListingForPromotion(null);
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmPromotion}
                    disabled={promotionProcessing}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    {promotionProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Promoting...</span>
                      </>
                    ) : (
                      <>
                        <Flame className="w-4 h-4" />
                        <span>Promote for €2</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Promote Modal */}
      <AnimatePresence>
        {showBulkPromoteModal && selectedListingsForPromotion.length > 0 && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] border border-orange-500/50 overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Flame className="w-6 h-6 text-orange-500 mr-2" />
                    Bulk Promote {selectedListingsForPromotion.length} Item{selectedListingsForPromotion.length !== 1 ? 's' : ''}
                  </h3>
                  <button
                    onClick={() => {
                      setShowBulkPromoteModal(false);
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Selected Items Preview */}
                <div className="bg-gray-800/50 rounded-lg p-4 mb-6 max-h-60 overflow-y-auto">
                  <h4 className="text-white font-semibold mb-3">Selected Items:</h4>
                  <div className="space-y-2">
                    {selectedListingsForPromotion.map(listing => (
                      <div key={listing.id} className="flex items-center space-x-3 bg-gray-700/30 rounded p-2">
                        <div className="w-12 h-12 bg-gray-700/50 rounded flex items-center justify-center flex-shrink-0">
                          <img
                            src={listing.image_url}
                            alt={listing.item_name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-white text-sm font-medium truncate">{listing.item_name}</h5>
                          <div className="text-gray-400 text-xs">
                            {listing.condition} • {formatPrice(listing.price)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleListingSelection(listing)}
                          className="text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Promotion Details */}
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6 mb-6">
                  <h4 className="text-orange-300 font-bold mb-4 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2" />
                    Hot Item Promotion Details
                  </h4>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Items to Promote:</span>
                      <span className="text-white font-medium">{selectedListingsForPromotion.length} item{selectedListingsForPromotion.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Price per Item:</span>
                      <span className="text-white font-medium">€2.00 EUR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Promotion Duration:</span>
                      <span className="text-white font-medium">24 hours each</span>
                    </div>
                    <div className="flex justify-between pt-3 border-t border-orange-500/30">
                      <span className="text-gray-400 font-bold">Total Cost:</span>
                      <span className="text-orange-400 font-bold text-lg">€{(selectedListingsForPromotion.length * 2).toFixed(2)} EUR</span>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded">
                    <h5 className="text-orange-300 font-semibold mb-2">Benefits for Each Item:</h5>
                    <ul className="text-gray-300 text-sm space-y-1">
                      <li>• Featured in "Trending Now" section</li>
                      <li>• Featured in "CS2 Categories" carousel</li>
                      <li>• Higher visibility & more views</li>
                      <li>• Priority placement in search results</li>
                      <li>• Increased sales potential</li>
                    </ul>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowBulkPromoteModal(false);
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmBulkPromotion}
                    disabled={promotionProcessing}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    {promotionProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Promoting...</span>
                      </>
                    ) : (
                      <>
                        <Flame className="w-4 h-4" />
                        <span>Promote All for €{(selectedListingsForPromotion.length * 2).toFixed(2)}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Listing Modal */}
      <AnimatePresence>
        {showBulkListingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[90vh] border border-gray-700/50 overflow-hidden shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <Package className="w-6 h-6 text-green-500 mr-2" />
                    List {selectedItems.length} Items
                  </h3>
                  <button
                    onClick={() => {
                      setShowBulkListingModal(false);
                      setBulkListingPrices({});
                      setBulkListingDescriptions({});
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Bulk Actions */}
                <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
                  <h4 className="text-white font-semibold mb-3">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const selectedItemsData = availableItems.filter(item => selectedItems.includes(item.id));
                        const newPrices = { ...bulkListingPrices };
                        selectedItemsData.forEach(item => {
                          newPrices[item.id] = item.price_estimate.toString();
                        });
                        setBulkListingPrices(newPrices);
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm transition-all duration-300"
                    >
                      Use Estimated Prices
                    </button>
                    <button
                      onClick={() => {
                        const multiplier = prompt('Enter multiplier (e.g., 1.1 for +10%, 0.9 for -10%):');
                        if (multiplier && !isNaN(Number(multiplier))) {
                          const selectedItemsData = availableItems.filter(item => selectedItems.includes(item.id));
                          const newPrices = { ...bulkListingPrices };
                          selectedItemsData.forEach(item => {
                            const currentPrice = parseFloat(bulkListingPrices[item.id] || item.price_estimate.toString());
                            newPrices[item.id] = Math.round(currentPrice * Number(multiplier)).toString();
                          });
                          setBulkListingPrices(newPrices);
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded text-sm transition-all duration-300"
                    >
                      Apply Multiplier
                    </button>
                    <button
                      onClick={() => {
                        const basePrice = prompt('Enter base price for all items:');
                        if (basePrice && !isNaN(Number(basePrice)) && Number(basePrice) > 0) {
                          const selectedItemsData = availableItems.filter(item => selectedItems.includes(item.id));
                          const newPrices = { ...bulkListingPrices };
                          selectedItemsData.forEach(item => {
                            newPrices[item.id] = basePrice;
                          });
                          setBulkListingPrices(newPrices);
                        }
                      }}
                      className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded text-sm transition-all duration-300"
                    >
                      Set Same Price
                    </button>
                  </div>
                </div>

                {/* Items Table */}
                <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                  <table className="w-full">
                    <thead className="bg-gray-800/50 sticky top-0">
                      <tr>
                        <th className="text-left p-3 text-gray-300 font-medium">Item</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Condition</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Estimated</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Your Price</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableItems
                        .filter(item => selectedItems.includes(item.id))
                        .map((item, index) => (
                        <tr key={item.id} className="border-t border-gray-700/50 hover:bg-gray-800/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-gray-700/50 rounded flex items-center justify-center">
                                <img 
                                  src={item.image} 
                                  alt={item.name}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                              <div>
                                <div className="text-white font-medium text-sm">{item.name}</div>
                                <div className={`text-xs px-2 py-1 rounded-full border ${getRarityColor(item.rarity)} inline-block`}>
                                  {item.rarity}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-gray-300 text-sm">{item.condition}</td>
                          <td className="p-3 text-green-400 font-medium">{formatPrice(item.price_estimate)}</td>
                          <td className="p-3">
                            <div className="relative w-32">
                              <input
                                type="number"
                                value={bulkListingPrices[item.id] || ''}
                                onChange={(e) => setBulkListingPrices(prev => ({
                                  ...prev,
                                  [item.id]: e.target.value
                                }))}
                                placeholder="Price"
                                min="1"
                                className="w-full bg-gray-800/50 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                              />
                              <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">
                                Kč
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleItemSelection(item.id)}
                              className="text-red-400 hover:text-red-300 p-1 transition-colors"
                              title="Remove from selection"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-green-300 font-semibold">Listing Summary</h4>
                      <p className="text-gray-300 text-sm">
                        {selectedItems.length} items • Total estimated value: {formatPrice(
                          availableItems
                            .filter(item => selectedItems.includes(item.id))
                            .reduce((sum, item) => sum + (parseFloat(bulkListingPrices[item.id]) || item.price_estimate), 0)
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowBulkListingModal(false);
                      setBulkListingPrices({});
                      setBulkListingDescriptions({});
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkListingSubmit}
                    disabled={bulkListingProcessing || selectedItems.length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    {bulkListingProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Listing Items...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4" />
                        <span>List All Items</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketplaceListingsManager;