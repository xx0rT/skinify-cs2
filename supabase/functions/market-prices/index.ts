import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface MarketPriceResponse {
  success: boolean;
  lowest_price?: string;
  volume?: string;
  median_price?: string;
}

interface CachedPrice {
  market_hash_name: string;
  lowest_price: number;
  median_price: number;
  volume: number;
  currency: string;
  last_updated: string;
  success: boolean;
}

interface PriceRequest {
  market_hash_name: string;
  country?: string;
  currency?: number;
}

/**
 * Parse price string to number (removes currency symbols)
 * @param priceStr - Price string like "$12.34" or "€10,50"
 * @returns Numeric price value
 */
function parsePriceString(priceStr: string): number {
  if (!priceStr) return 0;
  
  // Remove currency symbols and convert commas to dots
  const cleanPrice = priceStr.replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(cleanPrice) || 0;
}

/**
 * Convert price from USD to CZK (approximate conversion)
 * @param usdPrice - Price in USD
 * @returns Price in CZK
 */
function convertToCZK(usdPrice: number): number {
  const USD_TO_CZK_RATE = 23.5; // Approximate rate, in production use real exchange rate API
  return Math.round(usdPrice * USD_TO_CZK_RATE);
}

/**
 * Fetch market price from Steam Community Market API
 * @param marketHashName - Item's market hash name
 * @param country - Country code (default: US)
 * @param currency - Currency code (default: 1 for USD)
 * @returns Promise<MarketPriceResponse>
 */
async function fetchSteamMarketPrice(
  marketHashName: string, 
  country: string = 'US', 
  currency: number = 1
): Promise<MarketPriceResponse> {
  const encodedName = encodeURIComponent(marketHashName);
  const url = `https://steamcommunity.com/market/priceoverview/?country=${country}&currency=${currency}&appid=730&market_hash_name=${encodedName}`;
  
  console.log(`Fetching price for: ${marketHashName}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://steamcommunity.com/market/',
    },
    signal: AbortSignal.timeout(15000) // 15 second timeout
  });

  if (!response.ok) {
    throw new Error(`Steam Market API error: ${response.status} ${response.statusText}`);
  }

  const data: MarketPriceResponse = await response.json();
  
  if (!data.success) {
    console.warn(`No market data available for: ${marketHashName}`);
  }

  return data;
}

/**
 * Cache price data in Supabase
 * @param supabase - Supabase client
 * @param priceData - Price data to cache
 */
async function cachePriceData(supabase: any, priceData: CachedPrice): Promise<void> {
  const { error } = await supabase
    .from('market_prices')
    .upsert(priceData, { onConflict: 'market_hash_name' });

  if (error) {
    console.error('Failed to cache price data:', error);
    // Don't throw error, caching is optional
  }
}

/**
 * Get cached price data from Supabase
 * @param supabase - Supabase client
 * @param marketHashName - Item's market hash name
 * @param maxAgeMinutes - Maximum age of cached data in minutes
 * @returns Cached price data or null
 */
async function getCachedPrice(
  supabase: any, 
  marketHashName: string, 
  maxAgeMinutes: number = 30
): Promise<CachedPrice | null> {
  const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('market_prices')
    .select('*')
    .eq('market_hash_name', marketHashName)
    .gte('last_updated', cutoffTime)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Rate limiting: Simple in-memory store for request timestamps
 */
const rateLimitMap = new Map<string, number[]>();

/**
 * Check if request should be rate limited
 * @param key - Rate limit key (IP address)
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if request should be blocked
 */
function isRateLimited(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(key) || [];
  
  // Remove old requests outside the window
  const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
  
  if (validRequests.length >= maxRequests) {
    return true;
  }
  
  // Add current request
  validRequests.push(now);
  rateLimitMap.set(key, validRequests);
  
  return false;
}

/**
 * Main handler for market price fetching
 */
Deno.serve(async (req) => {
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const url = new URL(req.url);
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Rate limiting check
    if (isRateLimited(clientIP, 20, 60000)) { // 20 requests per minute
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          limit: '20 requests per minute'
        }),
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // Single item price request
      const marketHashName = url.searchParams.get('market_hash_name');
      const country = url.searchParams.get('country') || 'US';
      const currency = parseInt(url.searchParams.get('currency') || '1');

      if (!marketHashName) {
        return new Response(
          JSON.stringify({ error: 'market_hash_name parameter is required' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }

      console.log(`=== PRICE REQUEST ===`);
      console.log(`Item: ${marketHashName}`);
      console.log(`Country: ${country}, Currency: ${currency}`);

      // Check cache first
      const cachedPrice = await getCachedPrice(supabase, marketHashName, 30);
      
      if (cachedPrice) {
        console.log('Returning cached price data');
        return new Response(
          JSON.stringify({
            market_hash_name: cachedPrice.market_hash_name,
            lowest_price: cachedPrice.lowest_price,
            median_price: cachedPrice.median_price,
            volume: cachedPrice.volume,
            currency: cachedPrice.currency,
            cached: true,
            last_updated: cachedPrice.last_updated
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      }

      // Fetch from Steam Market API
      try {
        const marketData = await fetchSteamMarketPrice(marketHashName, country, currency);
        
        const lowestPrice = parsePriceString(marketData.lowest_price || '0');
        const medianPrice = parsePriceString(marketData.median_price || '0');
        const volume = parseInt(marketData.volume || '0');

        // Convert to CZK if needed
        const lowestPriceCZK = currency === 1 ? convertToCZK(lowestPrice) : lowestPrice;
        const medianPriceCZK = currency === 1 ? convertToCZK(medianPrice) : medianPrice;

        const priceData: CachedPrice = {
          market_hash_name: marketHashName,
          lowest_price: lowestPriceCZK,
          median_price: medianPriceCZK,
          volume: volume,
          currency: currency === 1 ? 'CZK' : 'USD',
          last_updated: new Date().toISOString(),
          success: marketData.success
        };

        // Cache the result
        await cachePriceData(supabase, priceData);

        console.log(`Price fetched: ${lowestPriceCZK} CZK`);

        return new Response(
          JSON.stringify({
            market_hash_name: marketHashName,
            lowest_price: lowestPriceCZK,
            median_price: medianPriceCZK,
            volume: volume,
            currency: 'CZK',
            cached: false,
            success: marketData.success,
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );

      } catch (steamError) {
        console.error('Steam Market API error:', steamError);
        
        // Return estimated price based on item name patterns
        const estimatedPrice = estimateItemPrice(marketHashName);
        
        return new Response(
          JSON.stringify({
            market_hash_name: marketHashName,
            lowest_price: estimatedPrice,
            median_price: estimatedPrice,
            volume: 0,
            currency: 'CZK',
            estimated: true,
            error: 'Steam Market API unavailable',
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      }

    } else if (req.method === 'POST') {
      // Check if this is a price history request
      const requestBody = await req.json();

      // Price history request
      if (requestBody.itemName && !requestBody.items) {
        const { itemName } = requestBody;

        console.log(`=== PRICE HISTORY REQUEST ===`);
        console.log(`Item: ${itemName}`);

        // First, get listing IDs for this item
        const { data: listings } = await supabase
          .from('marketplace_listings')
          .select('id, price, created_at, is_active')
          .eq('market_hash_name', itemName);

        if (!listings || listings.length === 0) {
          console.log('No listings found for item');
          return new Response(
            JSON.stringify({
              success: true,
              itemName,
              prices: []
            }),
            {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
              status: 200
            }
          );
        }

        const listingIds = listings.map(l => l.id);

        // Fetch price history for these listing IDs
        const { data: historyData, error: historyError } = await supabase
          .from('marketplace_price_history')
          .select('price, recorded_at, listing_id')
          .in('listing_id', listingIds)
          .order('recorded_at', { ascending: true })
          .limit(200);

        if (historyError) {
          console.error('Error fetching price history:', historyError);
        }

        // Get active listings
        const currentListings = listings.filter(l => l.is_active);

        // Aggregate prices by day
        const priceMap = new Map<string, { total: number; count: number }>();

        // Add historical prices
        if (historyData) {
          historyData.forEach((record: any) => {
            const date = new Date(record.recorded_at).toISOString().split('T')[0];
            const price = parseFloat(record.price);

            const existing = priceMap.get(date);
            if (existing) {
              existing.total += price;
              existing.count += 1;
            } else {
              priceMap.set(date, { total: price, count: 1 });
            }
          });
        }

        // Add current listings
        if (currentListings) {
          currentListings.forEach((listing: any) => {
            const date = new Date(listing.created_at).toISOString().split('T')[0];
            const price = parseFloat(listing.price);

            const existing = priceMap.get(date);
            if (existing) {
              existing.total += price;
              existing.count += 1;
            } else {
              priceMap.set(date, { total: price, count: 1 });
            }
          });
        }

        // Calculate daily averages
        const prices = Array.from(priceMap.entries())
          .map(([date, data]) => ({
            date,
            price: Math.round((data.total / data.count) * 100) / 100,
            volume: data.count
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-30); // Last 30 days

        console.log(`Found ${prices.length} days of price data`);

        return new Response(
          JSON.stringify({
            success: true,
            itemName,
            prices
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      }

      // Batch price request
      const items = requestBody.items;
      
      if (!items || !Array.isArray(items)) {
        return new Response(
          JSON.stringify({ error: 'Invalid request format. Expected { items: [...] }' }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          }
        );
      }

      console.log(`=== BATCH PRICE REQUEST ===`);
      console.log(`Items count: ${items.length}`);

      const results = [];
      const maxBatchSize = 10; // Limit batch size to prevent abuse

      for (let i = 0; i < Math.min(items.length, maxBatchSize); i++) {
        const item = items[i];
        
        try {
          // Check cache first
          const cachedPrice = await getCachedPrice(supabase, item.market_hash_name, 30);
          
          if (cachedPrice) {
            results.push({
              market_hash_name: cachedPrice.market_hash_name,
              lowest_price: cachedPrice.lowest_price,
              median_price: cachedPrice.median_price,
              volume: cachedPrice.volume,
              currency: cachedPrice.currency,
              cached: true
            });
          } else {
            // Fetch from Steam (with delay to avoid rate limits)
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
            }
            
            const marketData = await fetchSteamMarketPrice(
              item.market_hash_name, 
              item.country || 'US', 
              item.currency || 1
            );
            
            const lowestPrice = parsePriceString(marketData.lowest_price || '0');
            const lowestPriceCZK = convertToCZK(lowestPrice);
            
            results.push({
              market_hash_name: item.market_hash_name,
              lowest_price: lowestPriceCZK,
              median_price: convertToCZK(parsePriceString(marketData.median_price || '0')),
              volume: parseInt(marketData.volume || '0'),
              currency: 'CZK',
              cached: false,
              success: marketData.success
            });

            // Cache the result
            const priceData: CachedPrice = {
              market_hash_name: item.market_hash_name,
              lowest_price: lowestPriceCZK,
              median_price: convertToCZK(parsePriceString(marketData.median_price || '0')),
              volume: parseInt(marketData.volume || '0'),
              currency: 'CZK',
              last_updated: new Date().toISOString(),
              success: marketData.success
            };
            
            await cachePriceData(supabase, priceData);
          }
        } catch (error) {
          console.error(`Error fetching price for ${item.market_hash_name}:`, error);
          results.push({
            market_hash_name: item.market_hash_name,
            error: 'Failed to fetch price',
            estimated_price: estimateItemPrice(item.market_hash_name)
          });
        }
      }

      return new Response(
        JSON.stringify({
          results,
          total_items: results.length,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error) {
    console.error('=== MARKET PRICE ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch market prices',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
});

/**
 * Estimate item price based on name patterns (fallback)
 * @param marketHashName - Item name
 * @returns Estimated price in CZK
 */
function estimateItemPrice(marketHashName: string): number {
  const name = marketHashName.toLowerCase();
  
  // Knives and gloves
  if (name.includes('★')) return Math.floor(Math.random() * 50000) + 10000;
  
  // StatTrak items
  if (name.includes('stattrak™')) return Math.floor(Math.random() * 5000) + 1000;
  
  // High-tier skins
  if (name.includes('dragon lore') || name.includes('medusa') || name.includes('howl')) {
    return Math.floor(Math.random() * 100000) + 20000;
  }
  
  // Regular skins
  if (name.includes('ak-47') || name.includes('m4a4') || name.includes('awp')) {
    return Math.floor(Math.random() * 3000) + 500;
  }
  
  // Default estimation
  return Math.floor(Math.random() * 1000) + 100;
}