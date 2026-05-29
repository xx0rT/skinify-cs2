import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Plus, Eye, EyeOff, TrendingUp, ArrowUpCircle, Minus } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBalanceStore } from '../../store/balanceStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { StyledPrice } from '../../utils/formatPrice';
import DepositModal from '../ui/DepositModal';
import WithdrawModal from '../ui/WithdrawModal';

interface BalanceDisplayProps {
  onDepositSuccess?: () => void;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({ onDepositSuccess }) => {
  const { user } = useAuthStore();
  const { 
    balance, 
    pendingBalance,
    transactions,
    totalDeposited, 
    totalSpent, 
    loading: balanceLoading, 
    fetchBalance
  } = useBalanceStore();
  const { formatPrice } = useCurrencyStore();
  const [showBalance, setShowBalance] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const handleWithdrawSuccess = () => {
    loadBalance(); // Refresh balance after withdrawal
    setShowWithdrawModal(false);
  };

  const loadBalance = async () => {
    if (!user) return;
    
    await fetchBalance(user.steamId);
  };

  useEffect(() => {
    loadBalance();
  }, [user, fetchBalance]);

  const handleDepositSuccess = () => {
    loadBalance(); // Refresh balance
    console.log('=== DEPOSIT SUCCESS HANDLER ===');
    console.log('Only refreshing balance - NO money added by frontend');
    if (onDepositSuccess) {
      onDepositSuccess();
    }
  };

  if (!user) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-white">Account Balance</h3>
          </div>
          <button
            onClick={() => setShowBalance(!showBalance)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {showBalance ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>

        {/* Balance Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Available Balance</span>
            <div className="text-right">
              {balanceLoading ? (
                <div className="h-6 w-24 bg-gray-700 animate-pulse rounded"></div>
              ) : (
                <div className="text-xl font-bold text-purple-400">
                  {showBalance ? (
                    <StyledPrice
                      price={balance}
                      wholeClassName="text-purple-400"
                      decimalClassName="text-purple-400/60"
                      symbolClassName="text-purple-400"
                    />
                  ) : '••••••'}
                </div>
              )}
            </div>
          </div>

          {/* Pending Balance */}
          {pendingBalance > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Pending Balance</span>
              <span className="text-purple-400">
                {showBalance ? (
                  <StyledPrice
                    price={pendingBalance}
                    wholeClassName="text-purple-400"
                    decimalClassName="text-purple-400/60"
                    symbolClassName="text-purple-400"
                  />
                ) : '••••••'}
              </span>
            </div>
          )}

          {/* Total Deposited */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Total Deposited</span>
            <span className="text-gray-300">
              {showBalance ? (
                <StyledPrice
                  price={totalDeposited}
                  wholeClassName="text-gray-300"
                  decimalClassName="text-gray-400/60"
                  symbolClassName="text-gray-300"
                />
              ) : '••••••'}
            </span>
          </div>
          
          {/* Total Spent */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Total Spent</span>
            <span className="text-gray-300">
              {showBalance ? (
                <StyledPrice
                  price={totalSpent}
                  wholeClassName="text-gray-300"
                  decimalClassName="text-gray-400/60"
                  symbolClassName="text-gray-300"
                />
              ) : '••••••'}
            </span>
          </div>

          {/* Deposit Button */}
          <motion.button
            onClick={() => setShowDepositModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2 mb-3 group"
            style={{ boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)' }}
          >
            <motion.div
              animate={{ rotate: [0, 90, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <Plus size={18} className="group-hover:scale-110 transition-transform" />
            </motion.div>
            <span>Deposit Funds</span>
          </motion.button>
          
          {/* Withdraw Button */}
          <motion.button
            onClick={() => setShowWithdrawModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-2"
            style={{ boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)' }}
          >
            <Minus size={18} />
            <span>Withdraw Funds</span>
          </motion.button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-700/50">
          <div className="text-center">
            <div className="text-sm font-bold text-purple-400">
              {formatPrice(totalDeposited)}
            </div>
            <div className="text-xs text-gray-500">Deposited</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-bold text-purple-400">
              {formatPrice(totalSpent)}
            </div>
            <div className="text-xs text-gray-500">Spent</div>
          </div>
        </div>
      </motion.div>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        onSuccess={handleDepositSuccess}
        currentBalance={balance}
      />

      {/* Withdraw Modal */}
      <WithdrawModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        onSuccess={handleWithdrawSuccess}
        currentBalance={balance}
      />
    </>
  );
};

export default BalanceDisplay;