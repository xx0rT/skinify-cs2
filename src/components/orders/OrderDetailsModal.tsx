import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Package, 
  User, 
  Clock, 
  DollarSign, 
  ExternalLink, 
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  Truck,
  Shield,
  Star,
  Eye,
  Copy,
  RefreshCw,
  Settings,
  Calendar,
  Send
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useOrderStore } from '../../store/orderStore';
import { useToastStore } from '../../store/toastStore';
import { useChatStore } from '../../store/chatStore';
import { useCurrencyStore } from '../../store/currencyStore';
import RealTimeChat from '../profile/RealTimeChat';
import UserProfileModal from '../ui/UserProfileModal';
import { playMessageSent, playMessageReceived } from '../../utils/soundUtils';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, order }) => {
  const { user } = useAuthStore();
  const { updateOrderStatus } = useOrderStore();
  const { addToast } = useToastStore();
  const { initializeChatSession } = useChatStore();
  const { formatPrice } = useCurrencyStore();
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'tracking'>('details');
  const [processing, setProcessing] = useState(false);
  const [tradeInitiated, setTradeInitiated] = useState(false);
  const [tradeStatus, setTradeStatus] = useState<string>('pending');
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [timeUntilAutoRelease, setTimeUntilAutoRelease] = useState<string>('');
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<{
    steamId: string;
    name: string;
    avatarUrl?: string;
  } | null>(null);

  const isUserSeller = user?.steamId === order.seller_steam_id;
  const isUserBuyer = user?.steamId === order.buyer_steam_id;
  const otherPartyId = isUserSeller ? order.buyer_steam_id : order.seller_steam_id;

  // Get seller name from first item in the order (items have correct seller info)
  const sellerName = order.items && order.items.length > 0
    ? order.items[0].seller_name || 'Seller'
    : 'Seller';

  const otherPartyName = isUserSeller ? 'Buyer' : sellerName;

  // Handle viewing user profile
  const handleViewProfile = (steamId: string, name: string, avatarUrl?: string) => {
    console.log('=== OPENING USER PROFILE MODAL ===');
    console.log('Steam ID:', steamId);
    console.log('Name:', name);
    console.log('Avatar URL:', avatarUrl);
    
    if (!steamId || steamId === 'unknown') {
      addToast({
        type: 'warning',
        title: 'Profile Unavailable',
        message: 'User profile information not available for this order'
      });
      return;
    }
    
    setSelectedUserProfile({ steamId, name, avatarUrl });
    setShowUserProfile(true);
  };
  // Initialize chat session when modal opens
  useEffect(() => {
    if (isOpen && order) {
      initializeChatSession(order.transaction_id, order.buyer_steam_id, order.seller_steam_id);
    }
  }, [isOpen, order, initializeChatSession]);

  // Check trade status when modal opens
  useEffect(() => {
    if (isOpen && order && order.status === 'pending') {
      checkTradeStatus();
    }
  }, [isOpen, order]);

  const checkTradeStatus = async () => {
    // Implementation for checking trade status
  };

  const handleInitiateTrade = async () => {
    if (!user || !isUserSeller) {
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'Only the seller can initiate trades'
      });
      return;
    }

    setProcessing(true);

    try {
      console.log('=== INITIATING STEAM TRADE ===');
      
      // Get buyer's trade link from database
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/user-profile?steam_id=${order.buyer_steam_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get buyer information');
      }

      const buyerData = await response.json();
      
      if (!buyerData.user?.trade_link) {
        throw new Error('Buyer has not set their Steam trade link');
      }

      console.log('Opening Steam trade link:', buyerData.user.trade_link);
      
      // Open Steam trade window
      const tradeWindow = window.open(
        buyerData.user.trade_link,
        'steam_trade',
        'width=1200,height=800,scrollbars=yes,resizable=yes'
      );
      
      if (!tradeWindow) {
        throw new Error('Trade window was blocked. Please allow popups and try again.');
      }
      
      addToast({
        type: 'success',
        title: '🚀 Steam Trade Opened!',
        message: `Send items to ${buyerData.user.display_name || 'buyer'} via Steam`
      });
      
      // Start automatic verification process
      addToast({
        type: 'info',
        title: '🔍 Monitoring Trade Status',
        message: 'We\'ll automatically detect when you send the trade offer',
        duration: 4000
      });
      
      // Start verification polling
      startTradeVerification(order.transaction_id, order.seller_steam_id, order.buyer_steam_id);

    } catch (error) {
      console.error('Trade initiation failed:', error);
      addToast({
        type: 'error',
        title: 'Trade Failed',
        message: error instanceof Error ? error.message : 'Failed to initiate trade'
      });
    } finally {
      setProcessing(false);
    }
  };

  // Monitor trade completion
  // Automatic trade verification system
  const startTradeVerification = async (transactionId: string, sellerSteamId: string, buyerSteamId: string) => {
    console.log('=== STARTING AUTOMATIC TRADE VERIFICATION ===');
    console.log('Transaction:', transactionId);
    console.log('Seller:', sellerSteamId);
    console.log('Buyer:', buyerSteamId);
    
    let verificationAttempts = 0;
    const maxAttempts = 20; // Check for 20 attempts (10 minutes)
    
    const verifyTradeOfferSent = async (): Promise<boolean> => {
      try {
        verificationAttempts++;
        console.log(`=== VERIFICATION ATTEMPT ${verificationAttempts}/${maxAttempts} ===`);
        
        const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
        
        // Call verification API to check if trade was sent
        const verificationResponse = await fetch(`${supabaseUrl}/functions/v1/steam-verification/verify-trade-sent`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transaction_id: transactionId,
            seller_steam_id: sellerSteamId,
            buyer_steam_id: buyerSteamId
          })
        });
        
        if (verificationResponse.ok) {
          const result = await verificationResponse.json();
          console.log('Verification result:', result);
          
          if (result.trade_offer_sent === true) {
            console.log('✅ TRADE OFFER VERIFIED AS SENT');
            
            // Update order status to escrow
            await updateOrderStatusInDB('escrow');
            
            setTradeInitiated(true);
            setTradeStatus('escrow');
            
            addToast({
              type: 'success',
              title: '✅ Trade Offer Detected!',
              message: 'Steam trade offer sent successfully. Order updated to "Items Sent".',
              duration: 5000
            });
            
            return true; // Trade verified, stop polling
          } else {
            console.log(`Attempt ${verificationAttempts}: No trade offer detected yet`);
            return false; // Continue polling
          }
        } else {
          console.log(`Verification API error: ${verificationResponse.status}`);
          return false; // Continue polling
        }
        
      } catch (error) {
        console.error(`Verification attempt ${verificationAttempts} failed:`, error);
        return false; // Continue polling
      }
    };
    
    // Start polling for trade offer
    const pollForTradeOffer = async () => {
      const tradeDetected = await verifyTradeOfferSent();
      
      if (tradeDetected) {
        console.log('✅ Trade offer verification complete');
        return; // Stop polling
      }
      
      if (verificationAttempts < maxAttempts) {
        console.log(`Next verification in 30 seconds... (${verificationAttempts}/${maxAttempts})`);
        setTimeout(pollForTradeOffer, 30000); // Check again in 30 seconds
      } else {
        console.log('❌ Trade verification timeout - no trade offer detected');
        addToast({
          type: 'warning',
          title: '⏰ Trade Verification Timeout',
          message: 'No trade offer detected. Please try again or contact support if you sent the trade.',
          duration: 6000
        });
      }
    };
    
    // Start polling with initial delay
    setTimeout(pollForTradeOffer, 10000); // First check after 10 seconds
  };
  // Update order status in database
  const updateOrderStatusInDB = async (status: string) => {
    try {
      console.log('=== UPDATING ORDER STATUS ===');
      console.log('Order ID:', order.id);
      console.log('Transaction ID:', order.transaction_id);
      console.log('New status:', status);
      console.log('User Steam ID:', user?.steamId);
      
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const updateResponse = await fetch(`${supabaseUrl}/functions/v1/orders?id=${order.id}&steam_id=${user?.steamId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: status,
          tracking_notes: status === 'escrow' ? 'Steam trade offer sent to buyer. Payment secured - waiting for buyer confirmation.' : `Status updated to: ${status}`
        })
      });
      
      if (updateResponse.ok) {
        const result = await updateResponse.json();
        console.log('✅ Order status updated successfully:', result);
        
        // Force refresh the order data in parent component
        window.location.reload();
      } else {
        const errorData = await updateResponse.json();
        console.error('❌ Order status update failed:', errorData);
        throw new Error(errorData.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Failed to update order status:', error);
      addToast({
        type: 'error',
        title: 'Status Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update order status'
      });
    }
  };

  // Handle buyer confirmation
  const handleBuyerConfirmation = async () => {
    if (!user || !isUserBuyer) {
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'Only the buyer can confirm receipt'
      });
      return;
    }

    setConfirmingReceipt(true);

    try {
      console.log('=== BUYER CONFIRMING RECEIPT ===');
      
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/orders/confirm-receipt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: order.transaction_id,
          buyer_steam_id: user.steamId
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ BUYER CONFIRMATION SUCCESSFUL:', result);
        
        // Update local order state
        order.status = 'completed';
        
        addToast({
          type: 'success',
          title: '🎉 Receipt Confirmed!',
          message: 'Thank you! Seller\'s payment secured in pending wallet (8-day protection).',
          duration: 4000
        });
        
        // Refresh order data
        setTimeout(() => {
          onClose(); // Close modal and let parent refresh
        }, 2000);
        
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: 'Unknown error' };
        }
        
        console.error('Confirmation failed:', errorData);
        
        // More specific error handling
        if (response.status === 400) {
          throw new Error(errorData.error || 'Order cannot be confirmed at this time');
        } else if (response.status === 403) {
          throw new Error('You are not authorized to confirm this order');
        } else if (response.status === 500) {
          throw new Error('Server error during confirmation. Please try again.');
        } else {
          throw new Error(errorData.error || 'Failed to confirm receipt');
        }
      }
    } catch (error) {
      console.error('Buyer confirmation failed:', error);
      addToast({
        type: 'error',
        title: 'Confirmation Failed',
        message: error instanceof Error ? error.message : 'Failed to confirm receipt'
      });
    } finally {
      setConfirmingReceipt(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!user || !isUserSeller) {
      addToast({
        type: 'error',
        title: 'Access Denied',
        message: 'Only the seller can cancel orders'
      });
      return;
    }

    if (!confirm('Are you sure you want to cancel this order? This will refund the buyer.')) {
      return;
    }

    setProcessing(true);

    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/orders/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: order.transaction_id,
          seller_steam_id: user.steamId,
          buyer_steam_id: order.buyer_steam_id,
          cancel_reason: 'Cancelled by seller',
          refund_amount: order.total_amount
        })
      });

      if (response.ok) {
        addToast({
          type: 'success',
          title: 'Order Cancelled',
          message: 'Order cancelled and buyer refunded successfully'
        });
        onClose();
      } else {
        const errorData = await response.json();
        console.error('Confirmation failed:', errorData);
        throw new Error(errorData.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Order cancellation failed:', error);
      addToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: error instanceof Error ? error.message : 'Failed to cancel order'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'escrow': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'cancelled': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'disputed': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getTradeStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'sent': return 'text-purple-400';
      case 'trade_sent': return 'text-purple-400';
      case 'pending': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen || !order) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl w-full max-w-5xl max-h-[90vh] border-2 border-purple-500/30 overflow-hidden shadow-2xl backdrop-blur-xl"
          style={{
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 40px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-purple-600/20 via-purple-500/20 to-fuchsia-500/20 p-6 border-b border-purple-500/30">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(circle at 20% 20%, rgba(168, 85, 247, 0.4) 0%, transparent 50%),
                                   radial-gradient(circle at 80% 80%, rgba(217, 70, 239, 0.4) 0%, transparent 50%)`
                }}
              />
            </div>

            <div className="flex items-center space-x-6 relative z-10">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-16 h-16 bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-500 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  boxShadow: '0 8px 25px rgba(168, 85, 247, 0.5), 0 0 60px rgba(217, 70, 239, 0.3)'
                }}
              >
                <Package className="w-8 h-8 text-white" />
              </motion.div>
              
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  Order Details
                </h2>
                <p className="text-purple-300/80 text-lg">Transaction ID: {order.transaction_id}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                className={`px-4 py-2 rounded-full text-sm font-bold border-2 ${getStatusColor(order.status)}`}
                style={{
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
                }}
              >
                {order.status === 'escrow' ? 'Items Sent' : 
                 order.status === 'pending' ? 'Pending' :
                 order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </motion.div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-all duration-300 p-3 hover:bg-white/10 rounded-full hover:scale-110"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-purple-500/20 bg-gradient-to-r from-gray-900/80 to-gray-800/80">
            {[
              { id: 'details', label: 'Order Details', icon: Package },
              { id: 'chat', label: 'Chat', icon: MessageCircle },
              { id: 'tracking', label: 'Tracking', icon: Truck }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 px-8 py-4 transition-all duration-300 border-b-2 relative group ${
                  activeTab === id
                    ? 'border-purple-500 text-purple-300 bg-purple-500/10'
                    : 'border-transparent text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                <Icon size={18} />
                <span className="font-medium text-lg">{label}</span>
                {activeTab === id && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-600"
                    style={{
                      boxShadow: '0 0 10px rgba(168, 85, 247, 0.8)'
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8 overflow-y-auto max-h-[60vh] bg-gradient-to-br from-gray-900/50 to-gray-800/50">
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Order Summary */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-xl p-6 border border-green-500/20"
                    style={{
                      boxShadow: '0 8px 25px rgba(34, 197, 94, 0.1)'
                    }}
                  >
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <DollarSign className="w-5 h-5 text-green-500 mr-2" />
                      Payment Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Total Amount</span>
                        <span className="text-2xl font-bold text-green-400">
                          {formatPrice(order.total_amount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Payment Method</span>
                        <span className="text-white capitalize">{order.payment_method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Order Date</span>
                        <span className="text-white">
                          {new Date(order.created_at).toLocaleDateString('cs-CZ')}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20"
                  >
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <User className="w-5 h-5 text-purple-400 mr-2" />
                      {isUserSeller ? 'Buyer Information' : 'Seller Information'}
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <img 
                          src="https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg"
                          alt="User Avatar"
                          className="w-10 h-10 rounded-full border-2 border-gray-600/50"
                        />
                        <div>
                          <div className="text-white font-medium">{otherPartyName}</div>
                          <div className="text-gray-400 text-sm">Steam User</div>
                        </div>
                        <motion.button
                          onClick={() => handleViewProfile(
                            otherPartyId,
                            otherPartyName,
                            "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg"
                          )}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-sm transition-all duration-300 flex items-center space-x-1 shadow-lg shadow-purple-500/30"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Profile</span>
                        </motion.button>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Steam ID</span>
                        <span className="text-white font-mono text-sm">{otherPartyId}</span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Items */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20"
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                    <Package className="w-5 h-5 text-purple-500 mr-2" />
                    Items ({order.items.length})
                  </h3>
                  <div className="space-y-3">
                    {order.items.map((item: any, index: number) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        className="flex items-center space-x-4 bg-gray-700/30 rounded-lg p-4 hover:bg-gray-600/30 transition-all duration-300"
                      >
                        <div className="w-16 h-16 bg-gray-600/50 rounded-lg flex items-center justify-center">
                          <img 
                            src={item.image_url || item.image} 
                            alt={item.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-white font-medium">{item.name}</h4>
                          <div className="text-gray-400 text-sm">
                            {item.condition} • {item.type}
                          </div>
                          {item.seller_name && (
                            <div className="text-gray-500 text-xs">
                              by 
                              <button
                                onClick={() => handleViewProfile(
                                  item.seller_steam_id || order.seller_steam_id || 'unknown',
                                  item.seller_name || `Seller_${(item.seller_steam_id || order.seller_steam_id || '').slice(-6)}`,
                                  item.seller_avatar_url || "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg"
                                )}
                                className="ml-1 text-purple-400 hover:text-purple-300 hover:underline transition-colors"
                              >
                                {item.seller_name}
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-400">
                            {formatPrice(item.price)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Trade Actions (Only for Seller) */}
                {isUserSeller && order.status === 'pending' && (
                  <div className="bg-gradient-to-r from-green-500/10 to-purple-500/10 border border-green-500/30 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <Send className="w-5 h-5 text-green-500 mr-2" />
                      Send Items to Buyer
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                        <h4 className="text-purple-300 font-semibold mb-2">💰 Payment Already Secured!</h4>
                        <p className="text-gray-300 text-sm">
                          The buyer's payment of {formatPrice(order.total_amount)} is already secured. 
                          You can safely send the items now.
                        </p>
                      </div>

                      {order.status === 'pending' ? (
                        <motion.button
                          onClick={handleInitiateTrade}
                          disabled={processing}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full bg-gradient-to-r from-green-600 to-purple-600 hover:from-green-500 hover:to-purple-500 disabled:from-gray-600 disabled:to-gray-700 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/30"
                          style={{ boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)' }}
                        >
                          {processing ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                              />
                              <span>Opening Steam...</span>
                            </>
                          ) : (
                            <>
                              <ExternalLink className="w-5 h-5" />
                              <span>Send Steam Trade Offer</span>
                            </>
                          )}
                        </motion.button>
                      ) : order.status === 'escrow' ? (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                          <div className="flex items-center space-x-3 mb-2">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <span className="text-green-300 font-semibold">Steam Trade Offer Sent!</span>
                          </div>
                          <p className="text-gray-300 text-sm mb-3">
                            You've successfully sent the trade offer to the buyer. Your payment will be released when they confirm receipt.
                          </p>
                          <div className="text-sm font-medium text-orange-400">
                            Status: Waiting for buyer confirmation
                          </div>
                        </div>
                      ) : (
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                          <div className="flex items-center space-x-3 mb-2">
                            <CheckCircle className="w-5 h-5 text-purple-400" />
                            <span className="text-purple-300 font-semibold">Order Completed!</span>
                          </div>
                          <p className="text-gray-300 text-sm">
                            Trade completed successfully. Payment has been processed.
                          </p>
                        </div>
                      )}

                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <h4 className="text-yellow-300 font-semibold mb-2">⚠️ Important</h4>
                        <ul className="text-gray-300 text-sm space-y-1">
                          <li>• Send ALL items from this order</li>
                          <li>• Use the Steam trade link that opens</li>
                          <li>• Only confirm if you actually sent the trade</li>
                          <li>• Payment released when buyer confirms receipt</li>
                          <li>• Contact support if you have issues</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Buyer Instructions */}
                {isUserBuyer && (order.status === 'pending' || order.status === 'escrow') && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-fuchsia-500/10 border border-purple-500/30 rounded-xl p-6">
                    {order.status === 'pending' ? (
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                        <Clock className="w-5 h-5 text-purple-400 mr-2" />
                        Waiting for Seller to Send Items
                      </h3>
                    ) : (
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                        <Package className="w-5 h-5 text-green-500 mr-2" />
                        Items Sent - Confirm Receipt
                      </h3>
                    )}
                    
                    <div className="space-y-4">
                      {order.status === 'pending' ? (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                          <h4 className="text-green-300 font-semibold mb-2">✅ Payment Secured</h4>
                          <p className="text-gray-300 text-sm">
                            Your payment of {formatPrice(order.total_amount)} is secured. 
                            The seller will send you a Steam trade offer soon.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                          <h4 className="text-orange-300 font-semibold mb-2">📦 Items Sent!</h4>
                          <p className="text-gray-300 text-sm">
                            The seller has sent you a Steam trade offer. Check your Steam for incoming trades and accept them to receive your items.
                          </p>
                        </div>
                      )}


                      <motion.button
                        onClick={() => window.open('https://steamcommunity.com/my/tradeoffers/', '_blank')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/30"
                      >
                        <ExternalLink className="w-5 h-5" />
                        <span>Check Steam Trade Offers</span>
                      </motion.button>
                      
                      {/* Buyer Confirmation Button - Only show if items were sent */}
                      {(order.status === 'escrow' || order.status === 'pending') && (
                        <>
                          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                            <h4 className="text-green-300 font-semibold mb-2">✅ Received Your Items?</h4>
                            <p className="text-gray-300 text-sm mb-4">
                              If you've accepted the Steam trade and received all your items, click below to confirm and release payment to the seller.
                            </p>
                            
                            <motion.button
                              onClick={handleBuyerConfirmation}
                              disabled={confirmingReceipt}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-700 text-white py-4 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2"
                              style={{ boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)' }}
                            >
                              {confirmingReceipt ? (
                                <>
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                  />
                                  <span>Confirming...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-5 h-5" />
                                  <span>Yes, I Received All Items</span>
                                </>
                              )}
                            </motion.button>
                          </div>
                          
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                            <h4 className="text-yellow-300 font-semibold mb-2">🔒 Security Information</h4>
                            <p className="text-gray-300 text-sm">
                              When you confirm receipt, the seller's payment goes to their pending wallet for 8 days 
                              as security against chargebacks. This is industry standard for marketplace protection.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Actions */}
                {isUserSeller && order.status === 'pending' && (
                  <div className="flex space-x-4">
                    <button
                      onClick={handleCancelOrder}
                      disabled={processing}
                      className="flex-1 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <X size={18} />
                      <span>Cancel Order</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="h-[600px]">
                <RealTimeChat
                  orderId={order.transaction_id}
                  userSteamId={user?.steamId || ''}
                  otherPartyId={otherPartyId}
                  otherPartyName={otherPartyName}
                  userType={isUserSeller ? 'seller' : 'buyer'}
                />
              </div>
            )}

            {activeTab === 'tracking' && (
              <div className="space-y-6">
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/30">
                  <h3 className="text-lg font-bold text-white mb-4">Order Timeline</h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium">Order Created</div>
                        <div className="text-gray-400 text-sm">
                          {new Date(order.created_at).toLocaleString('cs-CZ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium">Payment Secured</div>
                        <div className="text-gray-400 text-sm">Funds held in escrow</div>
                      </div>
                    </div>

                    {tradeInitiated && (
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          tradeStatus === 'completed' ? 'bg-green-500' : 'bg-purple-500 animate-pulse'
                        }`}>
                          {tradeStatus === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-white" />
                          ) : (
                            <Clock className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {tradeStatus === 'completed' ? 'Trade Completed' : 'Trade In Progress'}
                          </div>
                          <div className="text-gray-400 text-sm">
                            {tradeStatus === 'completed' ? 'Items transferred successfully' : 'Waiting for buyer to accept'}
                          </div>
                        </div>
                      </div>
                    )}

                    {order.status === 'completed' && (
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium">Order Completed</div>
                          <div className="text-gray-400 text-sm">
                            {order.completed_at ? new Date(order.completed_at).toLocaleString('cs-CZ') : 'Recently'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {order.tracking_notes && (
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/30">
                    <h3 className="text-lg font-bold text-white mb-4">Tracking Notes</h3>
                    <p className="text-gray-300">{order.tracking_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
        
        {/* User Profile Modal */}
        <UserProfileModal
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          userProfile={selectedUserProfile}
        />
      </div>
    </AnimatePresence>
  );
};

export default OrderDetailsModal;