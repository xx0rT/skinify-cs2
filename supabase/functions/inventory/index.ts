import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ParsedInventoryItem {
  id: string;
  name: string;
  market_name: string;
  type: string;
  rarity: string;
  condition: string;
  image: string;
  tradable: boolean;
  marketable: boolean;
  float?: string;
  wear?: string;
  pattern?: string;
  stickers?: string[];
  price_estimate?: number;
}

function getRarityFromTags(tags: Array<{ category: string; localized_tag_name?: string; name?: string }>): string {
  const rarityTag = tags.find(tag => tag.category === 'Rarity');
  if (rarityTag) {
    return rarityTag.localized_tag_name || rarityTag.name || 'Unknown';
  }
  return 'Consumer Grade';
}

function getConditionFromName(name: string): string {
  if (name.includes('Factory New')) return 'Factory New';
  if (name.includes('Minimal Wear')) return 'Minimal Wear';
  if (name.includes('Field-Tested')) return 'Field-Tested';
  if (name.includes('Well-Worn')) return 'Well-Worn';
  if (name.includes('Battle-Scarred')) return 'Battle-Scarred';
  return 'Not Painted';
}

function getWeaponTypeFromTags(tags: Array<{ category: string; localized_tag_name?: string; name?: string }>): string {
  const typeTag = tags.find(tag => tag.category === 'Type');
  if (typeTag) {
    return typeTag.localized_tag_name || typeTag.name || 'Unknown';
  }
  return 'Unknown';
}

function extractFloatFromAssetProperties(assetProperties?: Array<{ propertyid: number; float_value?: string; int_value?: string; name: string }>): { float?: string; pattern?: string } {
  if (!assetProperties) return {};

  const result: { float?: string; pattern?: string } = {};

  // Look for Wear Rating (float value)
  const wearRating = assetProperties.find(prop => prop.propertyid === 2 || prop.name === 'Wear Rating');
  if (wearRating && wearRating.float_value) {
    result.float = wearRating.float_value;
  }

  // Look for Pattern Template
  const patternTemplate = assetProperties.find(prop => prop.propertyid === 1 || prop.name === 'Pattern Template');
  if (patternTemplate && patternTemplate.int_value) {
    result.pattern = patternTemplate.int_value;
  }

  return result;
}

function extractFloatFromDescriptions(descriptions?: Array<{ type: string; value: string }>): string | undefined {
  if (!descriptions) return undefined;

  const floatDesc = descriptions.find(desc => desc.value.includes('Float Value:'));
  if (floatDesc) {
    const match = floatDesc.value.match(/Float Value: ([0-9.]+)/);
    return match ? match[1] : undefined;
  }
  return undefined;
}

function extractStickersFromDescriptions(descriptions?: Array<{ type: string; value: string }>): string[] {
  if (!descriptions) return [];
  
  const stickerDesc = descriptions.find(desc => desc.value.includes('Sticker:'));
  if (stickerDesc) {
    const stickerMatch = stickerDesc.value.match(/Sticker: (.+)/);
    if (stickerMatch) {
      return stickerMatch[1].split(', ').map(sticker => sticker.trim());
    }
  }
  return [];
}

function estimatePrice(rarity: string, condition: string, marketName: string): number {
  let basePrice = 50; // Base price in CZK
  
  // Rarity multipliers
  switch (rarity.toLowerCase()) {
    case 'exceedingly rare': basePrice *= 100; break;
    case 'covert': basePrice *= 20; break;
    case 'classified': basePrice *= 5; break;
    case 'restricted': basePrice *= 3; break;
    case 'mil-spec grade': basePrice *= 2; break;
    default: basePrice *= 1;
  }
  
  // Condition multipliers
  switch (condition) {
    case 'Factory New': basePrice *= 1.5; break;
    case 'Minimal Wear': basePrice *= 1.2; break;
    case 'Field-Tested': basePrice *= 1.0; break;
    case 'Well-Worn': basePrice *= 0.8; break;
    case 'Battle-Scarred': basePrice *= 0.6; break;
    default: basePrice *= 1;
  }
  
  // Special items
  if (marketName.includes('Knife') || marketName.includes('Gloves')) {
    basePrice *= 10;
  }
  if (marketName.includes('StatTrak™')) {
    basePrice *= 2;
  }
  if (marketName.includes('Souvenir')) {
    basePrice *= 1.5;
  }
  
  // Add some randomness
  const randomFactor = 0.8 + Math.random() * 0.4; // ±20%
  return Math.round(basePrice * randomFactor);
}

// Wrap the entire serve function in a try-catch to ensure CORS headers are always returned
Deno.serve(async (req) => {
  // Variables declared at the top level to ensure they're always in scope
  let requestUrl: URL | null = null;
  let steamId: string | null = null;

  try {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { 
        headers: corsHeaders,
        status: 200 
      });
    }

    // Parse request URL and extract parameters
    try {
      requestUrl = new URL(req.url);
      steamId = requestUrl.searchParams.get('steamId');
    } catch (urlError) {
      console.error('Failed to parse request URL:', urlError);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request URL',
          details: urlError instanceof Error ? urlError.message : 'Unknown URL parsing error',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }
    
    if (!steamId) {
      return new Response(
        JSON.stringify({ 
          error: 'Steam ID is required',
          provided_steamid: steamId || 'null',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    console.log('=== STEAM INVENTORY FETCH START ===');
    console.log('Steam ID received:', steamId);

    // Handle all types of Steam IDs - numeric Steam ID64 or custom URLs
    const isNumericSteamId = /^\d+$/.test(steamId) && steamId.length >= 8;
    
    console.log('Steam ID type:', isNumericSteamId ? 'Numeric (Steam ID64)' : 'Custom URL');
    
    // If custom URL, we need to resolve it to Steam ID64 first
    let finalSteamId = steamId;
    if (!isNumericSteamId) {
      console.log('Resolving custom URL to Steam ID64...');
      try {
        const profileResponse = await fetch(`https://steamcommunity.com/id/${steamId}/?xml=1`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (profileResponse.ok) {
          const xmlText = await profileResponse.text();
          const steamId64Match = xmlText.match(/<steamID64>(\d+)<\/steamID64>/);
          if (steamId64Match) {
            finalSteamId = steamId64Match[1];
            console.log('Resolved Steam ID64:', finalSteamId);
          }
        }
      } catch (resolveError) {
        console.log('Failed to resolve Steam ID64, using original:', resolveError);
      }
    }


    const finalInventoryUrl = `https://steamcommunity.com/inventory/${finalSteamId}/730/2?l=english&count=5000`;
    console.log('Final inventory URL:', finalInventoryUrl);

    let response: Response | null = null;
    let lastError: Error | null = null;
    let attemptCount = 0;
    

    const maxAttempts = 2; 
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        attemptCount++;
        console.log(`Attempt ${attemptCount}: Fetching inventory JSON...`);
        
        // Add small delay to avoid rate limiting
        if (attemptCount > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        response = await fetch(finalInventoryUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': `https://steamcommunity.com/profiles/${finalSteamId}/inventory/`,
          },
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        
        console.log(`Response from inventory API (attempt ${attempt + 1}):`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: {
            'content-type': response.headers.get('content-type'),
            'content-length': response.headers.get('content-length'),
          }
        });
        
        if (response.ok) {
          console.log('SUCCESS! Got JSON response from Steam API');
          break;
        } else if (response.status === 403) {
          console.log('403 Forbidden - Inventory may be private');
          break; // Don't retry 403s
        } else if (response.status === 404) {
          console.log('404 Not Found - Steam ID may be invalid');
          break; // Don't retry 404s
        } else if (response.status === 500) {
          console.log('500 Internal Server Error - Steam server issue, retrying...');
        }
        
      } catch (fetchError) {
        console.error(`Error on attempt ${attemptCount}:`, fetchError);
        lastError = fetchError as Error;
        response = null;
      }
    }

    if (!response || !response.ok) {
      const finalStatus = response?.status || 0;
      const finalStatusText = response?.statusText || 'No response';
      
      console.error('=== API FETCH FAILED ===');
      console.error('Final status:', finalStatus, finalStatusText);
      console.error('Last error:', lastError?.message);
      console.error('Total attempts:', attemptCount);
      
      let errorMessage = '';
      if (finalStatus === 403) {
        errorMessage = `Steam inventory is private (${finalStatus}). Please set your Steam inventory to Public in your Steam Profile Privacy Settings. Steam ID: ${finalSteamId}`;
      } else if (finalStatus === 404) {
        errorMessage = `Steam profile not found (${finalStatus}). The Steam ID '${steamId}' may be invalid or the profile may not exist.`;
      } else if (finalStatus === 500) {
        errorMessage = `Steam server error (${finalStatus}). Steam's servers may be temporarily unavailable. Please try again later.`;
      } else if (finalStatus === 0) {
        errorMessage = `Network connection failed. Unable to reach Steam servers. Last error: ${lastError?.message || 'Unknown network error'}`;
      } else {
        errorMessage = `Failed to fetch Steam inventory with status ${finalStatus}: ${finalStatusText}. Tried ${attemptCount} attempts. Last error: ${lastError?.message || 'Unknown error'}`;
      }

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          status: finalStatus,
          attempts: attemptCount,
          steam_id: finalSteamId,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    console.log('=== PARSING JSON RESPONSE ===');

    let inventoryData: any;
    try {
      inventoryData = await response.json();
      console.log('JSON response keys:', Object.keys(inventoryData));
      console.log('Response structure:', {
        success: inventoryData.success,
        total_inventory_count: inventoryData.total_inventory_count,
        assets_length: inventoryData.assets?.length || 0,
        descriptions_length: inventoryData.descriptions?.length || 0,
        error: inventoryData.error,
        more_items: inventoryData.more_items,
        last_assetid: inventoryData.last_assetid
      });

      if (inventoryData.error) {
        return new Response(
          JSON.stringify({ 
            error: `Steam API error: ${inventoryData.error}`,
            steam_response: inventoryData,
            timestamp: new Date().toISOString()
          }),
          { 
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
      
      if (!inventoryData.success) {
        return new Response(
          JSON.stringify({ 
            error: 'Steam API returned success: false',
            steam_response: inventoryData,
            timestamp: new Date().toISOString()
          }),
          { 
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
      
    } catch (parseError) {
      console.error('Failed to parse Steam JSON response:', parseError);
      return new Response(
        JSON.stringify({ 
          error: `Steam returned invalid JSON data. Parse error: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
          raw_response_info: {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type')
          },
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        }
      );
    }

    console.log('=== PROCESSING INVENTORY DATA ===');

    const items: ParsedInventoryItem[] = [];
    
    if (inventoryData.assets && inventoryData.descriptions) {
      console.log('Processing assets and descriptions...');
      console.log('Total assets:', inventoryData.assets.length);
      console.log('Total descriptions:', inventoryData.descriptions.length);
      
      // Create a map of descriptions for quick lookup
      const descriptionsMap = new Map();
      for (const desc of inventoryData.descriptions) {
        const key = `${desc.classid}_${desc.instanceid}`;
        descriptionsMap.set(key, desc);
      }

      // Create a map of asset properties for quick lookup by assetid
      const assetPropertiesMap = new Map();
      if (inventoryData.asset_properties) {
        for (const assetProp of inventoryData.asset_properties) {
          if (assetProp.assetid) {
            assetPropertiesMap.set(assetProp.assetid, assetProp.asset_properties || []);
          }
        }
        console.log('Built asset properties map with', assetPropertiesMap.size, 'entries');
      }

      console.log('Built descriptions map with', descriptionsMap.size, 'entries');

      // Process each asset
      let processedCount = 0;
      let cs2ItemCount = 0;

      for (const asset of inventoryData.assets) {
        try {
          processedCount++;
          const key = `${asset.classid}_${asset.instanceid}`;
          const description = descriptionsMap.get(key);

          if (description) {
            // Check if it's a CS2 item
            if (description.appid === 730) {
              cs2ItemCount++;

              const rarity = getRarityFromTags(description.tags || []);
              const condition = getConditionFromName(description.market_name || description.name || '');
              const weaponType = getWeaponTypeFromTags(description.tags || []);

              // Try to get float and pattern from asset_properties first (more accurate)
              const assetProps = assetPropertiesMap.get(asset.assetid);
              const { float: assetFloat, pattern: assetPattern } = extractFloatFromAssetProperties(assetProps);

              // Fallback to description-based float if not in asset_properties
              const descriptionFloat = extractFloatFromDescriptions(description.descriptions);
              const finalFloat = assetFloat || descriptionFloat;

              const stickers = extractStickersFromDescriptions(description.descriptions);
              const priceEstimate = estimatePrice(rarity, condition, description.market_name || description.name || '');

              const item: ParsedInventoryItem = {
                id: `${asset.classid}_${asset.instanceid}_${asset.assetid}`,
                name: description.name || 'Unknown Item',
                market_name: description.market_name || description.name || 'Unknown Item',
                type: weaponType,
                rarity,
                condition,
                image: description.icon_url_large
                  ? `https://community.cloudflare.steamstatic.com/economy/image/${description.icon_url_large}`
                  : `https://community.cloudflare.steamstatic.com/economy/image/${description.icon_url}`,
                tradable: description.tradable === 1,
                marketable: description.marketable === 1,
                float: finalFloat,
                pattern: assetPattern,
                stickers,
                price_estimate: priceEstimate
              };

              items.push(item);
            }
          }
        } catch (itemError) {
          console.error(`Error processing asset ${processedCount}:`, itemError);
          // Continue processing other items
        }
      }
      
      console.log(`Processed ${processedCount} total assets, found ${cs2ItemCount} CS2 items, created ${items.length} item objects`);
      
    } else {
      console.error('Missing assets or descriptions in Steam response');
      console.log('Available keys:', Object.keys(inventoryData));
      
      // If no assets/descriptions, check for error messages
      if (inventoryData.error) {
        return new Response(
          JSON.stringify({ 
            error: `Steam inventory error: ${inventoryData.error}`,
            steam_response: inventoryData,
            timestamp: new Date().toISOString()
          }),
          { 
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          }
        );
      }
      
      if (inventoryData.total_inventory_count === 0) {
        console.log('Steam reports inventory is empty (total_inventory_count: 0)');
      }
    }

    const totalValue = items.reduce((sum, item) => sum + (item.price_estimate || 0), 0);

    console.log('=== PROCESSING COMPLETE ===');
    console.log('Total items found:', items.length);
    console.log('Total estimated value:', totalValue, 'CZK');

    const result = {
      items: items,
      total: items.length,
      total_value: totalValue,
      method: 'Steam JSON API',
      source_url: finalInventoryUrl,
      steam_id: finalSteamId,
      fetched_from: inventoryData.total_inventory_count ? 'Steam API' : 'Fallback',
      response_debug: {
        success: inventoryData.success,
        total_inventory_count: inventoryData.total_inventory_count,
        assets_count: inventoryData.assets?.length || 0,
        descriptions_count: inventoryData.descriptions?.length || 0,
        more_items: inventoryData.more_items
      }
    };

    console.log('=== RETURNING RESULT ===');
    console.log('Final result summary:', {
      itemCount: result.total,
      totalValue: result.total_value,
      method: result.method,
      steamId: result.steam_id
    });

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

  } catch (globalError) {
    // This catch block ensures CORS headers are ALWAYS returned, even for unexpected errors
    console.error('=== GLOBAL ERROR HANDLER ===');
    console.error('Unexpected error:', globalError);
    console.error('Request URL:', requestUrl?.toString() || 'Could not parse URL');
    console.error('Steam ID:', steamId || 'Not extracted');
    
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected server error occurred',
        details: globalError instanceof Error ? globalError.message : 'Unknown error',
        stack: globalError instanceof Error ? globalError.stack : undefined,
        request_info: {
          url: requestUrl?.toString() || 'Could not parse URL',
          steamId: steamId || 'Not extracted'
        },
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