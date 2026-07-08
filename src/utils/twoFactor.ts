import { getSupabaseCredentials } from './supabaseHelpers';
import { supabase } from '../lib/supabaseClient';
import { useAuthStore } from '../store/authStore';

/* ─────────────────────────────────────────────────────────────────────────
   twoFactor — client helpers for login-time 2FA + trusted devices +
   the Settings → Sessions list.

   Device token: a random id kept in localStorage that identifies this
   browser. On a passed 2FA challenge with "remember this device", the
   server marks the token trusted so future logins skip the prompt.
   ───────────────────────────────────────────────────────────────────────── */

const DEVICE_KEY = 'skinify_device_token';

export function getDeviceToken(): string | null {
  try {
    return localStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
}
export function setDeviceToken(token: string): void {
  try {
    localStorage.setItem(DEVICE_KEY, token);
  } catch {
    /* private mode */
  }
}

/* Auth headers: Supabase JWT when there's a session (email/password
   users), else anon key + X-Steam-Id (Steam users). */
async function authHeaders(steamIdOverride?: string): Promise<Record<string, string>> {
  const { supabaseKey } = getSupabaseCredentials();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  const steamId = steamIdOverride || useAuthStore.getState().user?.steamId;
  if (steamId) return { Authorization: `Bearer ${supabaseKey}`, 'X-Steam-Id': steamId };
  return { Authorization: `Bearer ${supabaseKey}` };
}

async function post(payload: Record<string, unknown>, steamIdOverride?: string): Promise<any> {
  const { supabaseUrl } = getSupabaseCredentials();
  const headers = await authHeaders(steamIdOverride);
  const res = await fetch(`${supabaseUrl}/functions/v1/two-factor`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Server error (${res.status})`);
  return body;
}

export interface DeviceCheck {
  twoFactorEnabled: boolean;
  deviceTrusted: boolean;
  needsCode: boolean;
}

/** At login: does this user need to enter a 2FA code on this device? */
export async function checkDevice(steamIdOverride?: string): Promise<DeviceCheck> {
  try {
    return await post({ action: 'check_device', deviceToken: getDeviceToken() }, steamIdOverride);
  } catch {
    // Fail open: if the check errors, don't lock the user out.
    return { twoFactorEnabled: false, deviceTrusted: false, needsCode: false };
  }
}

/** Verify a login-time code; optionally trust this device. Persists the
 *  returned device token. */
export async function verifyLoginCode(
  code: string,
  rememberDevice: boolean,
  steamIdOverride?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await post(
      { action: 'verify', code, rememberDevice, deviceToken: getDeviceToken() },
      steamIdOverride,
    );
    if (res.deviceToken) setDeviceToken(res.deviceToken);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message };
  }
}

/** Record a plain login (no 2FA / already trusted) so it shows in the
 *  sessions list. Best-effort. */
export async function recordLogin(steamIdOverride?: string): Promise<void> {
  try {
    const res = await post({ action: 'record_login', deviceToken: getDeviceToken() }, steamIdOverride);
    if (res.deviceToken) setDeviceToken(res.deviceToken);
  } catch {
    /* non-fatal */
  }
}

export interface DeviceRow {
  id: string;
  device_token: string;
  trusted: boolean;
  ip: string | null;
  user_agent: string | null;
  device_name: string | null;
  last_seen_at: string;
  created_at: string;
}

export async function listDevices(): Promise<DeviceRow[]> {
  const res = await post({ action: 'list_devices' });
  return (res.devices || []) as DeviceRow[];
}

export async function revokeDevice(id: string): Promise<void> {
  await post({ action: 'revoke_device', id });
}

/** True if the given row is *this* browser. */
export function isCurrentDevice(row: DeviceRow): boolean {
  return row.device_token === getDeviceToken();
}
