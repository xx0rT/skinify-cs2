import { supabase } from '../lib/supabaseClient';

let sessionId: string | null = null;

function getSessionId(): string {
  if (!sessionId) {
    sessionId = localStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('analytics_session_id', sessionId);
    }
  }
  return sessionId;
}

/* Cached ISO country code for the country-of-session map in the admin
   analytics tab. We only geolocate once per browser (cached for 24h),
   using the same keyless providers currency detection already uses, so
   this never adds a network hop to the hot path — the first event of a
   session may go out with country_code: null, every later one is
   tagged. Best-effort: any failure just leaves it null. */
const COUNTRY_KEY = 'skinify_geo_country';
const COUNTRY_TTL_MS = 24 * 60 * 60 * 1000;
let countryInFlight = false;

function getCachedCountry(): string | null {
  try {
    const raw = localStorage.getItem(COUNTRY_KEY);
    if (!raw) return null;
    const { code, at } = JSON.parse(raw);
    if (!code || Date.now() - at > COUNTRY_TTL_MS) return null;
    return code;
  } catch {
    return null;
  }
}

async function ensureCountry(): Promise<string | null> {
  const cached = getCachedCountry();
  if (cached) return cached;
  if (countryInFlight) return null;
  countryInFlight = true;
  try {
    const r = await fetch('https://api.country.is', { mode: 'cors' });
    if (r.ok) {
      const d = await r.json();
      const code = (d?.country || '').toUpperCase();
      if (code) {
        localStorage.setItem(COUNTRY_KEY, JSON.stringify({ code, at: Date.now() }));
        return code;
      }
    }
  } catch {
    /* leave null — next event tries again */
  } finally {
    countryInFlight = false;
  }
  return null;
}

interface TrackEventParams {
  eventType: string;
  eventData?: Record<string, any>;
  pageUrl?: string;
  pageTitle?: string;
}

export async function trackEvent(params: TrackEventParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    const userData = user ? await supabase
      .from('users')
      .select('steam_id')
      .eq('id', user.id)
      .maybeSingle() : null;

    /* country_code: read from cache synchronously; kick off a
       geolocation fetch in the background if we don't have it yet so
       later events in this session are tagged. Never block the insert
       on it. */
    const countryCode = getCachedCountry();
    if (!countryCode) void ensureCountry();

    await supabase.from('user_activity').insert({
      user_id: user?.id || null,
      user_steam_id: userData?.data?.steam_id || null,
      session_id: getSessionId(),
      event_type: params.eventType,
      event_data: params.eventData || {},
      page_url: params.pageUrl || window.location.pathname,
      page_title: params.pageTitle || document.title,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      country_code: countryCode,
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

export function trackPageView(pageTitle?: string) {
  trackEvent({
    eventType: 'page_view',
    pageUrl: window.location.pathname,
    pageTitle: pageTitle || document.title
  });
}

export function trackClick(element: string, data?: Record<string, any>) {
  trackEvent({
    eventType: 'click',
    eventData: { element, ...data }
  });
}

export function trackDeposit(amount: number, method: string) {
  trackEvent({
    eventType: 'deposit',
    eventData: { amount, method }
  });
}

export function trackPurchase(amount: number, itemCount: number, items: any[]) {
  trackEvent({
    eventType: 'purchase',
    eventData: { amount, itemCount, items }
  });
}

export function trackSearch(query: string, resultsCount: number) {
  trackEvent({
    eventType: 'search',
    eventData: { query, resultsCount }
  });
}

export function trackItemView(itemId: string, itemName: string, price: number) {
  trackEvent({
    eventType: 'item_view',
    eventData: { itemId, itemName, price }
  });
}
