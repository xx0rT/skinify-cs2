import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, X, Send, Search, Filter, Clock, CheckCircle, AlertCircle, Loader, ChevronDown, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { sendTicketCreatedEmail } from '../utils/emailService';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'account' | 'trading' | 'other';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
  users?: {
    display_name: string;
    avatar_url: string;
  };
}

const SupportTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'other',
    priority: 'medium'
  });

  /* The tickets tables reference users.id (uuid) but the auth store
     only carries the Steam ID, so `user.id` was always undefined and
     every insert/select silently failed. Resolve the users-row uuid
     once per session and key all queries off it. */
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        if (user.steamId) {
          const { data } = await supabase
            .from('users')
            .select('id')
            .eq('steam_id', user.steamId)
            .maybeSingle();
          if (!cancelled && data?.id) {
            setDbUserId(data.id);
            return;
          }
        }
        const authUserId = (user as any).authUserId;
        if (authUserId) {
          const { data } = await supabase
            .from('users')
            .select('id')
            .eq('id', authUserId)
            .maybeSingle();
          if (!cancelled && data?.id) setDbUserId(data.id);
        }
      } catch (e) {
        console.error('[support] failed to resolve user id:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.steamId]);

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    if (dbUserId) fetchTickets();
  }, [user, dbUserId, filterStatus]);

  const fetchTickets = async () => {
    if (!dbUserId) return;
    try {
      setLoading(true);
      let query = supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', dbUserId)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      addToast('Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select(`
          *,
          users:user_id(display_name, avatar_url)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      addToast('Failed to load messages', 'error');
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      addToast('Please fill in all fields', 'error');
      return;
    }
    if (!dbUserId) {
      addToast('Your account is still loading — try again in a second.', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert([
          {
            user_id: dbUserId,
            subject: newTicket.subject,
            description: newTicket.description,
            category: newTicket.category,
            priority: newTicket.priority
          }
        ])
        .select()
        .single();

      if (error) throw error;

      /* Confirmation email via Brevo — fire-and-forget so a mail
         hiccup never blocks ticket creation. Only when the account
         has an email on file (Steam-only accounts may not). */
      if (user?.email && data?.id) {
        sendTicketCreatedEmail({
          to: user.email,
          ticketSubject: newTicket.subject,
          ticketId: String(data.id),
        });
      }

      addToast('Support ticket created successfully', 'success');
      setShowCreateModal(false);
      setNewTicket({ subject: '', description: '', category: 'other', priority: 'medium' });
      fetchTickets();
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      addToast(error?.message || 'Failed to create ticket', 'error');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !dbUserId) return;

    try {
      setSendingMessage(true);
      const { error } = await supabase
        .from('support_ticket_messages')
        .insert([
          {
            ticket_id: selectedTicket.id,
            user_id: dbUserId,
            message: newMessage.trim(),
            is_staff_reply: false
          }
        ]);

      if (error) throw error;

      setNewMessage('');
      fetchMessages(selectedTicket.id);
      addToast('Message sent', 'success');
    } catch (error) {
      console.error('Error sending message:', error);
      addToast('Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-gray-400';
      case 'medium': return 'text-blue-400';
      case 'high': return 'text-orange-400';
      case 'urgent': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <Loader className="w-4 h-4" />;
      case 'resolved': return <CheckCircle className="w-4 h-4" />;
      case 'closed': return <X className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Header hideLanguage={true} />

      <main className="flex-1 pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  Support Tickets
                </h1>
                <p className="text-gray-400">
                  Get help from our support team
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg shadow-purple-500/30"
              >
                <Plus className="w-5 h-5" />
                New Ticket
              </motion.button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium transition-colors ${
                      filterStatus === status
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                    }`}
                  >
                    {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Tickets Found</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery ? 'Try adjusting your search' : 'Create your first support ticket'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Create Ticket
                </button>
              )}
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTickets.map((ticket, index) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    fetchMessages(ticket.id);
                  }}
                  className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 cursor-pointer hover:border-purple-500/50 hover:bg-gray-800/70 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-purple-400 transition-colors">
                        {ticket.subject}
                      </h3>
                      <p className="text-gray-400 text-sm line-clamp-2">
                        {ticket.description}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      {ticket.status.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                      <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.toUpperCase()}
                      </span>
                      <span className="text-gray-500 capitalize">
                        {ticket.category}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Create Ticket Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl pointer-events-auto max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Create Support Ticket</h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subject *
                    </label>
                    <input
                      type="text"
                      value={newTicket.subject}
                      onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                      placeholder="Brief description of your issue"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                      rows={6}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                      placeholder="Provide detailed information about your issue..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Category
                      </label>
                      <select
                        value={newTicket.category}
                        onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                      >
                        <option value="technical">Technical</option>
                        <option value="billing">Billing</option>
                        <option value="account">Account</option>
                        <option value="trading">Trading</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Priority
                      </label>
                      <select
                        value={newTicket.priority}
                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                        className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={createTicket}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-3 rounded-lg font-medium transition-all"
                    >
                      Create Ticket
                    </button>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Ticket Detail Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setSelectedTicket(null)}
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed right-0 top-0 h-full w-full sm:w-[600px] bg-gray-900 border-l border-gray-700 z-50 flex flex-col"
            >
              <div className="p-6 border-b border-gray-700">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="mb-4 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back to Tickets
                </button>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white mb-2">{selectedTicket.subject}</h2>
                    <p className="text-gray-400 text-sm">{selectedTicket.description}</p>
                  </div>
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedTicket.status)}`}>
                    {getStatusIcon(selectedTicket.status)}
                    {selectedTicket.status.replace('_', ' ')}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                  <span>{new Date(selectedTicket.created_at).toLocaleString()}</span>
                  <span className={`font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority.toUpperCase()}
                  </span>
                  <span className="capitalize">{selectedTicket.category}</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.is_staff_reply ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      msg.is_staff_reply ? 'bg-purple-600' : 'bg-gray-700'
                    }`}>
                      {msg.users?.avatar_url ? (
                        <img src={msg.users.avatar_url} alt="" className="w-full h-full rounded-full" />
                      ) : (
                        <span className="text-white font-medium">
                          {msg.users?.display_name?.[0] || 'U'}
                        </span>
                      )}
                    </div>
                    <div className={`flex-1 ${msg.is_staff_reply ? '' : 'text-right'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">
                          {msg.is_staff_reply ? 'Support Team' : msg.users?.display_name || 'You'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className={`inline-block p-3 rounded-lg ${
                        msg.is_staff_reply
                          ? 'bg-purple-600/20 border border-purple-500/30 text-white'
                          : 'bg-gray-800 border border-gray-700 text-gray-300'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {selectedTicket.status !== 'closed' && (
                <div className="p-6 border-t border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupportTicketsPage;
