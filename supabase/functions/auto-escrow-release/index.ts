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
    // Find transactions where 8 days have passed since creation and they're in pending status
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: expiredPendingTransactions, error } = await supabase
      .from('user_transactions')
      .select('*')
      .eq('type', 'sale')
      .lte('completed_at', eightDaysAgo)
      .contains('metadata', { pending_wallet: true })
      .eq('status', 'completed');

    if (error) {
      console.error('Failed to fetch expired pending transactions:', error);
      return;
    }

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

        // Get user's current balances
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('current_balance, pending_balance, total_earned')
          .eq('id', userData.userId)
          .single();

        if (userError || !user) {
          console.error(`User ${steamId} not found for pending release:`, userError);
          continue;
        }

        const currentBalance = Number(user.current_balance || 0);
        const currentPending = Number(user.pending_balance || 0);
        const currentEarned = Number(user.total_earned || 0);

        // Transfer from pending to main balance
        const newBalance = currentBalance + userData.totalAmount;
        const newPendingBalance = Math.max(0, currentPending - userData.totalAmount);
        const newTotalEarned = currentEarned + userData.totalAmount;

        console.log('Balance transfer calculation:', {
          steam_id: steamId,
          current_balance: currentBalance,
          current_pending: currentPending,
          amount_to_release: userData.totalAmount,
          new_balance: newBalance,
          new_pending: newPendingBalance
        });

        // Update user balances
        const { data: updatedUser, error: balanceUpdateError } = await supabase
          .from('users')
          .update({
            current_balance: newBalance,
            pending_balance: newPendingBalance,
            total_earned: newTotalEarned,
            updated_at: new Date().toISOString()
          })
          .eq('id', userData.userId)
          .select()
          .single();

        if (balanceUpdateError) {
          console.error(`Failed to update balance for ${steamId}:`, balanceUpdateError);
          continue;
        }

        console.log('✅ Balance updated successfully:', {
          user_id: userData.userId,
          old_balance: currentBalance,
          new_balance: newBalance,
          released_amount: userData.totalAmount
        });

        // Create release transaction record
        const releaseTransaction = {
          user_id: userData.userId,
          steam_id: steamId,
          type: 'sale',
          amount: userData.totalAmount,
          description: `Pending funds released to main balance after 8-day security period. ${userData.transactions.length} trade(s) completed.`,
          reference_id: `pending_release_${steamId}_${Date.now()}`,
          status: 'completed',
          completed_at: new Date().toISOString(),
          metadata: {
            release_type: 'auto_pending_release',
            escrow_period_days: 8,
            transactions_released: userData.transactions.length,
            released_transaction_ids: userData.transactions.map(t => t.id),
            wallet_transfer: {
              from: 'pending',
              to: 'main',
              amount: userData.totalAmount
            }
          }
        };

        const { data: releaseRecord, error: releaseError } = await supabase
          .from('user_transactions')
          .insert(releaseTransaction)
          .select()
          .single();

        if (releaseError) {
          console.error('Failed to create release transaction record:', releaseError);
        } else {
          console.log('Release transaction recorded:', releaseRecord.id);
        }

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