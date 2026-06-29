import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

/* ─────────────────────────────────────────────────────────────────────────
   dmStore — free-form direct messages between users.

   Architecture:
     - Backend: `direct_messages` Postgres table (see 20260625000000
       migration). Inserts go through Supabase with RLS verifying the
       sender is the authenticated user.
     - Local cache: zustand-persist mirrors recent threads to
       localStorage so opening a thread is instant even before the
       initial server fetch lands.
     - Realtime: one channel per logged-in user (`dm:to:<my_steam_id>`)
       subscribes to INSERTs where `to_steam_id` matches. The channel
       also carries ephemeral `broadcast` events for typing indicators —
       no DB writes, no rate limiting needed.

   Typing indicator state is intentionally NOT persisted — it's purely
   in-memory and clears when the tab closes.
   ───────────────────────────────────────────────────────────────────────── */

export interface DMAttachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface DMMessage {
  id: string;
  /** Sender steamId. 'me' kept for backwards compat with the
      pre-backend cache; new messages always set the real steamId. */
  fromSteamId: string | 'me';
  text: string;
  itemId?: string;
  itemName?: string;
  itemImage?: string;
  attachments?: DMAttachment[];
  ts: number;
  read: boolean;
  /** Server-side row id. Set once the optimistic insert is acked. */
  serverId?: number;
  /** 'pending' = optimistic / not acked yet, 'sent' = persisted,
      'failed' = server rejected. UI shows a tiny status hint for
      pending / failed. */
  status?: 'pending' | 'sent' | 'failed';
  /** Underlying error from Supabase when status === 'failed'. Surfaced
      in the failure toast so the user sees the actual cause (RLS, no
      session, etc.) instead of a generic "not sent" with no recourse. */
  failureReason?: string;
}

export interface DMThread {
  peerSteamId: string;
  peerName: string;
  peerAvatar?: string;
  messages: DMMessage[];
  lastActivity: number;
  /** True once we've done the initial server fetch for this thread. */
  hydrated?: boolean;
}

interface DMState {
  /** Caller's steam id — needed to filter outgoing vs incoming and
      to subscribe to the right realtime channel. Set once at login. */
  mySteamId: string | null;
  threads: Record<string, DMThread>;
  /** Per-thread "the other person is typing right now" flag, with a
      timestamp so the UI can auto-clear after ~3s of silence. */
  peerTyping: Record<string, number>;

  setMySteamId: (steamId: string | null) => void;
  ensureThread: (
    peerSteamId: string,
    peerName: string,
    peerAvatar?: string,
  ) => void;
  hydrateThread: (peerSteamId: string) => Promise<void>;
  sendMessage: (
    peerSteamId: string,
    text: string,
    context?: { itemId?: string; itemName?: string; itemImage?: string },
    attachments?: DMAttachment[],
  ) => Promise<DMMessage>;
  markThreadRead: (peerSteamId: string) => Promise<void>;
  deleteThread: (peerSteamId: string) => Promise<void>;
  totalUnread: () => number;
  threadUnread: (peerSteamId: string) => number;
  sortedThreads: () => DMThread[];
  /** Send a "typing" broadcast to the peer. Throttled internally. */
  setTyping: (peerSteamId: string) => void;
  /** Wire up the realtime subscription. Idempotent. */
  initRealtime: (mySteamId: string) => void;
  /** Tear down the realtime subscription on logout. */
  teardownRealtime: () => void;
}

const newClientId = () =>
  `dm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/* Module-scoped channel reference. We don't put it in zustand state
   because RealtimeChannel isn't serialisable and would blow up the
   persist layer. */
let realtimeChannel: RealtimeChannel | null = null;
let realtimeFor: string | null = null;

/* Typing-broadcast throttle: at most one event every 1200ms per peer. */
const lastTypingSentAt = new Map<string, number>();

export const useDMStore = create<DMState>()(
  persist(
    (set, get) => ({
      mySteamId: null,
      threads: {},
      peerTyping: {},

      setMySteamId: (steamId) => {
        set({ mySteamId: steamId });
        if (steamId) {
          get().initRealtime(steamId);
        } else {
          get().teardownRealtime();
        }
      },

      ensureThread: (peerSteamId, peerName, peerAvatar) => {
        const { threads, mySteamId } = get();
        /* You can't DM yourself — the DB enforces this via a CHECK
           constraint (from_steam_id <> to_steam_id) and would 400.
           Guard early so the thread never even appears in the list. */
        if (mySteamId && peerSteamId === mySteamId) {
          console.warn('[dmStore] ensureThread refused self-thread:', peerSteamId);
          return;
        }
        if (!peerSteamId) return;
        if (threads[peerSteamId]) {
          /* Refresh metadata if the caller has a better name/avatar
             than what we cached (e.g. ItemDetailPage knows the seller
             avatar; the thread list does not). */
          if (
            (peerAvatar && peerAvatar !== threads[peerSteamId].peerAvatar) ||
            (peerName && peerName !== threads[peerSteamId].peerName)
          ) {
            set({
              threads: {
                ...threads,
                [peerSteamId]: {
                  ...threads[peerSteamId],
                  peerName,
                  peerAvatar: peerAvatar || threads[peerSteamId].peerAvatar,
                },
              },
            });
          }
          return;
        }
        set({
          threads: {
            ...threads,
            [peerSteamId]: {
              peerSteamId,
              peerName,
              peerAvatar,
              messages: [],
              lastActivity: Date.now(),
            },
          },
        });
      },

      hydrateThread: async (peerSteamId) => {
        const { mySteamId, threads } = get();
        if (!mySteamId) return;
        /* Pull messages where either side of the conversation matches. */
        const { data, error } = await supabase
          .from('direct_messages')
          .select(
            'id, from_steam_id, to_steam_id, text, item_id, item_name, item_image, attachments, read_at, created_at',
          )
          .or(
            `and(from_steam_id.eq.${mySteamId},to_steam_id.eq.${peerSteamId}),and(from_steam_id.eq.${peerSteamId},to_steam_id.eq.${mySteamId})`,
          )
          .order('created_at', { ascending: true })
          .limit(200);
        if (error) {
          console.warn('[dmStore] hydrateThread failed:', error.message);
          return;
        }
        const messages: DMMessage[] = (data || []).map((row: any) => ({
          id: `srv_${row.id}`,
          serverId: row.id,
          fromSteamId: row.from_steam_id,
          text: row.text,
          itemId: row.item_id || undefined,
          itemName: row.item_name || undefined,
          itemImage: row.item_image || undefined,
          attachments: Array.isArray(row.attachments) ? row.attachments : [],
          ts: new Date(row.created_at).getTime(),
          read: row.from_steam_id === mySteamId ? true : !!row.read_at,
          status: 'sent',
        }));

        /* Resolve the peer's Steam display name + avatar from the
           users table. We do this every hydrate so a peer who changed
           their Steam avatar shows the up-to-date image. Cheap single
           row lookup; falls back to whatever we had cached if the
           lookup fails. */
        let peerName: string | undefined;
        let peerAvatar: string | undefined;
        try {
          const { data: peerRow } = await supabase
            .from('users')
            .select('display_name, avatar_url')
            .eq('steam_id', peerSteamId)
            .maybeSingle();
          if (peerRow) {
            peerName = peerRow.display_name || undefined;
            peerAvatar = peerRow.avatar_url || undefined;
          }
        } catch {
          /* network — keep cached values */
        }

        const existing = threads[peerSteamId];
        set({
          threads: {
            ...threads,
            [peerSteamId]: {
              peerSteamId,
              peerName: peerName || existing?.peerName || 'Trader',
              peerAvatar: peerAvatar || existing?.peerAvatar,
              messages,
              lastActivity: messages.length
                ? messages[messages.length - 1].ts
                : Date.now(),
              hydrated: true,
            },
          },
        });
      },

      sendMessage: async (peerSteamId, text, context, attachments) => {
        const trimmed = text.trim();
        const { mySteamId, threads } = get();

        /* Pre-flight guards. We return a failed-status DMMessage rather
           than throwing so the caller (MessagesPage.send) can show the
           failure-reason toast without a try/catch ladder. */
        if (!mySteamId) {
          const optimistic: DMMessage = makeOptimistic(
            'me',
            peerSteamId,
            trimmed,
            context,
            attachments,
            'failed',
            'You\'re not signed in — log in via Steam first.',
          );
          appendMessage(set, get, peerSteamId, optimistic);
          return optimistic;
        }
        if (peerSteamId === mySteamId) {
          /* Server-side CHECK would reject this with 400; surface the
             reason locally so the user sees something sensible. */
          const optimistic: DMMessage = makeOptimistic(
            mySteamId,
            peerSteamId,
            trimmed,
            context,
            attachments,
            'failed',
            'You can\'t send a message to yourself.',
          );
          appendMessage(set, get, peerSteamId, optimistic);
          return optimistic;
        }
        if (!trimmed && (!attachments || attachments.length === 0)) {
          const optimistic: DMMessage = makeOptimistic(
            mySteamId,
            peerSteamId,
            trimmed,
            context,
            attachments,
            'failed',
            'Message is empty.',
          );
          appendMessage(set, get, peerSteamId, optimistic);
          return optimistic;
        }

        /* Optimistic insert so the UI updates immediately. We mark it
           `pending`; the realtime echo (or the insert response) will
           swap it for the server-confirmed row. */
        const optimistic = makeOptimistic(
          mySteamId,
          peerSteamId,
          trimmed,
          context,
          attachments,
          'pending',
        );
        appendMessage(set, get, peerSteamId, optimistic);

        try {
          const { data, error } = await supabase
            .from('direct_messages')
            .insert({
              from_steam_id: mySteamId,
              to_steam_id: peerSteamId,
              text: trimmed,
              item_id: context?.itemId || null,
              item_name: context?.itemName || null,
              item_image: context?.itemImage || null,
              attachments: attachments || [],
            })
            .select('id, created_at')
            .single();
          if (error || !data) {
            const reason = humanizeDmError(error?.message, error?.code);
            console.warn('[dmStore] sendMessage rejected:', error?.message, error?.code);
            patchMessage(set, get, peerSteamId, optimistic.id, {
              status: 'failed',
              failureReason: reason,
            });
            return { ...optimistic, status: 'failed', failureReason: reason };
          }
          /* Promote the optimistic row to "sent" + stamp the server id
             so the realtime echo doesn't duplicate it. */
          patchMessage(set, get, peerSteamId, optimistic.id, {
            serverId: data.id,
            ts: new Date(data.created_at).getTime(),
            status: 'sent',
          });
          return { ...optimistic, serverId: data.id, status: 'sent' };
        } catch (err: any) {
          const reason = humanizeDmError(err?.message);
          console.warn('[dmStore] sendMessage threw:', err);
          patchMessage(set, get, peerSteamId, optimistic.id, {
            status: 'failed',
            failureReason: reason,
          });
          return { ...optimistic, status: 'failed', failureReason: reason };
        }
      },

      markThreadRead: async (peerSteamId) => {
        const { threads, mySteamId } = get();
        const t = threads[peerSteamId];
        if (!t) return;
        const anyUnread = t.messages.some((m) => !m.read);
        if (!anyUnread) return;
        set({
          threads: {
            ...threads,
            [peerSteamId]: {
              ...t,
              messages: t.messages.map((m) => ({ ...m, read: true })),
            },
          },
        });
        if (!mySteamId) return;
        try {
          await supabase
            .from('direct_messages')
            .update({ read_at: new Date().toISOString() })
            .eq('to_steam_id', mySteamId)
            .eq('from_steam_id', peerSteamId)
            .is('read_at', null);
        } catch {
          /* network — local read flag still applied, server catches
             up on next mark */
        }
      },

      deleteThread: async (peerSteamId) => {
        const { threads, mySteamId } = get();
        if (!threads[peerSteamId]) return;
        const next = { ...threads };
        delete next[peerSteamId];
        set({ threads: next });
        if (!mySteamId) return;
        try {
          await supabase
            .from('direct_messages')
            .delete()
            .or(
              `and(from_steam_id.eq.${mySteamId},to_steam_id.eq.${peerSteamId}),and(from_steam_id.eq.${peerSteamId},to_steam_id.eq.${mySteamId})`,
            );
        } catch {
          /* swallow — the local cache is already cleared */
        }
      },

      totalUnread: () =>
        Object.values(get().threads).reduce(
          (sum, t) => sum + t.messages.filter((m) => !m.read).length,
          0,
        ),

      threadUnread: (peerSteamId) => {
        const t = get().threads[peerSteamId];
        if (!t) return 0;
        return t.messages.filter((m) => !m.read).length;
      },

      sortedThreads: () =>
        Object.values(get().threads).sort(
          (a, b) => b.lastActivity - a.lastActivity,
        ),

      setTyping: (peerSteamId) => {
        const { mySteamId } = get();
        if (!mySteamId || !realtimeChannel) return;
        const now = Date.now();
        const last = lastTypingSentAt.get(peerSteamId) || 0;
        if (now - last < 1200) return;
        lastTypingSentAt.set(peerSteamId, now);
        /* Ephemeral broadcast — no DB write, no rate limit. The peer's
           channel listens on the same `dm:to:<peer>` channel name. */
        try {
          realtimeChannel.send({
            type: 'broadcast',
            event: 'typing',
            payload: { from: mySteamId, to: peerSteamId },
          });
        } catch {
          /* channel not joined yet — drop silently */
        }
      },

      initRealtime: (mySteamId) => {
        if (realtimeChannel && realtimeFor === mySteamId) return;
        if (realtimeChannel) {
          /* Different user just logged in — tear down old channel. */
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
        realtimeFor = mySteamId;
        /* Channel name is keyed on the RECIPIENT side so the peer can
           broadcast typing into our channel by name. */
        const channel = supabase.channel(`dm:to:${mySteamId}`, {
          config: { broadcast: { self: false } },
        });

        channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter: `to_steam_id=eq.${mySteamId}`,
          },
          (payload: any) => {
            const row = payload?.new;
            if (!row) return;
            const peer = row.from_steam_id;
            const existing = get().threads[peer];
            /* Avoid duplicate if we already have a row with the same
               serverId (defensive: the realtime echo can race the
               insert response). */
            if (existing?.messages.some((m) => m.serverId === row.id)) return;
            const incoming: DMMessage = {
              id: `srv_${row.id}`,
              serverId: row.id,
              fromSteamId: row.from_steam_id,
              text: row.text,
              itemId: row.item_id || undefined,
              itemName: row.item_name || undefined,
              itemImage: row.item_image || undefined,
              attachments: Array.isArray(row.attachments) ? row.attachments : [],
              ts: new Date(row.created_at).getTime(),
              read: false,
              status: 'sent',
            };
            const threads = get().threads;
            set({
              threads: {
                ...threads,
                [peer]: existing
                  ? {
                      ...existing,
                      messages: [...existing.messages, incoming],
                      lastActivity: incoming.ts,
                    }
                  : {
                      peerSteamId: peer,
                      peerName: 'Trader',
                      messages: [incoming],
                      lastActivity: incoming.ts,
                    },
              },
            });

            /* If this is a brand new peer (no cached display name /
               avatar), pull them from the users table so the thread
               list and chat header render with the right Steam
               identity instead of "Trader" + initial. */
            if (!existing || !existing.peerAvatar) {
              supabase
                .from('users')
                .select('display_name, avatar_url')
                .eq('steam_id', peer)
                .maybeSingle()
                .then(({ data: row }) => {
                  if (!row) return;
                  const cur = get().threads[peer];
                  if (!cur) return;
                  set({
                    threads: {
                      ...get().threads,
                      [peer]: {
                        ...cur,
                        peerName: row.display_name || cur.peerName,
                        peerAvatar: row.avatar_url || cur.peerAvatar,
                      },
                    },
                  });
                });
            }
          },
        );

        channel.on('broadcast', { event: 'typing' }, (payload: any) => {
          const from = payload?.payload?.from;
          const to = payload?.payload?.to;
          if (!from || to !== mySteamId) return;
          set({ peerTyping: { ...get().peerTyping, [from]: Date.now() } });
        });

        channel.subscribe();
        realtimeChannel = channel;
      },

      teardownRealtime: () => {
        if (!realtimeChannel) return;
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
        realtimeFor = null;
      },
    }),
    {
      name: 'skinify-dm-storage',
      /* Don't persist the realtime / typing state — it's ephemeral. */
      partialize: (state) => ({
        threads: state.threads,
        mySteamId: state.mySteamId,
      }),
    },
  ),
);

/* Update one message inside a thread by client id. */
function patchMessage(
  set: (partial: Partial<DMState>) => void,
  get: () => DMState,
  peerSteamId: string,
  clientId: string,
  patch: Partial<DMMessage>,
) {
  const threads = get().threads;
  const t = threads[peerSteamId];
  if (!t) return;
  set({
    threads: {
      ...threads,
      [peerSteamId]: {
        ...t,
        messages: t.messages.map((m) =>
          m.id === clientId ? { ...m, ...patch } : m,
        ),
      },
    },
  });
}

/* Build a new optimistic DMMessage. Pulled out of sendMessage so the
   early-return guards (no session / self-dm / empty) can build the
   same shape without duplicating the field list. */
function makeOptimistic(
  fromSteamId: string,
  _peerSteamId: string,
  text: string,
  context: { itemId?: string; itemName?: string; itemImage?: string } | undefined,
  attachments: DMAttachment[] | undefined,
  status: 'pending' | 'failed',
  failureReason?: string,
): DMMessage {
  return {
    id: newClientId(),
    fromSteamId,
    text,
    itemId: context?.itemId,
    itemName: context?.itemName,
    itemImage: context?.itemImage,
    attachments,
    ts: Date.now(),
    read: true,
    status,
    failureReason,
  };
}

/* Append a message to a thread, creating the thread on the fly if it
   doesn't already exist. Shared by the optimistic send + realtime
   incoming paths. */
function appendMessage(
  set: (partial: Partial<DMState>) => void,
  get: () => DMState,
  peerSteamId: string,
  message: DMMessage,
) {
  const threads = get().threads;
  const existing = threads[peerSteamId];
  set({
    threads: {
      ...threads,
      [peerSteamId]: existing
        ? {
            ...existing,
            messages: [...existing.messages, message],
            lastActivity: message.ts,
          }
        : {
            peerSteamId,
            peerName: 'Trader',
            messages: [message],
            lastActivity: message.ts,
          },
    },
  });
}

/* Map a raw Supabase error into a single line the user can act on. */
function humanizeDmError(message?: string, code?: string): string {
  const m = (message || '').toLowerCase();
  if (code === 'PGRST301' || /jwt|auth\.uid|not authenticated/.test(m)) {
    return 'Session expired — sign in again.';
  }
  if (code === '42501' || /row-level security|policy/.test(m)) {
    return 'You can\'t message this user (policy denied).';
  }
  if (code === '23514' || /check constraint|from_steam_id.*to_steam_id/.test(m)) {
    return 'You can\'t send a message to yourself.';
  }
  if (/network|fetch|failed to fetch/.test(m)) {
    return 'Network hiccup — try again.';
  }
  return message || 'Unknown error sending message.';
}
