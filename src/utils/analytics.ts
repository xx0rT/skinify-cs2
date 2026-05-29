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

    await supabase.from('user_activity').insert({
      user_id: user?.id || null,
      user_steam_id: userData?.data?.steam_id || null,
      session_id: getSessionId(),
      event_type: params.eventType,
      event_data: params.eventData || {},
      page_url: params.pageUrl || window.location.pathname,
      page_title: params.pageTitle || document.title,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent
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
