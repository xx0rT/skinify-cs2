/**
 * Rate Limiting Utilities
 * Prevents abuse of payment and sensitive endpoints
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  payment: { maxRequests: 5, windowMs: 60000 },        // 5 per minute
  deposit: { maxRequests: 10, windowMs: 60000 },       // 10 per minute
  webhook: { maxRequests: 100, windowMs: 60000 },      // 100 per minute
  order: { maxRequests: 20, windowMs: 60000 },         // 20 per minute
  default: { maxRequests: 60, windowMs: 60000 },       // 60 per minute
};

/**
 * Check if request should be rate limited
 * @param supabase Supabase client
 * @param identifier User identifier (steam_id or IP)
 * @param endpoint Endpoint name
 * @returns true if rate limited, false if allowed
 */
export async function checkRateLimit(
  supabase: any,
  identifier: string,
  endpoint: string
): Promise<{ limited: boolean; remaining: number; resetAt: Date }> {
  try {
    const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default;
    const windowStart = new Date(Date.now() - config.windowMs);

    // Check existing rate limit record
    const { data: existingLimit, error: fetchError } = await supabase
      .from('api_rate_limits')
      .select('*')
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .gte('window_start', windowStart.toISOString())
      .maybeSingle();

    if (fetchError) {
      console.error('Rate limit check error:', fetchError);
      // Fail open - allow request if database error
      return {
        limited: false,
        remaining: config.maxRequests,
        resetAt: new Date(Date.now() + config.windowMs)
      };
    }

    const now = new Date();

    if (!existingLimit) {
      // Create new rate limit record
      await supabase
        .from('api_rate_limits')
        .insert({
          identifier,
          endpoint,
          request_count: 1,
          window_start: now.toISOString()
        });

      return {
        limited: false,
        remaining: config.maxRequests - 1,
        resetAt: new Date(now.getTime() + config.windowMs)
      };
    }

    // Check if limit exceeded
    if (existingLimit.request_count >= config.maxRequests) {
      console.warn(`Rate limit exceeded for ${identifier} on ${endpoint}`);
      return {
        limited: true,
        remaining: 0,
        resetAt: new Date(new Date(existingLimit.window_start).getTime() + config.windowMs)
      };
    }

    // Increment counter
    await supabase
      .from('api_rate_limits')
      .update({
        request_count: existingLimit.request_count + 1,
        updated_at: now.toISOString()
      })
      .eq('id', existingLimit.id);

    return {
      limited: false,
      remaining: config.maxRequests - existingLimit.request_count - 1,
      resetAt: new Date(new Date(existingLimit.window_start).getTime() + config.windowMs)
    };

  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fail open - allow request if error
    return {
      limited: false,
      remaining: RATE_LIMIT_CONFIGS.default.maxRequests,
      resetAt: new Date(Date.now() + RATE_LIMIT_CONFIGS.default.windowMs)
    };
  }
}

/**
 * Get client identifier for rate limiting
 * Uses Steam ID if available, falls back to IP address
 * Prioritizes Cloudflare headers for accurate IP detection
 */
export function getClientIdentifier(req: Request, steamId?: string): string {
  if (steamId) {
    return `steam:${steamId}`;
  }

  // Prioritize Cloudflare connecting IP (most accurate behind Cloudflare)
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return `ip:${cfConnectingIp}`;
  }

  // Try to get IP from headers (common reverse proxy headers)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return `ip:${forwardedFor.split(',')[0].trim()}`;
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return `ip:${realIp}`;
  }

  // Fallback to a generic identifier
  return `unknown:${Date.now()}`;
}

/**
 * Get Cloudflare metadata from request
 */
export function getCloudflareMetadata(req: Request): {
  ray?: string;
  country?: string;
  ip?: string;
  isThreat: boolean;
  isBot: boolean;
} {
  return {
    ray: req.headers.get('cf-ray') || undefined,
    country: req.headers.get('cf-ipcountry') || undefined,
    ip: req.headers.get('cf-connecting-ip') || undefined,
    isThreat: req.headers.get('cf-threat-score') ? parseInt(req.headers.get('cf-threat-score')!) > 10 : false,
    isBot: req.headers.get('cf-bot-management') ? JSON.parse(req.headers.get('cf-bot-management')!).score < 30 : false
  };
}

/**
 * Create rate limit error response
 */
export function rateLimitResponse(resetAt: Date): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retry_after: Math.ceil((resetAt.getTime() - Date.now()) / 1000),
      reset_at: resetAt.toISOString()
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString(),
        'X-RateLimit-Reset': resetAt.toISOString()
      }
    }
  );
}
