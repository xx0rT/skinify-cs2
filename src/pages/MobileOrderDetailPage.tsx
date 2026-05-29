import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
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
  Send,
  Calendar,
  Menu,
  X,
  Phone,
  Mail,
  Info,
  Zap,
  Award,
  Activity,
  Heart,
  TrendingUp,
  Gamepad2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useToastStore } from '../store/toastStore';
import { useChatStore } from '../store/chatStore';
import { useCurrencyStore } from '../store/currencyStore';
import { playMessageSent, playMessageReceived } from '../utils/soundUtils';

const MobileOrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { orders, fetchOrders, updateOrderStatus } = useOrderStore();
  const { addToast } = useToastStore();
  const { sendMessage, getChatSession, markMessagesAsRead } = useChatStore();
  const { formatPrice } = useCurrencyStore();
  
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'tracking'>('details');
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find the order by transaction ID
  const order = orders.find(o => o.transaction_id === orderId);
  
  const isUserSeller = user?.steamId === order?.seller_steam_id;
  const isUserBuyer = user?.steamId === order?.buyer_steam_id;
  const otherPartyId = isUserSeller ? order?.buyer_steam_id : order?.seller_steam_id;
  const otherPartyName = isUserSeller ? 'Buyer' : (order?.seller_name || 'Seller');

  // Get chat session
  const chatSession = order ? getChatSession(order.transaction_id) : null;
  const messages = chatSession?.messages || [];

  useEffect(() => {
    if (user && !order) {
      fetchOrders(user.steamId);
    }
  }, [user, order, fetchOrders]);

  useEffect(() => {
    if (order && user) {
      markMessagesAsRead(order.transaction_id, user.steamId);
    }
  }, [order, user, messages.length, markMessagesAsRead]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!message.trim() || !order || !user) return;
    
    const messageToSend = message.trim();
    setMessage('');
    setIsTyping(false);
    
    try {
      await sendMessage(
        order.transaction_id,
        user.steamId,
        isUserSeller ? 'seller' : 'buyer',
        messageToSend
      );
      
      playMessageSent();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Message Failed',
        message: 'Failed to send message'
      });
    }
  };

  const handleInitiateTrade = async () => {
    if (!user || !isUserSeller || !order) return;

    setProcessing(true);

    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/user-profile?steam_id=${order.buyer_steam_id}`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const buyerData = await response.json();
        
        if (buyerData.user?.trade_link) {
          window.open(buyerData.user.trade_link, '_blank');
          addToast({
            type: 'success',
            title: '🚀 Steam Trade Opened!',
            message: `Send items to ${buyerData.user.display_name || 'buyer'}`
          });
        } else {
          throw new Error('Buyer has not set their Steam trade link');
        }
      } else {
        throw new Error('Failed to get buyer information');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Trade Failed',
        message: error instanceof Error ? error.message : 'Failed to initiate trade'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!user || !isUserBuyer || !order) return;

    setConfirmingReceipt(true);

    try {
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
        addToast({
          type: 'success',
          title: '🎉 Receipt Confirmed!',
          message: 'Seller payment processed successfully'
        });
        
        setTimeout(() => {
          navigate('/profile');
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to confirm receipt');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Confirmation Failed',
        message: error instanceof Error ? error.message : 'Failed to confirm receipt'
      });
    } finally {
      setConfirmingReceipt(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'escrow': return 'text-orange-400 bg-orange-500/20 border-orange-500/30';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'cancelled': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString('cs-CZ', { month: 'short', day: 'numeric' });
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-8 text-center max-w-sm w-full"
        >
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-4">Order Not Found</h1>
          <p className="text-gray-300 mb-6">
            The order you're looking for doesn't exist or you don't have access to it.
          </p>
          <motion.button
            onClick={() => navigate('/profile')}
            whileTap={{ scale: 0.95 }}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Profile
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 text-white">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-xl border-b border-purple-500/30">
        <div className="flex items-center justify-between p-4">
          <motion.button
            onClick={() => navigate('/profile')}
            whileTap={{ scale: 0.9 }}
            className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </motion.button>

          <div className="text-center">
            <h1 className="text-lg font-bold text-white">Order Details</h1>
            <p className="text-purple-300 text-sm">#{order.transaction_id.slice(-8)}</p>
          </div>

          <motion.button
            onClick={() => setShowMenu(!showMenu)}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-gray-300 hover:text-white transition-colors"
          >
            {showMenu ? <X size={20} /> : <Menu size={20} />}
          </motion.button>
        </div>
      </header>

      {/* Side Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowMenu(false)}
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-80 bg-gray-900/95 backdrop-blur-xl border-l border-purple-500/30 z-50 overflow-y-auto"
            >
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Order Menu</h2>
                  <button
                    onClick={() => setShowMenu(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {[
                  { icon: Package, label: 'All Orders', onClick: () => navigate('/profile') },
                  { icon: User, label: 'Profile', onClick: () => navigate('/profile') },
                  { icon: Phone, label: 'Support', onClick: () => navigate('/support') },
                  { icon: Mail, label: 'Contact', onClick: () => navigate('/contact') }
                ].map(({ icon: Icon, label, onClick }) => (
                  <button
                    key={label}
                    onClick={() => {
                      onClick();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 p-3 text-gray-300 hover:text-white hover:bg-purple-500/20 rounded-lg transition-all duration-300"
                  >
                    <Icon size={20} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Order Status Card */}
      <div className="p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-4 mb-4"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Order #{order.transaction_id.slice(-8)}</h2>
                <p className="text-gray-300 text-sm">{formatPrice(order.total_amount)}</p>
              </div>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(order.status)}`}>
              {order.status === 'escrow' ? 'Items Sent' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-400">{order.items.length}</div>
              <div className="text-gray-400 text-xs">Items</div>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-400">{formatPrice(order.total_amount)}</div>
              <div className="text-gray-400 text-xs">Total</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-400">
                {new Date(order.created_at).toLocaleDateString('cs-CZ', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-gray-400 text-xs">Date</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-16 z-40 bg-gray-800/90 backdrop-blur-xl border-b border-gray-700/50 overflow-x-auto">
        <div className="flex min-w-max px-4">
          {[
            { id: 'details', label: 'Details', icon: Info, count: order.items.length },
            { id: 'chat', label: 'Chat', icon: MessageCircle, count: messages.filter(m => m.senderId !== user?.steamId && !m.read).length },
            { id: 'tracking', label: 'Status', icon: Activity }
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-all duration-300 border-b-2 whitespace-nowrap ${
                activeTab === id
                  ? 'text-purple-400 bg-purple-500/20 border-purple-500'
                  : 'text-gray-400 hover:text-white border-transparent'
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
              {count !== undefined && count > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-4">
        {activeTab === 'details' && (
          <div className="p-4 space-y-4">
            {/* Items List */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Package className="w-5 h-5 text-purple-400 mr-2" />
                Items ({order.items.length})
              </h3>
              <div className="space-y-3">
                {order.items.map((item: any, index: number) => (
                  <div key={index} className="flex items-center space-x-3 bg-gray-700/30 rounded-lg p-3">
                    <div className="w-12 h-12 bg-gray-600/50 rounded-lg flex items-center justify-center">
                      <img 
                        src={item.image_url || item.image} 
                        alt={item.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm truncate">{item.name}</h4>
                      <div className="text-gray-400 text-xs">{item.condition}</div>
                    </div>
                    <div className="text-green-400 font-bold text-sm">
                      {formatPrice(item.price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Other Party Info */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <User className="w-5 h-5 text-blue-400 mr-2" />
                {isUserSeller ? 'Buyer' : 'Seller'} Information
              </h3>
              <div className="flex items-center space-x-3">
                <img
                  src="https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg"
                  alt="User Avatar"
                  className="w-12 h-12 rounded-full border-2 border-gray-600/50"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">{otherPartyName}</div>
                  <div className="text-gray-400 text-sm">Steam User</div>
                  <div className="flex items-center space-x-2 mt-1 text-xs">
                    <Star className="w-3 h-3 text-yellow-400" />
                    <span className="text-yellow-400">4.8/5</span>
                    <span className="text-gray-500">234 trades</span>
                  </div>
                </div>
                <button
                  onClick={() => window.open(`https://steamcommunity.com/profiles/${otherPartyId}`, '_blank')}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {isUserSeller && order.status === 'pending' && (
                <motion.button
                  onClick={handleInitiateTrade}
                  disabled={processing}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2"
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
                      <span>Send Steam Trade</span>
                    </>
                  )}
                </motion.button>
              )}

              {isUserBuyer && (order.status === 'escrow' || order.status === 'pending') && (
                <motion.button
                  onClick={handleConfirmReceipt}
                  disabled={confirmingReceipt}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2"
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
                      <span>Confirm Receipt</span>
                    </>
                  )}
                </motion.button>
              )}

              <button
                onClick={() => window.open('https://steamcommunity.com/my/tradeoffers/', '_blank')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
              >
                <Gamepad2 className="w-5 h-5" />
                <span>Open Steam</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-[calc(100vh-280px)] flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg, index) => {
                    const isMyMessage = msg.senderId === user?.steamId;
                    
                    return (
                      <motion.div
                        key={`${msg.id}-${index}`}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`flex w-full ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${isMyMessage ? 'order-2' : 'order-1'}`}>
                          {!isMyMessage && (
                            <div className="text-xs text-gray-400 mb-1 ml-1">
                              {otherPartyName}
                            </div>
                          )}
                          
                          <div className={`px-4 py-3 rounded-2xl ${
                            isMyMessage
                              ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-md'
                              : 'bg-gray-700/90 text-gray-200 rounded-bl-md border border-gray-600/50'
                          }`}>
                            <p className="text-sm leading-relaxed">{msg.message}</p>
                            <div className="text-xs opacity-70 mt-1">
                              {formatMessageTime(msg.timestamp)}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700/50 bg-gray-900/30">
              <div className="flex space-x-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setIsTyping(e.target.value.length > 0);
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Message ${otherPartyName}...`}
                  className="flex-1 bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  maxLength={500}
                />
                <motion.button
                  onClick={handleSendMessage}
                  disabled={!message.trim()}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-3 rounded-xl transition-all duration-300 ${
                    message.trim()
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send size={16} />
                </motion.button>
              </div>
              
              <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                <div className="flex items-center space-x-2">
                  <Shield className="w-3 h-3" />
                  <span>End-to-end encrypted</span>
                </div>
                <span>{message.length}/500</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tracking' && (
          <div className="p-4 space-y-4">
            {/* Order Timeline */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Activity className="w-5 h-5 text-blue-400 mr-2" />
                Order Timeline
              </h3>
              
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

                {order.status === 'escrow' && (
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                      <Truck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-white font-medium">Items Sent</div>
                      <div className="text-gray-400 text-sm">Waiting for buyer confirmation</div>
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

            {/* Security Features */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                <Shield className="w-5 h-5 text-green-400 mr-2" />
                Security Features
              </h3>
              <div className="space-y-3">
                {[
                  { icon: Shield, text: 'Escrow Protection', desc: '48-hour buyer protection' },
                  { icon: Zap, text: 'Instant Delivery', desc: 'Items sent via Steam trade' },
                  { icon: Award, text: '24/7 Support', desc: 'Expert help available' }
                ].map(({ icon: Icon, text, desc }, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Icon className="w-4 h-4 text-green-400" />
                    <div>
                      <div className="text-white text-sm font-medium">{text}</div>
                      <div className="text-gray-400 text-xs">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {order.tracking_notes && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4">
                <h3 className="text-lg font-bold text-white mb-3">Tracking Notes</h3>
                <p className="text-gray-300 text-sm">{order.tracking_notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Bottom Action Bar (when not in chat) */}
      {activeTab !== 'chat' && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-purple-500/30 p-4 z-40">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActiveTab('chat')}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
            >
              <MessageCircle size={18} />
              <span>Chat</span>
              {messages.filter(m => m.senderId !== user?.steamId && !m.read).length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {messages.filter(m => m.senderId !== user?.steamId && !m.read).length}
                </span>
              )}
            </button>
            
            {isUserSeller && order.status === 'pending' && (
              <motion.button
                onClick={handleInitiateTrade}
                disabled={processing}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center space-x-2"
              >
                <ExternalLink size={18} />
                <span>Send Trade</span>
              </motion.button>
            )}
            
            {isUserBuyer && (order.status === 'escrow' || order.status === 'pending') && (
              <motion.button
                onClick={handleConfirmReceipt}
                disabled={confirmingReceipt}
                whileTap={{ scale: 0.95 }}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center space-x-2"
              >
                <CheckCircle size={18} />
                <span>Confirm Receipt</span>
              </motion.button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileOrderDetailPage;