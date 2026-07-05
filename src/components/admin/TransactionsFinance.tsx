import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, RefreshCw, Download, Search, Filter } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'sale';
  user_id: string;
  username: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method: string;
  created_at: string;
}

const TransactionsFinance: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    // TODO: Replace with Supabase query
    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: 'deposit',
        user_id: 'user1',
        username: 'ProTrader2024',
        amount: 5000,
        status: 'completed',
        payment_method: 'Revolut',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        type: 'withdrawal',
        user_id: 'user2',
        username: 'SkinHunter',
        amount: 12500,
        status: 'pending',
        payment_method: 'Bank Transfer',
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '3',
        type: 'purchase',
        user_id: 'user3',
        username: 'CS2Collector',
        amount: 8500,
        status: 'completed',
        payment_method: 'Credit Card',
        created_at: new Date(Date.now() - 7200000).toISOString()
      }
    ];
    setTransactions(mockTransactions);
  };

  const totalRevenue = transactions
    .filter(t => t.status === 'completed' && (t.type === 'purchase' || t.type === 'deposit'))
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = transactions
    .filter(t => t.status === 'completed' && t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingTransactions = transactions.filter(t => t.status === 'pending').length;

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.username.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.includes(searchQuery);
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Transactions & Finance</h2>
          <p className="text-ink-muted text-sm">Monitor and manage all financial transactions</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-subtle hover:bg-bg px-4 py-2 rounded-lg text-ink transition-all flex items-center gap-2">
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="bg-accent hover:opacity-90 text-on-accent px-4 py-2 rounded-lg text-ink transition-all flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-lg p-6 border border-green-500/20">
          <DollarSign className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-3" />
          <div className="text-2xl font-bold text-ink mb-1">{totalRevenue.toLocaleString('cs-CZ')} Kč</div>
          <div className="text-green-300 text-sm">Total Revenue</div>
        </div>
        <div className="bg-surface rounded-lg p-6 border border-red-500/20">
          <TrendingUp className="w-8 h-8 text-rose-600 dark:text-rose-400 mb-3" />
          <div className="text-2xl font-bold text-ink mb-1">{totalWithdrawals.toLocaleString('cs-CZ')} Kč</div>
          <div className="text-red-300 text-sm">Total Withdrawals</div>
        </div>
        <div className="bg-surface rounded-lg p-6 border border-accent/20">
          <DollarSign className="w-8 h-8 text-accent mb-3" />
          <div className="text-2xl font-bold text-ink mb-1">
            {(totalRevenue - totalWithdrawals).toLocaleString('cs-CZ')} Kč
          </div>
          <div className="text-blue-300 text-sm">Net Profit</div>
        </div>
        <div className="bg-surface rounded-lg p-6 border border-yellow-500/20">
          <RefreshCw className="w-8 h-8 text-amber-600 dark:text-amber-400 mb-3" />
          <div className="text-2xl font-bold text-ink mb-1">{pendingTransactions}</div>
          <div className="text-yellow-300 text-sm">Pending Transactions</div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-surface rounded-xl border border-line/50 p-6">
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-subtle border border-line rounded-lg pl-10 pr-4 py-2 text-ink placeholder:text-ink-dim focus:outline-none focus:border-accent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-subtle border border-line rounded-lg px-4 py-2 text-ink focus:outline-none focus:border-accent"
          >
            <option value="all">All Types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="purchase">Purchases</option>
            <option value="sale">Sales</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-subtle border border-line rounded-lg px-4 py-2 text-ink focus:outline-none focus:border-accent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left py-3 px-4 text-ink-muted font-medium">ID</th>
                <th className="text-left py-3 px-4 text-ink-muted font-medium">User</th>
                <th className="text-left py-3 px-4 text-ink-muted font-medium">Type</th>
                <th className="text-left py-3 px-4 text-ink-muted font-medium">Amount</th>
                <th className="text-left py-3 px-4 text-ink-muted font-medium">Method</th>
                <th className="text-left py-3 px-4 text-ink-muted font-medium">Status</th>
                <th className="text-left py-3 px-4 text-ink-muted font-medium">Date</th>
                <th className="text-right py-3 px-4 text-ink-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-b border-line/50 hover:bg-subtle/30">
                  <td className="py-3 px-4 text-ink-muted font-mono text-sm">{transaction.id}</td>
                  <td className="py-3 px-4 text-ink">{transaction.username}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      transaction.type === 'deposit' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      transaction.type === 'withdrawal' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                      transaction.type === 'purchase' ? 'bg-accent-soft text-accent' :
                      'bg-accent-soft text-accent'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-ink font-semibold">
                    {transaction.amount.toLocaleString('cs-CZ')} Kč
                  </td>
                  <td className="py-3 px-4 text-ink-muted">{transaction.payment_method}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      transaction.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                      transaction.status === 'pending' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                      transaction.status === 'failed' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                      'bg-gray-500/20 text-ink-muted'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-ink-muted text-sm">
                    {new Date(transaction.created_at).toLocaleString('cs-CZ')}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {transaction.status === 'pending' && (
                        <>
                          <button className="text-emerald-600 dark:text-emerald-400 hover:text-green-300 text-sm px-3 py-1 rounded bg-green-500/10 hover:bg-emerald-500/10 transition-all">
                            Approve
                          </button>
                          <button className="text-rose-600 dark:text-rose-400 hover:text-red-300 text-sm px-3 py-1 rounded bg-red-500/10 hover:bg-rose-500/10 transition-all">
                            Reject
                          </button>
                        </>
                      )}
                      <button className="text-accent hover:text-blue-300 text-sm px-3 py-1 rounded bg-accent-soft hover:bg-accent-soft transition-all">
                        View
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

export default TransactionsFinance;
