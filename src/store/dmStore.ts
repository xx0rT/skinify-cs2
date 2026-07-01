import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import type { RealtimeChannel } from '@supabase/supabase-js';

/* Thin fetch helpers that go through the dm-send / dm-list edge
   functions instead of the REST-on-table endpoint. Reason: RLS on
   direct_messages was returning 401 for Steam-only users whose
   Supabase Auth JWTs never carried the steam_id claim. The edge
   functions do their own auth via the x-steam-id header, then run
   the DB write as service_role — bypassing RLS entirely.

   Both helpers throw on any non-2xx so callers can wrap them in a
   try/catch and surface humanizeDmError. */
async function dmSendEdge(payload: {
  fromSteamId: string;
  toSteamId: string;
  text: string;
  itemId?: string;
  itemName?: string;
  itemImage?: string;
  attachments?: DMAttachment[];
}): Promise<{ id: number; created_at: string }> {
  const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
  const res = await fetch(`${supabaseUrl}/functions/v1/dm-send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-steam-id': payload.fromSteamId,
      /* Supabase's edge gateway still wants an Authorization header
         even for verify_jwt=false functions. The anon key is fine. */
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({
      to_steam_id: payload.toSteamId,
      text: payload.text,
      item_id: payload.itemId || null,
      item_name: payload.itemName || null,
      item_image: payload.itemImage || null,
      attachments: payload.attachments || [],
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    /* Attach the code so humanizeDmError can key off it. */
    const err = new Error(body?.error?.message || `dm-send ${res.status}`);
    (err as any).code = body?.error?.code || String(res.status);
    throw err;
  }
  return body.data;
}

async function dmListEdge(
  mySteamId: string,
  peer?: string,
): Promise<any[]> {
  const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
  const url = new URL(`${supabaseUrl}/functions/v1/dm-list`);
  if (peer) url.searchParams.set('peer', peer);
  const res = await fetch(url.toString(), {
    headers: {
      'x-steam-id': mySteamId,
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || `dm-list ${res.status}`);
    (err as any).code = body?.error?.code || String(res.status);
    throw err;
  }
  return Array.isArray(body?.data) ? body.data : [];
}

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
  /** Pull every thread the user is a participant in — bulk fetch so
      the unread badge on the profile dropdown populates as soon as
      you log in, not only after opening /messages. */
  hydrateInbox: () => Promise<void>;
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

      hydrateInbox: async () => {
        const { mySteamId, threads } = get();
        if (!mySteamId) return;
        /* Pull the last 500 messages the user is a participant in via
           the dm-list edge function. That function runs as service_role
           and bypasses the RLS on direct_messages that was 401'ing
           Steam-only users. */
        let data: any[] = [];
        try {
          data = await dmListEdge(mySteamId);
        } catch (err: any) {
          console.warn('[dmStore] hydrateInbox failed:', err?.message);
          return;
        }
        /* Group messages by peer steam id. */
        const grouped = new Map<string, DMMessage[]>();
        for (const row of data || []) {
          const peer =
            row.from_steam_id === mySteamId ? row.to_steam_id : row.from_steam_id;
          if (!peer || peer === mySteamId) continue;
          const arr = grouped.get(peer) || [];
          arr.push({
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
          });
          grouped.set(peer, arr);
        }
        /* Merge into the store — we preserve existing peerName/avatar
           entries (they may have been enriched by ensureThread) and
           only overwrite the message list. */
        const next: Record<string, DMThread> = { ...threads };
        for (const [peer, msgs] of grouped.entries()) {
          const existing = next[peer];
          next[peer] = {
            peerSteamId: peer,
            peerName: existing?.peerName || 'Trader',
            peerAvatar: existing?.peerAvatar,
            messages: msgs,
            lastActivity: msgs.length
              ? msgs[msgs.length - 1].ts
              : existing?.lastActivity || Date.now(),
            hydrated: true,
          };
        }
        set({ threads: next });

        /* Best-effort: pull display_name / avatar_url for peers we
           don't have yet. Batches via `in` so it's one query. */
        const peersMissingMeta = Array.from(grouped.keys()).filter(
          (p) => !next[p].peerAvatar || next[p].peerName === 'Trader',
        );
        if (peersMissingMeta.length > 0) {
          try {
            const { data: peerRows } = await supabase
              .from('users')
              .select('steam_id, display_name, avatar_url')
              .in('steam_id', peersMissingMeta);
            if (peerRows && peerRows.length > 0) {
              const cur = { ...get().threads };
              for (const row of peerRows) {
                const t = cur[row.steam_id as string];
                if (!t) continue;
                cur[row.steam_id as string] = {
                  ...t,
                  peerName: row.display_name || t.peerName,
                  peerAvatar: row.avatar_url || t.peerAvatar,
                };
              }
              set({ threads: cur });
            }
          } catch {
            /* metadata is nice-to-have */
          }
        }
      },

      hydrateThread: async (peerSteamId) => {
        const { mySteamId, threads } = get();
        if (!mySteamId) return;
        /* Pull messages where either side of the conversation matches. */
        /* Same edge-function route as hydrateInbox — RLS bypassed via
           service_role behind x-steam-id auth. */
        let data: any[] = [];
        try {
          data = await dmListEdge(mySteamId, peerSteamId);
        } catch (err: any) {
          console.warn('[dmStore] hydrateThread failed:', err?.message);
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
          const data = await dmSendEdge({
            fromSteamId: mySteamId,
            toSteamId: peerSteamId,
            text: trimmed,
            itemId: context?.itemId,
            itemName: context?.itemName,
            itemImage: context?.itemImage,
            attachments,
          });
          /* Promote the optimistic row to "sent" + stamp the server id
             so the realtime echo doesn't duplicate it. */
          patchMessage(set, get, peerSteamId, optimistic.id, {
            serverId: data.id,
            ts: new Date(data.created_at).getTime(),
            status: 'sent',
          });
          return { ...optimistic, serverId: data.id, status: 'sent' };
        } catch (err: any) {
          const reason = humanizeDmError(err?.message, err?.code);
          console.warn('[dmStore] sendMessage threw:', err?.message, err?.code);
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
        /* Server-side read-tracking is currently disabled while the
           auth JWT plumbing is fixed. The local cache above marks the
           thread read for this session, which is what drives the
           unread badge. Once dm-mark-read / dm-delete edge functions
           ship, wire them here the same way sendMessage uses
           dmSendEdge. */
      },

      deleteThread: async (peerSteamId) => {
        const { threads } = get();
        if (!threads[peerSteamId]) return;
        const next = { ...threads };
        delete next[peerSteamId];
        set({ threads: next });
        /* Same rationale as markThreadRead — server-side delete
           requires an edge function that bypasses RLS. Local cache
           is cleared so the thread disappears from the current
           session. */
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
