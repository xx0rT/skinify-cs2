/*
  auth-guard — shared throttle + request-origin checks for auth endpoints.

  - clientIp(req): best-effort caller IP from CF / proxy headers.
  - throttle(): atomic fixed-window rate limit via the bump_rate_limit()
    DB function. Fails OPEN on DB error (availability > strictness) but
    logs it. Keyed per (identifier, action).
  - originAllowed(req): lightweight CSRF defence for state-changing POSTs —
    rejects cross-site requests whose Origin/Referer isn't an allowed host.
    Browsers always send Origin on cross-origin POST; server-to-server
    callers (no Origin header) are allowed through so integrations still
    work. This blocks a malicious site from driving these endpoints with a
    logged-in victim's cookies (there are none here, but it also blocks
    drive-by abuse from other origins).
*/

export function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export interface ThrottleResult {
  limited: boolean;
  count: number;
  retryAfter: number;
}

export async function throttle(
  supabase: any,
  identifier: string,
  action: string,
  max: number,
  windowSec: number,
): Promise<ThrottleResult> {
  try {
    const { data, error } = await supabase.rpc('bump_rate_limit', {
      p_identifier: identifier,
      p_endpoint: action,
      p_window_sec: windowSec,
    });
    if (error) {
      console.error('[auth-guard] throttle rpc error (fail-open):', error.message);
      return { limited: false, count: 0, retryAfter: 0 };
    }
    const count = Number(data || 0);
    return { limited: count > max, count, retryAfter: windowSec };
  } catch (e) {
    console.error('[auth-guard] throttle threw (fail-open):', (e as Error)?.message);
    return { limited: false, count: 0, retryAfter: 0 };
  }
}

export function tooManyRequests(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Příliš mnoho pokusů. Zkuste to prosím za chvíli.',
      code: 'RATE_LIMITED',
      retry_after: retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Retry-After': String(retryAfter),
      },
    },
  );
}

/* Hosts permitted to drive state-changing auth POSTs from a browser. */
const ALLOWED_HOSTS = new Set([
  'skinify.gg',
  'www.skinify.gg',
  'localhost',
  '127.0.0.1',
]);

export function originAllowed(req: Request): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  // No Origin/Referer → non-browser / server-to-server caller. Allow.
  if (!origin && !referer) return true;
  const src = origin || referer || '';
  try {
    const host = new URL(src).hostname;
    if (ALLOWED_HOSTS.has(host)) return true;
    // Vercel/Netlify preview deploys for this project.
    if (/(^|\.)skinify\.gg$/.test(host)) return true;
    if (/\.vercel\.app$/.test(host) || /\.netlify\.app$/.test(host)) return true;
    return false;
  } catch {
    return false;
  }
}
