import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/* ─────────────────────────────────────────────────────────────────────────
   dmStore — local-only direct-message threads scoped by seller steamId.

   This is a stand-in until a `direct_messages` table + edge function lands.
   Messages are persisted in localStorage so the conversation survives page
   reloads and shows up consistently across the site. Both outgoing and
   (eventually) incoming messages share the same shape so swapping the
   transport later is a one-line change.
   ───────────────────────────────────────────────────────────────────────── */

export interface DMMessage {
  id: string;
  /** Sender steamId. 'me' is a sentinel for the local user — we don't
      always know our own steamId at message-creation time. */
  fromSteamId: string | 'me';
  text: string;
  /** Optional item context (the listing the user opened the DM from). */
  itemId?: string;
  itemName?: string;
  itemImage?: string;
  ts: number;
  /** True once the local user has opened the thread after this message
      arrived. Outgoing messages are read-by-default. */
  read: boolean;
}

export interface DMThread {
  /** Seller steamId, used as the thread key. */
  peerSteamId: string;
  peerName: string;
  peerAvatar?: string;
  messages: DMMessage[];
  lastActivity: number;
}

interface DMState {
  threads: Record<string, DMThread>;

  ensureThread: (
    peerSteamId: string,
    peerName: string,
    peerAvatar?: string,
  ) => void;
  sendMessage: (
    peerSteamId: string,
    text: string,
    context?: { itemId?: string; itemName?: string; itemImage?: string },
  ) => DMMessage;
  markThreadRead: (peerSteamId: string) => void;
  deleteThread: (peerSteamId: string) => void;
  totalUnread: () => number;
  threadUnread: (peerSteamId: string) => number;
  sortedThreads: () => DMThread[];
}

const newId = () =>
  `dm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const useDMStore = create<DMState>()(
  persist(
    (set, get) => ({
      threads: {},

      ensureThread: (peerSteamId, peerName, peerAvatar) => {
        const { threads } = get();
        if (threads[peerSteamId]) return;
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

      sendMessage: (peerSteamId, text, context) => {
        const trimmed = text.trim();
        const msg: DMMessage = {
          id: newId(),
          fromSteamId: 'me',
          text: trimmed,
          itemId: context?.itemId,
          itemName: context?.itemName,
          itemImage: context?.itemImage,
          ts: Date.now(),
          read: true,
        };
        const { threads } = get();
        const existing = threads[peerSteamId];
        if (!existing) {
          /* Shouldn't happen — caller must ensureThread first. Recover
             gracefully so a missing call doesn't drop the message. */
          set({
            threads: {
              ...threads,
              [peerSteamId]: {
                peerSteamId,
                peerName: 'Seller',
                messages: [msg],
                lastActivity: msg.ts,
              },
            },
          });
          return msg;
        }
        set({
          threads: {
            ...threads,
            [peerSteamId]: {
              ...existing,
              messages: [...existing.messages, msg],
              lastActivity: msg.ts,
            },
          },
        });
        return msg;
      },

      markThreadRead: (peerSteamId) => {
        const { threads } = get();
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
      },

      deleteThread: (peerSteamId) => {
        const { threads } = get();
        if (!threads[peerSteamId]) return;
        const next = { ...threads };
        delete next[peerSteamId];
        set({ threads: next });
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
    }),
    { name: 'skinify-dm-storage' },
  ),
);
