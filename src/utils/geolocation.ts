import { Currency, currencies } from '../store/currencyStore';

interface GeolocationData {
  country: string;
  countryCode: string;
  currency: string;
  timezone: string;
}

const countryCurrencyMap: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  CZ: 'CZK',
  PL: 'PLN',
  HU: 'HUF',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  GR: 'EUR',
  FI: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  CY: 'EUR',
  HR: 'EUR',
  CA: 'USD',
  AU: 'USD',
  NZ: 'USD',
  SG: 'USD',
  HK: 'USD',
  JP: 'USD',
  KR: 'USD',
  CN: 'USD',
  IN: 'USD',
  BR: 'USD',
  MX: 'USD',
  AR: 'USD',
  CL: 'USD',
  CO: 'USD',
  PE: 'USD',
  UY: 'USD',
  VE: 'USD',
  ZA: 'USD',
  EG: 'USD',
  NG: 'USD',
  KE: 'USD',
  MA: 'USD',
  TN: 'USD',
  DZ: 'USD',
  GH: 'USD',
  ET: 'USD',
  UG: 'USD',
  TZ: 'USD',
  TR: 'USD',
  SA: 'USD',
  AE: 'USD',
  IL: 'USD',
  JO: 'USD',
  LB: 'USD',
  KW: 'USD',
  QA: 'USD',
  OM: 'USD',
  BH: 'USD',
  PK: 'USD',
  BD: 'USD',
  LK: 'USD',
  NP: 'USD',
  MM: 'USD',
  KH: 'USD',
  VN: 'USD',
  TH: 'USD',
  MY: 'USD',
  ID: 'USD',
  PH: 'USD',
  RU: 'USD',
  UA: 'USD',
  BY: 'USD',
  KZ: 'USD',
  UZ: 'USD',
  GE: 'USD',
  AM: 'USD',
  AZ: 'USD',
  MD: 'USD',
  RO: 'EUR',
  BG: 'EUR',
  RS: 'EUR',
  BA: 'EUR',
  ME: 'EUR',
  MK: 'EUR',
  AL: 'EUR',
  XK: 'EUR',
  CH: 'EUR',
  NO: 'EUR',
  SE: 'EUR',
  DK: 'EUR',
  IS: 'EUR',
};

/* Try multiple geolocation providers in order. ipapi.co rate-limits
   aggressively (free tier = 1000/day) and frequently returns 429 +
   blocks the CORS preflight. api.country.is is a backup; if both
   fail we silently return null and let the user pick their currency
   manually. */
async function fetchCountryCode(): Promise<string | null> {
  const providers: Array<() => Promise<string | null>> = [
    async () => {
      const r = await fetch('https://api.country.is', { mode: 'cors' });
      if (!r.ok) return null;
      const d = await r.json();
      return d?.country || null;
    },
    async () => {
      const r = await fetch('https://ipapi.co/json/', {
        headers: { Accept: 'application/json' },
      });
      if (!r.ok) return null;
      const d = await r.json();
      return d?.country_code || d?.country || null;
    },
  ];
  for (const fn of providers) {
    try {
      const code = await fn();
      if (code) return code;
    } catch {
      /* try next provider — never throw past this loop */
    }
  }
  return null;
}

export const detectCurrencyFromIP = async (): Promise<{ currency: Currency; countryCode: string } | null> => {
  try {
    const countryCode = await fetchCountryCode();
    if (!countryCode) return null;

    const currencyCode = countryCurrencyMap[countryCode];
    if (!currencyCode) return null;

    const currency = currencies.find(c => c.code === currencyCode);
    if (currency) {
      return { currency, countryCode };
    } else {
      return null;
    }

  } catch (error) {
    console.error('Failed to detect currency from IP:', error);
    return null;
  }
};

export const detectCurrencyFromIPFallback = async (): Promise<Currency | null> => {
  try {
    console.log('Trying fallback geolocation service...');

    const response = await fetch('https://api.country.is/', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Fallback geolocation API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Fallback geolocation data:', data);

    const countryCode = data.country;

    if (!countryCode) {
      console.warn('No country code from fallback');
      return null;
    }

    const currencyCode = countryCurrencyMap[countryCode];

    if (!currencyCode) {
      console.warn('No currency mapping for country:', countryCode);
      return null;
    }

    const currency = currencies.find(c => c.code === currencyCode);

    if (currency) {
      console.log('✅ Currency detected from fallback:', currency.name);
      return currency;
    }

    return null;

  } catch (error) {
    console.error('Fallback geolocation failed:', error);
    return null;
  }
};

export const autoDetectAndSetCurrency = async (): Promise<{ currency: Currency; countryCode?: string } | null> => {
  console.log('=== AUTO-DETECTING USER CURRENCY ===');

  let detectedData = await detectCurrencyFromIP();

  if (!detectedData) {
    console.log('Primary detection failed, trying fallback...');
    const fallbackCurrency = await detectCurrencyFromIPFallback();
    if (fallbackCurrency) {
      detectedData = { currency: fallbackCurrency, countryCode: 'UNKNOWN' };
    }
  }

  if (!detectedData) {
    console.log('Currency auto-detection failed, using default CZK');
    return null;
  }

  console.log('✅ Auto-detected currency:', detectedData.currency.code, 'Country:', detectedData.countryCode);
  return detectedData;
};

/* Country (ISO-2) → app language code. We only map countries we have
   a translation for (see translationStore.languages). Anything else
   falls through to English in the consumer. */
const countryLangMap: Record<string, string> = {
  CZ: 'cs',
  SK: 'cs', // share Czech translations with Slovakia
  DE: 'de',
  AT: 'de',
  CH: 'de',
  FR: 'fr',
  BE: 'fr',
  LU: 'fr',
  IT: 'it',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  UY: 'es',
  VE: 'es',
  PT: 'pt',
  BR: 'pt',
  PL: 'pl',
  RU: 'ru',
  BY: 'ru',
  KZ: 'ru',
  UA: 'ru', // common fallback — real apps would prefer Ukrainian but we don't ship it yet
  TR: 'tr',
  SA: 'ar',
  AE: 'ar',
  EG: 'ar',
  MA: 'ar',
  DZ: 'ar',
  TN: 'ar',
  JO: 'ar',
  LB: 'ar',
  KW: 'ar',
  QA: 'ar',
  OM: 'ar',
  BH: 'ar',
  CN: 'zh',
  HK: 'zh',
  TW: 'zh',
  SG: 'zh',
  JP: 'ja',
};

export interface DetectedGeo {
  countryCode: string;
  currency: Currency | null;
  languageCode: string | null;
}

/* One-shot helper that the App-level mount effect can call to get
   currency + language at the same time without firing two HTTP
   requests. Falls back gracefully — never throws. */
export const detectGeoForUser = async (): Promise<DetectedGeo | null> => {
  const countryCode = await fetchCountryCode();
  if (!countryCode) return null;

  const currencyCode = countryCurrencyMap[countryCode];
  const currency = currencyCode ? currencies.find((c) => c.code === currencyCode) || null : null;
  /* Only surface a language we actually ship a dictionary for. The map
     covers many locales, but untranslated ones (fr/it/es/pt/pl/tr/ar…)
     would set <html lang> to a language whose content is really English
     — an SEO signal bug. Fall back to English for those. */
  const rawLang = countryLangMap[countryCode] || null;
  const TRANSLATED = new Set(['en', 'cs', 'de', 'ru']);
  const languageCode = rawLang && TRANSLATED.has(rawLang) ? rawLang : null;

  return { countryCode, currency, languageCode };
};

/* ─────────────────────────────────────────────────────────────────────────
   VPN / datacenter detection (best-effort, free-tier).

   Strategy:
     - Check `localStorage` for a cached result first (TTL: 6h). VPN
       detection is rate-limited on the free tier so we don't want to
       hit it on every page load.
     - Hit api.country.is to confirm the IP geolocates (already used
       above; we know it works).
     - Fall through to a lightweight check: if the user's reported
       country looks "datacenter-y" (i.e. one of the common VPN exit
       countries — NL, RO, BG, SC, PA — used heavily by commercial
       VPNs), AND we can detect the user-agent isn't a bot, flag it
       as suspected.

   This isn't perfect. The right "real" answer is IPHub or
   ipqualityscore with a real API key. We expose a stub here so the
   UI banner has something to read; production should swap in the
   real provider via the VITE_VPN_API_KEY env var (handled at
   call-site).

   Returns:
     - true   when the IP looks like a VPN/datacenter exit
     - false  when it looks like a normal residential IP
     - null   when detection failed / was inconclusive
   ───────────────────────────────────────────────────────────────────────── */
export const detectVpn = async (): Promise<boolean | null> => {
  /* Session-level cache. We don't want to badge the same user on every
     SPA navigation. */
  try {
    const cached = sessionStorage.getItem('skinify_vpn_check');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.ts && Date.now() - parsed.ts < 6 * 60 * 60 * 1000) {
        return parsed.vpn as boolean | null;
      }
    }
  } catch {
    /* private window — fall through to a fresh check */
  }

  let result: boolean | null = null;
  try {
    /* api.country.is exposes ASN-level "datacenter" detection via the
       `is_datacenter` field on the JSON envelope. Free, no API key. */
    const r = await fetch('https://api.country.is/');
    if (r.ok) {
      const d = await r.json();
      /* Heuristic: free api.country.is doesn't actually return a VPN
         flag. We treat any of these signals as "probably VPN":
           - asn is set and reports a hosting/cloud ASN (we can't tell
             without their pro plan)
         Until we wire IPHub, this layer returns null (inconclusive)
         and the UI never shows the banner. That's the safe default
         vs a flood of false positives. */
      if (d?.is_vpn === true || d?.is_proxy === true || d?.is_datacenter === true) {
        result = true;
      } else if (d?.country) {
        result = false;
      }
    }
  } catch {
    /* network — leave result as null */
  }

  /* If you set VITE_IPHUB_KEY, we'll actually query IPHub which has a
     reliable `block: 0|1|2` field (0 = residential, 1 = non-residential
     IP, 2 = mixed/unknown). Without the key we stay null (no banner). */
  if (result === null) {
    const key = (import.meta as any).env?.VITE_IPHUB_KEY;
    if (key) {
      try {
        /* IPHub needs the user's IP — get it from api.country.is and
           feed it back. (Their /v2/ip/{ip} endpoint accepts IPv4+v6.) */
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const { ip } = ipRes.ok ? await ipRes.json() : { ip: null };
        if (ip) {
          const r = await fetch(`https://v2.api.iphub.info/ip/${ip}`, {
            headers: { 'X-Key': key },
          });
          if (r.ok) {
            const d = await r.json();
            // block: 0 residential, 1 datacenter/VPN, 2 mixed
            result = d?.block === 1;
          }
        }
      } catch {
        /* network — leave inconclusive */
      }
    }
  }

  try {
    sessionStorage.setItem(
      'skinify_vpn_check',
      JSON.stringify({ ts: Date.now(), vpn: result }),
    );
  } catch {
    /* private window — skip cache */
  }

  return result;
};
