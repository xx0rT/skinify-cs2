import { useState, useEffect } from 'react';
import { ExternalLink, Twitch, Loader, RefreshCw, Unlink, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

interface TwitchAccount {
  id: string;
  twitch_username: string;
  twitch_display_name: string;
  twitch_profile_image: string;
  streamelements_channel_id: string | null;
  last_synced_at: string | null;
  linked_at: string;
}

interface LoyaltyWallet {
  id: string;
  points_balance: number;
  total_earned: number;
  total_spent: number;
  last_sync_at: string | null;
}

export default function TwitchIntegration() {
  const { user } = useAuthStore();
  const addToast = useToastStore((state) => state.addToast);

  const [twitchAccount, setTwitchAccount] = useState<TwitchAccount | null>(null);
  const [loyaltyWallet, setLoyaltyWallet] = useState<LoyaltyWallet | null>(null);
  const [seChannelId, setSeChannelId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user?.steamId) {
        loadTwitchAccount();
      } else {
        setLoading(false);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user?.steamId, refreshKey]);

  useEffect(() => {
    let mounted = true;
    let checkInterval: NodeJS.Timeout;

    const urlParams = new URLSearchParams(window.location.search);
    const twitchParam = urlParams.get('twitch');

    if (twitchParam === 'linked' || twitchParam === 'callback') {
      console.log('🔄 Twitch callback detected, reloading account data...');

      setTimeout(() => loadTwitchAccount(), 500);

      checkInterval = setInterval(() => {
        if (mounted && user?.steamId) {
          console.log('🔄 Polling for Twitch account data...');
          loadTwitchAccount();
        }
      }, 2000);

      setTimeout(() => {
        if (checkInterval) {
          clearInterval(checkInterval);
        }
        const newUrl = window.location.pathname + window.location.search.replace(/[&?]twitch=(linked|callback)/g, '');
        window.history.replaceState({}, '', newUrl);
        setRefreshKey(prev => prev + 1);
      }, 10000);
    }

    return () => {
      mounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [user?.steamId, refreshKey]);

  const loadTwitchAccount = async () => {
    try {
      setLoading(true);
      setSetupRequired(false);

      console.log('🔍 Loading Twitch account...');
      console.log('User steamId:', user?.steamId);

      if (!user?.steamId) {
        console.log('❌ No steamId found, aborting');
        setLoading(false);
        return;
      }

      const { data: twitchData, error: twitchError } = await supabase
        .from('user_twitch_accounts')
        .select('*')
        .eq('steam_id', user.steamId)
        .maybeSingle();

      console.log('📊 Twitch data query result:', { twitchData, twitchError });

      if (twitchError) {
        console.error('Error loading Twitch account:', twitchError);
        if (twitchError.code === '42P01' || twitchError.message?.includes('does not exist')) {
          console.error('Table user_twitch_accounts does not exist. Database setup required.');
          setSetupRequired(true);
        }
        setLoading(false);
        return;
      }

      if (twitchData) {
        console.log('✅ Twitch account found:', twitchData);
        setTwitchAccount(twitchData);
        setSeChannelId(twitchData.streamelements_channel_id || '');

        const { data: walletData, error: walletError } = await supabase
          .from('loyalty_points_wallets')
          .select('*')
          .eq('twitch_account_id', twitchData.id)
          .maybeSingle();

        console.log('💰 Loyalty wallet result:', { walletData, walletError });

        if (walletError) {
          console.error('Error loading loyalty wallet:', walletError);
        } else if (walletData) {
          setLoyaltyWallet(walletData);
        }
      } else {
        console.log('ℹ️ No Twitch account linked yet');
      }
    } catch (error) {
      console.error('Failed to load Twitch account:', error);
      setSetupRequired(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkTwitch = async () => {
    try {
      setIsLinking(true);

      const state = btoa(JSON.stringify({
        steam_id: user!.steamId,
        user_id: user!.id,
        timestamp: Date.now(),
      }));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twitch-integration/auth-url?state=${state}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to get Twitch auth URL');

      const data = await response.json();
      window.location.href = data.auth_url;

    } catch (error) {
      console.error('Failed to link Twitch:', error);
      addToast('Failed to connect to Twitch', 'error');
      setIsLinking(false);
    }
  };

  const handleSyncPoints = async () => {
    if (!seChannelId.trim()) {
      addToast('Please enter your StreamElements channel ID', 'error');
      return;
    }

    try {
      setIsSyncing(true);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twitch-integration/sync-points`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user!.id,
            steam_id: user!.steamId,
            streamelements_channel_id: seChannelId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to sync points');
      }

      const data = await response.json();

      addToast(
        `Synced ${data.points.toLocaleString()} loyalty points from StreamElements!`,
        'success'
      );

      await loadTwitchAccount();

    } catch (error: any) {
      console.error('Failed to sync points:', error);
      addToast(error.message || 'Failed to sync StreamElements points', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink your Twitch account? Your loyalty points will be preserved.')) {
      return;
    }

    try {
      setIsUnlinking(true);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twitch-integration/unlink`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user!.id,
            steam_id: user!.steamId,
          }),
        }
      );

      if (!response.ok) throw new Error('Failed to unlink Twitch');

      addToast('Twitch account unlinked successfully', 'success');
      setTwitchAccount(null);
      setLoyaltyWallet(null);
      setSeChannelId('');

    } catch (error) {
      console.error('Failed to unlink Twitch:', error);
      addToast('Failed to unlink Twitch account', 'error');
    } finally {
      setIsUnlinking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="bg-yellow-500/10 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/30">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-lg">
            <Twitch className="w-8 h-8 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Database Setup Required
            </h3>
            <p className="text-gray-300 mb-4">
              The Twitch integration tables haven't been created yet. Your site administrator needs to run the database migration.
            </p>
            <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-400 mb-2">Steps for administrator:</p>
              <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                <li>Go to Supabase Dashboard → SQL Editor</li>
                <li>Run the file: <code className="text-purple-400">TWITCH_LOYALTY_MIGRATION.sql</code></li>
                <li>Refresh this page</li>
              </ol>
            </div>
            <a
              href="/APPLY_TWITCH_MIGRATION_NOW.md"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              View Setup Instructions
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!twitchAccount) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-500/10 rounded-lg">
            <Twitch className="w-8 h-8 text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2">
              Link Your Twitch Account
            </h3>
            <p className="text-gray-400 mb-4">
              Connect your Twitch account to sync loyalty points from StreamElements bot.
              Your points can be used for purchases on the marketplace!
            </p>
            <button
              onClick={handleLinkTwitch}
              disabled={isLinking}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isLinking ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Twitch className="w-4 h-4" />
                  <span>Link Twitch Account</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={twitchAccount.twitch_profile_image}
                alt={twitchAccount.twitch_display_name}
                className="w-20 h-20 rounded-full border-2 border-purple-500/50 shadow-lg"
              />
              <div className="absolute -bottom-1 -right-1 bg-green-500 w-6 h-6 rounded-full border-2 border-gray-900 flex items-center justify-center">
                <Twitch className="w-3 h-3 text-white" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-white">
                  {twitchAccount.twitch_display_name}
                </h3>
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                  Linked
                </span>
              </div>
              <p className="text-sm text-purple-300 font-medium">@{twitchAccount.twitch_username}</p>
              <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Linked {new Date(twitchAccount.linked_at).toLocaleDateString()}
              </p>
              {twitchAccount.last_synced_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Last synced: {new Date(twitchAccount.last_synced_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleUnlink}
            disabled={isUnlinking}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 border border-red-500/20"
          >
            {isUnlinking ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Unlink className="w-4 h-4" />
            )}
            <span>Unlink Account</span>
          </button>
        </div>

        {loyaltyWallet && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-purple-500/20">
            <div className="bg-purple-500/10 rounded-lg p-4">
              <p className="text-xs text-purple-300 mb-1">Available Points</p>
              <p className="text-2xl font-bold text-purple-400">
                {Number(loyaltyWallet.points_balance).toLocaleString()}
              </p>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-4">
              <p className="text-xs text-blue-300 mb-1">Total Earned</p>
              <p className="text-2xl font-bold text-blue-400">
                {Number(loyaltyWallet.total_earned).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-700/30 rounded-lg p-4">
              <p className="text-xs text-gray-300 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-gray-300">
                {Number(loyaltyWallet.total_spent).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">
          StreamElements Integration
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Enter your StreamElements channel ID to sync your loyalty points.
          You can find this in your StreamElements dashboard.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={seChannelId}
            onChange={(e) => setSeChannelId(e.target.value)}
            placeholder="StreamElements Channel ID"
            className="flex-1 px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            onClick={handleSyncPoints}
            disabled={isSyncing || !seChannelId.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Sync Points</span>
              </>
            )}
          </button>
        </div>
        <a
          href="https://streamelements.com/dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-3 text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open StreamElements Dashboard</span>
        </a>
      </div>

      {/* Debug Panel - Shows connection status */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/30">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Connection Status
          </h4>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between items-center py-1.5 px-3 bg-gray-800/50 rounded">
            <span className="text-gray-400">Steam ID:</span>
            <span className="text-green-400 font-mono">{user?.steamId || 'Not found'}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 px-3 bg-gray-800/50 rounded">
            <span className="text-gray-400">Twitch Account:</span>
            <span className={`font-medium ${twitchAccount ? 'text-green-400' : 'text-yellow-400'}`}>
              {twitchAccount ? 'Connected ✓' : 'Not linked'}
            </span>
          </div>
          {twitchAccount && (
            <>
              <div className="flex justify-between items-center py-1.5 px-3 bg-gray-800/50 rounded">
                <span className="text-gray-400">Twitch User ID:</span>
                <span className="text-purple-400 font-mono">{twitchAccount.twitch_user_id}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 px-3 bg-gray-800/50 rounded">
                <span className="text-gray-400">Loyalty Wallet:</span>
                <span className={`font-medium ${loyaltyWallet ? 'text-green-400' : 'text-yellow-400'}`}>
                  {loyaltyWallet ? 'Active ✓' : 'Not created'}
                </span>
              </div>
            </>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-3 italic">
          Check browser console (F12) for detailed debugging logs
        </p>
      </div>
    </div>
  );
}
