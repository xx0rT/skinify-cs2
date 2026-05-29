import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Rate limiting for fetchMessages to prevent infinite loops
const rateLimitMap = new Map<string, number>();

export interface ChatMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderType: 'buyer' | 'seller';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ChatSession {
  orderId: string;
  buyerSteamId: string;
  sellerSteamId: string;
  messages: ChatMessage[];
  lastActivity: string;
  isActive: boolean;
}

interface ChatState {
  chatSessions: { [orderId: string]: ChatSession };
  activeChat: string | null;
  typingUsers: { [orderId: string]: { userId: string; timestamp: number } };
  
  // Actions
  initializeChatSession: (orderId: string, buyerSteamId: string, sellerSteamId: string) => void;
  sendMessage: (orderId: string, senderId: string, senderType: 'buyer' | 'seller', message: string) => Promise<void>;
  fetchMessages: (orderId: string) => Promise<void>;
  markMessagesAsRead: (orderId: string, userId: string) => void;
  setTyping: (orderId: string, userId: string) => void;
  clearTyping: (orderId: string, userId: string) => void;
  getUnreadCount: (orderId: string, userId: string) => number;
  getChatSession: (orderId: string) => ChatSession | null;
  setActiveChat: (orderId: string | null) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chatSessions: {},
      activeChat: null,
      typingUsers: {},

      initializeChatSession: (orderId: string, buyerSteamId: string, sellerSteamId: string) => {
        const { chatSessions } = get();
        
        if (!chatSessions[orderId]) {
          const newSession: ChatSession = {
            orderId,
            buyerSteamId,
            sellerSteamId,
            messages: [],
            lastActivity: new Date().toISOString(),
            isActive: true
          };

          set({
            chatSessions: {
              ...chatSessions,
              [orderId]: newSession
            }
          });
          
          // Fetch existing messages from backend
          get().fetchMessages(orderId);
        }
      },

      sendMessage: async (orderId: string, senderId: string, senderType: 'buyer' | 'seller', message: string) => {
        const { chatSessions } = get();
        const session = chatSessions[orderId];
        
        if (!session) {
          console.error('Chat session not found:', orderId);
          return;
        }

        // Add message to local state immediately for better UX
        const tempMessage: ChatMessage = {
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderId,
          senderId,
          senderType,
          message: message.trim(),
          timestamp: new Date().toISOString(),
          read: false
        };

        // Update local state immediately
        const updatedSession: ChatSession = {
          ...session,
          messages: [...session.messages, tempMessage],
          lastActivity: new Date().toISOString()
        };

        set({
          chatSessions: {
            ...get().chatSessions,
            [orderId]: updatedSession
          }
        });
        try {
          // Send message to backend
          const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
          
          const response = await fetch(`${supabaseUrl}/functions/v1/chat`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              order_id: orderId,
              sender_steam_id: senderId,
              sender_type: senderType,
              message: message.trim()
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('Message sent successfully:', result.message.id);
            
            // Update temp message with real ID from backend
            const updatedMessages = session.messages.map(msg => 
              msg.id === tempMessage.id 
                ? { 
                    ...msg, 
                    id: result.message.id || tempMessage.id,
                    timestamp: result.message.timestamp || msg.timestamp 
                  }
                : msg
            );

            set({
              chatSessions: {
                ...get().chatSessions,
                [orderId]: {
                  ...session,
                  messages: updatedMessages,
                  lastActivity: new Date().toISOString()
                }
              }
            });
            
            // Poll for new messages from other party
            setTimeout(async () => {
              get().fetchMessages(orderId);
            }, 1000);
            
          } else {
            // Remove temp message if sending failed
            const failedSession: ChatSession = {
              ...session,
              messages: session.messages.filter(m => m.id !== tempMessage.id)
            };

            set({
              chatSessions: {
                ...get().chatSessions,
                [orderId]: failedSession
              }
            });
            
            console.error('Failed to send message:', await response.text());
          }
        } catch (error) {
          // Remove temp message on error
          const errorSession: ChatSession = {
            ...session,
            messages: session.messages.filter(m => m.id !== tempMessage.id)
          };

          set({
            chatSessions: {
              ...get().chatSessions,
              [orderId]: errorSession
            }
          });
          
          console.error('Error sending message:', error);
        }
      },

      fetchMessages: async (orderId: string) => {
        try {
          // Rate limiting - prevent calls within 5 seconds
          const now = Date.now();
          const lastCall = rateLimitMap.get(orderId) || 0;
          if (now - lastCall < 5000) {
            console.log('Rate limited: skipping fetchMessages call');
            return;
          }
          rateLimitMap.set(orderId, now);
          
          const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
          
          const currentUser = localStorage.getItem('auth-storage') 
            ? JSON.parse(localStorage.getItem('auth-storage')!).state?.user?.steamId 
            : null;
            
          if (!currentUser) return;
          
          const response = await fetch(`${supabaseUrl}/functions/v1/chat?order_id=${orderId}&steam_id=${currentUser}`, {
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const { chatSessions } = get();
            const session = chatSessions[orderId];
            
            if (session) {
              const backendMessages = data.messages || [];
              
              // Get existing messages safely
              const existingMessages = session.messages || [];
              const tempMessages = existingMessages.filter(msg => msg.id.startsWith('temp_'));
              const realMessages = existingMessages.filter(msg => !msg.id.startsWith('temp_'));
              
              // Only update if we have new messages to prevent unnecessary re-renders
              if (backendMessages.length > 0) {
                // Convert backend messages to our format
                const backendChatMessages: ChatMessage[] = backendMessages.map((msg: any) => ({
                  id: msg.id.toString(),
                  orderId: msg.order_id || orderId,
                  senderId: msg.sender_steam_id,
                  senderType: msg.sender_type,
                  message: msg.message,
                  timestamp: msg.timestamp || msg.created_at,
                  read: msg.read || false
                }));
                
                // Keep only backend messages we don't already have
                const newBackendMessages = backendChatMessages.filter(msg => 
                  !realMessages.some(existing => existing.id === msg.id)
                );
                
                // Only update state if there are actually new messages
                if (newBackendMessages.length > 0) {
                  // Combine: existing real messages + new backend messages + temp messages
                  const allMessages = [
                    ...realMessages,
                    ...newBackendMessages,
                    ...tempMessages
                  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                  
                  set({
                    chatSessions: {
                      ...chatSessions,
                      [orderId]: {
                        ...session,
                        messages: allMessages
                      }
                    }
                  });
                  
                  console.log(`Chat sync: ${realMessages.length} real + ${newBackendMessages.length} new backend + ${tempMessages.length} temp = ${allMessages.length} total`);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      },

      markMessagesAsRead: (orderId: string, userId: string) => {
        // Rate limiting for markMessagesAsRead
        const now = Date.now();
        const lastCall = rateLimitMap.get(`read_${orderId}_${userId}`) || 0;
        if (now - lastCall < 3000) {
          console.log('Rate limited: skipping markMessagesAsRead call');
          return;
        }
        rateLimitMap.set(`read_${orderId}_${userId}`, now);
        
        const { chatSessions } = get();
        const session = chatSessions[orderId];
        
        if (!session) return;

        // Mark messages as read in backend (async, no await to prevent blocking)
        try {
          const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
          
          // Fire and forget - don't wait for response
          fetch(`${supabaseUrl}/functions/v1/chat?order_id=${orderId}&steam_id=${userId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            }
          }).catch(error => {
            console.error('Error marking messages as read:', error);
          });
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
        
        // Update local state only if there are unread messages
        const existingMessages = session.messages || [];
        const hasUnreadMessages = existingMessages.some(msg => 
          msg.senderId !== userId && !msg.read
        );
        
        if (hasUnreadMessages) {
          const updatedMessages = existingMessages.map(msg => ({
            ...msg,
            read: msg.senderId === userId ? msg.read : true
          }));

          set({
            chatSessions: {
              ...chatSessions,
              [orderId]: {
                ...session,
                messages: updatedMessages
              }
            }
          });
        }
      },

      setTyping: (orderId: string, userId: string) => {
        set({
          typingUsers: {
            ...get().typingUsers,
            [orderId]: {
              userId,
              timestamp: Date.now()
            }
          }
        });
      },

      clearTyping: (orderId: string, userId: string) => {
        const { typingUsers } = get();
        const updated = { ...typingUsers };
        delete updated[orderId];
        set({ typingUsers: updated });
      },

      getUnreadCount: (orderId: string, userId: string) => {
        const session = get().chatSessions[orderId];
        if (!session) return 0;
        
        return session.messages.filter(msg => 
          msg.senderId !== userId && !msg.read
        ).length;
      },

      getChatSession: (orderId: string) => {
        return get().chatSessions[orderId] || null;
      },

      setActiveChat: (orderId: string | null) => {
        set({ activeChat: orderId });
      }
    }),
    {
      name: 'chat-storage',
    }
  )
);