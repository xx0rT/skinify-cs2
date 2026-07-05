import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { sendTicketCreatedEmail } from '../utils/emailService';
import { TICKET_PREFILL_KEY } from '../components/SupportChatWidget';
import LandingNav from '../components/LandingNav';
import Footer from '../components/Footer';
import { spring, tap } from '../lib/motion';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

/* ─────────────────────────────────────────────────────────────────────────
   SupportTicketsPage — flat redesign in the app's design language.

   Left: ticket list with status dots + filter pills. Right (lg+) or
   full overlay (<lg): the conversation for the selected ticket with a
   composer. Creating a ticket opens a flat modal.
   ───────────────────────────────────────────────────────────────────────── */

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

const STATUS_META: Record<
  SupportTicket['status'],
  { label: string; dot: string; pill: string }
> = {
  open: {
    label: 'Open',
    dot: 'bg-accent',
    pill: 'bg-accent-soft text-accent',
  },
  in_progress: {
    label: 'In progress',
    dot: 'bg-amber-500',
    pill: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  resolved: {
    label: 'Resolved',
    dot: 'bg-emerald-500',
    pill: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  closed: {
    label: 'Closed',
    dot: 'bg-ink-dim',
    pill: 'bg-subtle text-ink-muted',
  },
};

const CATEGORIES: SupportTicket['category'][] = [
  'technical',
  'billing',
  'account',
  'trading',
  'other',
];
const PRIORITIES: SupportTicket['priority'][] = ['low', 'medium', 'high', 'urgent'];

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
  const [creating, setCreating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'other',
    priority: 'medium',
  });

  useBodyScrollLock(showCreateModal);

  /* Handoff from the AI support chat — a prefilled subject/description
     lands in sessionStorage; open the create modal with it once. */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TICKET_PREFILL_KEY);
      if (!raw) return;
      sessionStorage.removeItem(TICKET_PREFILL_KEY);
      const prefill = JSON.parse(raw);
      if (prefill?.subject || prefill?.description) {
        setNewTicket((prev) => ({
          ...prev,
          subject: String(prefill.subject || '').slice(0, 120),
          description: String(prefill.description || '').slice(0, 4000),
        }));
        setShowCreateModal(true);
      }
    } catch {
      /* malformed prefill — ignore */
    }
  }, []);

  /* The tickets tables reference users.id (uuid) but the auth store
     only carries the Steam ID — resolve the uuid once per session. */
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

  /* Keep the open conversation fresh. */
  useEffect(() => {
    if (!selectedTicket) return;
    fetchMessages(selectedTicket.id);
    const interval = window.setInterval(() => fetchMessages(selectedTicket.id), 10_000);
    return () => window.clearInterval(interval);
  }, [selectedTicket?.id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length, selectedTicket?.id]);

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
        .select(`*, users:user_id(display_name, avatar_url)`)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
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

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert([
          {
            user_id: dbUserId,
            subject: newTicket.subject,
            description: newTicket.description,
            category: newTicket.category,
            priority: newTicket.priority,
          },
        ])
        .select()
        .single();

      if (error) throw error;

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
      if (data) setSelectedTicket(data as SupportTicket);
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      addToast(error?.message || 'Failed to create ticket', 'error');
    } finally {
      setCreating(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || !dbUserId || sendingMessage) return;
    try {
      setSendingMessage(true);
      const { error } = await supabase.from('support_ticket_messages').insert([
        {
          ticket_id: selectedTicket.id,
          user_id: dbUserId,
          message: newMessage.trim(),
          is_staff_reply: false,
        },
      ]);
      if (error) throw error;
      setNewMessage('');
      fetchMessages(selectedTicket.id);
    } catch (error) {
      console.error('Error sending message:', error);
      addToast('Failed to send message', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!user) return null;

  return (
    /* Desktop: exact one-viewport layout (like /messages) — the page
       never scrolls; the ticket list and the conversation scroll
       internally. */
    <div className="min-h-screen lg:min-h-0 lg:h-dvh lg:overflow-hidden bg-bg text-ink flex flex-col">
      <LandingNav />

      <main className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 pt-4 pb-16 lg:pb-5 lg:flex-1 lg:min-h-0 lg:flex lg:flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex items-center gap-3 mb-5"
        >
          <motion.button
            whileTap={tap}
            onClick={() => navigate('/support')}
            className="w-10 h-10 rounded-full bg-subtle hover:bg-surface grid place-items-center text-ink-muted hover:text-ink transition-colors shrink-0"
            aria-label="Back to support"
          >
            <ChevronLeft size={16} strokeWidth={2.4} />
          </motion.button>
          <div className="flex-1 min-w-0">
            <span className="label-eyebrow">Support</span>
            <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-none mt-1">
              My tickets
            </h1>
          </div>
          <motion.button
            whileTap={tap}
            onClick={() => setShowCreateModal(true)}
            className="h-11 px-4 sm:px-5 rounded-full bg-accent text-on-accent text-[13.5px] font-bold inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus size={15} strokeWidth={2.6} />
            <span className="hidden sm:inline">New ticket</span>
          </motion.button>
        </motion.div>

        {/* Search + status filter */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring, delay: 0.04 }}
          className="flex flex-col sm:flex-row gap-2 mb-4"
        >
          <div className="flex-1 flex items-center gap-2.5 h-11 px-4 rounded-full bg-subtle focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
            <Search size={14} strokeWidth={2.2} className="text-ink-muted shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets…"
              className="flex-1 bg-transparent outline-none text-[13.5px] font-medium text-ink placeholder:text-ink-dim min-w-0"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((status) => {
              const active = filterStatus === status;
              return (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`relative h-11 px-4 rounded-full text-[12.5px] font-bold whitespace-nowrap transition-colors ${
                    active ? 'text-on-accent' : 'bg-subtle text-ink-muted hover:text-ink'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="ticket-status-pill"
                      className="absolute inset-0 rounded-full bg-accent"
                      transition={spring}
                    />
                  )}
                  <span className="relative">
                    {status === 'all' ? 'All' : STATUS_META[status].label}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-[380px_1fr] items-start lg:items-stretch lg:flex-1 lg:min-h-0 lg:auto-rows-[minmax(0,1fr)]">
          {/* ── Ticket list ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.06 }}
            className="panel overflow-hidden lg:h-full flex flex-col min-h-0"
          >
            {loading ? (
              <div className="p-8 grid place-items-center">
                <Loader2 size={22} className="animate-spin text-ink-muted" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-10 text-center">
                <MessageSquare size={24} className="mx-auto text-ink-muted mb-3" />
                <p className="text-[14px] font-bold text-ink">No tickets found</p>
                <p className="text-[12.5px] text-ink-muted font-medium mt-1">
                  {searchQuery
                    ? 'Try a different search.'
                    : 'Open your first ticket and we’ll get back fast.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-5 h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus size={13} strokeWidth={2.6} />
                    New ticket
                  </button>
                )}
              </div>
            ) : (
              <ul className="flex-1 min-h-0 overflow-y-auto">
                {filteredTickets.map((ticket, i) => {
                  const meta = STATUS_META[ticket.status];
                  const active = selectedTicket?.id === ticket.id;
                  return (
                    <motion.li
                      key={ticket.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...spring, delay: Math.min(i * 0.04, 0.3) }}
                    >
                      <button
                        onClick={() => setSelectedTicket(ticket)}
                        className={`w-full text-left px-4 py-3.5 flex items-start gap-3 border-l-2 transition-colors ${
                          active
                            ? 'bg-accent-soft border-l-accent'
                            : 'border-l-transparent hover:bg-subtle/60'
                        }`}
                      >
                        <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13.5px] font-bold text-ink truncate tracking-tight">
                            {ticket.subject}
                          </span>
                          <span className="block text-[11.5px] text-ink-muted font-medium truncate mt-0.5">
                            {ticket.description}
                          </span>
                          <span className="mt-1.5 flex items-center gap-2">
                            <span className={`pill !px-2 !py-0.5 text-[10px] ${meta.pill}`}>
                              {meta.label}
                            </span>
                            <span className="text-[10.5px] text-ink-dim font-medium tabular-nums">
                              {new Date(ticket.created_at).toLocaleDateString()}
                            </span>
                          </span>
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </motion.div>

          {/* ── Conversation ── */}
          <AnimatePresence mode="wait">
            {selectedTicket ? (
              <motion.section
                key={selectedTicket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ ...spring, mass: 0.6 }}
                className="panel flex flex-col overflow-hidden max-lg:fixed max-lg:inset-0 max-lg:z-[60] max-lg:rounded-none lg:h-full lg:min-h-0"
                style={{
                  paddingTop: 'env(safe-area-inset-top)',
                  paddingBottom: 'env(safe-area-inset-bottom)',
                }}
              >
                {/* Conversation header */}
                <div className="shrink-0 px-4 sm:px-5 py-3.5 border-b border-line/60 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="lg:hidden w-9 h-9 rounded-full bg-subtle grid place-items-center text-ink-muted"
                    aria-label="Back"
                  >
                    <ArrowLeft size={15} strokeWidth={2.4} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14.5px] font-bold text-ink truncate tracking-tight">
                      {selectedTicket.subject}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`pill !px-2 !py-0.5 text-[10px] ${STATUS_META[selectedTicket.status].pill}`}
                      >
                        {STATUS_META[selectedTicket.status].label}
                      </span>
                      <span className="text-[10.5px] text-ink-dim font-semibold uppercase tracking-wider">
                        {selectedTicket.category} · {selectedTicket.priority}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="hidden lg:grid w-9 h-9 rounded-full bg-subtle place-items-center text-ink-muted hover:text-ink transition-colors"
                    aria-label="Close"
                  >
                    <X size={14} strokeWidth={2.4} />
                  </button>
                </div>

                {/* Messages */}
                <div
                  ref={scrollRef}
                  className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-4 space-y-3"
                >
                  {/* Original description as the first bubble */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl rounded-br-md bg-accent text-on-accent text-[13.5px] font-medium leading-snug whitespace-pre-wrap break-words">
                      {selectedTicket.description}
                    </div>
                  </div>
                  {messages.map((m) => {
                    const mine = !m.is_staff_reply;
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...spring, mass: 0.5 }}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
                          {!mine && (
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-accent px-1">
                              Skinify support
                            </span>
                          )}
                          <div
                            className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] font-medium leading-snug whitespace-pre-wrap break-words ${
                              mine
                                ? 'bg-accent text-on-accent rounded-br-md'
                                : 'bg-subtle text-ink rounded-bl-md'
                            }`}
                          >
                            {m.message}
                          </div>
                          <span className="text-[10px] text-ink-dim font-medium tabular-nums px-1">
                            {new Date(m.created_at).toLocaleString([], {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                  {selectedTicket.status === 'resolved' && (
                    <div className="flex justify-center pt-2">
                      <span className="pill bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
                        <CheckCircle2 size={12} strokeWidth={2.4} /> Resolved
                      </span>
                    </div>
                  )}
                </div>

                {/* Composer */}
                {selectedTicket.status !== 'closed' && (
                  <div className="shrink-0 border-t border-line/60 px-3 sm:px-4 py-3 flex items-end gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Write a reply…"
                      rows={1}
                      maxLength={2000}
                      className="flex-1 min-h-[42px] max-h-[140px] rounded-2xl bg-subtle px-3.5 py-2.5 text-[13.5px] text-ink font-medium outline-none focus:ring-2 focus:ring-accent/40 resize-none"
                    />
                    <motion.button
                      whileTap={tap}
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="h-10 w-10 rounded-full bg-accent text-on-accent grid place-items-center disabled:opacity-40 shrink-0"
                      aria-label="Send"
                    >
                      {sendingMessage ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Send size={15} strokeWidth={2.4} />
                      )}
                    </motion.button>
                  </div>
                )}
              </motion.section>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="panel hidden lg:grid place-items-center p-16 lg:h-full"
              >
                <div className="text-center">
                  <Clock size={24} className="mx-auto text-ink-muted mb-3" />
                  <p className="text-[15px] font-bold text-ink">Select a ticket</p>
                  <p className="text-[12.5px] text-ink-muted font-medium mt-1">
                    Pick a ticket from the list to see the conversation.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── Create ticket modal ── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={spring}
              onClick={(e) => e.stopPropagation()}
              className="panel w-full sm:max-w-lg p-5 sm:p-6 max-h-[92dvh] overflow-y-auto rounded-b-none sm:rounded-b-[20px]"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <span className="label-eyebrow">Support</span>
                  <h2 className="text-[19px] font-bold tracking-tight leading-none mt-1">
                    New ticket
                  </h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-9 h-9 rounded-full bg-subtle grid place-items-center text-ink-muted hover:text-ink transition-colors"
                  aria-label="Close"
                >
                  <X size={14} strokeWidth={2.4} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label-meta block mb-1.5">Subject</label>
                  <input
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    placeholder="What's the issue?"
                    maxLength={120}
                    className="w-full h-11 px-4 rounded-xl bg-subtle outline-none text-ink placeholder:text-ink-dim text-[14px] font-medium focus:ring-2 focus:ring-accent/40 transition-shadow"
                  />
                </div>
                <div>
                  <label className="label-meta block mb-1.5">Description</label>
                  <textarea
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    rows={5}
                    maxLength={4000}
                    placeholder="Tell us what happened. Include order IDs if relevant."
                    className="w-full px-4 py-3 rounded-xl bg-subtle outline-none text-ink placeholder:text-ink-dim text-[14px] font-medium focus:ring-2 focus:ring-accent/40 transition-shadow resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-meta block mb-1.5">Category</label>
                    <select
                      value={newTicket.category}
                      onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl bg-subtle outline-none text-ink text-[14px] font-medium focus:ring-2 focus:ring-accent/40"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c.charAt(0).toUpperCase() + c.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-meta block mb-1.5">Priority</label>
                    <select
                      value={newTicket.priority}
                      onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                      className="w-full h-11 px-3 rounded-xl bg-subtle outline-none text-ink text-[14px] font-medium focus:ring-2 focus:ring-accent/40"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <motion.button
                  whileTap={tap}
                  onClick={createTicket}
                  disabled={creating}
                  className="w-full h-12 rounded-full bg-accent text-on-accent text-[14px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={14} strokeWidth={2.4} />
                  )}
                  {creating ? 'Creating…' : 'Create ticket'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer slim />
    </div>
  );
};

export default SupportTicketsPage;
