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

export const detectCurrencyFromIP = async (): Promise<{ currency: Currency; countryCode: string } | null> => {
  try {
    console.log('=== DETECTING CURRENCY FROM IP ===');

    const response = await fetch('https://ipapi.co/json/', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Geolocation API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Geolocation data:', data);

    const countryCode = data.country_code || data.country;
    console.log('Country code:', countryCode);

    if (!countryCode) {
      console.warn('No country code detected');
      return null;
    }

    const currencyCode = countryCurrencyMap[countryCode] || data.currency;
    console.log('Detected currency code:', currencyCode);

    if (!currencyCode) {
      console.warn('No currency mapping found for country:', countryCode);
      return null;
    }

    const currency = currencies.find(c => c.code === currencyCode);

    if (currency) {
      console.log('✅ Currency detected:', currency.name, currency.symbol);
      return { currency, countryCode };
    } else {
      console.warn('Currency not supported:', currencyCode);
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
