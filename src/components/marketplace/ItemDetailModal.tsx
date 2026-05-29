import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Star,
  Shield,
  Eye,
  ArrowUpDown,
  ShoppingCart,
  Heart,
  Share2,
  BarChart3,
  Calendar,
  Activity,
  Package,
  Filter,
  Plus,
  Minus
} from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useToastStore } from '../../store/toastStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useCurrencyStore } from '../../store/currencyStore';
import PriceChart from './PriceChart';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    market_name: string;
    type: string;
    rarity: string;
    condition: string;
    price: number;
    priceChange: number;
    image: string;
    tradable: boolean;
    marketable: boolean;
    float?: string;
    stickers?: string[];
    seller?: {
      steamId: string;
      name: string;
      avatarUrl?: string;
    };
  };
  availableQuantity?: number;
  allCopies?: any[];
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ isOpen, onClose, item }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'price-history' | 'variants' | 'similar'>('overview');
  const [priceData, setPriceData] = useState<any>(null);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [modalSize, setModalSize] = useState({ width: 900, height: 700 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const { addItem } = useCartStore();
  const { isInWishlist, toggleItem } = useWishlistStore();
  const { addToast } = useToastStore();
  const { addNotification } = useNotificationStore();
  const { formatPrice } = useCurrencyStore();

  const isFavorited = isInWishlist(item.id);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;
      
      // Disable scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Re-enable scrolling and restore position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      
      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    // Cleanup function to ensure scrolling is always restored
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Generate realistic price history data
  const generatePriceHistory = () => {
    const days = 30;
    const basePrice = item.price;
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Create realistic price fluctuation
      const volatility = 0.1; // 10% volatility
      const trend = Math.sin(i / 7) * 0.05; // Weekly trend
      const randomChange = (Math.random() - 0.5) * volatility;
      const priceMultiplier = 1 + trend + randomChange;
      
      data.push({
        date: date.toISOString().split('T')[0],
        price: Math.round(basePrice * priceMultiplier),
        volume: Math.floor(Math.random() * 100) + 10
      });
    }
    
    return data;
  };

  // Generate realistic sales history
  const generateSalesHistory = () => {
    const sales = [];
    const basePrice = item.price;
    
    for (let i = 0; i < 20; i++) {
      const date = new Date();
      date.setHours(date.getHours() - i * 2);
      
      const priceVariation = 0.9 + Math.random() * 0.2; // ±10% price variation
      const salePrice = Math.round(basePrice * priceVariation);
      
      sales.push({
        id: `sale_${i}`,
        price: salePrice,
        date: date.toISOString(),
        seller: `Trader${Math.floor(Math.random() * 9999)}`,
        buyer: `Player${Math.floor(Math.random() * 9999)}`,
        float: (Math.random() * 0.8 + 0.01).toFixed(3),
        condition: item.condition,
        verified: Math.random() > 0.1
      });
    }
    
    return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Generate item variants (different conditions/floats)
  const generateVariants = () => {
    const conditions = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred'];
    const variants = [];
    
    conditions.forEach(condition => {
      if (condition !== item.condition) {
        const priceMultiplier = {
          'Factory New': 1.4,
          'Minimal Wear': 1.15,
          'Field-Tested': 1.0,
          'Well-Worn': 0.75,
          'Battle-Scarred': 0.55
        }[condition] || 1;
        
        variants.push({
          id: `variant_${condition}`,
          condition,
          price: Math.round(item.price * priceMultiplier),
          available: Math.floor(Math.random() * 20) + 1,
          lowestFloat: Math.random() * 0.15,
          highestFloat: Math.random() * 0.35 + 0.15,
          avgPrice: Math.round(item.price * priceMultiplier * (0.95 + Math.random() * 0.1))
        });
      }
    });
    
    return variants;
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      // Simulate API call delay
      setTimeout(() => {
        if (activeTab === 'price-history') {
          setPriceData(generatePriceHistory());
          setSalesHistory(generateSalesHistory());
        } else if (activeTab === 'variants') {
          setVariants(generateVariants());
        }
        setLoading(false);
      }, 800);
    }
  }, [isOpen, activeTab, item.price]);

  // Get rarity styling
  const getRarityStyle = (rarity: string) => {
    const rarityLower = rarity.toLowerCase();
    
    if (rarityLower.includes('exceedingly rare') || rarityLower.includes('★')) {
      return {
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-400/30',
        glow: '0 0 20px rgba(250, 204, 21, 0.3)'
      };
    }
    
    const rarityMap: { [key: string]: any } = {
      'covert': {
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-400/30',
        glow: '0 0 20px rgba(248, 113, 113, 0.3)'
      },
      'classified': {
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-400/30',
        glow: '0 0 20px rgba(168, 85, 247, 0.3)'
      },
      'restricted': {
        color: 'text-pink-400',
        bg: 'bg-pink-500/10',
        border: 'border-pink-400/30',
        glow: '0 0 20px rgba(244, 114, 182, 0.3)'
      },
      'mil-spec grade': {
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-400/30',
        glow: '0 0 20px rgba(96, 165, 250, 0.3)'
      },
      'industrial grade': {
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-400/30',
        glow: '0 0 20px rgba(34, 211, 238, 0.3)'
      },
      'consumer grade': {
        color: 'text-gray-400',
        bg: 'bg-gray-500/10',
        border: 'border-gray-400/30',
        glow: '0 0 20px rgba(156, 163, 175, 0.3)'
      }
    };
    
    return rarityMap[rarityLower] || rarityMap['consumer grade'];
  };

  const rarityStyle = getRarityStyle(item.rarity);
  const floatValue = parseFloat(item.float || '0.15');

  const handleBuyNow = () => {
    if (selectedQuantity === 1) {
      // Add single item
      const cartItem = {
        id: item.id,
        name: item.name,
        market_name: item.market_name,
        type: item.type,
        condition: item.condition,
        price: item.price,
        image: item.image,
        rarity: item.rarity,
        seller: item.seller || { steamId: 'unknown', name: 'Unknown Seller' }
      };
      
      addItem(cartItem);
      
      addToast({
        type: 'success',
        title: 'Added to Cart!',
        message: `${item.name} - ${formatPrice(item.price)}`,
        duration: 2000
      });
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      rarity: item.rarity
    });
    
    addToast({
      type: isFavorited ? 'info' : 'success',
      title: isFavorited ? 'Removed from Wishlist' : 'Added to Wishlist',
      message: item.name,
      duration: 2000
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <h2 className="text-2xl font-bold text-white">{item.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Image */}
              <div className="flex justify-center">
                <img
                  src={item.image}
                  alt={item.name}
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
              
              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{formatPrice(item.price)}</h3>
                  <p className="text-gray-400">{item.type}</p>
                  <p className="text-gray-400">Condition: {item.condition}</p>
                  <p className="text-gray-400">Rarity: {item.rarity}</p>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={handleBuyNow}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingCart size={20} />
                    Add to Cart
                  </button>
                  
                  <button
                    onClick={handleToggleFavorite}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center justify-center ${
                      isFavorited
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                    }`}
                  >
                    <Heart size={20} fill={isFavorited ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ItemDetailModal;