import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, RefreshCw, Download, Search, Filter, CheckCircle, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'purchase' | 'sale';
  user_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method?: string;
  withdrawal_method?: string;
  withdrawal_details?: any;
  created_at: string;
  users?: { username?: string; display_name?: string; email?: string };
}

interface FinanceTabProps {
  addToast: (toast: any) => void;
}

const FinanceTab: React.FC<FinanceTabProps> = ({ addToast }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      if (!supabase) {
        setMockData();
        return;
      }

      const { data, error } = await supabase
        .from('user_transactions')
        .select(`
          *,
          users (steam_id, display_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    setTransactions([
      {
        id: '1',
        type: 'deposit',
        user_id: 'user1',
        amount: 5000,
        status: 'completed',
        payment_method: 'Revolut',
        created_at: new Date().toISOString(),
        users: { username: 'ProTrader2024' }
      },
      {
        id: '2',
        type: 'withdrawal',
        user_id: 'user2',
        amount: 12500,
        status: 'pending',
        payment_method: 'Bank Transfer',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        users: { username: 'SkinHunter' }
      },
      {
        id: '3',
        type: 'purchase',
        user_id: 'user3',
        amount: 8500,
        status: 'completed',
        payment_method: 'Credit Card',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        users: { username: 'CS2Collector' }
      }
    ]);
  };

  const handleApprove = async (transactionId: string) => {
    try {
      if (!supabase) {
        addToast({ type: 'error', title: 'Error', message: 'Database not available' });
        return;
      }

      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) throw new Error('Transaction not found');

      const { error: updateError } = await supabase
        .from('user_transactions')
        .update({ status: 'completed' })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          action: 'approve_withdrawal',
          target_type: 'transaction',
          target_id: transactionId,
          details: { amount: transaction.amount, user_id: transaction.user_id }
        });
      }

      addToast({ type: 'success', title: 'Success', message: 'Transaction approved successfully' });
      fetchTransactions();
    } catch (error: any) {
      console.error('Approve error:', error);
      addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to approve transaction' });
    }
  };

  const handleReject = async (transactionId: string) => {
    try {
      if (!supabase) {
        addToast({ type: 'error', title: 'Error', message: 'Database not available' });
        return;
      }

      const { error: updateError } = await supabase
        .from('user_transactions')
        .update({ status: 'cancelled' })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_logs').insert({
          admin_id: user.id,
          action: 'reject_withdrawal',
          target_type: 'transaction',
          target_id: transactionId
        });
      }

      addToast({ type: 'success', title: 'Success', message: 'Transaction rejected successfully' });
      fetchTransactions();
    } catch (error: any) {
      console.error('Reject error:', error);
      addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to reject transaction' });
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const displayName = t.users?.display_name || '';
    const matchesSearch = displayName.toLowerCase().includes(searchQuery.toLowerCase()) || String(t.id).includes(searchQuery);
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    totalRevenue: transactions
      .filter(t => t.status === 'completed' && (t.type === 'purchase' || t.type === 'deposit'))
      .reduce((sum, t) => sum + t.amount, 0),
    totalWithdrawals: transactions
      .filter(t => t.status === 'completed' && t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0),
    pendingCount: transactions.filter(t => t.status === 'pending').length,
    completedToday: transactions.filter(t => {
      const today = new Date().setHours(0, 0, 0, 0);
      return t.status === 'completed' && new Date(t.created_at).getTime() >= today;
    }).length
  };

  const netProfit = stats.totalRevenue - stats.totalWithdrawals;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink">Transactions & Finance</h2>
          <p className="text-ink-muted text-sm">Monitor and manage all financial transactions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="bg-subtle hover:bg-bg px-4 py-2 rounded-lg text-ink transition-all flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className="bg-accent hover:opacity-90 text-on-accent px-4 py-2 rounded-lg text-ink transition-all flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl p-6 border border-line shadow-lg">
          <DollarSign className="w-8 h-8 text-accent mb-3" />
          <div className="text-2xl font-bold text-ink mb-1">{stats.totalRevenue.toLocaleString('cs-CZ')} Kč</div>
          <div className="text-accent text-sm">Total Revenue</div>
        </div>
        <div className="bg-surface rounded-xl p-6 border border-line shadow-lg">
          <TrendingDown className="w-8 h-8 text-accent mb-3" />
          <div className="text-2xl font-bold text-ink mb-1">{stats.totalWithdrawals.toLocaleString('cs-CZ')} Kč</div>
          <div className="text-accent text-sm">Total Withdrawals</div>
        </div>
        <div className="bg-surface rounded-xl p-6 border border-line shadow-lg">
          <TrendingUp className="w-8 h-8 text-accent mb-3" />
          <div className="text-2xl font-bold text-ink mb-1">{netProfit.toLocaleString('cs-CZ')} Kč</div>
          <div className="text-accent text-sm">Net Profit</div>
        </div>
        <div className="bg-surface rounded-xl p-6 border border-line shadow-lg">
          <RefreshCw className="w-8 h-8 text-accent mb-3" />
          <div className="text-2xl font-bold text-ink mb-1">{stats.pendingCount}</div>
          <div className="text-accent text-sm">Pending Transactions</div>
        </div>
      </div>

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
                  <td className="py-3 px-4 text-ink-muted font-mono text-sm">{String(transaction.id).slice(0, 8)}...</td>
                  <td className="py-3 px-4 text-ink">{transaction.users?.display_name || 'Unknown'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      transaction.type === 'deposit' ? 'bg-accent-soft text-accent' :
                      transaction.type === 'withdrawal' ? 'bg-pink-500/20 text-pink-400' :
                      transaction.type === 'purchase' ? 'bg-fuchsia-500/20 text-fuchsia-400' :
                      'bg-accent-soft text-accent'
                    }`}>
                      {transaction.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-ink font-semibold">
                    {transaction.amount.toLocaleString('cs-CZ')} Kč
                  </td>
                  <td className="py-3 px-4 text-ink-muted">{transaction.payment_method || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      transaction.status === 'completed' ? 'bg-accent-soft text-accent' :
                      transaction.status === 'pending' ? 'bg-pink-500/20 text-pink-400' :
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
                          <button
                            onClick={() => handleApprove(transaction.id)}
                            className="text-accent hover:text-accent text-sm px-3 py-1 rounded bg-accent-soft hover:bg-accent-soft transition-all flex items-center gap-1 border border-line"
                          >
                            <CheckCircle size={14} />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(transaction.id)}
                            className="text-pink-400 hover:text-pink-300 text-sm px-3 py-1 rounded bg-pink-500/10 hover:bg-pink-500/20 transition-all flex items-center gap-1 border border-pink-500/30"
                          >
                            <X size={14} />
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedTransaction(transaction)}
                        className="text-accent hover:text-accent text-sm px-3 py-1 rounded bg-accent-soft hover:bg-accent-soft transition-all border border-line"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12 text-ink-muted">
              No transactions found
            </div>
          )}
        </div>
      </div>

      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTransaction(null)}>
          <div className="bg-surface rounded-xl border border-line p-6 max-w-2xl w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold bg-surface bg-clip-text text-transparent">
                Transaction Details
              </h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-ink-muted hover:text-ink transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface rounded-lg p-4 border border-line">
                  <div className="text-ink-muted text-sm mb-1">Transaction ID</div>
                  <div className="text-ink font-mono text-sm">{String(selectedTransaction.id)}</div>
                </div>
                <div className="bg-surface rounded-lg p-4 border border-line">
                  <div className="text-ink-muted text-sm mb-1">User</div>
                  <div className="text-ink">{selectedTransaction.users?.display_name || 'Unknown'}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface rounded-lg p-4 border border-line">
                  <div className="text-ink-muted text-sm mb-1">Type</div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    selectedTransaction.type === 'deposit' ? 'bg-accent-soft text-accent' :
                    selectedTransaction.type === 'withdrawal' ? 'bg-pink-500/20 text-pink-400' :
                    selectedTransaction.type === 'purchase' ? 'bg-fuchsia-500/20 text-fuchsia-400' :
                    'bg-accent-soft text-accent'
                  }`}>
                    {selectedTransaction.type}
                  </span>
                </div>
                <div className="bg-surface rounded-lg p-4 border border-line">
                  <div className="text-ink-muted text-sm mb-1">Status</div>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    selectedTransaction.status === 'completed' ? 'bg-accent-soft text-accent' :
                    selectedTransaction.status === 'pending' ? 'bg-pink-500/20 text-pink-400' :
                    selectedTransaction.status === 'failed' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                    'bg-gray-500/20 text-ink-muted'
                  }`}>
                    {selectedTransaction.status}
                  </span>
                </div>
              </div>

              <div className="bg-surface rounded-lg p-4 border border-line">
                <div className="text-ink-muted text-sm mb-1">Amount</div>
                <div className="text-2xl font-bold text-ink">
                  {selectedTransaction.amount.toLocaleString('cs-CZ')} CZK
                </div>
              </div>

              {selectedTransaction.type === 'withdrawal' && selectedTransaction.withdrawal_method && (
                <div className="bg-surface rounded-lg p-4 border border-pink-500/30">
                  <div className="text-pink-300 text-sm mb-1 font-semibold">Withdrawal Method</div>
                  <div className="text-ink font-bold text-lg">{selectedTransaction.withdrawal_method}</div>
                </div>
              )}

              {selectedTransaction.type === 'withdrawal' && selectedTransaction.withdrawal_details && (
                <div className="col-span-2 bg-surface rounded-lg p-4 border border-line">
                  <div className="text-accent text-sm mb-3 font-semibold flex items-center gap-2">
                    <DollarSign size={16} />
                    Payment Details to Send Money
                  </div>
                  <div className="space-y-2 bg-surface rounded p-3">
                    {Object.entries(selectedTransaction.withdrawal_details).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center py-1 border-b border-line last:border-0">
                        <span className="text-accent text-sm capitalize font-medium">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-ink text-sm font-mono bg-accent-soft px-2 py-1 rounded">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTransaction.type !== 'withdrawal' && selectedTransaction.payment_method && (
                <div className="bg-surface rounded-lg p-4 border border-line">
                  <div className="text-ink-muted text-sm mb-1">Payment Method</div>
                  <div className="text-ink">{selectedTransaction.payment_method}</div>
                </div>
              )}

              {selectedTransaction.users?.email && (
                <div className="bg-surface rounded-lg p-4 border border-line">
                  <div className="text-ink-muted text-sm mb-1">User Email</div>
                  <div className="text-ink font-mono text-sm">{selectedTransaction.users.email}</div>
                </div>
              )}

              <div className="bg-surface rounded-lg p-4 border border-line">
                <div className="text-ink-muted text-sm mb-1">Created At</div>
                <div className="text-ink">{new Date(selectedTransaction.created_at).toLocaleString('cs-CZ')}</div>
              </div>

              {selectedTransaction.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-line">
                  <button
                    onClick={() => {
                      handleApprove(selectedTransaction.id);
                      setSelectedTransaction(null);
                    }}
                    className="flex-1 bg-accent hover:opacity-90 text-on-accent px-4 py-3 rounded-lg text-ink font-medium transition-all  flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Approve Transaction
                  </button>
                  <button
                    onClick={() => {
                      handleReject(selectedTransaction.id);
                      setSelectedTransaction(null);
                    }}
                    className="flex-1 bg-pink-600 hover:bg-pink-500 px-4 py-3 rounded-lg text-ink font-medium transition-all shadow-lg shadow-pink-500/30 flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Reject Transaction
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default FinanceTab;
