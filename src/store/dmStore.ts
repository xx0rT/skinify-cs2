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
        const { threads } = get();
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

        /* Optimistic insert so the UI updates immediately. We mark it
           `pending`; the realtime echo (or the insert response) will
           swap it for the server-confirmed row. */
        const optimistic: DMMessage = {
          id: newClientId(),
          fromSteamId: mySteamId || 'me',
          text: trimmed,
          itemId: context?.itemId,
          itemName: context?.itemName,
          itemImage: context?.itemImage,
          attachments,
          ts: Date.now(),
          read: true,
          status: 'pending',
        };

        const existing = threads[peerSteamId];
        set({
          threads: {
            ...threads,
            [peerSteamId]: existing
              ? {
                  ...existing,
                  messages: [...existing.messages, optimistic],
                  lastActivity: optimistic.ts,
                }
              : {
                  peerSteamId,
                  peerName: 'Trader',
                  messages: [optimistic],
                  lastActivity: optimistic.ts,
                },
          },
        });

        /* If we don't know our own steam id, we can't persist — keep
           the optimistic row but mark it failed so the UI shows the
           "not delivered" state. */
        if (!mySteamId) {
          markStatus(set, get, peerSteamId, optimistic.id, 'failed');
          return optimistic;
        }

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
            console.warn('[dmStore] sendMessage rejected:', error?.message);
            markStatus(set, get, peerSteamId, optimistic.id, 'failed');
            return optimistic;
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
          console.warn('[dmStore] sendMessage threw:', err?.message);
          markStatus(set, get, peerSteamId, optimistic.id, 'failed');
          return optimistic;
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

function markStatus(
  set: (partial: Partial<DMState>) => void,
  get: () => DMState,
  peerSteamId: string,
  clientId: string,
  status: 'pending' | 'sent' | 'failed',
) {
  patchMessage(set, get, peerSteamId, clientId, { status });
}
