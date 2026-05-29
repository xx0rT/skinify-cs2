import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Mail, MessageCircle, ExternalLink, Grid2x2 as Grid, List, Eye, Heart, Share2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import ShopItemModal from '../components/marketplace/ShopItemModal';
import Header from '../components/Header';

interface Shop {
  id: string;
  user_id: string;
  shop_name: string;
  shop_url: string;
  description: string;
  logo_url: string;
  banner_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  layout_style: string;
  email: string;
  discord_username: string;
  twitter_url: string;
  instagram_url: string;
  total_views: number;
  total_sales: number;
  custom_css?: string;
}

interface ShopItem {
  id: string;
  listing_id: number;
  is_featured: boolean;
  marketplace_listings: {
    id: number;
    item_name: string;
    item_type: string;
    image_url: string;
    price: number;
    condition: string;
    is_active: boolean;
  };
}

const UserShopPage: React.FC = () => {
  const { shopUrl } = useParams<{ shopUrl: string }>();
  const navigate = useNavigate();
  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

  useEffect(() => {
    console.log('=== SHOP URL PARAM ===', shopUrl);
    if (shopUrl) {
      fetchShop();
    } else {
      console.error('No shop URL provided in route');
      setLoading(false);
      navigate('/marketplace');
    }
  }, [shopUrl]);

  useEffect(() => {
    if (shop?.id) {
      recordView();
    }
  }, [shop?.id]);

  const fetchShop = async () => {
    console.log('=== FETCH SHOP STARTED ===');
    console.log('Current timestamp:', new Date().toISOString());

    try {
      console.log('=== FETCHING SHOP ===');
      console.log('Shop URL:', shopUrl);
      console.log('About to query user_shops table...');

      const { data: shopData, error: shopError } = await supabase
        .from('user_shops')
        .select('*')
        .eq('shop_url', shopUrl)
        .eq('is_active', true)
        .maybeSingle();

      console.log('Query completed!');
      console.log('Shop data:', shopData);
      console.log('Shop error:', shopError);

      if (shopError) {
        console.error('Shop query error:', shopError);
        throw shopError;
      }

      if (!shopData) {
        console.error('Shop not found for URL:', shopUrl);
        navigate('/marketplace');
        return;
      }

      console.log('Shop found! Setting shop state...');
      setShop(shopData);
      setViewStyle(shopData.layout_style === 'list' ? 'list' : 'grid');
      console.log('Shop state set. Now fetching items...');

      const { data: itemsData, error: itemsError } = await supabase
        .from('shop_items')
        .select('*, marketplace_listings(*)')
        .eq('shop_id', shopData.id)
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true });

      console.log('=== SHOP ITEMS DEBUG ===');
      console.log('Shop ID:', shopData.id);
      console.log('Items data:', itemsData);
      console.log('Items error:', itemsError);
      console.log('Item count:', itemsData?.length || 0);

      if (itemsError) {
        console.error('Error fetching shop items:', itemsError);
        throw itemsError;
      }

      console.log('Setting items state...');
      setItems(itemsData || []);
      console.log('Items state set!');
    } catch (error: any) {
      console.error('=== ERROR IN FETCH SHOP ===');
      console.error('Error type:', typeof error);
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);

      if (error?.code === 'PGRST116') {
        console.log('Shop not found, redirecting to marketplace...');
        navigate('/marketplace');
      }
    } finally {
      console.log('=== FINALLY BLOCK ===');
      console.log('Setting loading to false at:', new Date().toISOString());
      setLoading(false);
      console.log('Loading set to false!');
    }
  };

  const recordView = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase.from('shop_views').insert({
        shop_id: shop?.id,
        viewer_id: user?.id || null,
        ip_address: null,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null
      });

      if (shop?.id) {
        await supabase.rpc('increment_shop_views', { shop_uuid: shop.id });
      }
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const copyShopLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert('Shop link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Store className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Shop Not Found</h2>
          <p className="text-gray-400 mb-6">This shop doesn't exist or is not active.</p>
          <button
            onClick={() => navigate('/marketplace')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition"
          >
            Go to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <Header activeSection="Shop" />

      {/* Inject Custom CSS */}
      {shop.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: shop.custom_css }} />
      )}

      {/* Main Content - With proper margins for header and sidebar */}
      <div className="ml-16 pt-20 min-h-screen bg-gray-900">
        <div className="shop-container" style={{ background: 'transparent' }}>
        {/* Banner */}
        {shop.banner_url && (
          <div
            className="h-64 bg-cover bg-center"
            style={{ backgroundImage: `url(${shop.banner_url})` }}
          />
        )}

        {/* Shop Header Section */}
        <div className="shop-header">
          <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate('/marketplace')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition"
          >
            <ArrowLeft size={20} />
            Back to Marketplace
          </button>

          <div className="flex items-start gap-6 mb-8">
            {shop.logo_url ? (
              <img
                src={shop.logo_url}
                alt={shop.shop_name}
                className="w-24 h-24 rounded-xl object-cover border-4 shadow-xl"
                style={{ borderColor: shop.primary_color }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-xl flex items-center justify-center shadow-xl"
                style={{ backgroundColor: shop.primary_color }}
              >
                <Store className="w-12 h-12 text-white" />
              </div>
            )}

            <div className="flex-1">
              <motion.h1
                className="text-4xl font-bold text-white mb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                {shop.shop_name}
              </motion.h1>
              {shop.description && (
                <motion.p
                  className="text-gray-300 mb-4 max-w-3xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {shop.description}
                </motion.p>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <motion.div
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group cursor-default"
                  whileHover={{ scale: 1.05 }}
                >
                  <Eye size={18} className="group-hover:text-purple-400 transition-colors" />
                  <span>{shop.total_views.toLocaleString()} views</span>
                </motion.div>
                <motion.div
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group cursor-default"
                  whileHover={{ scale: 1.05 }}
                >
                  <Store size={18} className="group-hover:text-purple-400 transition-colors" />
                  <span>{shop.total_sales.toLocaleString()} sales</span>
                </motion.div>

                {shop.email && (
                  <motion.a
                    href={`mailto:${shop.email}`}
                    className="flex items-center gap-2 hover:text-white transition-colors"
                    style={{ color: shop.accent_color }}
                    whileHover={{ scale: 1.05, x: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Mail size={18} />
                    Contact
                  </motion.a>
                )}

                {shop.discord_username && (
                  <motion.div
                    className="flex items-center gap-2"
                    style={{ color: shop.accent_color }}
                    whileHover={{ scale: 1.05 }}
                  >
                    <MessageCircle size={18} />
                    {shop.discord_username}
                  </motion.div>
                )}

                <motion.button
                  onClick={copyShopLink}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition hover:bg-white/10"
                  style={{ color: shop.secondary_color }}
                  whileHover={{
                    scale: 1.05,
                    backgroundColor: `${shop.secondary_color}20`,
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Share2 size={18} />
                  Share
                </motion.button>
              </div>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex justify-end gap-2 mb-6">
            <motion.button
              onClick={() => setViewStyle('grid')}
              className={`p-3 rounded-lg transition-all ${
                viewStyle === 'grid'
                  ? 'text-white shadow-lg'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              style={{
                backgroundColor: viewStyle === 'grid' ? shop.primary_color : undefined,
              }}
              whileHover={{
                scale: 1.1,
                boxShadow: viewStyle === 'grid'
                  ? `0 0 20px ${shop.primary_color}80`
                  : '0 4px 12px rgba(0,0,0,0.3)',
              }}
              whileTap={{ scale: 0.95 }}
            >
              <Grid size={20} />
            </motion.button>
            <motion.button
              onClick={() => setViewStyle('list')}
              className={`p-3 rounded-lg transition-all ${
                viewStyle === 'list'
                  ? 'text-white shadow-lg'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
              style={{
                backgroundColor: viewStyle === 'list' ? shop.primary_color : undefined,
              }}
              whileHover={{
                scale: 1.1,
                boxShadow: viewStyle === 'list'
                  ? `0 0 20px ${shop.primary_color}80`
                  : '0 4px 12px rgba(0,0,0,0.3)',
              }}
              whileTap={{ scale: 0.95 }}
            >
              <List size={20} />
            </motion.button>
          </div>

          {/* Items Grid */}
          {items.length === 0 ? (
            <div className="text-center py-20">
              <Store className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Items Yet</h3>
              <p className="text-gray-400">This shop hasn't listed any items yet. Check back soon!</p>
            </div>
          ) : (
            <div
              className={
                viewStyle === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                  : 'space-y-4'
              }
            >
              {items.map((item) => {
                const listing = item.marketplace_listings;
                if (!listing || !listing.is_active) return null;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{
                      y: -8,
                      transition: { duration: 0.2 }
                    }}
                    onClick={() => setSelectedItemId(listing.id)}
                    className={`item-card group relative bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden cursor-pointer transition-all ${
                      viewStyle === 'list' ? 'flex gap-4' : ''
                    }`}
                    style={{
                      borderColor: item.is_featured ? shop.accent_color : undefined,
                    }}
                  >
                    {/* Hover Glow Effect */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        background: `radial-gradient(circle at center, ${shop.primary_color}15 0%, transparent 70%)`
                      }}
                    />

                    {/* Shine Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div
                        className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${shop.primary_color}20, transparent)`
                        }}
                      />
                    </div>

                    {item.is_featured && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold text-white z-10"
                        style={{ backgroundColor: shop.accent_color }}
                      >
                        <motion.span
                          animate={{
                            scale: [1, 1.1, 1],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatType: "reverse"
                          }}
                          className="inline-block"
                        >
                          ⭐ FEATURED
                        </motion.span>
                      </motion.div>
                    )}

                    <div className={`relative ${viewStyle === 'list' ? 'w-48' : 'w-full h-48'} overflow-hidden`}>
                      <motion.img
                        src={listing.image_url}
                        alt={listing.item_name}
                        className={`${viewStyle === 'list' ? 'w-full h-full' : 'w-full h-full'} object-cover transition-transform duration-500 group-hover:scale-110`}
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.3 }}
                      />

                      {/* Image Overlay on Hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    <div className={`relative p-4 ${viewStyle === 'list' ? 'flex-1' : ''}`}>
                      <h3 className="text-white font-semibold mb-2 line-clamp-2">
                        {listing.item_name}
                      </h3>
                      <div className="flex items-center justify-between">
                        <motion.span
                          className="item-price text-2xl font-bold transition-all duration-300"
                          style={{ color: shop.primary_color }}
                          whileHover={{
                            scale: 1.1,
                            transition: { duration: 0.2 }
                          }}
                        >
                          {listing.price.toLocaleString()} Kč
                        </motion.span>
                        <motion.span
                          className="text-gray-400 text-sm capitalize px-2 py-1 rounded-lg bg-gray-700/50 group-hover:bg-gray-700 transition-colors duration-300"
                          whileHover={{ scale: 1.05 }}
                        >
                          {listing.condition}
                        </motion.span>
                      </div>

                      {/* Buy Button */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItemId(listing.id);
                        }}
                        className="mt-3 w-full py-2 rounded-lg font-semibold text-white transition-all duration-300"
                        style={{
                          backgroundColor: shop.primary_color,
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Buy Now
                      </motion.button>
                    </div>

                    {/* Border Glow on Hover */}
                    <div
                      className="absolute inset-0 rounded-xl border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        borderColor: shop.primary_color,
                        boxShadow: `0 0 20px ${shop.primary_color}40`
                      }}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Social Links */}
          {(shop.twitter_url || shop.instagram_url) && (
            <div className="mt-12 pt-8 border-t border-gray-700/50">
              <h3 className="text-white font-semibold mb-4">Follow Us</h3>
              <div className="flex gap-4">
                {shop.twitter_url && (
                  <a
                    href={shop.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white"
                  >
                    <ExternalLink size={18} />
                    Twitter
                  </a>
                )}
                {shop.instagram_url && (
                  <a
                    href={shop.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-white"
                  >
                    <ExternalLink size={18} />
                    Instagram
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Item Detail Modal */}
        {selectedItemId && (
          <ShopItemModal
            itemId={selectedItemId}
            onClose={() => setSelectedItemId(null)}
          />
        )}
        </div>
      </div>
    </>
  );
};

export default UserShopPage;
