import { getSupabaseCredentials } from '../../utils/supabaseHelpers';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  User, 
  Clock, 
  Shield, 
  Activity,
  MessageCircle,
  ExternalLink,
  Settings,
  CheckCircle,
  Circle
} from 'lucide-react';
import { useChatStore, ChatMessage } from '../../store/chatStore';
import { useOnlineStatusStore } from '../../store/onlineStatusStore';
import { playMessageSent, playMessageReceived } from '../../utils/soundUtils';

interface RealTimeChatProps {
  orderId: string;
  userSteamId: string;
  otherPartyId: string;
  otherPartyName: string;
  userType: 'buyer' | 'seller';
}

const RealTimeChat: React.FC<RealTimeChatProps> = ({
  orderId,
  userSteamId,
  otherPartyId,
  otherPartyName,
  userType
}) => {
  const [message, setMessage] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [otherPersonTyping, setOtherPersonTyping] = useState(false);
  const [lastTypingTime, setLastTypingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const { getUserStatus, startHeartbeat } = useOnlineStatusStore();
  const otherPartyStatus = getUserStatus(otherPartyId);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages.length]);

  // Set up heartbeat for user status
  useEffect(() => {
    const cleanup = startHeartbeat(userSteamId);
    return cleanup;
  }, [userSteamId, startHeartbeat]);

  // Handle typing indicator
  const handleTyping = () => {
    const now = Date.now();
    setLastTypingTime(now);
    
    if (!isTyping) {
      setIsTyping(true);
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  };
  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
        
        const response = await fetch(`${supabaseUrl}/functions/v1/chat?order_id=${orderId}&steam_id=${userSteamId}`, {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const messages = data.messages || [];
          
          const formattedMessages: ChatMessage[] = messages.map((msg: any) => ({
            id: msg.id.toString(),
            orderId: msg.orderId || msg.order_id,
            senderId: msg.senderId || msg.sender_steam_id,
            senderType: msg.senderType || msg.sender_type,
            message: msg.message,
            timestamp: msg.timestamp || msg.created_at,
            read: msg.read || false
          }));
          
          setLocalMessages(formattedMessages);
          console.log(`Loaded ${formattedMessages.length} messages for order ${orderId}`);
        }
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    if (orderId && userSteamId) {
      loadMessages();
    }
  }, [orderId, userSteamId]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
        
        const response = await fetch(`${supabaseUrl}/functions/v1/chat?order_id=${orderId}&steam_id=${userSteamId}`, {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const backendMessages = data.messages || [];
          
          // Only update if we have new messages
          if (backendMessages.length > localMessages.length) {
            const formattedMessages: ChatMessage[] = backendMessages.map((msg: any) => ({
              id: msg.id.toString(),
              orderId: msg.orderId || msg.order_id,
              senderId: msg.senderId || msg.sender_steam_id,
              senderType: msg.senderType || msg.sender_type,
              message: msg.message,
              timestamp: msg.timestamp || msg.created_at,
              read: msg.read || false
            }));
            
            setLocalMessages(formattedMessages);
            
            // Play message received sound if we have new messages from other party
            const hasNewMessagesFromOtherParty = formattedMessages.some(msg => 
              msg.senderId !== userSteamId && 
              !localMessages.some(localMsg => localMsg.id === msg.id)
            );
            
            if (hasNewMessagesFromOtherParty) {
              playMessageReceived();
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [orderId, userSteamId, localMessages.length]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const messageToSend = message.trim();
    setMessage(''); // Clear input
    setIsTyping(false); // Stop typing indicator
    
    // Create temporary message for immediate display
    const tempMessage: ChatMessage = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId,
      senderId: userSteamId,
      senderType: userType,
      message: messageToSend,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    // Add to local messages immediately
    setLocalMessages(prev => [...prev, tempMessage]);
    
    console.log('=== SENDING MESSAGE ===');
    console.log('User Steam ID:', userSteamId);
    console.log('User Type:', userType);
    console.log('Message:', messageToSend);
    
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          sender_steam_id: userSteamId,
          sender_type: userType,
          message: messageToSend
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('Message sent successfully:', result.message.id);
        
        // Play message sent sound
        playMessageSent();
        
        // Replace temp message with real message from backend
        setLocalMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id 
            ? { 
                ...msg, 
                id: result.message.id || tempMessage.id,
                timestamp: result.message.timestamp || msg.timestamp 
              }
            : msg
        ));
        
      } else {
        console.error('Failed to send message:', await response.text());
        // Remove temp message on failure
        setLocalMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        setMessage(messageToSend); // Restore message in input
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove temp message on error
      setLocalMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setMessage(messageToSend); // Restore message in input
    }
    
    // Focus back to input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return date.toLocaleDateString('cs-CZ', { month: 'short', day: 'numeric' });
  };

  // Handle input changes for typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    handleTyping();
  };
  return (
    <div className="h-[600px] bg-gray-800/50 rounded-xl border border-gray-700/50 flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700/50 bg-gray-900/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src={`https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg`}
                alt={otherPartyName}
                className="w-10 h-10 rounded-full border-2 border-gray-600/50"
                onError={(e) => {
                  e.currentTarget.src = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg';
                }}
              />
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-800 ${
                otherPartyStatus === 'online' ? 'bg-green-500' : 'bg-gray-500'
              }`}></div>
            </div>
            
            <div>
              <div className="font-medium text-white flex items-center space-x-2">
                <span>{otherPartyName}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  userType === 'buyer' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {userType === 'buyer' ? 'Seller' : 'Buyer'}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {otherPersonTyping ? 'Typing...' : otherPartyStatus === 'online' ? 'Online now' : 'Offline'}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.open(`https://steamcommunity.com/profiles/${otherPartyId}`, '_blank')}
              className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-full hover:bg-gray-700/50"
              title="View Steam Profile"
            >
              <ExternalLink size={16} />
            </button>
            <button
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-700/50"
              title="Chat Settings"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {localMessages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {localMessages.map((msg, index) => {
              const isMyMessage = msg.senderId === userSteamId;
              
              console.log(`Message ${index}: "${msg.message}" | Sender: ${msg.senderId} | User: ${userSteamId} | IsMyMessage: ${isMyMessage}`);
              
              return (
                <motion.div
                  key={`${msg.id}-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15 }}
                  className={`flex w-full ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${isMyMessage ? 'order-2' : 'order-1'}`}>
                    {/* Sender label */}
                    {!isMyMessage && (
                      <div className="text-xs text-gray-400 mb-1 ml-1">
                        {otherPartyName}
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      transition={{ duration: 0.1 }}
                      className={`px-4 py-3 rounded-lg shadow-lg relative ${
                        isMyMessage
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-sm shadow-lg shadow-blue-500/20'
                          : 'bg-gray-700/90 text-gray-200 rounded-bl-sm border border-gray-600/50'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{msg.message}</p>
                      
                      <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                        <span>{formatMessageTime(msg.timestamp)}</span>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        
        {/* Typing indicator */}
        <AnimatePresence>
          {otherPersonTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="bg-gray-700/90 rounded-xl px-4 py-3 border border-gray-600/50">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{otherPartyName} is typing...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-700/50 bg-gray-900/30 flex-shrink-0">
        <div className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Message ${otherPartyName}...`}
            className="flex-1 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-all duration-300"
            maxLength={500}
          />
          <motion.button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-3 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 ${
              message.trim()
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send size={16} />
          </motion.button>
        </div>
        
        {/* Chat Info */}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Shield className="w-3 h-3" />
              <span>End-to-end encrypted</span>
            </div>
            {isTyping && (
              <div className="flex items-center space-x-1 text-blue-400">
                <Activity className="w-3 h-3" />
                <span>You are typing...</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Activity className="w-3 h-3" />
              <span>Real-time sync</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <span>{message.length}/500</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeChat;