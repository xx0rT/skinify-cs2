import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  Package, 
  Star, 
  Sparkles, 
  Gift,
  ArrowRight,
  Copy,
  ExternalLink,
  User,
  Calendar,
  CreditCard,
  ShoppingBag,
  Zap,
  Heart,
  Trophy,
  Crown,
  PartyPopper,
  Shield,
  Clock
} from 'lucide-react';
import { playOrderSuccess } from '../../utils/soundUtils';

interface PurchaseItem {
  id: string;
  name: string;
  price: number;
  image: string;
  seller: {
    name: string;
  };
}

interface PurchaseSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  items: PurchaseItem[];
  totalAmount: number;
  paymentMethod: string;
}

// Confetti component
const ConfettiPiece: React.FC<{ delay: number; color: string }> = ({ delay, color }) => {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
      initial={{ 
        opacity: 0,
        scale: 0,
        x: Math.random() * window.innerWidth,
        y: -20
      }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0],
        y: window.innerHeight + 100,
        rotate: 360 * 3,
        x: Math.random() * window.innerWidth
      }}
      transition={{ 
        duration: 3,
        delay,
        ease: "easeOut"
      }}
    />
  );
};

const FloatingIcon: React.FC<{ icon: React.ReactNode; delay: number; color: string }> = ({ icon, delay, color }) => {
  return (
    <motion.div
      className="absolute"
      style={{ color }}
      initial={{ 
        opacity: 0,
        scale: 0,
        x: Math.random() * 400 + 100,
        y: Math.random() * 200 + 100
      }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0, 1.5, 1, 0],
        y: -100,
        rotate: [0, 180, 360]
      }}
      transition={{ 
        duration: 2.5,
        delay,
        ease: "easeOut"
      }}
    >
      {icon}
    </motion.div>
  );
};

const PurchaseSuccessModal: React.FC<PurchaseSuccessModalProps> = ({
  isOpen,
  onClose,
  transactionId,
  items,
  totalAmount,
  paymentMethod
}) => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      setStep(0);
      
      // Play order success sound
      playOrderSuccess();
      
      // Animate through steps
      const stepTimer = setTimeout(() => setStep(1), 500);
      const confettiTimer = setTimeout(() => setShowConfetti(false), 4000);
      
      return () => {
        clearTimeout(stepTimer);
        clearTimeout(confettiTimer);
      };
    }
  }, [isOpen]);

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

  const confettiColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
  const floatingIcons = [
    <Star size={24} />, 
    <Gift size={24} />, 
    <Trophy size={24} />, 
    <Crown size={24} />,
    <Sparkles size={24} />,
    <Heart size={24} />
  ];

  const handleCopyTransaction = () => {
    navigator.clipboard.writeText(transactionId);
  };

  const itemNames = items.map(item => item.name).join(', ');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4">
        {/* Confetti Effect */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-[101]">
            {Array.from({ length: 50 }).map((_, i) => (
              <ConfettiPiece
                key={i}
                delay={i * 0.1}
                color={confettiColors[i % confettiColors.length]}
              />
            ))}
            {Array.from({ length: 12 }).map((_, i) => (
              <FloatingIcon
                key={i}
                icon={floatingIcons[i % floatingIcons.length]}
                delay={i * 0.2}
                color={confettiColors[i % confettiColors.length]}
              />
            ))}
          </div>
        )}

        {/* Main Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          transition={{ 
            duration: 0.6,
            type: "spring", 
            stiffness: 200, 
            damping: 20 
          }}
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl sm:rounded-3xl w-full max-w-xs sm:max-w-2xl max-h-[95vh] border-2 border-green-500/30 overflow-hidden relative z-[102] flex flex-col"
          style={{ boxShadow: '0 0 60px rgba(16, 185, 129, 0.3)' }}
        >
          {/* Success Header */}
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 p-4 sm:p-8 text-center border-b border-green-500/30 flex-shrink-0"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: 0.5,
                duration: 0.8,
                type: "spring",
                stiffness: 200 
              }}
              className="w-16 h-16 sm:w-24 sm:h-24 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6"
              style={{ boxShadow: '0 0 40px rgba(16, 185, 129, 0.6)' }}
            >
              <CheckCircle className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-transparent mb-3"
            >
              🎉 Purchase Successful!
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="text-lg sm:text-xl text-gray-300 mb-4"
            >
              Your items are on their way!
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="bg-green-500/10 border border-green-500/30 rounded-lg p-4"
            >
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-300 font-semibold">Items Removed from Marketplace</span>
              </div>
              <p className="text-gray-300 text-sm">
                Your purchased items have been automatically removed from the marketplace to prevent duplicate sales.
              </p>
            </motion.div>
          </motion.div>

          {/* Purchase Details */}
          <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
            {/* Transaction Summary */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: step >= 1 ? 1 : 0, x: step >= 1 ? 0 : -30 }}
              transition={{ duration: 0.6 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-600/30"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mr-2" />
                  Order Summary
                </h3>
                <div className="flex items-center space-x-2 text-sm">
                  <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  <span className="text-gray-300 capitalize">{paymentMethod}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                {/* Items */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Items Purchased</h4>
                  <div className="space-y-2 sm:space-y-3 max-h-32 sm:max-h-40 overflow-y-auto scrollbar-thin">
                    {items.map((item, index) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 + index * 0.1, duration: 0.4 }}
                        className="flex items-center space-x-2 sm:space-x-3 bg-gray-700/30 rounded-lg p-2 sm:p-3"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-600/50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-xs sm:text-sm truncate">{item.name}</div>
                          <div className="text-gray-400 text-xs">by {item.seller.name}</div>
                        </div>
                        <div className="text-green-400 font-bold text-xs sm:text-sm flex-shrink-0">
                          {item.price.toLocaleString('cs-CZ')} Kč
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Order Details */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Order Details</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Items ({items.length})</span>
                      <span className="text-white font-medium">
                        {(totalAmount * 0.98).toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">Trading Fee (2%)</span>
                      <span className="text-white font-medium">
                        {(totalAmount * 0.02).toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                    <div className="border-t border-gray-600/50 pt-3 flex justify-between items-center">
                      <span className="text-white font-semibold">Total Paid</span>
                      <span className="text-green-400 font-bold text-xl">
                        {totalAmount.toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Transaction ID */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 20 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-semibold mb-1">Transaction ID</h4>
                  <p className="text-blue-400 font-mono text-sm">{transactionId}</p>
                </div>
                <button
                  onClick={handleCopyTransaction}
                  className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-all duration-300 hover:scale-105"
                  title="Copy Transaction ID"
                >
                  <Copy size={16} />
                </button>
              </div>
              <p className="text-gray-400 text-xs mt-2">
                Save this ID for order tracking and support
              </p>
            </motion.div>

            {/* Next Steps */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 20 }}
              transition={{ delay: 1.8, duration: 0.5 }}
              className="bg-green-500/10 border border-green-500/30 rounded-xl p-6"
            >
              <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
                Items Ship Immediately!
              </h4>
              
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-3 mb-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  <span className="text-green-300 font-semibold">Payment Secured - Immediate Shipping</span>
                </div>
                <p className="text-gray-300 text-sm">
                  Your payment is safely secured and sellers have been notified! They can now send your items 
                  immediately via Steam trade. 8-day escrow protection starts AFTER you receive your items.
                </p>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-300 font-medium">Expected Delivery</span>
                  <span className="text-white font-bold">Within minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-300 font-medium">Shipping Method</span>
                  <span className="text-blue-400 font-bold">Steam Trade Offer</span>
                </div>
              </div>
              
              {/* Timeline */}
              <div className="bg-gray-800/30 rounded-lg p-4">
                <h5 className="text-white font-semibold mb-3">What happens next:</h5>
                <div className="space-y-3">
                {[
                  {
                    icon: <CheckCircle className="w-4 h-4 text-green-400" />,
                    title: 'Payment Secured (Now)',
                    description: 'Your payment is safely secured and ready',
                    status: 'completed'
                  },
                  {
                    icon: <User className="w-4 h-4 text-blue-400" />,
                    title: 'Sellers Notified (Now)', 
                    description: 'All sellers have been notified and can ship immediately',
                    status: 'completed'
                  },
                  {
                    icon: <Package className="w-4 h-4 text-orange-400" />,
                    title: 'Items Being Shipped',
                    description: 'Sellers will send items via Steam trade offers',
                    status: 'in-progress'
                  },
                  {
                    icon: <CheckCircle className="w-4 h-4 text-purple-400" />,
                    title: 'Enjoy Your Items!',
                    description: 'Accept the Steam trade and enjoy your new items',
                    status: 'pending'
                  }
                ].map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 2.0 + index * 0.2, duration: 0.4 }}
                    className="flex items-center space-x-3"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.status === 'completed' ? 'bg-green-500/20 border-green-500/40 border' :
                      step.status === 'in-progress' ? 'bg-blue-500/20 border-blue-500/40 border animate-pulse' :
                      'bg-gray-600/20 border-gray-500/40 border'
                    }`}>
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <h5 className="text-white font-medium text-sm">{step.title}</h5>
                      <p className="text-gray-400 text-xs">{step.description}</p>
                    </div>
                    {step.status === 'completed' && (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                  </motion.div>
                ))}
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 20 }}
              transition={{ delay: 2.8, duration: 0.5 }}
              className="flex flex-col gap-3 sm:gap-4"
            >
              <motion.button
                onClick={() => window.location.href = '/profile?tab=orders'}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2"
                style={{ boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)' }}
              >
                <Package size={18} />
                <span>Track Orders</span>
                <ArrowRight size={16} />
              </motion.button>
              
              <motion.button
                onClick={() => window.open('https://steamcommunity.com/my/tradeoffers/', '_blank')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2"
                style={{ boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)' }}
              >
                <ExternalLink size={18} />
                <span>Open Steam</span>
              </motion.button>
              
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <ShoppingBag size={18} />
                <span>Continue Shopping</span>
              </motion.button>
            </motion.div>

            {/* Achievement Unlock Animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: step >= 1 ? 1 : 0, scale: step >= 1 ? 1 : 0.8 }}
              transition={{ delay: 3.0, duration: 0.6 }}
              className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4 text-center"
            >
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                <span className="text-yellow-400 font-bold text-sm sm:text-base">Achievement Unlocked!</span>
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              </div>
              <p className="text-gray-300 text-xs sm:text-sm">
                {items?.length === 1 ? 'First Purchase' : 
                 (items?.length || 0) >= 5 ? 'Big Spender' : 
                 totalAmount > 50000 ? 'High Roller' : 'Smart Trader'}
              </p>
            </motion.div>

            {/* Support Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: step >= 1 ? 1 : 0 }}
              transition={{ delay: 3.3, duration: 0.5 }}
              className="text-center text-gray-500 text-xs sm:text-sm"
            >
              <p className="mb-2">Need help? Our support team is here 24/7</p>
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-4">
                <span>📧 support@skinify.com</span>
                <span className="hidden sm:inline">•</span>
                <span>⏰ Average response: 2 hours</span>
              </div>
            </motion.div>
          </div>

          {/* Animated Border */}
          <motion.div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: 'linear-gradient(45deg, transparent, rgba(16, 185, 129, 0.1), transparent, rgba(16, 185, 129, 0.1), transparent)',
              backgroundSize: '400% 400%'
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PurchaseSuccessModal;