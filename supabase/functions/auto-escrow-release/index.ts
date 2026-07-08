import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Create notification for escrow events
 */
async function createNotification(
  supabase: any,
  userSteamId: string,
  type: string,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: any
) {
  try {
    const { data, error } = await supabase
      .from('user_notifications')
      .insert({
        user_steam_id: userSteamId,
        type,
        title,
        message,
        action_url: actionUrl,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create notification:', error);
    } else {
      console.log('Notification created:', data.id);
    }

    return data;
  } catch (error) {
    console.error('Notification creation error:', error);
    return null;
  }
}

/**
 * Release funds from pending wallet to main balance after 8 days
 */
async function releasePendingFunds(supabase: any) {
  console.log('=== CHECKING FOR PENDING FUNDS TO RELEASE ===');

  try {
    // The 8-day escrow clock starts on CONFIRMED DELIVERY, not sale time.
    // verify-steam-inventory stamps metadata.escrow_start_at once the asset
    // is confirmed in the buyer's inventory. We release a sale only when:
    //   - it's still pending_wallet=true, and
    //   - escrow_start_at is set (delivery confirmed), and
    //   - escrow_start_at is ≥ 8 days ago.
    // Sales still awaiting delivery (escrow_start_at unset) are skipped —
    // their funds stay held until the buyer actually receives the item.
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

    const { data: pendingSales, error } = await supabase
      .from('user_transactions')
      .select('*')
      .eq('type', 'sale')
      .eq('status', 'completed')
      .contains('metadata', { pending_wallet: true });

    if (error) {
      console.error('Failed to fetch pending sale transactions:', error);
      return;
    }

    // Filter in code: escrow_start_at present AND matured. (postgrest can't
    // cleanly do a ≤ comparison on a nested jsonb timestamp.)
    const expiredPendingTransactions = (pendingSales || []).filter((t: any) => {
      const startAt = t.metadata?.escrow_start_at;
      return startAt && new Date(startAt).getTime() <= new Date(eightDaysAgo).getTime();
    });

    console.log(`Found ${expiredPendingTransactions?.length || 0} expired pending transactions to release`);

    if (!expiredPendingTransactions || expiredPendingTransactions.length === 0) {
      console.log('No expired pending funds found');
      return;
    }

    // Group by user to batch updates
    const userPendingAmounts = new Map<string, { userId: string; steamId: string; totalAmount: number; transactions: any[] }>();

    expiredPendingTransactions.forEach(transaction => {
      const steamId = transaction.steam_id;
      if (!userPendingAmounts.has(steamId)) {
        userPendingAmounts.set(steamId, {
          userId: transaction.user_id,
          steamId: steamId,
          totalAmount: 0,
          transactions: []
        });
      }
      
      const userData = userPendingAmounts.get(steamId)!;
      userData.totalAmount += Number(transaction.amount);
      userData.transactions.push(transaction);
    });

    console.log(`Processing ${userPendingAmounts.size} users for pending fund release`);

    // Process each user's pending fund release
    for (const [steamId, userData] of userPendingAmounts) {
      try {
        console.log(`=== RELEASING PENDING FUNDS FOR ${steamId} ===`);
        console.log(`Amount to release: ${userData.totalAmount} CZK`);
        console.log(`Transactions: ${userData.transactions.length}`);

        // Flip the `pending_wallet` flag on each matured sale transaction
        // to false. The `update_user_balance_from_transactions` trigger
        // recomputes the user's full balance from all completed sales and
        // honors this flag (see migration 20251107000000): sales with
        // pending_wallet=true count toward pending_balance, false toward
        // current_balance. Updating the metadata is sufficient — no manual
        // balance arithmetic needed, which avoids double-credit bugs.
        const txIds = userData.transactions.map((t) => t.id);
        const releasedAt = new Date().toISOString();

        // One update per row so we can patch the metadata jsonb precisely
        // (postgrest can't merge jsonb via PATCH). The trigger fires once per
        // row, but each fire recomputes from scratch so the final state is
        // consistent.
        for (const tx of userData.transactions) {
          const patchedMeta = {
            ...(tx.metadata || {}),
            pending_wallet: false,
            released_at: releasedAt,
            release_type: 'auto_pending_release',
            escrow_period_days: 8,
          };
          const { error: updateErr } = await supabase
            .from('user_transactions')
            .update({ metadata: patchedMeta, updated_at: releasedAt })
            .eq('id', tx.id);
          if (updateErr) {
            console.error(`Failed to release sale tx ${tx.id}:`, updateErr);
          }
        }

        // Sanity-read the user after the trigger fires so we can include the
        // new current_balance in the notification.
        const { data: user } = await supabase
          .from('users')
          .select('current_balance')
          .eq('id', userData.userId)
          .single();
        const newBalance = Number(user?.current_balance || 0);

        console.log('✅ Released', userData.totalAmount, 'CZK for', steamId, '— new balance:', newBalance);

        // Create notification about funds release
        await createNotification(
          supabase,
          steamId,
          'success',
          '🎉 Pending Funds Released!',
          `Your pending funds of ${userData.totalAmount.toLocaleString('cs-CZ')} Kč have been released to your main balance! The 8-day security period has completed successfully.`,
          `/profile?tab=balance`,
          { 
            amount: userData.totalAmount,
            transactions_count: userData.transactions.length,
            release_type: 'automatic',
            escrow_period_completed: true,
            new_balance: newBalance
          }
        );

        console.log(`✅ Pending fund release complete for ${steamId}`);

      } catch (userReleaseError) {
        console.error(`Failed to release pending funds for user ${steamId}:`, userReleaseError);
        
        // Create error notification for admin
        await createNotification(
          supabase,
          'system',
          'error',
          '❌ Pending Release Failed',
          `Failed to release pending funds for user ${steamId}: ${userReleaseError.message}`,
          '/admin',
          { 
            user_steam_id: steamId,
            error: userReleaseError.message,
            amount: userData.totalAmount,
            requires_manual_intervention: true
          }
        );
      }
    }

    console.log('=== PENDING FUND RELEASE PROCESSING COMPLETE ===');

  } catch (error) {
    console.error('Error processing pending fund releases:', error);
  }
}

/**
 * Automatic Pending Fund Release Handler
 * This function should be called daily to release expired pending funds
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      console.log('=== PROCESSING PENDING FUND RELEASES ===');
      console.log('Current time:', new Date().toISOString());
      
      await releasePendingFunds(supabase);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Pending fund release processing completed',
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200
        }
      );

    } else if (req.method === 'GET') {
      // Get pending fund release status
      const url = new URL(req.url);
      const steamId = url.searchParams.get('steam_id');
      
      if (steamId) {
        // Get specific user's pending fund info
        const { data: user, error } = await supabase
          .from('users')
          .select('pending_balance, current_balance')
          .eq('steam_id', steamId)
          .single();

        if (error || !user) {
          throw new Error('User not found');
        }

        // Get pending transactions
        const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: pendingTransactions, error: pendingError } = await supabase
          .from('user_transactions')
          .select('*')
          .eq('steam_id', steamId)
          .eq('type', 'sale')
          .gte('completed_at', eightDaysAgo)
          .contains('metadata', { pending_wallet: true })
          .order('completed_at', { ascending: false });

        return new Response(
          JSON.stringify({
            steam_id: steamId,
            current_balance: Number(user.current_balance || 0),
            pending_balance: Number(user.pending_balance || 0),
            pending_transactions: pendingTransactions || [],
            ready_for_release: pendingTransactions?.filter(t => 
              new Date(t.completed_at).getTime() <= new Date(eightDaysAgo).getTime()
            ).length || 0,
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 200
          }
        );
      } else {
        // Get summary of all pending funds
        const { data: allUsers, error } = await supabase
          .from('users')
          .select('steam_id, pending_balance')
          .gt('pending_balance', 0);

        const totalPendingAmount = allUsers?.reduce((sum, user) => sum + Number(user.pending_balance || 0), 0) || 0;

        return new Response(
          JSON.stringify({
            total_users_with_pending: allUsers?.length || 0,
            total_pending_amount: totalPendingAmount,
            users: allUsers || [],
            timestamp: new Date().toISOString()
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
    console.error('=== PENDING RELEASE ERROR ===', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to process pending fund release',
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