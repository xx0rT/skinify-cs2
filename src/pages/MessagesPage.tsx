import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  Paperclip,
  Plus,
  Repeat,
  Banknote,
  CheckCircle2,
  ShoppingBag,
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
import { useBalanceStore } from '../store/balanceStore';
import { useCurrencyStore } from '../store/currencyStore';
import useDocumentMeta from '../hooks/useDocumentMeta';
import { spring, tap } from '../lib/motion';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import TradeOfferModal from '../components/trade/TradeOfferModal';

/* Money-offer messages are plain DMs whose text carries a machine-
   readable JSON payload behind a prefix — no schema change needed.
   Bubble detects the prefix and renders a price-offer card (with the
   targeted listing's thumbnail) instead of a text bubble. A JSON body
   (rather than colon-joined fields) avoids the note text breaking the
   format if it happens to contain a colon. */
const MONEY_OFFER_PREFIX = '__money_offer__:';
interface MoneyOfferPayload {
  amountCZK: number;
  note: string;
  listingId: number | null;
  listingName: string | null;
  listingImage: string | null;
  /** Set once the recipient pays — flips the card to the green
      "Bought" state for both sides via mark_money_offer_bought. */
  bought?: boolean;
}
const buildMoneyOfferText = (payload: MoneyOfferPayload) =>
  `${MONEY_OFFER_PREFIX}${JSON.stringify(payload)}`;
const parseMoneyOfferText = (text: string): MoneyOfferPayload | null => {
  if (!text.startsWith(MONEY_OFFER_PREFIX)) return null;
  try {
    const parsed = JSON.parse(text.slice(MONEY_OFFER_PREFIX.length));
    if (!Number.isFinite(parsed?.amountCZK)) return null;
    return {
      amountCZK: parsed.amountCZK,
      note: typeof parsed.note === 'string' ? parsed.note : '',
      listingId: Number.isFinite(parsed?.listingId) ? parsed.listingId : null,
      listingName: parsed?.listingName || null,
      listingImage: parsed?.listingImage || null,
      bought: !!parsed?.bought,
    };
  } catch {
    return null;
  }
};

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
  const hydrateInbox = useDMStore((s) => s.hydrateInbox);

  /* Pull the full inbox from the server as soon as the page opens so
     every thread (and its latest preview) is already there — then keep
     it fresh with a light 20s poll. Realtime inserts still land
     instantly through the dmStore channel; the poll only covers
     messages sent while the socket was down. */
  useEffect(() => {
    hydrateInbox();
    const interval = window.setInterval(() => hydrateInbox(), 20_000);
    return () => window.clearInterval(interval);
  }, [hydrateInbox]);

  const threads = useMemo(
    () => Object.values(threadsMap).sort((a, b) => b.lastActivity - a.lastActivity),
    [threadsMap],
  );

  /* When a peer is supplied via URL, focus it. */
  useEffect(() => {
    if (peerFromUrl) setActivePeer(peerFromUrl);
  }, [peerFromUrl]);

  /* Auto-select the first thread on initial load if none selected —
     desktop only. The lg+ layout is a split view that looks broken
     with an empty right pane; on mobile the inbox LIST is the landing
     screen (Instagram-style) and auto-opening a chat would both hide
     it and break the chat panel's back button. */
  useEffect(() => {
    if (
      !activePeer &&
      threads.length > 0 &&
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches
    ) {
      setActivePeer(threads[0].peerSteamId);
    }
  }, [activePeer, threads]);

  /* Mark whichever thread is active as read whenever it changes. This is
     the ONLY place that should call markThreadRead — it writes read_at
     server-side, which is what drives the sender's "Seen" indicator.
     A previous version also fired this for every thread just from
     opening /messages (to clear the navbar badge), which meant peers
     saw "Seen" on conversations the recipient never actually opened. */
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
    /* Desktop: hard-lock the page to exactly one viewport (h-dvh +
       overflow-hidden) — the thread list and the chat log scroll
       internally, the page itself never does, so the composer is
       always on screen. */
    <div className="lg:h-dvh lg:overflow-hidden bg-bg text-ink flex flex-col">
      <LandingNav />
      {/* Top action row — page-level "back" so users on /messages can
          return to wherever they came from without going through the
          profile sidebar. Desktop only: on mobile the page is a
          full-height Instagram-style inbox and the bottom tab bar
          handles navigation. */}
      <div className="hidden lg:block max-w-[1280px] w-full mx-auto px-3 sm:px-4 lg:px-6 pt-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink text-[13px] font-semibold transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={2.4} />
          Back
        </button>
      </div>
      {/* On <lg the main pane is FIXED between the top bar and the
          bottom tab bar (.mobile-chat-viewport in index.css) — the page
          itself physically cannot scroll; only the thread list / chat
          log do. That keeps the peer name pinned on screen at all
          times, Instagram-style. */}
      <main
        className="mobile-chat-viewport max-w-[1280px] w-full mx-auto lg:px-6 lg:py-3 flex flex-col lg:grid lg:gap-3 lg:grid-cols-[320px_1fr] lg:auto-rows-[minmax(0,1fr)] lg:flex-1 lg:min-h-0"
      >
        {/* ─── Threads sidebar ─── */}
        <aside
          className={`lg:card flex-col overflow-hidden flex-1 min-h-0 ${
            activePeer ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Mobile inbox title — Instagram-style header, always visible. */}
          <div className="lg:hidden px-4 pt-3 pb-1 shrink-0">
            <h1 className="text-[22px] font-bold tracking-tight leading-none">Messages</h1>
          </div>
          <div className="p-3 lg:border-b border-line flex items-center gap-2 shrink-0">
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
          <ul className="flex-1 overflow-y-auto min-h-0">
            {filteredThreads.length === 0 ? (
              <li className="px-4 py-10 text-center text-[12.5px] text-ink-muted font-medium">
                No conversations yet. Open a listing and tap "Message" to start one.
              </li>
            ) : (
              filteredThreads.map((t, i) => {
                const lastMsg = t.messages[t.messages.length - 1];
                const unread = t.messages.filter((m) => !m.read).length;
                const isActive = t.peerSteamId === activePeer;
                return (
                  <ThreadRow
                    key={t.peerSteamId}
                    thread={t}
                    lastMsg={lastMsg}
                    unread={unread}
                    isActive={isActive}
                    index={i}
                    onClick={() => setActivePeer(t.peerSteamId)}
                  />
                );
              })
            )}
          </ul>
        </aside>

        {/* ─── Active conversation pane ─── */}
        <section
          className={`lg:card flex-col overflow-hidden min-h-0 flex-1 ${
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
   ThreadRow — one entry in the conversation sidebar.

   Adds two things on top of the original button:
     1. Lazy avatar fetch from /functions/v1/user-profile when the
        thread's peerAvatar is null. Steam avatars persist on the
        users table after first login, so this is the source of
        truth. Cached on window so the same peer doesn't refetch
        across thread re-renders.
     2. Presence dot on the avatar (green = online <5 min ago,
        amber = within last hour, gray = away). The "last_seen"
        column on users is updated by user-profile on every fetch,
        so we use that as a rough heuristic.
   ───────────────────────────────────────────────────────────────────────── */
const ThreadRow: React.FC<{
  thread: ReturnType<typeof useDMStore.getState>['threads'][string];
  lastMsg: DMMessage | undefined;
  unread: number;
  isActive: boolean;
  index?: number;
  onClick: () => void;
}> = ({ thread: t, lastMsg, unread, isActive, index = 0, onClick }) => {
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<string | null>(t.peerAvatar || null);
  const [presence, setPresence] = useState<'online' | 'recent' | 'away'>('away');

  useEffect(() => {
    if (!t.peerSteamId) return;
    /* Process-wide cache so siblings sharing a peer don't refetch. */
    const cache = ((window as any).__skinifyPeerProfileCache ||= new Map<
      string,
      { avatar: string | null; lastSeen: string | null }
    >());
    const apply = (data: { avatar: string | null; lastSeen: string | null }) => {
      if (data.avatar) setAvatar(data.avatar);
      setPresence(computePresence(data.lastSeen));
    };
    if (cache.has(t.peerSteamId)) {
      apply(cache.get(t.peerSteamId)!);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) return;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/user-profile?steam_id=${encodeURIComponent(t.peerSteamId)}`,
          {
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
            },
          },
        );
        if (!res.ok) return;
        const json = await res.json();
        const data = {
          avatar: json?.user?.avatar_url || json?.avatar_url || null,
          lastSeen: json?.user?.last_login || json?.last_login || null,
        };
        cache.set(t.peerSteamId, data);
        if (!cancelled) apply(data);
      } catch {
        /* network — leave defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t.peerSteamId]);

  const initial = t.peerName.charAt(0).toUpperCase();
  const presenceColor =
    presence === 'online' ? 'bg-emerald-500'
    : presence === 'recent' ? 'bg-amber-500'
    : 'bg-ink-dim';

  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: Math.min(index * 0.04, 0.3) }}
    >
      {/* Row is a div (not a button) because the avatar inside is its
          own tap target — tapping it opens the peer's profile while
          tapping anywhere else opens the conversation. */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className={`w-full text-left px-4 lg:px-3 py-3 flex items-center gap-3 cursor-pointer transition-colors border-l-2 ${
          isActive ? 'bg-accent-soft border-l-accent' : 'border-l-transparent hover:bg-subtle/60 active:bg-subtle/60'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/user/${t.peerSteamId}`);
          }}
          className="relative w-12 h-12 lg:w-11 lg:h-11 rounded-2xl bg-accent text-on-accent grid place-items-center font-bold shrink-0"
          aria-label={`Open ${t.peerName}'s profile`}
          title="View profile"
        >
          <span className="w-full h-full rounded-2xl overflow-hidden grid place-items-center">
            {avatar ? (
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[15px]">{initial}</span>
            )}
          </span>
          {/* Presence dot — only rendered while the peer is actually
              online/recently active. No ring: the old ring-bg halo read
              as a strange hollow blue border in the light theme. */}
          {presence !== 'away' && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ${presenceColor}`}
              title={presence === 'online' ? 'Online now' : 'Recently online'}
            />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14px] lg:text-[13px] font-bold text-ink truncate tracking-tight">
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
            {/* Preview line — ALWAYS the last message (Instagram-style).
                Presence lives on the avatar dot, not here. */}
            <div
              className={`text-[12px] lg:text-[11.5px] truncate font-medium ${
                unread > 0 ? 'text-ink font-semibold' : 'text-ink-muted'
              }`}
            >
              {(lastMsg?.text && parseMoneyOfferText(lastMsg.text) ? '💰 Money offer' : lastMsg?.text?.trim()) ||
                lastMsg?.attachments?.[0]?.name ||
                'No messages yet'}
            </div>
            {unread > 0 && (
              <span className="shrink-0 bg-accent text-on-accent text-[10px] font-bold rounded-full px-1.5 tabular-nums">
                {unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.li>
  );
};

function computePresence(lastSeen: string | null): 'online' | 'recent' | 'away' {
  if (!lastSeen) return 'away';
  const ts = new Date(lastSeen).getTime();
  if (!Number.isFinite(ts)) return 'away';
  const delta = Date.now() - ts;
  if (delta < 5 * 60 * 1000) return 'online';
  if (delta < 60 * 60 * 1000) return 'recent';
  return 'away';
}

function isSameDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** Index of the last message in the array sent by us — used to show the
 *  sent/seen indicator only on our most recent bubble, Instagram-style.
 *  `mySteamId` may be null before hydration; fall back to the legacy
 *  'me' sentinel in that case (same rule the Bubble component uses). */
function lastMineIndex(messages: DMMessage[], mySteamId: string | null): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.fromSteamId === 'me' || (!!mySteamId && m.fromSteamId === mySteamId)) return i;
  }
  return -1;
}

function formatDateSeparator(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

const DateSeparator: React.FC<{ ts: number }> = ({ ts }) => (
  <div className="flex items-center justify-center py-2" aria-hidden={false}>
    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-dim bg-subtle px-3 py-1 rounded-full">
      {formatDateSeparator(ts)}
    </span>
  </div>
);

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return 'recently';
  const delta = Date.now() - ts;
  const min = Math.floor(delta / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ─────────────────────────────────────────────────────────────────────────
   ChatPanel — header + scrollable messages + composer with attachments.
   ───────────────────────────────────────────────────────────────────────── */
const ChatPanel: React.FC<{
  thread: ReturnType<typeof useDMStore.getState>['threads'][string];
  onBack: () => void;
  onDeleteThread: () => void;
}> = ({ thread, onBack, onDeleteThread }) => {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const sendMessage = useDMStore((s) => s.sendMessage);
  const setTyping = useDMStore((s) => s.setTyping);
  const hydrateThread = useDMStore((s) => s.hydrateThread);
  const mySteamId = useDMStore((s) => s.mySteamId);
  /* Peer's last-seen timestamp — fetched alongside their avatar in
     ThreadRow's profile lookup; ChatPanel does its own small fetch so
     the header's "Last seen" line works even when opened via deep
     link (no ThreadRow ever mounted for this peer). */
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  /* Subscribe to the live peerTyping map; we re-render when it
     changes so the "typing…" hint flips on/off automatically. */
  const peerTypingTs = useDMStore(
    (s) => s.peerTyping[thread.peerSteamId] || 0,
  );
  /* Whether the peer's steam_id appears in the shared presence
     channel's roster. Updates live via the same channel used for
     DM inserts. */
  const peerOnline = useDMStore((s) => s.onlineSteamIds.has(thread.peerSteamId));

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [text, setText] = useState('');
  const [pending, setPending] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  /* '+' composer bar — expands in place of the plain paperclip button
     to offer Attach / Trade offer / Money offer. */
  const [actionsOpen, setActionsOpen] = useState(false);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [moneyOfferOpen, setMoneyOfferOpen] = useState(false);
  const [moneyAmount, setMoneyAmount] = useState('');
  const [moneyNote, setMoneyNote] = useState('');
  /* Money offers target one of the PEER's active listings (not a bare
     amount) — the offer card in the bubble then shows what skin the
     money is for. Fetched lazily the first time the money-offer form
     opens for this thread. */
  const [peerListings, setPeerListings] = useState<
    { id: number; name: string; image: string; price: number }[] | null
  >(null);
  const [peerListingsLoading, setPeerListingsLoading] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);
  const [listingSearch, setListingSearch] = useState('');
  const { formatPrice } = useCurrencyStore();

  const openMoneyOffer = async () => {
    setMoneyOfferOpen(true);
    setActionsOpen(false);
    if (peerListings !== null) return;
    setPeerListingsLoading(true);
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(
        `${supabaseUrl}/functions/v1/marketplace-listings?steamId=${thread.peerSteamId}&userOnly=true`,
        { headers: { Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' } },
      );
      const data = await res.json().catch(() => null);
      const items = Array.isArray(data?.items) ? data.items : [];
      setPeerListings(
        items.map((it: any) => ({
          id: it.id,
          name: it.name || it.item_name,
          image: it.image || it.image_url,
          price: Number(it.price),
        })),
      );
    } catch {
      setPeerListings([]);
    } finally {
      setPeerListingsLoading(false);
    }
  };

  const filteredPeerListings = useMemo(() => {
    const list = peerListings || [];
    const q = listingSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((l) => l.name.toLowerCase().includes(q));
  }, [peerListings, listingSearch]);

  /* Tick state every second so the "is the peer still typing" check
     re-evaluates without us having to thread the ts into a useEffect. */
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);
  const peerIsTyping = Date.now() - peerTypingTs < 3000;

  /* Peer's last-seen timestamp, for the "Last seen 12m ago" header line
     shown while they're offline. Cheap single-row lookup, refreshed
     whenever the thread changes; process-wide cache shares the fetch
     with ThreadRow's presence dot. */
  useEffect(() => {
    if (!thread.peerSteamId) return;
    const cache = ((window as any).__skinifyPeerProfileCache ||= new Map<
      string,
      { avatar: string | null; lastSeen: string | null }
    >());
    if (cache.has(thread.peerSteamId)) {
      setPeerLastSeen(cache.get(thread.peerSteamId)!.lastSeen);
    }
    let cancelled = false;
    (async () => {
      try {
        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
        const supabaseKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) return;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/user-profile?steam_id=${encodeURIComponent(thread.peerSteamId)}`,
          { headers: { Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' } },
        );
        if (!res.ok) return;
        const json = await res.json();
        const lastSeen = json?.user?.last_login || json?.last_login || null;
        cache.set(thread.peerSteamId, {
          avatar: cache.get(thread.peerSteamId)?.avatar || null,
          lastSeen,
        });
        if (!cancelled) setPeerLastSeen(lastSeen);
      } catch {
        /* network — keep whatever we had */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [thread.peerSteamId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [thread.messages.length, thread.peerSteamId, peerIsTyping]);

  useEffect(() => {
    /* Pull history from the server every time we open a thread —
       the local cache may be stale (e.g. the peer wrote to us from
       another device). Then keep the open conversation live with a
       short poll so replies appear without a manual refresh even if
       the realtime channel drops. */
    hydrateThread(thread.peerSteamId);
    const interval = window.setInterval(
      () => hydrateThread(thread.peerSteamId),
      8_000,
    );
    /* Re-focus the composer whenever you switch threads. */
    setTimeout(() => inputRef.current?.focus(), 50);
    /* Money-offer state is per-peer (their listings, your pick) — reset
       it so switching threads doesn't leave the previous peer's
       listings selectable in the new thread's form. */
    setMoneyOfferOpen(false);
    setPeerListings(null);
    setSelectedListingId(null);
    setMoneyAmount('');
    setMoneyNote('');
    return () => window.clearInterval(interval);
  }, [thread.peerSteamId, hydrateThread]);

  const onPickFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const picked = Array.from(files);
    const images = picked.filter((f) => f.type.startsWith('image/'));
    if (images.length < picked.length) {
      addToast({
        type: 'warning',
        title: 'Images only',
        message: 'Only image files can be sent in messages.',
      });
    }
    const next = [...pending, ...images].slice(0, 6);
    setPending(next);
  };

  const removePending = (idx: number) => {
    setPending((prev) => prev.filter((_, i) => i !== idx));
  };

  const send = async () => {
    if (!text.trim() && pending.length === 0) return;
    if (sending) return;

    /* Clear the composer IMMEDIATELY — sendMessage optimistic-inserts
       the bubble synchronously, so the perceived "send" is done the
       instant this function is called. Previously text/pending only
       cleared after `await sendMessage(...)` resolved, which held the
       textarea populated and the input effectively locked for the
       whole network round-trip — the bubble appeared instantly but the
       composer looked stuck, reading as lag. Attachments still need
       their upload to finish before we know the real URLs, so those
       clear right after kicking off the upload instead of waiting on
       the full send. */
    const textToSend = text.trim() || ' ';
    const filesToUpload = pending;
    setText('');
    setPending([]);
    setSending(true);
    try {
      let attachments: DMAttachment[] = [];
      if (filesToUpload.length > 0) {
        try {
          attachments = await uploadAttachments(filesToUpload, thread.peerSteamId);
        } catch (e: any) {
          /* Abort the send — shipping a message whose image never
             uploaded would show the peer a permanently broken file.
             Restore what the user typed so nothing is silently lost. */
          addToast({ type: 'error', title: 'Upload failed', message: e?.message });
          setText(textToSend === ' ' ? '' : textToSend);
          setPending(filesToUpload);
          setSending(false);
          return;
        }
      }
      const result = await sendMessage(thread.peerSteamId, textToSend, undefined, attachments);
      if (result.status === 'failed') {
        addToast({
          type: 'error',
          title: 'Message not delivered',
          message:
            result.failureReason ||
            'Tap retry to try again, or check your connection.',
          duration: 6000,
        });
      }
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const sendMoneyOffer = async () => {
    const amount = Number(moneyAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast({ type: 'warning', title: 'Enter a valid amount' });
      return;
    }
    if (!selectedListingId) {
      addToast({ type: 'warning', title: 'Pick which listing this offer is for' });
      return;
    }
    const listing = (peerListings || []).find((l) => l.id === selectedListingId);

    /* Clear + close immediately, same instant-feel fix as send(). */
    const payload: MoneyOfferPayload = {
      amountCZK: amount,
      note: moneyNote.trim(),
      listingId: selectedListingId,
      listingName: listing?.name || null,
      listingImage: listing?.image || null,
    };
    setMoneyAmount('');
    setMoneyNote('');
    setSelectedListingId(null);
    setMoneyOfferOpen(false);
    setActionsOpen(false);

    const result = await sendMessage(thread.peerSteamId, buildMoneyOfferText(payload));
    if (result.status === 'failed') {
      addToast({
        type: 'error',
        title: 'Offer not sent',
        message: result.failureReason || 'Try again.',
      });
    } else {
      addToast({ type: 'success', title: 'Money offer sent', message: formatPrice(amount) });
    }
  };

  /* Notify the peer that we're typing. Throttled inside the store to
     at most one broadcast every 1.2s. */
  const onTextChange = (value: string) => {
    setText(value);
    if (value.trim().length > 0) {
      setTyping(thread.peerSteamId);
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
        {/* Avatar + name are ONE tap target that opens the peer's
            profile page — same affordance as Instagram DMs. The
            wrapper is non-clipping so the presence dot bleeds past
            the avatar's rounded corner; the inner div clips. */}
        <button
          type="button"
          onClick={() => navigate(`/user/${thread.peerSteamId}`)}
          className="relative shrink-0"
          aria-label={`Open ${thread.peerName}'s profile`}
          title="View profile"
        >
          <div className="w-10 h-10 rounded-2xl bg-accent text-on-accent grid place-items-center font-bold overflow-hidden">
            {thread.peerAvatar ? (
              <img src={thread.peerAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[14px]">{initial}</span>
            )}
          </div>
          {peerOnline && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500"
              aria-label="Online"
            />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate(`/user/${thread.peerSteamId}`)}
            className="block max-w-full text-left text-[14px] font-bold text-ink tracking-tight truncate leading-none hover:underline underline-offset-2"
            title="View profile"
          >
            {thread.peerName}
          </button>
          {/* Status line: `typing…` when the peer is broadcasting,
              `Online` when they're in the presence roster, else
              `Offline`. The 3-second TTL on typing lives inside
              peerIsTyping above. */}
          <div
            className={`text-[11px] font-medium mt-1 leading-none flex items-center gap-1.5 ${
              peerIsTyping
                ? 'text-accent'
                : peerOnline
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-ink-muted'
            }`}
          >
            {peerIsTyping ? (
              <>
                <TypingDots />
                <span>typing…</span>
              </>
            ) : peerOnline ? (
              <span>Online</span>
            ) : peerLastSeen ? (
              <span>Last seen {formatRelative(peerLastSeen)}</span>
            ) : (
              <span>Offline</span>
            )}
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
          thread.messages.map((m, i) => {
            const prev = thread.messages[i - 1];
            const showDateSeparator = !prev || !isSameDay(prev.ts, m.ts);
            return (
              <React.Fragment key={m.id}>
                {showDateSeparator && <DateSeparator ts={m.ts} />}
                <Bubble
                  message={m}
                  peerSteamId={thread.peerSteamId}
                  peerName={thread.peerName}
                  isLastOfMine={lastMineIndex(thread.messages, mySteamId) === i}
                />
              </React.Fragment>
            );
          })
        )}

        {/* Typing bubble — appears at the end of the log while the peer
            is broadcasting typing events, like iMessage/Instagram. */}
        <AnimatePresence>
          {peerIsTyping && (
            <motion.div
              key="typing-bubble"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.94 }}
              transition={{ ...spring, mass: 0.5 }}
              className="flex justify-start"
            >
              <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-subtle inline-flex items-center">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

        {/* Money-offer inline form — replaces the text row while open. */}
        <AnimatePresence mode="wait">
          {moneyOfferOpen ? (
            <motion.div
              key="money-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl bg-subtle p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
                    Send a money offer
                  </span>
                  <button
                    onClick={() => setMoneyOfferOpen(false)}
                    className="text-ink-muted hover:text-ink"
                    aria-label="Cancel"
                  >
                    <XIcon size={13} />
                  </button>
                </div>

                {/* Listing picker — the offer is always for one of the
                    peer's active listings, not a bare amount. */}
                {peerListingsLoading ? (
                  <div className="text-[12px] text-ink-muted font-medium py-2">
                    Loading {thread.peerName}'s listings…
                  </div>
                ) : (peerListings || []).length === 0 ? (
                  <div className="text-[12px] text-ink-muted font-medium py-2">
                    {thread.peerName} has no active listings right now.
                  </div>
                ) : (
                  <>
                    <input
                      value={listingSearch}
                      onChange={(e) => setListingSearch(e.target.value)}
                      placeholder={`Search ${thread.peerName}'s listings…`}
                      className="w-full h-8 rounded-lg bg-bg px-2.5 text-[12px] font-medium text-ink outline-none focus:ring-2 focus:ring-accent/40"
                    />
                    <div className="flex gap-1.5 overflow-x-auto overflow-y-hidden pt-1.5 pb-1 -mx-0.5 px-0.5">
                      {filteredPeerListings.length === 0 ? (
                        <div className="text-[11.5px] text-ink-muted font-medium py-2 px-0.5">
                          No listings match "{listingSearch}".
                        </div>
                      ) : (
                        filteredPeerListings.map((l) => {
                          const active = selectedListingId === l.id;
                          return (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => setSelectedListingId(l.id)}
                              className={`shrink-0 w-[76px] rounded-xl p-1.5 text-left transition-colors ${
                                active ? 'bg-accent-soft ring-2 ring-accent' : 'bg-bg hover:bg-bg/70'
                              }`}
                            >
                              <div className="w-full h-11 rounded-md bg-subtle grid place-items-center overflow-hidden">
                                <img src={l.image} alt="" className="w-[85%] h-[85%] object-contain" />
                              </div>
                              <div className="text-[10px] font-semibold text-ink truncate mt-1 leading-tight">
                                {l.name}
                              </div>
                              <div className="text-[10px] font-bold text-accent tabular-nums">
                                {formatPrice(l.price)}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={moneyAmount}
                    onChange={(e) => setMoneyAmount(e.target.value)}
                    placeholder="Your offer"
                    autoFocus
                    className="w-28 h-10 rounded-xl bg-bg px-3 text-[13.5px] font-bold text-ink outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <input
                    value={moneyNote}
                    onChange={(e) => setMoneyNote(e.target.value)}
                    placeholder="Note (optional)"
                    maxLength={140}
                    className="flex-1 h-10 rounded-xl bg-bg px-3 text-[13px] font-medium text-ink outline-none focus:ring-2 focus:ring-accent/40"
                  />
                  <motion.button
                    whileTap={tap}
                    onClick={sendMoneyOffer}
                    disabled={!moneyAmount || !selectedListingId || sending}
                    className="h-10 px-4 rounded-xl bg-accent text-on-accent font-bold text-[13px] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    Send
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="text-row"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-end gap-2 overflow-visible"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  onPickFiles(e.target.files);
                  setActionsOpen(false);
                }}
              />

              {/* '+' composer trigger — morphs into a VERTICAL action
                  menu (Attach / Trade offer / Money offer) that grows
                  upward from the button, so the transform reads as one
                  continuous shape change rather than a separate popover. */}
              <div className="relative shrink-0">
                <motion.button
                  layout
                  onClick={() => setActionsOpen((v) => !v)}
                  aria-label={actionsOpen ? 'Close actions' : 'More actions'}
                  className="h-10 w-10 rounded-full bg-subtle hover:bg-bg text-ink-muted hover:text-ink grid place-items-center transition-colors overflow-hidden"
                >
                  <motion.span
                    animate={{ rotate: actionsOpen ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                    className="grid place-items-center"
                  >
                    <Plus size={17} strokeWidth={2.4} />
                  </motion.span>
                </motion.button>

                <AnimatePresence>
                  {actionsOpen && (
                    <>
                      <motion.div
                        key="actions-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setActionsOpen(false)}
                      />
                      <motion.div
                        key="actions-bar"
                        initial={{ opacity: 0, scale: 0.9, y: 8, transformOrigin: 'bottom left' }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 6 }}
                        transition={{ type: 'spring', stiffness: 460, damping: 32 }}
                        className="absolute z-50 bottom-full mb-2 left-0 bg-surface ring-1 ring-line rounded-2xl shadow-lg p-1.5 flex flex-col gap-0.5 whitespace-nowrap"
                      >
                        <button
                          onClick={() => {
                            fileInputRef.current?.click();
                          }}
                          className="h-9 px-3 rounded-xl hover:bg-subtle text-ink text-[12.5px] font-semibold inline-flex items-center gap-2 transition-colors"
                        >
                          <Paperclip size={14} strokeWidth={2.2} />
                          Attach
                        </button>
                        <button
                          onClick={() => {
                            setTradeModalOpen(true);
                            setActionsOpen(false);
                          }}
                          className="h-9 px-3 rounded-xl hover:bg-subtle text-ink text-[12.5px] font-semibold inline-flex items-center gap-2 transition-colors"
                        >
                          <Repeat size={14} strokeWidth={2.2} />
                          Trade offer
                        </button>
                        <button
                          onClick={openMoneyOffer}
                          className="h-9 px-3 rounded-xl hover:bg-subtle text-ink text-[12.5px] font-semibold inline-flex items-center gap-2 transition-colors"
                        >
                          <Banknote size={14} strokeWidth={2.2} />
                          Money offer
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
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
            </motion.div>
          )}
        </AnimatePresence>

        {!moneyOfferOpen && (
          <div className="text-[10.5px] text-ink-dim font-medium flex items-center justify-between">
            <span>Enter to send · Shift+Enter for newline · Tap + to attach or make an offer</span>
            <span className="tabular-nums">{text.length}/2000</span>
          </div>
        )}
      </div>

      <TradeOfferModal
        isOpen={tradeModalOpen}
        onClose={() => setTradeModalOpen(false)}
        recipientSteamId={thread.peerSteamId}
        recipientName={thread.peerName}
      />
    </>
  );
};

const REACTION_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const Bubble: React.FC<{
  message: DMMessage;
  peerSteamId: string;
  peerName: string;
  isLastOfMine: boolean;
}> = ({ message, peerSteamId, peerName, isLastOfMine }) => {
  /* "Mine" check: the legacy sentinel `'me'` still appears in older
     localStorage rows; new rows carry the real Steam id and we compare
     against the authenticated user. */
  const mySteamId = useDMStore((s) => s.mySteamId);
  const toggleReaction = useDMStore((s) => s.toggleReaction);
  const mine =
    message.fromSteamId === 'me' ||
    (!!mySteamId && message.fromSteamId === mySteamId);
  const time = new Date(message.ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [moneyOfferDetailOpen, setMoneyOfferDetailOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  const startLongPress = () => {
    if (!message.serverId) return; // can't react to an unsent optimistic row
    longPressTimer.current = window.setTimeout(() => setPickerOpen(true), 420);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const react = (emoji: string) => {
    if (!message.serverId) return;
    toggleReaction(peerSteamId, message.serverId, emoji);
    setPickerOpen(false);
  };

  const reactions = message.reactions || {};
  const reactionEntries = Object.entries(reactions).filter(([, ids]) => ids.length > 0);
  const { formatPrice } = useCurrencyStore();
  const moneyOffer = message.text ? parseMoneyOfferText(message.text) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, mass: 0.5 }}
      className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`group relative max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
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

        {/* Money-offer card — rendered instead of the plain text bubble
            when the message text carries the money-offer prefix. Shows
            the targeted listing's thumbnail so it reads as "offer FOR
            this skin", not a bare number. Clickable — opens a detail
            modal with full info and a Buy button (recipient only).
            Once bought, flips to a green "Bought" state for both
            sides. */}
        {moneyOffer && (
          <button
            type="button"
            onClick={() => setMoneyOfferDetailOpen(true)}
            className={`rounded-2xl px-3.5 py-3 min-w-[200px] flex items-center gap-3 text-left transition-transform hover:scale-[1.015] active:scale-[0.99] ${
              moneyOffer.bought
                ? 'bg-emerald-500/15 ring-1 ring-emerald-500/40'
                : mine
                ? 'bg-accent text-on-accent'
                : 'bg-subtle text-ink'
            }`}
          >
            {moneyOffer.listingImage && (
              <div className="w-12 h-12 rounded-lg bg-black/10 grid place-items-center overflow-hidden shrink-0">
                <img src={moneyOffer.listingImage} alt="" className="w-[85%] h-[85%] object-contain" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div
                className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  moneyOffer.bought ? 'text-emerald-700 dark:text-emerald-300' : 'opacity-70'
                }`}
              >
                {moneyOffer.bought ? (
                  <>
                    <CheckCircle2 size={11} strokeWidth={2.6} />
                    Bought
                  </>
                ) : (
                  'Money offer'
                )}
              </div>
              {moneyOffer.listingName && (
                <div
                  className={`text-[11.5px] font-semibold truncate max-w-[160px] ${
                    moneyOffer.bought ? 'text-ink' : 'opacity-90'
                  }`}
                >
                  {moneyOffer.listingName}
                </div>
              )}
              <div
                className={`text-[18px] font-bold tracking-tight mt-0.5 ${
                  moneyOffer.bought ? 'text-emerald-700 dark:text-emerald-300' : ''
                }`}
              >
                {formatPrice(moneyOffer.amountCZK)}
              </div>
              {moneyOffer.note && (
                <div
                  className={`text-[12px] font-medium mt-1 ${
                    moneyOffer.bought ? 'text-ink-muted' : 'opacity-90'
                  }`}
                >
                  {moneyOffer.note}
                </div>
              )}
            </div>
          </button>
        )}

        {moneyOffer && (
          <MoneyOfferDetailModal
            isOpen={moneyOfferDetailOpen}
            onClose={() => setMoneyOfferDetailOpen(false)}
            offer={moneyOffer}
            mine={mine}
            messageServerId={message.serverId}
            peerSteamId={peerSteamId}
            peerName={peerName}
          />
        )}

        {/* Text — long-press (mobile) or hover (desktop, via the ⋯
            reveal button) opens the emoji picker. */}
        {!moneyOffer && message.text && message.text.trim().length > 0 && (
          <div className="relative">
            <div
              onPointerDown={startLongPress}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              className={`px-3.5 py-2 rounded-2xl text-[13.5px] font-medium leading-snug whitespace-pre-wrap break-words select-none ${
                mine
                  ? 'bg-accent text-on-accent rounded-br-md'
                  : 'bg-subtle text-ink rounded-bl-md'
              }`}
            >
              {message.text}
            </div>

            {/* Emoji picker popover */}
            <AnimatePresence>
              {pickerOpen && (
                <>
                  <motion.div
                    key="picker-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40"
                    onClick={() => setPickerOpen(false)}
                  />
                  <motion.div
                    key="picker"
                    initial={{ opacity: 0, y: 6, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 480, damping: 32 }}
                    className={`absolute z-50 bottom-full mb-2 ${mine ? 'right-0' : 'left-0'} bg-surface ring-1 ring-line rounded-full shadow-lg px-1.5 py-1 flex items-center gap-0.5`}
                  >
                    {REACTION_EMOJI.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => react(emoji)}
                        className={`w-8 h-8 rounded-full grid place-items-center text-[16px] hover:bg-subtle hover:scale-125 transition-all ${
                          mySteamId && reactions[emoji]?.includes(mySteamId) ? 'bg-accent-soft' : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Reaction pills — rendered under the bubble, tap to toggle
            your own reaction on/off. */}
        {reactionEntries.length > 0 && (
          <div className={`flex flex-wrap gap-1 px-1 ${mine ? 'justify-end' : 'justify-start'}`}>
            {reactionEntries.map(([emoji, ids]) => {
              const mineReacted = !!mySteamId && ids.includes(mySteamId);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => react(emoji)}
                  className={`h-6 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 transition-colors ${
                    mineReacted
                      ? 'bg-accent-soft text-accent ring-1 ring-accent/40'
                      : 'bg-subtle text-ink-muted hover:bg-bg'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="tabular-nums">{ids.length}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="text-[10px] font-medium tabular-nums px-1 flex items-center gap-1.5">
          <span className="text-ink-dim">{time}</span>
          {/* Status hint: pending = grey dot, failed = red "not sent".
              Only shown on our own bubbles. Avoid surfacing on the
              peer's bubbles where status is meaningless. */}
          {mine && message.status === 'pending' && (
            <span className="text-ink-dim">· sending…</span>
          )}
          {mine && message.status === 'failed' && (
            <span
              className="text-rose-600 dark:text-rose-400"
              title={message.failureReason || undefined}
            >
              · not sent
              {message.failureReason ? (
                <span className="text-ink-dim normal-case"> · {message.failureReason}</span>
              ) : null}
            </span>
          )}
          {/* Sent/Seen — Instagram style, only on our most recent
              delivered bubble (matching the rest of the thread would be
              visual noise). */}
          {mine && message.status === 'sent' && isLastOfMine && (
            <span className="text-ink-dim">· {message.read ? 'Seen' : 'Sent'}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   MoneyOfferDetailModal — full info about the offered listing + a Buy
   button. Only the RECIPIENT of the offer (mine === false, i.e. we
   didn't send it) can buy — they're the one paying. Once bought, marks
   the message bought server-side so both sides see the green state.
   ───────────────────────────────────────────────────────────────────────── */
const MoneyOfferDetailModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  offer: MoneyOfferPayload;
  mine: boolean;
  messageServerId?: number;
  peerSteamId: string;
  peerName: string;
}> = ({ isOpen, onClose, offer, mine, messageServerId, peerSteamId, peerName }) => {
  const { formatPrice } = useCurrencyStore();
  const { addToast } = useToastStore();
  const { user } = useAuthStore();
  const { balance, purchaseWithBalance } = useBalanceStore();
  const markMoneyOfferBought = useDMStore((s) => s.markMoneyOfferBought);
  const [buying, setBuying] = useState(false);

  /* Only the recipient pays, so only they see an actionable Buy button.
     The sender sees their own offer as read-only (with a "Bought" flip
     once the recipient pays). */
  const canBuy = !mine && !offer.bought && !!messageServerId;
  const canAfford = Number(balance || 0) >= offer.amountCZK;

  const handleBuy = async () => {
    if (!messageServerId || buying) return;
    if (!user) {
      addToast({ type: 'warning', title: 'Sign in required' });
      return;
    }
    if (!canAfford) {
      addToast({
        type: 'warning',
        title: 'Insufficient balance',
        message: `Add ${formatPrice(offer.amountCZK - Number(balance || 0))} to your balance to accept this offer.`,
      });
      return;
    }
    setBuying(true);
    try {
      const ok = await purchaseWithBalance(offer.amountCZK, [
        {
          id: offer.listingId,
          name: offer.listingName || 'Item',
          market_name: offer.listingName || 'Item',
          price: offer.amountCZK,
          image: offer.listingImage,
          seller: { steamId: peerSteamId, name: peerName },
        } as any,
      ]);
      if (!ok) {
        const err = useBalanceStore.getState().error;
        addToast({ type: 'error', title: 'Purchase failed', message: err || 'Try again.' });
        return;
      }
      await markMoneyOfferBought(peerSteamId, messageServerId);
      addToast({ type: 'success', title: 'Purchase complete', message: offer.listingName || undefined });
      onClose();
    } finally {
      setBuying(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="offer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="offer-modal"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed inset-0 z-[120] m-auto w-[min(360px,92vw)] h-fit bg-surface ring-1 ring-line rounded-3xl shadow-2xl p-5"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-dim">
                {offer.bought ? 'Purchased offer' : 'Money offer'}
              </span>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-subtle hover:bg-bg grid place-items-center text-ink-muted hover:text-ink transition-colors"
                aria-label="Close"
              >
                <XIcon size={14} strokeWidth={2.4} />
              </button>
            </div>

            {offer.listingImage && (
              <div className="w-full h-36 rounded-2xl bg-subtle grid place-items-center overflow-hidden mb-3">
                <img src={offer.listingImage} alt="" className="w-[70%] h-[70%] object-contain" />
              </div>
            )}

            {offer.listingName && (
              <div className="text-[15px] font-bold text-ink tracking-tight leading-snug">
                {offer.listingName}
              </div>
            )}

            <div className="flex items-center justify-between mt-3">
              <span className="text-[12px] font-semibold text-ink-muted">Offer amount</span>
              <span className="text-[22px] font-bold text-ink tabular-nums">
                {formatPrice(offer.amountCZK)}
              </span>
            </div>

            {offer.note && (
              <div className="mt-3 rounded-xl bg-subtle px-3 py-2.5 text-[12.5px] text-ink font-medium leading-relaxed">
                {offer.note}
              </div>
            )}

            {offer.bought ? (
              <div className="mt-4 rounded-xl bg-emerald-500/15 ring-1 ring-emerald-500/30 px-3 py-2.5 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 size={16} strokeWidth={2.4} />
                <span className="text-[13px] font-bold">Bought</span>
              </div>
            ) : canBuy ? (
              <motion.button
                whileTap={tap}
                onClick={handleBuy}
                disabled={buying}
                className="mt-4 w-full h-11 rounded-full bg-accent text-on-accent font-bold text-[13.5px] inline-flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
              >
                <ShoppingBag size={14} strokeWidth={2.4} />
                {buying ? 'Processing…' : `Buy for ${formatPrice(offer.amountCZK)}`}
              </motion.button>
            ) : (
              <p className="mt-4 text-[11.5px] text-ink-dim font-medium text-center leading-relaxed">
                Waiting for {peerName} to accept this offer.
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const AttachmentBubble: React.FC<{ attachment: DMAttachment }> = ({ attachment }) => {
  const isImage = attachment.mimeType.startsWith('image/');
  const [lightbox, setLightbox] = useState(false);
  useBodyScrollLock(lightbox);

  if (!isImage) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="card-flat overflow-hidden block max-w-[280px] hover:bg-subtle/60 transition-colors"
      >
        <div className="p-3 flex items-center gap-2.5">
          <AttachmentIcon mimeType={attachment.mimeType} />
          <div className="min-w-0">
            <div className="text-[12.5px] font-bold text-ink truncate">{attachment.name}</div>
            <div className="text-[10.5px] text-ink-muted tabular-nums">
              {formatBytes(attachment.size)}
            </div>
          </div>
        </div>
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="card-flat overflow-hidden block max-w-[280px] hover:opacity-90 transition-opacity cursor-zoom-in"
        aria-label={`Open ${attachment.name}`}
      >
        <img src={attachment.url} alt={attachment.name} className="w-full max-h-60 object-cover" />
      </button>

      {/* In-app lightbox — rendered through a PORTAL to <body> so it
          escapes the chat's fixed/overflow stacking context (otherwise
          it renders "below" the app on mobile). Dimmed backdrop,
          spring-scaled image, click anywhere / Esc / X to close. */}
      {createPortal(
        <AnimatePresence>
          {lightbox && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm grid place-items-center p-4 sm:p-10 cursor-zoom-out"
              onClick={() => setLightbox(false)}
              role="dialog"
              aria-modal="true"
            >
              <motion.img
                initial={{ scale: 0.86, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                src={attachment.url}
                alt={attachment.name}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                onClick={() => setLightbox(false)}
                className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition-colors"
                aria-label="Close"
              >
                <XIcon size={18} strokeWidth={2.4} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12px] text-white/80 font-medium truncate max-w-[80vw]">
                {attachment.name}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};

const AttachmentIcon: React.FC<{ mimeType: string }> = ({ mimeType }) => {
  if (mimeType.startsWith('image/'))
    return <ImageIcon size={14} className="text-ink-muted shrink-0" />;
  return <FileText size={14} className="text-ink-muted shrink-0" />;
};

/* TypingDots — three accent dots bouncing in sequence. Used in the
   chat header subtitle when the peer is broadcasting "typing" events.
   Keep it small (4px dots) so it sits naturally on the same baseline
   as the text next to it. */
const TypingDots: React.FC = () => (
  <span
    className="inline-flex items-center gap-[3px]"
    aria-hidden
  >
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="block w-[4px] h-[4px] rounded-full bg-accent"
        animate={{ y: [0, -3, 0] }}
        transition={{
          duration: 0.9,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: i * 0.15,
        }}
      />
    ))}
  </span>
);

export default MessagesPage;
