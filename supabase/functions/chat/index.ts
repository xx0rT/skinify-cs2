import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface ChatMessage {
  id?: string;
  order_id: string;
  sender_steam_id: string;
  sender_type: 'buyer' | 'seller';
  message: string;
  read?: boolean;
  created_at?: string;
}

interface SendMessageRequest {
  order_id: string;
  sender_steam_id: string;
  sender_type: 'buyer' | 'seller';
  message: string;
}

/**
 * Validate user is part of the order
 */
async function validateOrderParticipant(supabase: any, orderId: string, steamId: string) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('buyer_steam_id, seller_steam_id')
    .eq('transaction_id', orderId)
    .single();

  if (error || !order) {
    throw new Error('Order not found');
  }

  const isParticipant = order.buyer_steam_id === steamId || order.seller_steam_id === steamId;
  
  if (!isParticipant) {
    throw new Error('Not authorized to access this chat');
  }

  return order;
}

/**
 * Create notification for new messages
 */
async function notifyNewMessage(
  supabase: any,
  recipientSteamId: string,
  senderName: string,
  orderId: string,
  messagePreview: string
) {
  try {
    await supabase
      .from('user_notifications')
      .insert({
        user_steam_id: recipientSteamId,
        type: 'trade',
        title: '💬 New Message',
        message: `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
        action_url: `/profile?tab=orders&transaction=${orderId}&view=chat`,
        metadata: {
          order_id: orderId,
          sender_steam_id: recipientSteamId,
          chat_message: true
        }
      });
    
    console.log(`Message notification sent to ${recipientSteamId}`);
  } catch (error) {
    console.error('Failed to send message notification:', error);
  }
}

/**
 * Get user display name by Steam ID
 */
async function getUserDisplayName(supabase: any, steamId: string): Promise<string> {
  const { data: user } = await supabase
    .from('users')
    .select('display_name')
    .eq('steam_id', steamId)
    .single();

  return user?.display_name || `User_${steamId.slice(-6)}`;
}

/**
 * Main chat handler
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
      // Get chat messages for an order
      const orderId = url.searchParams.get('order_id');
      const steamId = url.searchParams.get('steam_id');
      
      if (!orderId || !steamId) {
        return new Response(
          JSON.stringify({ error: 'order_id and steam_id parameters are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      console.log(`=== FETCHING CHAT MESSAGES FOR ORDER ${orderId} ===`);

      // Validate user is part of the order
      await validateOrderParticipant(supabase, orderId, steamId);

      // Get all messages for this order from database
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Database error fetching messages:', error);
        throw new Error(`Failed to fetch messages: ${error.message}`);
      }

      console.log(`Found ${messages?.length || 0} messages for order ${orderId}`);

      // Format messages for frontend
      const formattedMessages = (messages || []).map(msg => ({
        id: msg.id.toString(),
        orderId: msg.order_id,
        senderId: msg.sender_steam_id,
        senderType: msg.sender_type,
        message: msg.message,
        timestamp: msg.created_at,
        read: msg.read || false
      }));

      return new Response(
        JSON.stringify({
          messages: formattedMessages,
          total: formattedMessages.length,
          order_id: orderId,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );

    } else if (req.method === 'POST') {
      // Send new message
      const messageData: SendMessageRequest = await req.json();
      
      console.log(`=== SENDING CHAT MESSAGE ===`);
      console.log('Message data:', {
        order_id: messageData.order_id,
        sender: messageData.sender_steam_id,
        type: messageData.sender_type,
        message_length: messageData.message.length
      });

      if (!messageData.order_id || !messageData.sender_steam_id || !messageData.message) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: order_id, sender_steam_id, message' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Validate user is part of the order
      const order = await validateOrderParticipant(supabase, messageData.order_id, messageData.sender_steam_id);

      // Get sender info
      const senderName = await getUserDisplayName(supabase, messageData.sender_steam_id);

      // Determine recipient
      const recipientSteamId = messageData.sender_steam_id === order.buyer_steam_id 
        ? order.seller_steam_id 
        : order.buyer_steam_id;

      // Save message to database
      const { data: newMessage, error } = await supabase
        .from('chat_messages')
        .insert({
          order_id: messageData.order_id,
          sender_steam_id: messageData.sender_steam_id,
          sender_type: messageData.sender_type,
          message: messageData.message.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Database error saving message:', error);
        throw new Error(`Failed to save message: ${error.message}`);
      }

      console.log('Message saved to database with ID:', newMessage.id);

      // Notify recipient of new message
      await notifyNewMessage(
        supabase,
        recipientSteamId,
        senderName,
        messageData.order_id,
        messageData.message
      );

      console.log('Message sent successfully');

      // Return the saved message formatted for frontend
      const formattedMessage = {
        id: newMessage.id.toString(),
        orderId: newMessage.order_id,
        senderId: newMessage.sender_steam_id,
        senderType: newMessage.sender_type,
        message: newMessage.message,
        timestamp: newMessage.created_at,
        read: false
      };

      return new Response(
        JSON.stringify({
          success: true,
          message: formattedMessage,
          recipient_notified: true
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 201
        }
      );

    } else if (req.method === 'PUT') {
      // Mark messages as read
      const orderId = url.searchParams.get('order_id');
      const steamId = url.searchParams.get('steam_id');
      
      if (!orderId || !steamId) {
        return new Response(
          JSON.stringify({ error: 'order_id and steam_id parameters are required' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }}
        );
      }

      // Validate user is part of the order
      await validateOrderParticipant(supabase, orderId, steamId);

      // Mark messages as read (messages NOT sent by this user)
      const { error } = await supabase
        .from('chat_messages')
        .update({ read: true })
        .eq('order_id', orderId)
        .neq('sender_steam_id', steamId)
        .eq('read', false);

      if (error) {
        console.error('Error marking messages as read:', error);
        throw new Error(`Failed to mark messages as read: ${error.message}`);
      }
      
      console.log(`Marked messages as read for order ${orderId}, user ${steamId}`);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Messages marked as read'
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
    console.error('=== CHAT ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process chat request',
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