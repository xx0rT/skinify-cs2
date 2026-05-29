import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ShoppingCart, Heart, ExternalLink, User, Star } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useToastStore } from '../../store/toastStore';
import { useCurrencyStore } from '../../store/currencyStore';

interface ShopItemModalProps {
  itemId: number;
  onClose: () => void;
}

interface ListingData {
  id: number;
  item_name: string;
  item_type: string;
  image_url: string;
  price: number;
  condition: string;
  rarity: string;
  float_value: number | null;
  description: string | null;
  is_active: boolean;
  seller_id: string;
  users: {
    id: string;
    steam_id: string;
    display_name: string;
    avatar_url: string;
  };
}

const ShopItemModal: React.FC<ShopItemModalProps> = ({ itemId, onClose }) => {
  const [listing, setListing] = useState<ListingData | null>(null);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCartStore();
  const { addItem: addToWishlist, isInWishlist } = useWishlistStore();
  const { addToast } = useToastStore();
  const { convertPrice, currency } = useCurrencyStore();

  useEffect(() => {
    fetchListing();
  }, [itemId]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(`
          *,
          users (
            id,
            steam_id,
            display_name,
            avatar_url
          )
        `)
        .eq('id', itemId)
        .single();

      if (error) throw error;
      setListing(data);
    } catch (error) {
      console.error('Error fetching listing:', error);
      addToast('Failed to load item details', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!listing) return;

    addItem({
      id: listing.id.toString(),
      name: listing.item_name,
      type: listing.item_type,
      price: listing.price,
      image: listing.image_url,
      seller: {
        steamId: listing.users.steam_id,
        displayName: listing.users.display_name,
        avatarUrl: listing.users.avatar_url,
      },
      condition: listing.condition,
      rarity: listing.rarity,
      float: listing.float_value?.toString(),
    });

    addToast('Added to cart!', 'success');
  };

  const handleAddToWishlist = () => {
    if (!listing) return;

    addToWishlist({
      id: listing.id.toString(),
      name: listing.item_name,
      type: listing.item_type,
      price: listing.price,
      image: listing.image_url,
      seller: {
        steamId: listing.users.steam_id,
        displayName: listing.users.display_name,
        avatarUrl: listing.users.avatar_url,
      },
      condition: listing.condition,
      rarity: listing.rarity,
      float: listing.float_value?.toString(),
    });

    addToast('Added to wishlist!', 'success');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl p-8">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-white mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  const displayPrice = convertPrice(listing.price);
  const inWishlist = isInWishlist(listing.id.toString());

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-white">{listing.item_name}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-8 border border-gray-700">
                <img
                  src={listing.image_url}
                  alt={listing.item_name}
                  className="w-full h-auto object-contain"
                />
              </div>

              {/* Seller Info */}
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-semibold">Seller</span>
                </div>
                <div className="flex items-center gap-3">
                  <img
                    src={listing.users.avatar_url}
                    alt={listing.users.display_name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <div className="text-white font-medium">{listing.users.display_name}</div>
                    <div className="text-gray-400 text-sm">View Profile</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-6">
              {/* Price */}
              <div>
                <div className="text-4xl font-bold text-purple-400 mb-2">
                  {displayPrice.toLocaleString()} {currency}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      listing.condition === 'Factory New'
                        ? 'bg-green-500/20 text-green-400'
                        : listing.condition === 'Minimal Wear'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {listing.condition}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-500/20 text-purple-400">
                    {listing.item_type}
                  </span>
                </div>
              </div>

              {/* Item Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Rarity</span>
                  <span className="text-white font-medium capitalize">{listing.rarity}</span>
                </div>

                {listing.float_value && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-700">
                    <span className="text-gray-400">Float Value</span>
                    <span className="text-white font-medium">{listing.float_value.toFixed(8)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-400">Type</span>
                  <span className="text-white font-medium">{listing.item_type}</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-400">Status</span>
                  <span className="text-green-400 font-medium">Available</span>
                </div>
              </div>

              {/* Description */}
              {listing.description && (
                <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
                  <h3 className="text-white font-semibold mb-2">Description</h3>
                  <p className="text-gray-300 text-sm">{listing.description}</p>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCart}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-6 py-4 rounded-xl font-semibold transition shadow-lg"
                >
                  <ShoppingCart size={20} />
                  Add to Cart
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleAddToWishlist}
                    disabled={inWishlist}
                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition ${
                      inWishlist
                        ? 'bg-pink-500/20 text-pink-400 cursor-not-allowed'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    <Heart size={18} className={inWishlist ? 'fill-current' : ''} />
                    {inWishlist ? 'In Wishlist' : 'Wishlist'}
                  </button>

                  <button
                    onClick={() => window.open(`/user/${listing.users.steam_id}`, '_blank')}
                    className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-xl font-medium transition"
                  >
                    <ExternalLink size={18} />
                    Seller
                  </button>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-xl p-4 border border-green-500/20">
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-white font-semibold mb-1">Secure Transaction</div>
                    <div className="text-gray-300 text-sm">
                      Protected by our escrow system. Your payment is held securely until you receive the item.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ShopItemModal;
