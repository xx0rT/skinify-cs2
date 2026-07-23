/*
  Google Tag Manager (GTM-W4KCRRHQ) + Consent Mode v2.

  GTM's container script is loaded unconditionally, as a static
  <script> in index.html's <head> — this is required for Google's own
  "tag not detected" install checker to find it (it scans the page
  source at load time; a script injected later via JS after a consent
  click, which is what this file used to do for a direct gtag.js tag,
  never satisfies it). GA4 itself is no longer configured directly in
  this codebase — it's a tag inside the GTM container, managed from
  the GTM web UI (tagmanager.google.com), which is also where GA4's own
  Consent Mode / Configuration tags live now.

  GDPR compliance (Skinify is a Czech / EU company) instead comes from
  Consent Mode: index.html sets `analytics_storage: 'denied'` by
  default for EEA/UK/Switzerland the instant the dataLayer initializes
  (before GTM's script even parses), so no cookie is set and no data
  reaches Google until the user explicitly accepts. This file only
  flips that consent signal and pushes dataLayer events for GTM's
  triggers to react to — it never injects or removes any tag script.

  Distinct from utils/analytics.ts (first-party event tracking into our
  own Supabase user_activity table) — this file is purely the external
  GTM/GA4 pixel, for standard acquisition/traffic-source reporting.
*/

const CONSENT_KEY = 'skinify_analytics_consent';

function gtag(...args: any[]): void {
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).dataLayer.push(args);
}

/** Call once, on app boot. Re-applies a previously granted consent
 *  choice (index.html's inline script already set the 'denied'
 *  default, so there's nothing to do here on first visit / decline). */
export function initGtag(): void {
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

/** SPA route-change pageview — GTM's GA4 Configuration tag only fires
 *  its initial page_view once, on container load, so client-side
 *  navigations need an explicit event pushed to the dataLayer for a
 *  GTM trigger to pick up (wire a "page_view" custom event trigger →
 *  GA4 Event tag in the GTM UI). No-ops harmlessly if consent hasn't
 *  been granted (Consent Mode drops the hit before it reaches Google,
 *  regardless of what GTM does with the event locally). */
export function trackGaPageview(path: string): void {
  gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
