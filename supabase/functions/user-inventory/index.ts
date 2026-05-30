import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Cache TTL for fetched inventories. 5 minutes is a good balance between
 * "fresh enough that newly-traded items disappear quickly" and "long enough
 * that we don't get IP-banned by Steam during traffic spikes." A user can
 * pass `?force=true` to bypass the cache and force a refetch.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Verbose per-item logs were leaking into every production fetch and adding
 * latency. Gate them behind a debug flag; lifecycle / error logs stay always.
 * Set USER_INVENTORY_DEBUG=true in Edge Function secrets to re-enable.
 */
const VERBOSE = Deno.env.get('USER_INVENTORY_DEBUG') === 'true';
const vlog = (...args: any[]) => { if (VERBOSE) console.log(...args); };

interface SteamInventoryAsset {
  assetid: string;
  classid: string;
  instanceid: string;
  amount: string;
}

interface SteamInventoryDescription {
  appid: number;
  classid: string;
  instanceid: string;
  icon_url: string;
  icon_url_large?: string;
  name: string;
  market_name?: string;
  type: string;
  tradable: number;
  marketable: number;
  descriptions?: Array<{
    type: string;
    value: string;
  }>;
  tags?: Array<{
    category: string;
    internal_name: string;
    localized_category_name?: string;
    localized_tag_name?: string;
    name?: string;
  }>;
}

interface SteamInventoryResponse {
  assets?: SteamInventoryAsset[];
  descriptions?: SteamInventoryDescription[];
  success: boolean;
  error?: string;
  total_inventory_count?: number;
}

interface ProcessedItem {
  id: string;
  name: string;
  market_name: string;
  type: string;
  rarity: string;
  condition: string;
  price_estimate: number;
  image: string;
  tradable: boolean;
  marketable: boolean;
  float?: string;
  stickers?: string[];
  assetid: string;
  classid: string;
  instanceid: string;
}

/**
 * Resolve Steam custom URL to Steam ID64
 * @param steamId - Steam ID or custom URL
 * @returns Promise<string> - Steam ID64
 */
async function resolveSteamId(steamId: string): Promise<string> {
  // Check if it's already a numeric Steam ID64
  const isNumericSteamId = /^\d+$/.test(steamId) && steamId.length >= 8;
  
  if (isNumericSteamId) {
    console.log('Steam ID is already numeric:', steamId);
    return steamId;
  }
  
  console.log('Resolving custom Steam URL:', steamId);
  
  try {
    // Resolve custom URL to Steam ID64 via XML profile
    const profileResponse = await fetch(`https://steamcommunity.com/id/${steamId}/?xml=1`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (profileResponse.ok) {
      const xmlText = await profileResponse.text();
      const steamId64Match = xmlText.match(/<steamID64>(\d+)<\/steamID64>/);
      
      if (steamId64Match) {
        console.log(`Resolved ${steamId} to Steam ID64: ${steamId64Match[1]}`);
        return steamId64Match[1];
      }
    }
  } catch (error) {
    console.warn('Failed to resolve Steam ID64:', error);
  }
  
  // Return original if resolution failed
  return steamId;
}

/**
 * Extract rarity from Steam item tags
 * @param tags - Array of item tags
 * @returns Rarity string
 */
function getRarityFromTags(tags?: any[]): string {
  if (!tags) return 'Consumer Grade';
  
  const rarityTag = tags.find(tag => tag.category === 'Rarity');
  return rarityTag?.localized_tag_name || rarityTag?.name || 'Consumer Grade';
}

/**
 * Extract condition from item market name
 * @param marketName - Item market name
 * @returns Condition string
 */
function getConditionFromName(marketName: string): string {
  if (marketName.includes('Factory New')) return 'Factory New';
  if (marketName.includes('Minimal Wear')) return 'Minimal Wear';
  if (marketName.includes('Field-Tested')) return 'Field-Tested';
  if (marketName.includes('Well-Worn')) return 'Well-Worn';
  if (marketName.includes('Battle-Scarred')) return 'Battle-Scarred';
  return 'Not Painted';
}

/**
 * Extract weapon/item type from tags
 * @param tags - Array of item tags
 * @returns Type string
 */
function getTypeFromTags(tags?: any[]): string {
  if (!tags) return 'Unknown';
  
  const typeTag = tags.find(tag => tag.category === 'Type');
  if (typeTag) {
    return typeTag.localized_tag_name || typeTag.name || 'Unknown';
  }
  
  const weaponTag = tags.find(tag => tag.category === 'Weapon');
  if (weaponTag) {
    return weaponTag.localized_tag_name || weaponTag.name || 'Unknown';
  }
  
  return 'Unknown';
}

/**
 * Extract float value from descriptions
 * @param descriptions - Array of item descriptions
 * @returns Float value as string or undefined
 */
function extractFloat(descriptions?: any[]): string | undefined {
  if (!descriptions) return undefined;
  
  const floatDesc = descriptions.find(desc => 
    desc.value && desc.value.includes('Float Value:')
  );
  
  if (floatDesc) {
    const match = floatDesc.value.match(/Float Value: ([0-9.]+)/);
    return match ? match[1] : undefined;
  }
  
  return undefined;
}

/**
 * Parse Steam's sticker_info HTML to extract actual sticker data
 * @param descriptions - Array of item descriptions
 * @returns Array of sticker objects
 */
function extractStickers(descriptions: any[]): Array<{
  name: string;
  slot: number;
  wear?: number;
  image?: string;
  tournament?: string;
  rarity?: string;
  estimated_price?: number;
}> {
  // Return empty array for invalid input
  if (!descriptions || descriptions.length === 0) return [];

  try {
    vlog('=== PARSING STEAM STICKER DATA ===');
    vlog(`Total descriptions: ${descriptions.length}`);

    const stickerInfo = descriptions.find(desc => desc && desc.name === 'sticker_info');

    if (!stickerInfo || !stickerInfo.value) {
      return [];
    }

    vlog('Raw sticker_info HTML:', stickerInfo.value);

    const stickers: Array<{
      name: string;
      slot: number;
      wear?: number;
      image?: string;
      tournament?: string;
      rarity?: string;
      estimated_price?: number;
    }> = [];

    // Method 1: Extract from img tags with title attributes
    const imgTagRegex = /<img[^>]*src="([^"]*)"[^>]*title="Sticker:\s*([^"]*)"[^>]*>/gi;
    let match;
    let stickerSlot = 0;

    while ((match = imgTagRegex.exec(stickerInfo.value)) !== null) {
      const imageUrl = match[1];
      const stickerName = match[2].trim();

      vlog(`Found img sticker: "${stickerName}" with image: ${imageUrl}`);

      if (stickerName) {
        stickers.push(createStickerObject(stickerName, ++stickerSlot, imageUrl));
      }
    }

    // Method 2: If no img tags found, try parsing <center> tags
    if (stickers.length === 0) {
      vlog('No img tags found, trying center tag parsing...');

      const centerRegex = /<center[^>]*>(?:[^<]*<br[^>]*>)?\s*Sticker:\s*([^<]+)<\/center>/gi;

      while ((match = centerRegex.exec(stickerInfo.value)) !== null) {
        const stickerName = match[1].trim();

        vlog(`Found center sticker: "${stickerName}"`);

        if (stickerName) {
          stickers.push(createStickerObject(stickerName, ++stickerSlot));
        }
      }
    }

    // Method 3: Parse simple text format "Sticker: Name"
    if (stickers.length === 0) {
      vlog('No structured stickers found, trying text parsing...');

      const cleanText = stickerInfo.value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      vlog('Clean text:', cleanText);

      const textMatch = cleanText.match(/Sticker:\s*(.+)/);
      if (textMatch) {
        const stickersText = textMatch[1].trim();
        vlog(`Found sticker text: "${stickersText}"`);

        const stickerNames = stickersText.split(',').map(name => name.trim()).filter(name => name);

        stickerNames.forEach((name, index) => {
          vlog(`Adding text sticker: "${name}"`);
          stickers.push(createStickerObject(name, index + 1));
        });
      }
    }

    vlog(`Sticker extraction complete — total found: ${stickers.length}`);

    return stickers;
  } catch (error) {
    console.error('Error in extractStickers:', error);
    return []; // Return empty array instead of throwing
  }
}

/**
 * Create a sticker object with proper Steam data
 */
function createStickerObject(
  name: string, 
  slot: number, 
  imageUrl?: string
): {
  name: string;
  slot: number;
  wear?: number;
  image?: string;
  tournament?: string;
  rarity?: string;
  estimated_price?: number;
} {
  const tournament = detectTournament(name);
  const { rarity, estimated_price } = getStickerRarityAndPrice(name, tournament);
  
  return {
    name: name,
    slot: slot,
    wear: 0.01 + Math.random() * 0.15, // 1-16% wear simulation
    image: imageUrl || generateStickerImageUrl(name),
    tournament: tournament,
    rarity: rarity,
    estimated_price: estimated_price
  };
}

/**
 * Extract wear category from descriptions
 */
function extractWearCategory(descriptions: any[]): string {
  if (!descriptions) return 'Not Painted';
  
  const wearInfo = descriptions.find(desc => desc.name === 'exterior_wear');
  if (!wearInfo || !wearInfo.value) {
    return 'Not Painted';
  }
  
  // Parse "Exterior: Field-Tested" format
  const wearMatch = wearInfo.value.match(/Exterior:\s*(.+)/);
  return wearMatch ? wearMatch[1].trim() : 'Not Painted';
}

/**
 * Extract inspect link from actions array
 */
function extractInspectLink(actions: any[]): string | null {
  if (!actions) return null;
  
  const inspectAction = actions.find(action => 
    action.link && action.link.includes('csgo_econ_action_preview')
  );
  
  return inspectAction ? inspectAction.link : null;
}

/**
 * Get float value from CSGOFloat API (optional)
 */
async function getFloatFromCSGOFloat(inspectLink: string): Promise<number | null> {
  try {
    // This would call CSGOFloat API in production
    console.log('Would fetch float from CSGOFloat API for:', inspectLink);
    return 0.1 + Math.random() * 0.8; // Mock float between 0.1-0.9
  } catch (error) {
    console.error('CSGOFloat API error:', error);
    return null;
  }
}

/**
 * Extract float and pattern from asset_properties
 */
function extractFloatFromAssetProperties(assetProperties?: Array<{ propertyid: number; float_value?: string; int_value?: string; name: string }>): { float?: string; pattern?: string } {
  if (!assetProperties) return {};

  const result: { float?: string; pattern?: string } = {};

  // Look for Wear Rating (float value) - propertyid 2
  const wearRating = assetProperties.find(prop => prop.propertyid === 2 || prop.name === 'Wear Rating');
  if (wearRating && wearRating.float_value) {
    result.float = wearRating.float_value;
  }

  // Look for Pattern Template - propertyid 1
  const patternTemplate = assetProperties.find(prop => prop.propertyid === 1 || prop.name === 'Pattern Template');
  if (patternTemplate && patternTemplate.int_value) {
    result.pattern = patternTemplate.int_value;
  }

  return result;
}

/**
 * Parse a CS2 item from Steam Inventory API JSON response
 * @param asset - Steam asset object
 * @param description - Steam description object
 * @param assetProperties - Asset properties containing float/pattern
 * @returns Processed item object
 */
function parseCS2Item(asset: any, description: any, assetProperties?: any[]): any {
  vlog('=== PARSING CS2 ITEM ===');
  vlog('Asset:', { assetid: asset.assetid, classid: asset.classid, instanceid: asset.instanceid });
  vlog('Description:', { name: description.name, market_name: description.market_name });

  // Extract basic item info
  const basicInfo = {
    name: description.market_name || description.name || 'Unknown Item',
    assetid: asset.assetid,
    image: description.icon_url_large
      ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url_large}`
      : description.icon_url
        ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url}`
        : 'https://steamcommunity-a.akamaihd.net/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICfTH5s2H6IhxFcH8E2SbkCPAL-fYJ0zJyZKgdP4nzCjsLa45O',
    tradable: description.tradable === 1,
    marketable: description.marketable === 1
  };

  vlog('Basic info extracted:', basicInfo);

  // Extract stickers from descriptions (wrap in try-catch to prevent failures)
  let stickers = [];
  try {
    stickers = extractStickers(description.descriptions || []);
  } catch (error) {
    console.error(`Error extracting stickers for ${basicInfo.name}:`, error);
    stickers = [];
  }

  // Extract wear category
  const wearCategory = extractWearCategory(description.descriptions || []);

  // Extract inspect link
  const inspectLink = extractInspectLink(description.actions || []);

  // Extract float and pattern from asset_properties (most accurate)
  const { float: assetFloat, pattern: assetPattern } = extractFloatFromAssetProperties(assetProperties);

  // Fallback: try to extract float from descriptions if not in asset_properties
  const descriptionFloat = extractFloat(description.descriptions || []);
  const finalFloat = assetFloat || descriptionFloat;

  if (finalFloat) {
    vlog(`Float extracted for ${basicInfo.name}: ${finalFloat}`);
  }
  if (assetPattern) {
    vlog(`Pattern extracted for ${basicInfo.name}: ${assetPattern}`);
  }

  // Extract other item properties
  const rarity = getRarityFromTags(description.tags);
  const condition = getConditionFromName(basicInfo.name);
  const type = getTypeFromTags(description.tags);
  const priceEstimate = estimatePrice(rarity, condition, basicInfo.name);

  return {
    id: `${asset.classid}_${asset.instanceid}_${asset.assetid}`,
    name: basicInfo.name,
    market_name: basicInfo.name,
    type,
    rarity,
    condition,
    price_estimate: priceEstimate,
    image: basicInfo.image,
    tradable: basicInfo.tradable,
    marketable: basicInfo.marketable,
    float: finalFloat,
    pattern: assetPattern,
    wear_category: wearCategory,
    stickers,
    inspect_link: inspectLink,
    assetid: asset.assetid,
    classid: asset.classid,
    instanceid: asset.instanceid
  };
}

/**
 * Generate Steam sticker image URL from name
 */
function generateStickerImageUrl(stickerName: string): string {
  // Convert sticker name to Steam CDN format
  const urlSafeName = stickerName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Remove multiple underscores
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  return `https://steamcommunity-a.akamaihd.net/economy/image/sticker/${urlSafeName}`;
}

/**
 * Detect tournament from sticker name
 */
function detectTournament(name: string): string {
  const nameLower = name.toLowerCase();
  
  if (nameLower.includes('katowice 2014')) return 'Katowice 2014';
  if (nameLower.includes('stockholm 2021')) return 'Stockholm 2021';
  if (nameLower.includes('antwerp 2022')) return 'Antwerp 2022';
  if (nameLower.includes('paris 2023')) return 'Paris 2023';
  if (nameLower.includes('copenhagen 2024')) return 'Copenhagen 2024';
  if (nameLower.includes('cologne')) return 'ESL Cologne';
  if (nameLower.includes('mlg')) return 'MLG Columbus';
  if (nameLower.includes('boston')) return 'Boston 2018';
  if (nameLower.includes('berlin')) return 'Berlin 2019';
  
  return '';
}

/**
 * Get sticker rarity and price based on name and tournament
 */
function getStickerRarityAndPrice(name: string, tournament: string): { rarity: string; estimated_price: number } {
  const nameLower = name.toLowerCase();
  
  // Katowice 2014 - Most expensive stickers
  if (tournament === 'Katowice 2014') {
    if (nameLower.includes('ibuypower') && nameLower.includes('holo')) {
      return { rarity: 'Legendary', estimated_price: 2000000 }; // 2M CZK
    }
    if (nameLower.includes('titan') && nameLower.includes('holo')) {
      return { rarity: 'Legendary', estimated_price: 1500000 }; // 1.5M CZK
    }
    if (nameLower.includes('holo')) {
      return { rarity: 'Legendary', estimated_price: 50000 + Math.random() * 200000 }; // 50k-250k
    }
    return { rarity: 'Exotic', estimated_price: 10000 + Math.random() * 40000 }; // 10k-50k
  }
  
  // Modern tournaments
  if (tournament.includes('Stockholm') || tournament.includes('Antwerp')) {
    if (nameLower.includes('holo')) {
      return { rarity: 'Exotic', estimated_price: 500 + Math.random() * 2000 }; // 500-2500 CZK
    }
    if (nameLower.includes('foil')) {
      return { rarity: 'Remarkable', estimated_price: 200 + Math.random() * 800 }; // 200-1000 CZK
    }
    return { rarity: 'High Grade', estimated_price: 50 + Math.random() * 200 }; // 50-250 CZK
  }
  
  // Default pricing for other stickers
  if (nameLower.includes('holo')) {
    return { rarity: 'Exotic', estimated_price: 1000 + Math.random() * 3000 }; // 1k-4k CZK
  }
  if (nameLower.includes('foil')) {
    return { rarity: 'Remarkable', estimated_price: 300 + Math.random() * 1200 }; // 300-1500 CZK
  }
  
  return { rarity: 'Normal', estimated_price: 20 + Math.random() * 180 }; // 20-200 CZK
}

/**
 * Estimate item price based on rarity and condition
 * @param rarity - Item rarity
 * @param condition - Item condition  
 * @param marketName - Item market name
 * @returns Estimated price in CZK
 */
function estimatePrice(rarity: string, condition: string, marketName: string): number {
  let basePrice = 50;
  
  // Rarity multipliers
  const rarityMultipliers: { [key: string]: number } = {
    'exceedingly rare': 100,    // Knives, Gloves
    'covert': 20,               // Red items
    'classified': 5,            // Pink items
    'restricted': 3,            // Purple items
    'mil-spec grade': 2,        // Blue items
    'industrial grade': 1.2,    // Light blue items
    'consumer grade': 1         // Gray items
  };
  
  basePrice *= rarityMultipliers[rarity.toLowerCase()] || 1;
  
  // Condition multipliers
  const conditionMultipliers: { [key: string]: number } = {
    'factory new': 1.5,
    'minimal wear': 1.2,
    'field-tested': 1.0,
    'well-worn': 0.8,
    'battle-scarred': 0.6
  };
  
  basePrice *= conditionMultipliers[condition.toLowerCase()] || 1;
  
  // Special items detection
  if (marketName.includes('★')) basePrice *= 10;        // Knives/Gloves
  if (marketName.includes('StatTrak™')) basePrice *= 2; // StatTrak
  if (marketName.includes('Souvenir')) basePrice *= 1.5; // Souvenir
  
  // High-value skins
  if (marketName.includes('Dragon Lore')) basePrice *= 50;
  if (marketName.includes('Medusa')) basePrice *= 30;
  if (marketName.includes('Howl')) basePrice *= 25;
  if (marketName.includes('Fire Serpent')) basePrice *= 15;
  
  // Add randomness (±20%)
  const randomFactor = 0.8 + Math.random() * 0.4;
  
  return Math.round(basePrice * randomFactor);
}

/**
 * Main handler for Steam inventory fetching
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
    const steamId = url.searchParams.get('steamId');
    const debugMode = url.searchParams.get('debug') === 'true';
    const forceRefresh = url.searchParams.get('force') === 'true';

    if (!steamId) {
      return new Response(
        JSON.stringify({
          error: 'Steam ID parameter is required',
          usage: 'GET /user-inventory?steamId=<STEAM_ID>&force=true&debug=true (optional)',
          timestamp: new Date().toISOString()
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Step 1: Resolve Steam ID to Steam ID64 if needed
    const steamId64 = await resolveSteamId(steamId);

    // Step 1.5: Cache lookup — Steam's inventory endpoint is per-IP rate-limited
    // (≈20 req/min). Without caching we burn the quota on every page navigation.
    // Bypass with `?force=true` or `?debug=true`.
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const db = (supabaseUrl && supabaseServiceKey)
      ? createClient(supabaseUrl, supabaseServiceKey)
      : null;

    if (db && !forceRefresh && !debugMode) {
      const freshSince = new Date(Date.now() - CACHE_TTL_MS).toISOString();
      const { data: cached } = await db
        .from('user_inventories')
        .select('*')
        .eq('steam_id', steamId64)
        .gte('last_updated', freshSince)
        .order('last_updated', { ascending: false });

      if (cached && cached.length > 0) {
        const items: ProcessedItem[] = cached.map((row: any) => ({
          id: row.asset_id,
          name: row.item_name || row.market_name || '',
          market_name: row.market_name || '',
          type: row.item_type || 'Unknown',
          rarity: row.rarity || 'Consumer Grade',
          condition: row.condition || 'Not Painted',
          price_estimate: Number(row.price_estimate || 0),
          image: row.image_url || '',
          tradable: !!row.tradable,
          marketable: !!row.marketable,
          float: row.float_value ?? undefined,
          stickers: row.stickers ?? undefined,
          assetid: row.asset_id,
          classid: row.class_id,
          instanceid: row.instance_id,
        }));
        const totalValue = items.reduce((s, it) => s + it.price_estimate, 0);
        return new Response(
          JSON.stringify({
            steam_id: steamId64,
            original_steam_id: steamId,
            items,
            total: items.length,
            total_value: totalValue,
            currency: 'CZK',
            last_updated: cached[0].last_updated,
            cached: true,
            cache_ttl_seconds: Math.floor(CACHE_TTL_MS / 1000),
          }),
          { headers: { 'Content-Type': 'application/json', ...corsHeaders }, status: 200 },
        );
      }
    }

    // Step 2: Construct Steam inventory URL exactly as specified
    const inventoryUrl = `https://steamcommunity.com/inventory/${steamId64}/730/2`;
    console.log('Fetching from URL:', inventoryUrl);

    // Step 3: Fetch the JSON from Steam
    const response = await fetch(inventoryUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': `https://steamcommunity.com/profiles/${steamId64}/inventory/`,
      },
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    console.log('Steam API Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      let errorMessage = '';
      if (response.status === 403) {
        errorMessage = 'Steam inventory is private. Please set your Steam inventory to Public in your Steam Profile Privacy Settings.';
      } else if (response.status === 404) {
        errorMessage = 'Steam profile not found. The Steam ID may be invalid.';
      } else if (response.status === 500) {
        errorMessage = 'Steam server error. Steam\'s servers may be temporarily unavailable.';
      } else {
        errorMessage = `Steam API error: ${response.status} ${response.statusText}`;
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: response.status,
          steam_id: steamId64,
          inventory_url: inventoryUrl,
          instructions: [
            'Go to Steam Profile Privacy Settings',
            'Set Profile to Public',
            'Set Game Details to Public', 
            'Set Inventory to Public',
            'Wait 15-30 minutes for changes to take effect'
          ],
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Step 4: Parse the JSON response from Steam
    const inventoryData: SteamInventoryResponse = await response.json();

    console.log('Steam JSON parsed:', {
      success: inventoryData.success,
      total_inventory_count: inventoryData.total_inventory_count,
      assets_count: inventoryData.assets?.length || 0,
      descriptions_count: inventoryData.descriptions?.length || 0,
      has_asset_properties: !!(inventoryData as any).asset_properties,
      asset_properties_count: ((inventoryData as any).asset_properties as any[])?.length || 0,
      error: inventoryData.error
    });

    // DEBUG MODE: Return raw Steam API response
    if (debugMode) {
      console.log('DEBUG MODE: Returning raw Steam API response');

      // Sample first asset, description, and asset_property for inspection
      const sampleData = {
        success: inventoryData.success,
        total_count: inventoryData.total_inventory_count,
        assets_count: inventoryData.assets?.length || 0,
        descriptions_count: inventoryData.descriptions?.length || 0,
        has_asset_properties: !!(inventoryData as any).asset_properties,
        asset_properties_count: ((inventoryData as any).asset_properties as any[])?.length || 0,
        sample_asset: inventoryData.assets?.[0] || null,
        sample_description: inventoryData.descriptions?.[0] || null,
        sample_asset_property: ((inventoryData as any).asset_properties as any[])?.[0] || null,
        first_5_assets: inventoryData.assets?.slice(0, 5) || [],
        first_5_asset_properties: ((inventoryData as any).asset_properties as any[])?.slice(0, 5) || [],
        full_response_keys: Object.keys(inventoryData)
      };

      return new Response(
        JSON.stringify(sampleData, null, 2),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (inventoryData.error) {
      return new Response(
        JSON.stringify({ 
          error: `Steam inventory error: ${inventoryData.error}`,
          steam_id: steamId64,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    if (!inventoryData.success) {
      return new Response(
        JSON.stringify({ 
          error: 'Steam API returned success: false',
          steam_response: inventoryData,
          steam_id: steamId64,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      );
    }

    // Step 5: Process the inventory data
    const items: ProcessedItem[] = [];

    if (inventoryData.assets && inventoryData.descriptions) {
      console.log('Processing inventory items...');

      // Create description lookup map
      const descriptionMap = new Map<string, SteamInventoryDescription>();
      inventoryData.descriptions.forEach(desc => {
        const key = `${desc.classid}_${desc.instanceid}`;
        descriptionMap.set(key, desc);
      });

      // Create asset_properties lookup map (if available in response)
      const assetPropertiesMap = new Map<string, any[]>();
      if ((inventoryData as any).asset_properties) {
        console.log('Asset properties found in response');
        for (const assetProp of (inventoryData as any).asset_properties) {
          if (assetProp.assetid) {
            assetPropertiesMap.set(assetProp.assetid, assetProp.asset_properties || []);
          }
        }
        console.log(`Built asset properties map with ${assetPropertiesMap.size} entries`);
      } else {
        console.log('No asset_properties in Steam response - float values may not be available');
      }

      // Process each asset with its description
      for (const asset of inventoryData.assets) {
        try {
          const key = `${asset.classid}_${asset.instanceid}`;
          const description = descriptionMap.get(key);

          if (description && description.appid === 730) { // CS2 items only (appid 730)
            // Get asset properties for this specific asset
            const assetProps = assetPropertiesMap.get(asset.assetid);

            // Use the new CS2 item parser with asset properties
            const processedItem = parseCS2Item(asset, description, assetProps);

            // Validate the processed item before adding
            if (processedItem && processedItem.name && processedItem.image) {
              items.push(processedItem);
            } else {
              console.warn('Skipping invalid item:', {
                assetid: asset.assetid,
                name: processedItem?.name,
                hasImage: !!processedItem?.image
              });
            }
          }
        } catch (error) {
          console.error('Error processing item:', {
            assetid: asset.assetid,
            error: error.message
          });
          // Continue processing other items instead of failing completely
        }
      }
    }

    const totalValue = items.reduce((sum, item) => sum + item.price_estimate, 0);

    // Step 5.5: Cache write-through — replace this user's rows in
    // user_inventories so subsequent requests within CACHE_TTL_MS skip Steam.
    // Steam's API rate-limits per IP, so caching is functional, not just an
    // optimization. We swallow cache errors so a DB hiccup never breaks the
    // user-facing response.
    if (db) {
      try {
        // Drop the user's old rows so deleted/traded items disappear.
        await db.from('user_inventories').delete().eq('steam_id', steamId64);
        if (items.length > 0) {
          const rows = items.map((it) => ({
            steam_id: steamId64,
            asset_id: it.assetid,
            class_id: it.classid,
            instance_id: it.instanceid,
            market_name: it.market_name,
            item_name: it.name,
            item_type: it.type,
            rarity: it.rarity,
            condition: it.condition,
            price_estimate: it.price_estimate,
            image_url: it.image,
            tradable: it.tradable,
            marketable: it.marketable,
            float_value: it.float ?? null,
            stickers: it.stickers ?? null,
            last_updated: new Date().toISOString(),
          }));
          // Insert in chunks to avoid hitting payload limits for huge inventories.
          const CHUNK = 200;
          for (let i = 0; i < rows.length; i += CHUNK) {
            const { error: insertErr } = await db
              .from('user_inventories')
              .insert(rows.slice(i, i + CHUNK));
            if (insertErr) {
              console.warn('[user-inventory] cache write chunk failed:', insertErr.message);
              break;
            }
          }
        }
      } catch (cacheErr) {
        console.warn('[user-inventory] cache write failed:', cacheErr);
      }
    }

    // Step 6: Return processed inventory
    const result = {
      steam_id: steamId64,
      original_steam_id: steamId,
      items: items,
      total: items.length,
      total_value: totalValue,
      currency: 'CZK',
      last_updated: new Date().toISOString(),
      source_url: inventoryUrl,
      cached: false,
      raw_steam_response: {
        success: inventoryData.success,
        total_inventory_count: inventoryData.total_inventory_count,
        processed_cs2_items: items.length
      }
    };

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        },
        status: 200
      }
    );

  } catch (error) {
    console.error('=== INVENTORY FETCH ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to fetch Steam inventory',
        details: error.stack || 'No additional details',
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