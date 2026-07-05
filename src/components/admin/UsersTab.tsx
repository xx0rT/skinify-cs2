import React, { useState, useEffect } from 'react';
import { Search, Filter, Ban, AlertTriangle, Shield, CheckCircle, Eye, Mail, Calendar } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';

interface User {
  id: string;
  steam_id: string;
  display_name: string;
  email: string;
  status: string;
  reputation_score: number;
  is_verified: boolean;
  verification_type?: string;
  created_at: string;
  last_login?: string;
  avatar_url?: string;
  profile_picture?: string;
}

const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionType, setActionType] = useState<'ban' | 'warn' | 'verify' | null>(null);
  const [actionReason, setActionReason] = useState('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        console.error('Supabase client not initialized');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!supabase) return;

    try {
      await supabase.from('user_bans').insert({
        user_id: userId,
        reason: actionReason || 'No reason provided',
        banned_by: (await supabase.auth.getUser()).data.user?.id,
        banned_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      await supabase.from('users').update({ status: 'banned' }).eq('id', userId);

      await supabase.from('admin_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'ban_user',
        target_id: userId,
        details: { reason: actionReason }
      });

      fetchUsers();
      closeModal();
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  const handleWarnUser = async (userId: string) => {
    if (!supabase) return;

    try {
      await supabase.from('user_warnings').insert({
        user_id: userId,
        reason: actionReason || 'No reason provided',
        issued_by: (await supabase.auth.getUser()).data.user?.id
      });

      await supabase.from('admin_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'warn_user',
        target_id: userId,
        details: { reason: actionReason }
      });

      fetchUsers();
      closeModal();
    } catch (error) {
      console.error('Error warning user:', error);
    }
  };

  const handleVerifyUser = async (userId: string) => {
    if (!supabase) return;

    try {
      await supabase.from('users').update({
        is_verified: true,
        verification_type: 'admin_verified'
      }).eq('id', userId);

      await supabase.from('admin_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'verify_user',
        target_id: userId
      });

      fetchUsers();
      closeModal();
    } catch (error) {
      console.error('Error verifying user:', error);
    }
  };

  const openActionModal = (user: User, action: 'ban' | 'warn' | 'verify') => {
    setSelectedUser(user);
    setActionType(action);
    setActionReason('');
  };

  const closeModal = () => {
    setSelectedUser(null);
    setActionType(null);
    setActionReason('');
  };

  const confirmAction = () => {
    if (!selectedUser) return;

    if (actionType === 'ban') {
      handleBanUser(selectedUser.id);
    } else if (actionType === 'warn') {
      handleWarnUser(selectedUser.id);
    } else if (actionType === 'verify') {
      handleVerifyUser(selectedUser.id);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.steam_id || '').includes(searchQuery);
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="panel p-5">
          <div className="text-[22px] font-bold tracking-tight tabular-nums text-ink leading-none">{users.length}</div>
          <div className="label-meta mt-2">Total Users</div>
        </div>
        <div className="panel p-5">
          <div className="text-[22px] font-bold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400 leading-none">
            {users.filter(u => u.status === 'active').length}
          </div>
          <div className="label-meta mt-2">Active Users</div>
        </div>
        <div className="panel p-5">
          <div className="text-[22px] font-bold tracking-tight tabular-nums text-accent leading-none">
            {users.filter(u => u.is_verified).length}
          </div>
          <div className="label-meta mt-2">Verified Users</div>
        </div>
        <div className="panel p-5">
          <div className="text-[22px] font-bold tracking-tight tabular-nums text-rose-600 dark:text-rose-400 leading-none">
            {users.filter(u => u.status === 'suspended' || u.status === 'banned').length}
          </div>
          <div className="label-meta mt-2">Suspended/Banned</div>
        </div>
      </div>

      <div className="panel p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Search by username, email, or Steam ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-subtle border border-line rounded-lg pl-10 pr-4 py-2 text-ink placeholder:text-ink-dim focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-subtle border border-line rounded-lg px-4 py-2 text-ink focus:outline-none focus:border-accent transition-colors"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-left py-3 px-4 text-ink-muted font-medium">User</th>
                  <th className="text-left py-3 px-4 text-ink-muted font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-ink-muted font-medium">Steam ID</th>
                  <th className="text-left py-3 px-4 text-ink-muted font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-ink-muted font-medium">Reputation</th>
                  <th className="text-left py-3 px-4 text-ink-muted font-medium">Joined</th>
                  <th className="text-right py-3 px-4 text-ink-muted font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-line/50 hover:bg-subtle/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        {user.avatar_url || user.profile_picture ? (
                          <img
                            src={user.avatar_url || user.profile_picture}
                            alt={user.display_name || 'User'}
                            className="w-10 h-10 rounded-full object-cover border-2 border-accent/30"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling!.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`w-10 h-10 bg-surface rounded-full flex items-center justify-center ${user.avatar_url || user.profile_picture ? 'hidden' : ''}`}>
                          <span className="text-ink font-bold">
                            {(user.display_name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-ink font-medium">{user.display_name || 'Unknown'}</div>
                          {user.is_verified && (
                            <span className="text-xs text-accent flex items-center gap-1">
                              <CheckCircle size={12} />
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-ink-muted">{user.email || 'N/A'}</td>
                    <td className="py-3 px-4 text-ink-muted font-mono text-sm">{user.steam_id || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        user.status === 'suspended' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        user.status === 'banned' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                        'bg-gray-500/20 text-ink-muted'
                      }`}>
                        {user.status || 'active'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-ink font-medium">{user.reputation_score || 0}</div>
                        <div className="w-16 h-2 bg-subtle rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              (user.reputation_score || 0) >= 80 ? 'bg-green-500' :
                              (user.reputation_score || 0) >= 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${user.reputation_score || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-ink-muted text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openActionModal(user, 'verify')}
                          className="text-emerald-600 dark:text-emerald-400 hover:text-green-300 p-2 rounded-lg hover:bg-green-500/10 transition-all"
                          title="Verify User"
                        >
                          <Shield size={16} />
                        </button>
                        <button
                          onClick={() => openActionModal(user, 'warn')}
                          className="text-amber-600 dark:text-amber-400 hover:text-yellow-300 p-2 rounded-lg hover:bg-yellow-500/10 transition-all"
                          title="Warn User"
                        >
                          <AlertTriangle size={16} />
                        </button>
                        <button
                          onClick={() => openActionModal(user, 'ban')}
                          className="text-rose-600 dark:text-rose-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-all"
                          title="Ban User"
                        >
                          <Ban size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedUser && actionType && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full mx-4 border border-line">
            <h3 className="text-xl font-bold text-ink mb-4">
              {actionType === 'ban' ? 'Ban User' : actionType === 'warn' ? 'Warn User' : 'Verify User'}
            </h3>
            <p className="text-ink-muted mb-4">
              User: <span className="font-bold">{selectedUser.display_name}</span>
            </p>
            {actionType !== 'verify' && (
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Reason for this action..."
                className="w-full bg-subtle border border-line rounded-lg p-3 text-ink placeholder:text-ink-dim focus:outline-none focus:border-accent transition-colors mb-4"
                rows={4}
              />
            )}
            <div className="flex gap-3">
              <button
                onClick={confirmAction}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  actionType === 'ban' ? 'bg-red-600 hover:bg-red-500 text-ink' :
                  actionType === 'warn' ? 'bg-yellow-600 hover:bg-yellow-500 text-ink' :
                  'bg-green-600 hover:bg-green-500 text-ink'
                }`}
              >
                Confirm
              </button>
              <button
                onClick={closeModal}
                className="flex-1 bg-subtle hover:bg-bg text-ink px-4 py-2 rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default UsersTab;
