/*
  Google Analytics 4 — loaded only after consent, only when a
  measurement ID is configured, and only in production (no noise in
  local dev). GA4's free tier has no visitor cap for a site this size.

  Distinct from utils/analytics.ts (first-party event tracking into our
  own Supabase user_activity table) — this file is purely for the
  external GA4 pixel so we get standard acquisition/traffic-source
  reporting without building it ourselves.

  Why gated behind consent rather than loaded unconditionally in
  index.html: GDPR (Skinify is a Czech / EU company) requires consent
  BEFORE any non-essential tracking script runs — loading gtag.js on
  page load would set a third-party cookie before the user agreed.
  CookieConsentBanner calls grantAnalyticsConsent() only on an explicit
  "Accept" click; declining never loads the script.
*/

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const CONSENT_KEY = 'skinify_analytics_consent';

let loaded = false;

function loadGtagScript(): void {
  if (loaded || !GA_ID) return;
  loaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) {
    (window as any).dataLayer.push(args);
  }
  (window as any).gtag = gtag;
  gtag('js', new Date());
  /* GA4 always truncates IPs server-side; ad-signal flags are off
     since Skinify doesn't run ads and has no reason to feed Google's
     ad network with visitor data. */
  gtag('config', GA_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

/** Call once, on app boot. Loads GA immediately if consent was already
 *  granted in a previous session; otherwise waits for the banner. */
export function initGtag(): void {
  if (!GA_ID || import.meta.env.DEV) return;
  try {
    if (localStorage.getItem(CONSENT_KEY) === 'granted') {
      loadGtagScript();
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
  loadGtagScript();
}

export function declineAnalyticsConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, 'declined');
  } catch {
    /* best-effort */
  }
}

/** SPA route-change pageview — gtag's initial config only auto-fires
 *  once on script load, so client-side navigations need an explicit
 *  event or GA only ever sees the entry page. */
export function trackGaPageview(path: string): void {
  if (!GA_ID || typeof (window as any).gtag !== 'function') return;
  (window as any).gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
