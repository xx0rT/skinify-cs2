import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  Paperclip,
  Search as SearchIcon,
  Send,
  Trash2,
  X as XIcon,
  FileText,
  ImageIcon,
} from 'lucide-react';
import LandingNav from '../components/LandingNav';
import { useAuthStore } from '../store/authStore';
import { useDMStore, DMAttachment, DMMessage } from '../store/dmStore';
import { uploadAttachments, formatBytes } from '../utils/dmAttachments';
import { useToastStore } from '../store/toastStore';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   MessagesPage — full inbox + active chat.

   Layout:
     ┌─────────────────────────────────────┐
     │ LandingNav                          │
     ├──────────┬──────────────────────────┤
     │ Threads  │ Header (peer info)       │
     │  ┌────┐  │ ──────────────────────── │
     │  │... │  │ Messages (scrollable)    │
     │  │... │  │                          │
     │  └────┘  │ Composer + attachments   │
     └──────────┴──────────────────────────┘

   The URL accepts `?peer=<steamId>` to deep-link to a specific thread,
   which is how the "Message" buttons in product pages route here.
   ───────────────────────────────────────────────────────────────────────── */
const MessagesPage: React.FC = () => {
  useDocumentMeta({ title: 'Messages · Skinify', noindex: true });
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const peerFromUrl = search.get('peer') || '';
  const [activePeer, setActivePeer] = useState<string>(peerFromUrl);
  const [query, setQuery] = useState('');

  /* Subscribe to the raw threads map (stable reference unless threads
     actually change). Then derive the sorted list locally with useMemo
     so we don't return a new array from the selector every render —
     that was triggering React error #185 (infinite render loop). */
  const threadsMap = useDMStore((s) => s.threads);
  const markThreadRead = useDMStore((s) => s.markThreadRead);
  const deleteThread = useDMStore((s) => s.deleteThread);

  const threads = useMemo(
    () => Object.values(threadsMap).sort((a, b) => b.lastActivity - a.lastActivity),
    [threadsMap],
  );

  /* When a peer is supplied via URL, focus it. */
  useEffect(() => {
    if (peerFromUrl) setActivePeer(peerFromUrl);
  }, [peerFromUrl]);

  /* Auto-select the first thread on initial load if none selected. */
  useEffect(() => {
    if (!activePeer && threads.length > 0) {
      setActivePeer(threads[0].peerSteamId);
    }
  }, [activePeer, threads]);

  /* Mark whichever thread is active as read whenever it changes. */
  useEffect(() => {
    if (activePeer) markThreadRead(activePeer);
  }, [activePeer, markThreadRead]);

  const filteredThreads = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) => t.peerName.toLowerCase().includes(q));
  }, [threads, query]);

  if (!user) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <LandingNav />
        <main className="max-w-md mx-auto px-4 pt-16 text-center">
          <h1 className="text-[20px] font-bold tracking-tight">Sign in to see messages</h1>
          <button
            onClick={() => navigate('/auth/signin')}
            className="mt-5 h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13px]"
          >
            Sign in
          </button>
        </main>
      </div>
    );
  }

  const activeThread = threads.find((t) => t.peerSteamId === activePeer);

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <LandingNav />
      {/* Top action row — page-level "back" so users on /messages can
          return to wherever they came from without going through the
          profile sidebar. Hidden once a thread is open on mobile (the
          chat panel has its own back button to close the thread, which
          is the more contextual action there). */}
      <div
        className={`max-w-[1280px] w-full mx-auto px-3 sm:px-4 lg:px-6 pt-3 ${
          activePeer ? 'hidden lg:block' : 'block'
        }`}
      >
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink text-[13px] font-semibold transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={2.4} />
          Back
        </button>
      </div>
      <main
        className="max-w-[1280px] w-full mx-auto px-3 sm:px-4 lg:px-6 py-3 flex-1 grid gap-3 lg:grid-cols-[320px_1fr]"
        style={{ minHeight: 'calc(100dvh - 96px)' }}
      >
        {/* ─── Threads sidebar ─── */}
        <aside
          className={`card flex flex-col overflow-hidden ${
            activePeer ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-3 border-b border-line flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 h-10 rounded-2xl bg-subtle focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
              <SearchIcon size={14} className="text-ink-muted shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations"
                className="flex-1 bg-transparent outline-none text-[13px] font-medium text-ink placeholder:text-ink-dim min-w-0"
              />
              {query && (
                <button onClick={() => setQuery('')} aria-label="Clear">
                  <XIcon size={13} className="text-ink-muted" />
                </button>
              )}
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {filteredThreads.length === 0 ? (
              <li className="px-4 py-10 text-center text-[12.5px] text-ink-muted font-medium">
                No conversations yet. Open a listing and tap "Message" to start one.
              </li>
            ) : (
              filteredThreads.map((t) => {
                const lastMsg = t.messages[t.messages.length - 1];
                const unread = t.messages.filter((m) => !m.read).length;
                const isActive = t.peerSteamId === activePeer;
                return (
                  <li key={t.peerSteamId}>
                    <button
                      onClick={() => setActivePeer(t.peerSteamId)}
                      className={`w-full text-left px-3 py-3 flex items-center gap-3 transition-colors border-l-2 ${
                        isActive
                          ? 'bg-accent-soft border-l-accent'
                          : 'border-l-transparent hover:bg-subtle/60'
                      }`}
                    >
                      <div className="w-11 h-11 rounded-2xl bg-accent text-on-accent grid place-items-center font-bold shrink-0 overflow-hidden">
                        {t.peerAvatar ? (
                          <img src={t.peerAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[14px]">{t.peerName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-[13px] font-bold text-ink truncate tracking-tight">
                            {t.peerName}
                          </div>
                          <div className="text-[10.5px] text-ink-dim tabular-nums shrink-0">
                            {new Date(t.lastActivity).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <div className="text-[11.5px] text-ink-muted truncate font-medium">
                            {lastMsg?.text || lastMsg?.attachments?.[0]?.name || 'No messages yet'}
                          </div>
                          {unread > 0 && (
                            <span className="shrink-0 bg-accent text-on-accent text-[10px] font-bold rounded-full px-1.5 tabular-nums">
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        {/* ─── Active conversation pane ─── */}
        <section
          className={`card flex flex-col overflow-hidden min-h-0 ${
            activePeer ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {activeThread ? (
            <ChatPanel
              thread={activeThread}
              onBack={() => setActivePeer('')}
              onDeleteThread={() => {
                deleteThread(activePeer);
                setActivePeer('');
                addToast({ type: 'info', title: 'Conversation deleted' });
              }}
            />
          ) : (
            <div className="flex-1 grid place-items-center text-center px-6 py-10">
              <div>
                <h2 className="text-[15px] font-bold text-ink">Select a conversation</h2>
                <p className="text-[12.5px] text-ink-muted font-medium mt-1">
                  Pick a thread from the list to open it.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   ChatPanel — header + scrollable messages + composer with attachments.
   ───────────────────────────────────────────────────────────────────────── */
const ChatPanel: React.FC<{
  thread: ReturnType<typeof useDMStore.getState>['threads'][string];
  onBack: () => void;
  onDeleteThread: () => void;
}> = ({ thread, onBack, onDeleteThread }) => {
  const { addToast } = useToastStore();
  const sendMessage = useDMStore((s) => s.sendMessage);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [text, setText] = useState('');
  const [pending, setPending] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [thread.messages.length, thread.peerSteamId]);

  useEffect(() => {
    /* Re-focus the composer whenever you switch threads. */
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [thread.peerSteamId]);

  const onPickFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = [...pending, ...Array.from(files)].slice(0, 6);
    setPending(next);
  };

  const removePending = (idx: number) => {
    setPending((prev) => prev.filter((_, i) => i !== idx));
  };

  const send = async () => {
    if (!text.trim() && pending.length === 0) return;
    if (sending) return;
    setSending(true);
    try {
      let attachments: DMAttachment[] = [];
      if (pending.length > 0) {
        try {
          attachments = await uploadAttachments(pending, thread.peerSteamId);
        } catch (e: any) {
          addToast({ type: 'error', title: 'Upload failed', message: e?.message });
        }
      }
      sendMessage(thread.peerSteamId, text.trim() || ' ', undefined, attachments);
      setText('');
      setPending([]);
      setTimeout(() => inputRef.current?.focus(), 0);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const initial = thread.peerName.charAt(0).toUpperCase();

  return (
    <>
      {/* ─── Header ─── */}
      <div className="shrink-0 px-3 sm:px-4 py-3 border-b border-line flex items-center gap-3">
        <button
          onClick={onBack}
          className="lg:hidden w-9 h-9 rounded-full bg-subtle hover:bg-bg grid place-items-center text-ink-muted hover:text-ink transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={15} strokeWidth={2.4} />
        </button>
        <div className="w-10 h-10 rounded-2xl bg-accent text-on-accent grid place-items-center font-bold shrink-0 overflow-hidden">
          {thread.peerAvatar ? (
            <img src={thread.peerAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[14px]">{initial}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-bold text-ink tracking-tight truncate leading-none">
            {thread.peerName}
          </div>
          <div className="text-[11px] text-ink-muted font-medium mt-1 leading-none">
            Direct message
          </div>
        </div>
        <button
          onClick={onDeleteThread}
          className="w-9 h-9 rounded-full bg-subtle hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 text-ink-muted grid place-items-center transition-colors"
          aria-label="Delete conversation"
          title="Delete conversation"
        >
          <Trash2 size={15} strokeWidth={2.2} />
        </button>
      </div>

      {/* ─── Messages ─── */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 space-y-2.5"
      >
        {thread.messages.length === 0 ? (
          <div className="h-full grid place-items-center text-center px-6">
            <div>
              <p className="text-[13.5px] font-bold text-ink tracking-tight">
                Start the conversation
              </p>
              <p className="text-[12px] text-ink-muted font-medium mt-1">
                Ask about float, stickers, or price.
              </p>
            </div>
          </div>
        ) : (
          thread.messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
      </div>

      {/* ─── Composer ─── */}
      <div className="shrink-0 border-t border-line px-3 sm:px-4 py-3 space-y-2">
        {/* Pending attachments preview */}
        <AnimatePresence>
          {pending.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 overflow-hidden"
            >
              {pending.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="card-flat px-2 py-1.5 flex items-center gap-2 text-[11.5px] font-semibold"
                >
                  <AttachmentIcon mimeType={f.type} />
                  <span className="truncate max-w-[160px]">{f.name}</span>
                  <span className="text-ink-dim tabular-nums">
                    {formatBytes(f.size)}
                  </span>
                  <button
                    onClick={() => removePending(i)}
                    className="text-ink-muted hover:text-ink"
                    aria-label="Remove"
                  >
                    <XIcon size={11} />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => onPickFiles(e.target.files)}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-10 w-10 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors shrink-0"
            aria-label="Attach files"
            title="Attach files"
          >
            <Paperclip size={15} strokeWidth={2.2} />
          </button>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message…"
            rows={1}
            maxLength={2000}
            className="flex-1 min-h-[40px] max-h-[180px] rounded-2xl bg-subtle px-3.5 py-2.5 text-[13.5px] text-ink font-medium outline-none focus:ring-2 focus:ring-accent/40 resize-none"
          />
          <motion.button
            whileTap={tap}
            whileHover={text.trim() || pending.length > 0 ? { scale: 1.04 } : undefined}
            onClick={send}
            disabled={(!text.trim() && pending.length === 0) || sending}
            aria-label="Send"
            className="h-10 w-10 rounded-full bg-accent text-on-accent grid place-items-center disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shrink-0"
          >
            <Send size={15} strokeWidth={2.4} />
          </motion.button>
        </div>
        <div className="text-[10.5px] text-ink-dim font-medium flex items-center justify-between">
          <span>Enter to send · Shift+Enter for newline · Paperclip to attach</span>
          <span className="tabular-nums">{text.length}/2000</span>
        </div>
      </div>
    </>
  );
};

const Bubble: React.FC<{ message: DMMessage }> = ({ message }) => {
  const mine = message.fromSteamId === 'me';
  const time = new Date(message.ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, mass: 0.5 }}
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Listing context card (first message only) */}
        {message.itemImage && (
          <div className="card-flat p-2 flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-subtle grid place-items-center overflow-hidden shrink-0">
              <img src={message.itemImage} alt="" className="w-[88%] h-[88%] object-contain" />
            </div>
            <div className="text-[11.5px] font-semibold text-ink truncate max-w-[200px]">
              {message.itemName || 'Listed item'}
            </div>
          </div>
        )}

        {/* Attachments */}
        {message.attachments?.map((a) => (
          <AttachmentBubble key={a.id} attachment={a} />
        ))}

        {/* Text */}
        {message.text && message.text.trim().length > 0 && (
          <div
            className={`px-3.5 py-2 rounded-2xl text-[13.5px] font-medium leading-snug whitespace-pre-wrap break-words ${
              mine
                ? 'bg-accent text-on-accent rounded-br-md'
                : 'bg-subtle text-ink rounded-bl-md'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="text-[10px] text-ink-dim font-medium tabular-nums px-1">{time}</div>
      </div>
    </motion.div>
  );
};

const AttachmentBubble: React.FC<{ attachment: DMAttachment }> = ({ attachment }) => {
  const isImage = attachment.mimeType.startsWith('image/');
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card-flat overflow-hidden block max-w-[280px] hover:bg-subtle/60 transition-colors"
    >
      {isImage ? (
        <img
          src={attachment.url}
          alt={attachment.name}
          className="w-full max-h-60 object-cover"
        />
      ) : (
        <div className="p-3 flex items-center gap-2.5">
          <AttachmentIcon mimeType={attachment.mimeType} />
          <div className="min-w-0">
            <div className="text-[12.5px] font-bold text-ink truncate">
              {attachment.name}
            </div>
            <div className="text-[10.5px] text-ink-muted tabular-nums">
              {formatBytes(attachment.size)}
            </div>
          </div>
        </div>
      )}
    </a>
  );
};

const AttachmentIcon: React.FC<{ mimeType: string }> = ({ mimeType }) => {
  if (mimeType.startsWith('image/'))
    return <ImageIcon size={14} className="text-ink-muted shrink-0" />;
  return <FileText size={14} className="text-ink-muted shrink-0" />;
};

export default MessagesPage;
