/*
  Google Analytics 4 — Consent Mode v2.

  The gtag.js tag itself is loaded unconditionally, as a static
  <script> in index.html's <head> — this is required for Google's own
  "tag not detected" install checker to find it (it scans the page
  source at load time; a script injected later via JS after a consent
  click, which is what this file used to do, never satisfies it).

  GDPR compliance (Skinify is a Czech / EU company) instead comes from
  Consent Mode: index.html sets `analytics_storage: 'denied'` by
  default the instant the tag loads, so no cookie is set and no data
  reaches Google until the user explicitly accepts. This file only
  flips that consent signal — it never injects or removes the script.

  Distinct from utils/analytics.ts (first-party event tracking into our
  own Supabase user_activity table) — this file is purely the external
  GA4 pixel, for standard acquisition/traffic-source reporting.
*/

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const CONSENT_KEY = 'skinify_analytics_consent';

function gtag(...args: any[]): void {
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push(args);
}

/** Call once, on app boot. Re-applies a previously granted consent
 *  choice (index.html's inline script already set the 'denied'
 *  default, so there's nothing to do here on first visit / decline). */
export function initGtag(): void {
  if (!GA_ID) return;
  try {
    if (localStorage.getItem(CONSENT_KEY) === 'granted') {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  } catch {
    /* private mode — consent can't persist, banner will re-ask each visit */
  }
}

export function hasStoredConsentChoice(): boolean {
  try {
    return !!localStorage.getItem(CONSENT_KEY);
  } catch {
    return false;
  }
}

export function grantAnalyticsConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, 'granted');
  } catch {
    /* best-effort */
  }
  gtag('consent', 'update', { analytics_storage: 'granted' });
}

export function declineAnalyticsConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, 'declined');
  } catch {
    /* best-effort */
  }
  /* Already 'denied' by index.html's default — nothing to flip. */
}

/** SPA route-change pageview — gtag's initial config call (in
 *  index.html) only fires once on script load, so client-side
 *  navigations need an explicit event or GA only ever sees the entry
 *  page. No-ops harmlessly if consent hasn't been granted (Consent
 *  Mode drops the hit server-side). */
export function trackGaPageview(path: string): void {
  if (!GA_ID) return;
  gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
