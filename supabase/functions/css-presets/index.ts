import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const url = new URL(req.url);
    const endpoint = url.pathname.split('/').pop();

    if (req.method === 'GET') {
      console.log('=== FETCHING CSS PRESETS ===');

      const { data: presets, error } = await supabase
        .from('css_presets')
        .select(`
          *,
          creator:user_id (
            display_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('download_count', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch presets: ${error.message}`);
      }

      console.log(`Found ${presets?.length || 0} public presets`);

      return new Response(
        JSON.stringify({
          presets: presets || [],
          total: presets?.length || 0
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } else if (req.method === 'POST') {
      if (endpoint === 'download') {
        console.log('=== RECORDING PRESET DOWNLOAD ===');

        const { preset_id, steam_id } = await req.json();

        if (!preset_id || !steam_id) {
          return new Response(
            JSON.stringify({ error: 'preset_id and steam_id are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('steam_id', steam_id)
          .maybeSingle();

        if (!user) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabase
          .from('css_preset_downloads')
          .insert({
            preset_id,
            user_id: user.id
          });

        console.log('Download recorded successfully');

        return new Response(
          JSON.stringify({ success: true }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      } else if (endpoint === 'like') {
        console.log('=== TOGGLING PRESET LIKE ===');

        const { preset_id, steam_id } = await req.json();

        if (!preset_id || !steam_id) {
          return new Response(
            JSON.stringify({ error: 'preset_id and steam_id are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('steam_id', steam_id)
          .maybeSingle();

        if (!user) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: existingLike } = await supabase
          .from('css_preset_likes')
          .select('id')
          .eq('preset_id', preset_id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingLike) {
          await supabase
            .from('css_preset_likes')
            .delete()
            .eq('id', existingLike.id);

          console.log('Like removed');
        } else {
          await supabase
            .from('css_preset_likes')
            .insert({
              preset_id,
              user_id: user.id
            });

          console.log('Like added');
        }

        return new Response(
          JSON.stringify({ success: true, liked: !existingLike }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      } else {
        console.log('=== CREATING NEW PRESET ===');

        const presetData = await req.json();
        const { steam_id, name, description, css_code, category, tags, is_public } = presetData;

        if (!steam_id || !name || !css_code) {
          return new Response(
            JSON.stringify({ error: 'steam_id, name, and css_code are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('steam_id', steam_id)
          .maybeSingle();

        if (!user) {
          return new Response(
            JSON.stringify({ error: 'User not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: preset, error } = await supabase
          .from('css_presets')
          .insert({
            user_id: user.id,
            name,
            description: description || null,
            css_code,
            category: category || 'other',
            tags: tags || [],
            is_public: is_public || false,
            version: '1.0.0'
          })
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create preset: ${error.message}`);
        }

        console.log('Preset created:', preset.id);

        return new Response(
          JSON.stringify({ success: true, preset }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('CSS Presets function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
