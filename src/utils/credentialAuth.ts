import { supabase } from '../lib/supabaseClient';
import type { AuthUser } from '../store/authStore';

/* ─────────────────────────────────────────────────────────────────────────
   credentialAuth — email/password sign-up + sign-in via Supabase Auth.

   Companion to the Steam OpenID flow (SteamLogin.tsx).

   Account model:
     - Supabase Auth row (auth.users) carries the email + password hash
     - public.users row is created on first sign-in, keyed by:
         * steam_id when signed in via Steam
         * auth_user_id (UUID) when signed in via email/password
     - A user can ALSO have both — when an email user links Steam later,
       we add their steam_id onto their existing public.users row.

   When an email user has no steam_id linked, listing creation is gated
   by the UI in the Profile / Inventory tab (see SteamLinkBanner).
   ───────────────────────────────────────────────────────────────────────── */

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

/** Sign up with email + password. Creates the auth.users row and a
 *  matching public.users record. Returns the user immediately if
 *  email confirmation is disabled in your Supabase project; otherwise
 *  prompts to confirm via email. */
export async function signUpWithPassword(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult & { needsConfirm?: boolean }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      return { ok: false, error: humanError(error.message) };
    }
    if (!data.user) {
      return { ok: false, error: 'Sign up did not return a user.' };
    }

    /* Some Supabase projects require email confirmation. In that case
       data.session is null. We don't have an authenticated session yet
       so just tell the caller. */
    if (!data.session) {
      return {
        ok: false,
        error: 'Check your inbox to confirm your email address before signing in.',
        needsConfirm: true,
      };
    }

    await upsertPublicUser({
      authUserId: data.user.id,
      email: data.user.email || email,
      displayName,
    });

    const user = await hydrateAuthUser(data.user.id);
    return user
      ? { ok: true, user }
      : { ok: false, error: 'Failed to hydrate user profile.' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Unexpected error during sign up.' };
  }
}

/** Sign in with email + password. */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) return { ok: false, error: humanError(error.message) };
    if (!data.user) return { ok: false, error: 'Sign in did not return a user.' };

    const user = await hydrateAuthUser(data.user.id);
    return user
      ? { ok: true, user }
      : { ok: false, error: 'Failed to hydrate user profile.' };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Unexpected error during sign in.' };
  }
}

/** Sign out from Supabase Auth. */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Send a magic-link / password reset email. */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset`,
  });
  if (error) return { ok: false, error: humanError(error.message) };
  return { ok: true, user: undefined as unknown as AuthUser };
}

/** Re-hydrate the AuthUser object from public.users for the given auth UUID. */
async function hydrateAuthUser(authUserId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (error || !data) {
    /* The row may not exist yet for very fresh signups. Fall back to a
       minimal user object built from the auth profile. */
    const session = await supabase.auth.getUser();
    const u = session.data.user;
    if (!u) return null;
    return {
      id: u.id,
      authUserId: u.id,
      email: u.email || undefined,
      steamId: '',
      steamLinked: false,
      displayName:
        (u.user_metadata as any)?.display_name || u.email?.split('@')[0] || 'Trader',
      avatarUrl: '',
    };
  }
  return {
    id: data.id,
    authUserId: data.auth_user_id || authUserId,
    email: data.email || undefined,
    steamId: data.steam_id || '',
    steamLinked: !!data.steam_id,
    displayName: data.display_name || 'Trader',
    avatarUrl: data.avatar_url || '',
    tradeLink: data.trade_link || undefined,
  };
}

/** Idempotently create the public.users row for a fresh email account. */
async function upsertPublicUser(args: {
  authUserId: string;
  email: string;
  displayName: string;
}) {
  await supabase
    .from('users')
    .upsert(
      {
        auth_user_id: args.authUserId,
        email: args.email,
        display_name: args.displayName,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      },
      { onConflict: 'auth_user_id' },
    );
}

/**
 * Link a Steam account to the currently signed-in email user.
 * After running, the public.users row has both auth_user_id AND
 * steam_id populated, so the user can list items.
 *
 * Implementation: opens Steam OpenID with a special return path that
 * the AuthCallback page recognises as a "link" flow rather than a
 * "fresh sign-in" flow.
 */
export function startSteamLink(): void {
  const returnTo = `${window.location.origin}/auth/callback?mode=link`;
  const realm = window.location.origin;
  const steamOpenIDUrl = new URL('https://steamcommunity.com/openid/login');
  const params = {
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': realm,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  };
  Object.entries(params).forEach(([key, value]) => {
    steamOpenIDUrl.searchParams.append(key, value);
  });
  window.location.href = steamOpenIDUrl.toString();
}

/** Helper to attach a steam_id to the currently authenticated user. */
export async function attachSteamIdToCurrentUser(steamId: string): Promise<AuthResult> {
  const session = await supabase.auth.getUser();
  const authUser = session.data.user;
  if (!authUser) {
    return { ok: false, error: 'No active session to attach Steam to.' };
  }
  const { error } = await supabase
    .from('users')
    .update({ steam_id: steamId, last_login: new Date().toISOString() })
    .eq('auth_user_id', authUser.id);
  if (error) return { ok: false, error: humanError(error.message) };
  const user = await hydrateAuthUser(authUser.id);
  return user
    ? { ok: true, user }
    : { ok: false, error: 'Failed to re-hydrate user after linking.' };
}

/* Translate Supabase Auth error strings to friendlier user copy. */
function humanError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Wrong email or password.';
  if (m.includes('email not confirmed')) return 'Confirm your email before signing in.';
  if (m.includes('user already registered')) return 'An account with this email already exists.';
  if (m.includes('password should be at least')) return 'Password must be at least 6 characters.';
  if (m.includes('rate limit')) return 'Too many attempts. Try again in a minute.';
  return msg;
}
