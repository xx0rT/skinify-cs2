import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Main notifications handler
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      // Get user notifications
      const steamId = url.searchParams.get('steam_id');
      const unreadOnly = url.searchParams.get('unread_only') === 'true';
      const limit = parseInt(url.searchParams.get('limit') || '50');
      
      if (!steamId) {
        return new Response(
          JSON.stringify({ error: 'steam_id parameter is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      console.log(`=== FETCHING NOTIFICATIONS FOR ${steamId} ===`);

      let query = supabase
        .from('user_notifications')
        .select('*')
        .eq('user_steam_id', steamId);
      
      if (unreadOnly) {
        query = query.eq('read', false);
      }
      
      const { data: notifications, error } = await query
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch notifications: ${error.message}`);
      }

      const unreadCount = unreadOnly ? notifications?.length || 0 : 
        await supabase
          .from('user_notifications')
          .select('id', { count: 'exact' })
          .eq('user_steam_id', steamId)
          .eq('read', false)
          .then(({ count }) => count || 0);

      console.log(`Found ${notifications?.length || 0} notifications, ${unreadCount} unread`);

      return new Response(
        JSON.stringify({
          notifications: notifications || [],
          unread_count: unreadCount,
          total: notifications?.length || 0,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );

    } else if (req.method === 'PUT') {
      // Mark notification as read
      const notificationId = url.searchParams.get('id');
      const steamId = url.searchParams.get('steam_id');
      const action = url.searchParams.get('action');
      
      if (!steamId) {
        return new Response(
          JSON.stringify({ error: 'steam_id is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }
      
      if (action === 'mark_all_read') {
        // Mark all notifications as read for user
        const { data: updatedNotifications, error } = await supabase
          .from('user_notifications')
          .update({ read: true })
          .eq('user_steam_id', steamId)
          .eq('read', false)
          .select();

        if (error) {
          throw new Error(`Failed to mark all notifications as read: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            updated_count: updatedNotifications?.length || 0,
            message: 'All notifications marked as read'
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      } else if (!notificationId) {
        return new Response(
          JSON.stringify({ error: 'Notification ID is required when action is not specified' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      } else {
        // Mark single notification as read
        const { data: notification, error } = await supabase
          .from('user_notifications')
          .update({ read: true })
          .eq('id', notificationId)
          .eq('user_steam_id', steamId)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update notification: ${error.message}`);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            notification,
            message: 'Notification marked as read'
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      }

    } else if (req.method === 'POST') {
      // Create notification (for admin use)
      const { user_steam_id, type, title, message, action_url, metadata } = await req.json();
      
      if (!user_steam_id || !title || !message) {
        return new Response(
          JSON.stringify({ error: 'user_steam_id, title, and message are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      const notification = await createNotification(
        supabase,
        user_steam_id,
        type || 'info',
        title,
        message,
        action_url,
        metadata
      );

      return new Response(
        JSON.stringify({ 
          success: true, 
          notification,
          message: 'Notification created successfully'
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 201
        }
      );
    } else if (req.method === 'DELETE') {
      // Delete notification
      const notificationId = url.searchParams.get('id');
      const steamId = url.searchParams.get('steam_id');
      const action = url.searchParams.get('action');
      
      if (!steamId) {
        return new Response(
          JSON.stringify({ error: 'steam_id is required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      if (action === 'clear_all') {
        // Delete all notifications for user
        console.log(`=== CLEARING ALL NOTIFICATIONS FOR ${steamId} ===`);
        
        const { data: deletedNotifications, error } = await supabase
          .from('user_notifications')
          .delete()
          .eq('user_steam_id', steamId)
          .select();

        if (error) {
          console.error('Error clearing all notifications:', error);
          throw new Error(`Failed to clear all notifications: ${error.message}`);
        }

        console.log('All notifications cleared successfully:', deletedNotifications?.length || 0);

        return new Response(
          JSON.stringify({ 
            success: true,
            deleted_count: deletedNotifications?.length || 0,
            message: 'All notifications cleared successfully'
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      } else if (!notificationId) {
        return new Response(
          JSON.stringify({ error: 'Notification ID is required when action is not specified' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      } else {
        // Delete single notification
        console.log(`=== DELETING NOTIFICATION ${notificationId} ===`);

        const { error } = await supabase
          .from('user_notifications')
          .delete()
          .eq('id', notificationId)
          .eq('user_steam_id', steamId);

        if (error) {
          console.error('Error deleting notification:', error);
          throw new Error(`Failed to delete notification: ${error.message}`);
        }

        console.log('Notification deleted successfully:', notificationId);

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Notification deleted successfully'
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error) {
    console.error('=== NOTIFICATIONS ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process notification request',
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