import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Download,
  Maximize2,
  MessageCircle,
  Minimize2,
  Send,
  Ticket,
  X,
} from 'lucide-react';
import { useTranslationStore } from '../store/translationStore';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   SupportChatWidget — floating AI support agent ("Sky") for the
   support page.

   - Answers via the support-chat edge function (Claude) in the user's
     UI language.
   - Header actions: open the FAQ, expand to a big window, download the
     transcript, close.
   - After the conversation runs long (5+ user messages) an inline card
     offers to open a ticket pre-filled with the issue + transcript
     (handoff via sessionStorage → /tickets).
   ───────────────────────────────────────────────────────────────────────── */

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  ts: number;
}

export const TICKET_PREFILL_KEY = 'skinify_prefill_ticket';

const STARTERS = [
  'How do trades work?',
  'My deposit failed',
  "Why can't I trade?",
];

const SupportChatWidget: React.FC = () => {
  const navigate = useNavigate();
  const language = useTranslationStore((s) => s.currentLanguage);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  const suggestTicket = userMsgCount >= 5;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages.length, thinking, open, expanded]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open, expanded]);

  const send = async (raw?: string) => {
    const content = (raw ?? text).trim();
    if (!content || thinking) return;
    setText('');
    const next: ChatMsg[] = [...messages, { role: 'user', content, ts: Date.now() }];
    setMessages(next);
    setThinking(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/support-chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          language: language?.name || 'English',
        }),
      });
      const body = await res.json().catch(() => ({}));
      const reply: string = res.ok && body?.reply
        ? body.reply
        : "I couldn't reach the assistant right now — please try again in a moment, or open a support ticket at skinify.gg/tickets and a human will pick it up.";
      setMessages((prev) => [...prev, { role: 'assistant', content: reply, ts: Date.now() }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I couldn't reach the assistant right now — please try again in a moment, or open a support ticket and a human will pick it up.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const downloadTranscript = () => {
    const lines = messages.map(
      (m) =>
        `[${new Date(m.ts).toLocaleString()}] ${m.role === 'user' ? 'You' : 'Skinify Assistant'}: ${m.content}`,
    );
    const blob = new Blob(
      [`Skinify support chat transcript — ${new Date().toLocaleString()}\n\n${lines.join('\n\n')}`],
      { type: 'text/plain;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skinify-chat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createTicketFromChat = () => {
    const firstIssue = messages.find((m) => m.role === 'user')?.content || 'Support chat follow-up';
    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');
    try {
      sessionStorage.setItem(
        TICKET_PREFILL_KEY,
        JSON.stringify({
          subject: firstIssue.slice(0, 110),
          description: `Issue (from AI chat): ${firstIssue}\n\n--- Chat transcript for review ---\n\n${transcript}`.slice(0, 3900),
        }),
      );
    } catch {
      /* private mode — the ticket page just opens blank */
    }
    setOpen(false);
    navigate('/tickets');
  };

  const panelClass = expanded
    ? 'fixed inset-4 sm:inset-x-auto sm:right-6 sm:top-6 sm:bottom-6 sm:w-[720px] z-[85]'
    : 'fixed right-4 bottom-4 sm:right-6 sm:bottom-6 w-[calc(100vw-2rem)] max-w-[400px] h-[600px] max-h-[calc(100dvh-6rem)] z-[85]';

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="chat-launcher"
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={spring}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(true)}
            className="fixed right-4 bottom-24 md:bottom-6 sm:right-6 z-[85] h-14 px-5 rounded-full bg-accent text-on-accent font-bold text-[14px] inline-flex items-center gap-2"
            style={{ boxShadow: '0 16px 40px -12px rgb(var(--accent) / 0.65)' }}
            aria-label="Chat with support"
          >
            <MessageCircle size={18} strokeWidth={2.4} />
            <span className="hidden sm:inline">Chat with us</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            layout
            initial={{ opacity: 0, y: 32, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.8 }}
            className={`${panelClass} panel flex flex-col overflow-hidden shadow-2xl`}
            role="dialog"
            aria-label="Support chat"
          >
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-line/60 flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-accent text-on-accent grid place-items-center shrink-0">
                <MessageCircle size={18} strokeWidth={2.4} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold text-ink tracking-tight leading-none">
                  Skinify Assistant
                </div>
                <div className="text-[11px] text-ink-muted font-medium mt-1 leading-none">
                  AI agent · replies in {language?.nativeName || 'your language'}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <HeaderIcon
                  title="Open the FAQ"
                  onClick={() => {
                    setOpen(false);
                    navigate('/faq');
                  }}
                >
                  <BookOpen size={15} strokeWidth={2.2} />
                </HeaderIcon>
                {messages.length > 0 && (
                  <HeaderIcon title="Download transcript" onClick={downloadTranscript}>
                    <Download size={15} strokeWidth={2.2} />
                  </HeaderIcon>
                )}
                <HeaderIcon
                  title={expanded ? 'Smaller window' : 'Bigger window'}
                  onClick={() => setExpanded((v) => !v)}
                >
                  {expanded ? (
                    <Minimize2 size={15} strokeWidth={2.2} />
                  ) : (
                    <Maximize2 size={15} strokeWidth={2.2} />
                  )}
                </HeaderIcon>
                <HeaderIcon title="Close" onClick={() => setOpen(false)}>
                  <X size={16} strokeWidth={2.4} />
                </HeaderIcon>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={spring}
                >
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-subtle text-ink text-[13.5px] font-medium leading-snug inline-block max-w-[85%]">
                    Hi! I'm the Skinify assistant. Ask me anything about trades, deposits,
                    withdrawals or your account — I'll answer in your language.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {STARTERS.map((s) => (
                      <motion.button
                        whileTap={tap}
                        key={s}
                        onClick={() => send(s)}
                        className="h-9 px-3.5 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[12.5px] font-semibold transition-colors"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((m, i) => (
                <motion.div
                  key={`${m.ts}-${i}`}
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ ...spring, mass: 0.5 }}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13.5px] font-medium leading-snug whitespace-pre-wrap break-words ${
                      m.role === 'user'
                        ? 'bg-accent text-on-accent rounded-br-md'
                        : 'bg-subtle text-ink rounded-bl-md'
                    }`}
                  >
                    {m.content}
                  </div>
                </motion.div>
              ))}

              {/* Thinking bubble */}
              <AnimatePresence>
                {thinking && (
                  <motion.div
                    key="thinking"
                    initial={{ opacity: 0, y: 8, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ ...spring, mass: 0.5 }}
                    className="flex justify-start"
                  >
                    <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-subtle inline-flex items-center gap-[4px]">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="block w-[5px] h-[5px] rounded-full bg-accent"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.9,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Long-conversation handoff */}
              <AnimatePresence>
                {suggestTicket && !thinking && (
                  <motion.div
                    key="ticket-handoff"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={spring}
                    className="rounded-2xl bg-accent-soft p-4"
                  >
                    <div className="text-[13px] font-bold text-ink tracking-tight">
                      Still stuck? Let a human take over.
                    </div>
                    <p className="text-[12px] text-ink-muted font-medium mt-1 leading-relaxed">
                      I'll open a ticket pre-filled with your issue and this conversation
                      attached for review.
                    </p>
                    <motion.button
                      whileTap={tap}
                      onClick={createTicketFromChat}
                      className="mt-3 h-10 px-4 rounded-full bg-accent text-on-accent text-[12.5px] font-bold inline-flex items-center gap-1.5"
                    >
                      <Ticket size={13} strokeWidth={2.4} />
                      Create ticket with transcript
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t border-line/60 px-3 py-3 flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask anything…"
                rows={1}
                maxLength={2000}
                className="flex-1 min-h-[42px] max-h-[120px] rounded-2xl bg-subtle px-3.5 py-2.5 text-[13.5px] text-ink font-medium outline-none focus:ring-2 focus:ring-accent/40 resize-none"
              />
              <motion.button
                whileTap={tap}
                onClick={() => send()}
                disabled={!text.trim() || thinking}
                className="h-10 w-10 rounded-full bg-accent text-on-accent grid place-items-center disabled:opacity-40 shrink-0"
                aria-label="Send"
              >
                <Send size={15} strokeWidth={2.4} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const HeaderIcon: React.FC<{
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ title, onClick, children }) => (
  <motion.button
    whileTap={tap}
    onClick={onClick}
    title={title}
    aria-label={title}
    className="w-9 h-9 rounded-full grid place-items-center text-ink-muted hover:text-ink hover:bg-subtle transition-colors"
  >
    {children}
  </motion.button>
);

export default SupportChatWidget;
