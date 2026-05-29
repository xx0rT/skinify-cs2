import { getSupabaseConfig } from '../config/supabase';

interface SteamMarketPrice {
  success: boolean;
  lowest_price?: string;
  median_price?: string;
  volume?: string;
}

interface MarketPriceData {
  lowestPrice: number;
  medianPrice: number;
  recommendedPrice: number;
  volume: number;
}

const CURRENCY_CODES = {
  USD: 1,
  EUR: 3,
  CZK: 5,
  GBP: 2,
} as const;

function parsePrice(priceString: string | undefined): number {
  if (!priceString) return 0;
  const cleaned = priceString.replace(/[^0-9.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export async function fetchSteamMarketPrice(
  itemName: string,
  currency: keyof typeof CURRENCY_CODES = 'USD'
): Promise<MarketPriceData | null> {
  try {
    const currencyCode = CURRENCY_CODES[currency];
    const { url: supabaseUrl, anonKey } = getSupabaseConfig();

    const proxyUrl = `${supabaseUrl}/functions/v1/steam-market-price?item=${encodeURIComponent(itemName)}&currency=${currencyCode}`;

    console.log(`[Steam API] Fetching price for: ${itemName}`);
    console.log(`[Steam API] Proxy URL: ${proxyUrl}`);

    const response = await fetch(proxyUrl, {
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[Steam API] Failed to fetch price for ${itemName} - Status: ${response.status}`);
      return null;
    }

    const result = await response.json();
    console.log(`[Steam API] Proxy response for ${itemName}:`, result);

    if (!result.success || !result.data) {
      console.warn(`[Steam API] Proxy returned no data for ${itemName}`);
      return null;
    }

    const data: SteamMarketPrice = result.data;

    if (!data.success) {
      console.warn(`[Steam API] Steam API returned success=false for ${itemName}`);
      return null;
    }

    const lowestPrice = parsePrice(data.lowest_price);
    const medianPrice = parsePrice(data.median_price);
    const volume = parseInt(data.volume || '0', 10);

    const recommendedPrice = medianPrice || lowestPrice || 0;

    console.log(`[Steam API] Parsed prices for ${itemName}:`, {
      lowestPrice,
      medianPrice,
      recommendedPrice,
      volume,
    });

    return {
      lowestPrice,
      medianPrice,
      recommendedPrice,
      volume,
    };
  } catch (error) {
    console.error(`[Steam API] Error fetching price for ${itemName}:`, error);
    return null;
  }
}

export function calculatePriceWithPercentage(basePrice: number, percentage: number): number {
  return basePrice * (1 + percentage / 100);
}

export function calculatePercentageDiff(currentPrice: number, basePrice: number): number {
  if (basePrice === 0) return 0;
  return ((currentPrice - basePrice) / basePrice) * 100;
}

export function formatMarketPrice(price: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    CZK: 'Kč',
    GBP: '£',
  };

  const symbol = symbols[currency] || currency;

  if (currency === 'CZK') {
    return `${price.toFixed(2)} ${symbol}`;
  }

  return `${symbol}${price.toFixed(2)}`;
}
