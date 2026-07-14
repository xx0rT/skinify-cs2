import { useEffect, useState } from 'react';
import { getSupabaseCredentials } from './supabaseHelpers';

/* ─────────────────────────────────────────────────────────────────────────
   siteFlags — SITEWIDE feature flags (Admin → Developer).

   Stored in system_settings under key `site_flags` and read publicly via
   the admin-settings edge function's `get_public_flags` action (the only
   unauthenticated action it exposes). Cached in-module + localStorage so
   the banner paints instantly on revisit; refreshed in the background.
   ───────────────────────────────────────────────────────────────────────── */

export interface SiteFlags {
  maintenance_banner?: boolean;
  maintenance_text?: string;
  promo_banner?: boolean;
}

const LS_KEY = 'skinify_site_flags';
const TTL_MS = 60_000;

let memo: { flags: SiteFlags; at: number } | null = null;
let inflight: Promise<SiteFlags> | null = null;

function readLocal(): SiteFlags {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
  } catch {
    return {};
  }
}

export async function fetchSiteFlags(force = false): Promise<SiteFlags> {
  if (!force && memo && Date.now() - memo.at < TTL_MS) return memo.flags;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const res = await fetch(`${supabaseUrl}/functions/v1/admin-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ action: 'get_public_flags' }),
      });
      const body = await res.json().catch(() => ({}));
      const flags: SiteFlags = (res.ok && body?.flags) || {};
      memo = { flags, at: Date.now() };
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(flags));
      } catch {
        /* private mode */
      }
      return flags;
    } catch {
      return memo?.flags ?? readLocal();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** React hook — seeds from localStorage for instant paint, then refreshes. */
export function useSiteFlags(): SiteFlags {
  const [flags, setFlags] = useState<SiteFlags>(() => memo?.flags ?? readLocal());
  useEffect(() => {
    let alive = true;
    fetchSiteFlags().then((f) => alive && setFlags(f));
    return () => {
      alive = false;
    };
  }, []);
  return flags;
}
