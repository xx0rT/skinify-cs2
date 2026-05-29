export const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey'
};

export function validateCloudflareHeaders(request: Request): boolean {
  const cfRay = request.headers.get('cf-ray');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  return !!(cfRay || cfConnectingIp);
}

export function getClientIP(request: Request): string {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]
    || request.headers.get('x-real-ip')
    || 'unknown';
}

export function getCloudflareCountry(request: Request): string {
  return request.headers.get('cf-ipcountry') || 'unknown';
}

export function isCloudflareBot(request: Request): boolean {
  const cfBotManagement = request.headers.get('cf-bot-management');
  if (!cfBotManagement) return false;

  try {
    const botInfo = JSON.parse(cfBotManagement);
    return botInfo.score < 30;
  } catch {
    return false;
  }
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  clientId: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(clientId);

  if (!record || now > record.resetTime) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(clientId, { count: 1, resetTime });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime };
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime
  };
}

export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupRateLimitStore, 60000);
