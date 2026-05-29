import React, { useState, useEffect } from 'react';
import { Heart, ShoppingCart, Trash2, Loader, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { useNavigate } from 'react-router-dom';
import { StyledPrice } from '../../utils/formatPrice';

interface WishlistItem {
  id: string;
  listing_id: string;
  created_at: string;
  listing: {
    id: string;
    item_name: string;
    price: number;
    wear: string;
    float_value: number;
    stattrak: boolean;
    image_url: string;
    seller_steam_id: string;
  };
}

const WishlistManager: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchWishlist();
    }
  }, [user?.id]);

  const fetchWishlist = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }

    try {
      setLoading(true);

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.log('No active Supabase session. Wishlist requires authentication.');
        setWishlistItems([]);
        setLoading(false);
        return;
      }

      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlist_items')
        .select('id, listing_id, created_at')
        .order('created_at', { ascending: false });

      if (wishlistError) {
        console.error('Wishlist query error:', wishlistError);
        throw wishlistError;
      }

      if (!wishlistData || wishlistData.length === 0) {
        setWishlistItems([]);
        return;
      }

      const listingIds = wishlistData.map(item => item.listing_id);

      const { data: listingsData, error: listingsError } = await supabase
        .from('marketplace_listings')
        .select('id, item_name, price, wear, float_value, stattrak, image_url, seller_steam_id')
        .in('id', listingIds);

      if (listingsError) {
        console.error('Listings query error:', listingsError);
        throw listingsError;
      }

      const listingsMap = new Map(listingsData?.map(listing => [listing.id, listing]) || []);

      const combinedData = wishlistData
        .map(item => ({
          id: item.id,
          listing_id: item.listing_id,
          created_at: item.created_at,
          listing: listingsMap.get(item.listing_id)
        }))
        .filter(item => item.listing);

      setWishlistItems(combinedData as WishlistItem[]);
      console.log('✅ Loaded wishlist items:', combinedData.length);
    } catch (error: any) {
      console.error('Error fetching wishlist:', error);

      if (error?.code === 'PGRST116' || error?.message?.includes('JWT')) {
        addToast({
          type: 'info',
          title: 'Authentication Required',
          message: 'Please log in with Steam to use the wishlist feature'
        });
      } else {
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to load your wishlist'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (itemId: string) => {
    if (!user?.id) return;

    try {
      setRemoving(itemId);

      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        addToast({
          type: 'error',
          title: 'Authentication Required',
          message: 'Please log in to manage your wishlist'
        });
        setRemoving(null);
        return;
      }

      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setWishlistItems(prev => prev.filter(item => item.id !== itemId));
      addToast({
        type: 'success',
        title: 'Removed',
        message: 'Item removed from wishlist'
      });
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to remove item'
      });
    } finally {
      setRemoving(null);
    }
  };

  const viewItem = (listingId: string) => {
    navigate(`/item/${listingId}`);
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6 flex items-center justify-center min-h-[400px]">
        <Loader className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center">
            <Heart className="w-6 h-6 text-pink-500 mr-2 fill-pink-500" />
            My Wishlist
          </h3>
          <span className="text-sm text-gray-400">Track items you want to buy</span>
        </div>
        <div className="text-center py-20">
          <Heart className="w-16 h-16 text-pink-500/50 mx-auto mb-4" />
          <p className="text-lg text-gray-300 mb-2">Your wishlist is empty</p>
          <p className="text-sm text-gray-400 mb-6">
            Browse the marketplace and click the heart icon on items you like to add them here
          </p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all"
          >
            <ShoppingCart size={18} />
            Browse Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center">
          <Heart className="w-6 h-6 text-pink-500 mr-2 fill-pink-500" />
          My Wishlist
          <span className="ml-3 px-3 py-1 bg-pink-500/20 text-pink-400 text-sm rounded-full">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
          </span>
        </h3>
        <button
          onClick={() => navigate('/')}
          className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
        >
          <ShoppingCart size={16} />
          Browse More
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wishlistItems.map((item) => {
          const listing = item.listing;
          if (!listing) return null;

          return (
            <div
              key={item.id}
              className="bg-gray-900/50 border border-gray-700/50 rounded-lg overflow-hidden hover:border-pink-500/50 transition-all group"
            >
              <div className="relative aspect-[4/3]">
                <img
                  src={listing.image_url}
                  alt={listing.item_name}
                  className="w-full h-full object-contain bg-gradient-to-br from-gray-900 to-gray-800"
                  loading="lazy"
                />
                {listing.stattrak && (
                  <div className="absolute top-2 left-2 bg-orange-500/90 text-white text-xs px-2 py-1 rounded font-bold">
                    StatTrak™
                  </div>
                )}
              </div>

              <div className="p-4">
                <h4 className="text-white font-medium text-sm mb-1 truncate group-hover:text-pink-400 transition-colors">
                  {listing.item_name}
                </h4>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>{listing.wear}</span>
                  {listing.float_value && (
                    <span className="font-mono">{listing.float_value.toFixed(6)}</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-lg font-bold text-purple-400">
                      <StyledPrice
                        price={listing.price}
                        wholeClassName="text-purple-400"
                        decimalClassName="text-purple-400/70"
                        symbolClassName="text-purple-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => viewItem(listing.id)}
                      className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
                      title="View Item"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      disabled={removing === item.id}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove from Wishlist"
                    >
                      {removing === item.id ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-2 text-xs text-gray-500">
                  Added {new Date(item.created_at).toLocaleDateString('cs-CZ')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WishlistManager;
