import React, { useState, useEffect } from 'react';
import { Search, Filter, Ban, AlertTriangle, Shield, CheckCircle, X, Mail, Calendar, Activity } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

interface User {
  id: string;
  steam_id: string;
  username: string;
  email: string;
  status: string;
  reputation_score: number;
  is_verified: boolean;
  created_at: string;
  last_login: string;
}

const UserManagement: React.FC = () => {
  const { addToast } = useToastStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual Supabase query
      // const { data, error } = await supabase.from('users').select('*');

      // Mock data for now
      const mockUsers: User[] = [
        {
          id: '1',
          steam_id: '76561198000000001',
          username: 'ProTrader2024',
          email: 'protrader@email.com',
          status: 'active',
          reputation_score: 98,
          is_verified: true,
          created_at: '2024-01-15T10:00:00Z',
          last_login: new Date().toISOString()
        },
        {
          id: '2',
          steam_id: '76561198000000002',
          username: 'SkinHunter',
          email: 'skinhunter@email.com',
          status: 'active',
          reputation_score: 85,
          is_verified: true,
          created_at: '2024-02-10T14:30:00Z',
          last_login: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '3',
          steam_id: '76561198000000003',
          username: 'CS2Collector',
          email: 'collector@email.com',
          status: 'suspended',
          reputation_score: 45,
          is_verified: false,
          created_at: '2024-03-20T08:15:00Z',
          last_login: new Date(Date.now() - 86400000).toISOString()
        }
      ];

      setUsers(mockUsers);
    } catch (error) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.steam_id.includes(searchQuery);
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">User Management</h2>
          <p className="text-ink-muted text-sm">Manage all registered users and their accounts</p>
        </div>
        <button className="bg-accent hover:opacity-90 text-on-accent px-4 py-2 rounded-lg text-ink transition-all">
          Export Users
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-lg p-4 border border-line/50">
          <div className="text-2xl font-bold text-ink">{users.length}</div>
          <div className="text-ink-muted text-sm">Total Users</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-line/50">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {users.filter(u => u.status === 'active').length}
          </div>
          <div className="text-ink-muted text-sm">Active Users</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-line/50">
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">
            {users.filter(u => u.is_verified).length}
          </div>
          <div className="text-ink-muted text-sm">Verified Users</div>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-line/50">
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {users.filter(u => u.status === 'suspended' || u.status === 'banned').length}
          </div>
          <div className="text-ink-muted text-sm">Suspended/Banned</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-xl border border-line/50 p-6">
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
            <option value="pending_verification">Pending Verification</option>
          </select>
        </div>

        {/* Users Table */}
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
                      <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center">
                        <span className="text-ink font-bold">{user.username.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="text-ink font-medium">{user.username}</div>
                        {user.is_verified && (
                          <span className="text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1">
                            <CheckCircle size={12} />
                            Verified
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-ink-muted">{user.email}</td>
                  <td className="py-3 px-4 text-ink-muted font-mono text-sm">{user.steam_id}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      user.status === 'suspended' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                      user.status === 'banned' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                      'bg-gray-500/20 text-ink-muted'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="text-ink font-medium">{user.reputation_score}</div>
                      <div className="w-16 h-2 bg-subtle rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            user.reputation_score >= 80 ? 'bg-green-500' :
                            user.reputation_score >= 50 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${user.reputation_score}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-ink-muted text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="text-sky-600 dark:text-sky-400 hover:text-blue-300 p-2 rounded-lg hover:bg-blue-500/10 transition-all">
                        <Mail size={16} />
                      </button>
                      <button className="text-amber-600 dark:text-amber-400 hover:text-yellow-300 p-2 rounded-lg hover:bg-yellow-500/10 transition-all">
                        <AlertTriangle size={16} />
                      </button>
                      <button className="text-rose-600 dark:text-rose-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-500/10 transition-all">
                        <Ban size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
