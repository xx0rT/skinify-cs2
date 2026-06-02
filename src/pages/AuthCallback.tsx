import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldOff,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import { useAuthStore } from '../store/authStore';
import { attachSteamIdToCurrentUser } from '../utils/credentialAuth';
import LandingNav from '../components/LandingNav';
import { spring, tap } from '../lib/motion';

/* ─────────────────────────────────────────────────────────────────────────
   AuthCallback — handles the Steam OpenID response

   - Parses the openid params off the URL
   - Calls our /functions/v1/auth edge function with them
   - Stores the user, then routes:
       new user (no onboard flag)  →  /onboarding
       returning user              →  /

   The error UX is the important part of this page: a real human is
   sitting here when something went wrong, so the error screen needs to
   tell them what to actually do — not just dump a stack trace.
   ───────────────────────────────────────────────────────────────────────── */

type AuthStatus = 'loading' | 'success' | 'error';

type FailureKind = 'network' | 'cancelled' | 'noSteamData' | 'config' | 'server' | 'unknown';

interface FailureInfo {
  kind: FailureKind;
  title: string;
  message: string;
  hint?: string;
  details?: string;
}

const classifyError = (raw: unknown, response?: Response | null): FailureInfo => {
  const message =
    raw instanceof Error
      ? raw.message
      : typeof raw === 'string'
      ? raw
      : 'Unknown authentication error';

  // Network-layer rejection — fetch never reached the edge function.
  // Almost always a privacy extension, content blocker, VPN/DNS filter,
  // or aggressive corporate network filtering *.supabase.co.
  if (
    /load failed|failed to fetch|network ?error|networkerror|aborted|timeout|err_/i.test(message) &&
    !response
  ) {
    return {
      kind: 'network',
      title: 'Connection hiccup — please try again',
      message:
        "We couldn't reach Steam just now. This is usually a brief connection blip — give it another go.",
      hint:
        "If it keeps failing, an ad-blocker, VPN, or DNS filter (uBlock, Brave Shields, NextDNS, Pi-hole) might be blocking *.supabase.co. Try an incognito window or disable those for skinify.gg.",
      details: message,
    };
  }

  if (/cancel/i.test(message)) {
    return {
      kind: 'cancelled',
      title: 'Steam login cancelled',
      message: 'You closed the Steam sign-in page before it finished.',
      hint: 'Click "Try again" to retry — no data was saved.',
      details: message,
    };
  }

  if (/steam id not found|invalid steam openid|no authentication data/i.test(message)) {
    return {
      kind: 'noSteamData',
      title: 'Steam didn\'t send us your ID',
      message:
        'The handoff from Steam was incomplete. This usually means the OpenID redirect was tampered with or expired.',
      hint: 'Restart sign-in from the homepage — the link should work fresh.',
      details: message,
    };
  }

  if (/configuration missing|missing.*credentials/i.test(message)) {
    return {
      kind: 'config',
      title: 'Service is misconfigured',
      message: 'The site is missing the credentials it needs to talk to Supabase.',
      hint:
        'This is on our side — please email support@skinify.gg with this debug info.',
      details: message,
    };
  }

  if (response && response.status >= 500) {
    return {
      kind: 'server',
      title: 'Sign-in service is having a moment',
      message: `The auth server returned HTTP ${response.status} (${response.statusText || 'server error'}).`,
      hint: 'Try again in a minute. If it persists, our status page will list it.',
      details: message,
    };
  }

  return {
    kind: 'unknown',
    title: 'Authentication failed',
    message,
    hint: 'Try again, or contact support if the issue persists.',
    details: message,
  };
};

const ICONS: Record<FailureKind, React.ComponentType<any>> = {
  network: Wifi,
  cancelled: ArrowRight,
  noSteamData: ShieldOff,
  config: AlertTriangle,
  server: AlertTriangle,
  unknown: AlertTriangle,
};

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [failure, setFailure] = useState<FailureInfo | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const handleAuth = async () => {
      let response: Response | null = null;
      try {
        setStatus('loading');
        setFailure(null);

        const params = new URLSearchParams(window.location.search);
        const mode = params.get('openid.mode');

        if (!mode) throw new Error('No authentication data received');
        if (mode === 'cancel') throw new Error('Steam authentication was cancelled');
        if (mode !== 'id_res') throw new Error('Invalid Steam OpenID response');

        const claimedId = params.get('openid.claimed_id');
        if (!claimedId) throw new Error('Steam ID not found in response');

        const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
        const steamId = steamIdMatch ? steamIdMatch[1] : null;
        if (!steamId) throw new Error('Could not extract Steam ID from claimed_id');

        /* Link mode — the user is already signed in via email/password
           and is adding Steam to their account. Don't run the fresh
           sign-in path; just attach the steamId to their public.users
           row and bounce back to the profile. */
        const linkMode = params.get('mode') === 'link';
        if (linkMode) {
          const result = await attachSteamIdToCurrentUser(steamId);
          if (!result.ok) {
            throw new Error(result.error);
          }
          setUser(result.user);
          setStatus('success');
          setTimeout(() => {
            navigate('/profile?tab=settings&linked=1', { replace: true });
          }, 1200);
          return;
        }

        const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
        if (!supabaseUrl || !supabaseKey) {
          throw new Error(`Supabase configuration missing`);
        }

        const authUrl = `${supabaseUrl}/functions/v1/auth${window.location.search}`;

        /* Manual abort controller — AbortSignal.timeout isn't available in
           older Safari/Chromium and throws synchronously when missing,
           which the outer catch reads as "Load failed" and confuses
           users into thinking an extension blocked them. */
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 30000);
        try {
          response = await fetch(authUrl, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              apikey: supabaseKey,
            },
            credentials: 'omit',
            mode: 'cors',
            cache: 'no-store',
            signal: controller.signal,
          });
        } catch (fetchError) {
          if ((fetchError as any)?.name === 'AbortError') {
            throw new Error('Request timed out');
          }
          throw new Error(
            fetchError instanceof Error ? fetchError.message : 'Network error',
          );
        } finally {
          window.clearTimeout(timeoutId);
        }

        if (!response.ok) {
          let errorData: { error?: string } = {};
          try {
            errorData = await response.json();
          } catch {
            try {
              errorData = { error: await response.text() };
            } catch {
              errorData = { error: 'Unknown server error' };
            }
          }
          throw new Error(
            errorData.error ||
              `Authentication failed (${response.status}): ${response.statusText}`,
          );
        }

        const userData = await response.json();
        if (userData.error) throw new Error(userData.error);

        setUser({
          id: userData.id,
          steamId: userData.steamId,
          displayName: userData.displayName,
          avatarUrl: userData.avatarUrl,
          tradeLink: userData.tradeLink || null,
          referred_by: userData.referred_by,
          referral_code: userData.referral_code,
        });

        setStatus('success');

        // Redirect — new users go through onboarding (unless already done)
        setTimeout(() => {
          let onboarded = false;
          try {
            onboarded = localStorage.getItem('skinify_onboarded') === '1';
          } catch {
            /* private window */
          }
          const goToOnboarding = userData.isNewUser && !onboarded;
          const destination = goToOnboarding ? '/onboarding' : '/';
          try {
            navigate(destination, { replace: true });
          } catch {
            window.location.href = destination;
          }
        }, 1400);
      } catch (error) {
        const info = classifyError(error, response);
        console.error('[AUTH ERROR]', info);
        setFailure(info);
        setStatus('error');
      }
    };

    handleAuth();
  }, [navigate, setUser, attempt]);

  const retry = () => {
    // Cancelled flow doesn't make sense to retry from this page — go home.
    if (failure?.kind === 'cancelled' || failure?.kind === 'noSteamData') {
      navigate('/', { replace: true });
      return;
    }
    setAttempt((a) => a + 1);
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <LandingNav />

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring}
              className="card p-8 sm:p-10 max-w-md w-full text-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                className="mx-auto mb-5 w-14 h-14 rounded-3xl bg-accent-soft grid place-items-center"
              >
                <Loader2 size={26} className="text-accent" strokeWidth={2.2} />
              </motion.div>
              <span className="label-eyebrow">Steam</span>
              <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight mt-2 leading-tight">
                Verifying your sign-in
              </h1>
              <p className="text-[13.5px] text-ink-muted font-medium mt-3 leading-relaxed">
                Hang tight — talking to Steam, then dropping you back in.
              </p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring}
              className="card p-8 sm:p-10 max-w-md w-full text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                className="mx-auto mb-5 w-14 h-14 rounded-3xl bg-emerald-500/15 grid place-items-center"
              >
                <CheckCircle2 size={26} className="text-emerald-600 dark:text-emerald-400" strokeWidth={2.4} />
              </motion.div>
              <span className="label-eyebrow">Welcome</span>
              <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight mt-2 leading-tight">
                You're signed in.
              </h1>
              <p className="text-[13.5px] text-ink-muted font-medium mt-3 leading-relaxed">
                Redirecting you in just a second…
              </p>
            </motion.div>
          )}

          {status === 'error' && failure && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={spring}
              className="card p-7 sm:p-9 max-w-lg w-full"
            >
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 grid place-items-center shrink-0">
                  {React.createElement(ICONS[failure.kind], {
                    size: 22,
                    strokeWidth: 2.4,
                    className: 'text-rose-600 dark:text-rose-400',
                  })}
                </div>
                <div className="min-w-0">
                  <span className="label-eyebrow text-rose-700 dark:text-rose-300">
                    {failure.kind === 'network'
                      ? 'Blocked locally'
                      : failure.kind === 'cancelled'
                      ? 'Cancelled'
                      : failure.kind === 'server'
                      ? 'Server'
                      : 'Sign-in error'}
                  </span>
                  <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight mt-1.5 leading-tight">
                    {failure.title}
                  </h1>
                </div>
              </div>

              <p className="text-[13.5px] text-ink-muted font-medium leading-relaxed">
                {failure.message}
              </p>

              {failure.hint && (
                <div className="mt-4 card-flat p-3.5 flex items-start gap-2.5">
                  <Sparkles size={14} strokeWidth={2.4} className="text-accent shrink-0 mt-0.5" />
                  <p className="text-[12.5px] text-ink font-medium leading-relaxed">
                    {failure.hint}
                  </p>
                </div>
              )}

              {failure.details && (
                <details className="mt-4 group">
                  <summary className="text-[11.5px] font-semibold text-ink-muted cursor-pointer hover:text-ink transition-colors select-none list-none inline-flex items-center gap-1">
                    <span className="group-open:hidden">Show technical details</span>
                    <span className="hidden group-open:inline">Hide technical details</span>
                  </summary>
                  <pre className="mt-2 p-3 rounded-2xl bg-subtle text-[11px] font-mono text-ink-muted leading-relaxed overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
                    {failure.details}
                  </pre>
                </details>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <motion.button
                  whileTap={tap}
                  whileHover={{ scale: 1.02 }}
                  onClick={retry}
                  className="h-11 px-5 rounded-full bg-accent text-on-accent font-bold text-[13.5px] inline-flex items-center gap-2"
                  style={{ boxShadow: '0 10px 24px -10px rgb(var(--accent) / 0.6)' }}
                >
                  {failure.kind === 'cancelled' || failure.kind === 'noSteamData' ? (
                    <>
                      Back to home
                      <ArrowRight size={14} strokeWidth={2.4} />
                    </>
                  ) : (
                    <>
                      <RefreshCw size={14} strokeWidth={2.4} />
                      Try again
                    </>
                  )}
                </motion.button>
                <motion.button
                  whileTap={tap}
                  onClick={() => navigate('/', { replace: true })}
                  className="h-11 px-4 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-semibold transition-colors"
                >
                  Return home
                </motion.button>
                <motion.a
                  whileTap={tap}
                  href="mailto:support@skinify.gg"
                  className="h-11 px-4 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-semibold inline-flex items-center transition-colors"
                >
                  Email support
                </motion.a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
