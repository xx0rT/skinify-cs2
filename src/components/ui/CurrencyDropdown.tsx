import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useCurrencyStore, currencies } from '../../store/currencyStore';

const CurrencyDropdown: React.FC = () => {
  const { selectedCurrency, setSelectedCurrency, isAutoDetected } = useCurrencyStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleCurrencySelect = (currency: typeof currencies[0]) => {
    setSelectedCurrency(currency);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center space-x-1 md:space-x-2 text-gray-300 hover:text-white transition-all duration-300 p-1.5 md:p-2 hover:bg-gray-700/50 rounded-lg"
      >
        <Globe size={16} className="md:w-[18px] md:h-[18px]" />
        <span className="text-xs md:text-sm font-medium">{selectedCurrency.code}</span>
        <ChevronDown
          size={12}
          className={`md:w-[14px] md:h-[14px] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[85]"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed left-2 top-14 w-64 sm:w-72 bg-gray-800 rounded-xl border border-gray-700/50 shadow-2xl z-[90]"
              style={{
                maxHeight: 'calc(100vh - 64px)'
              }}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-700/50 bg-gray-900/50">
                <h3 className="font-semibold text-white flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-blue-400" />
                  Select Currency
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {isAutoDetected ? (
                    <span className="text-green-400">Auto-detected from your location</span>
                  ) : (
                    'Prices will be converted from CZK'
                  )}
                </p>
              </div>

              {/* Currency List */}
              <div className="max-h-80 overflow-y-auto scrollbar-thin">
                {currencies.map((currency, index) => (
                  <motion.button
                    key={currency.code}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleCurrencySelect(currency)}
                    className={`w-full p-4 text-left hover:bg-gray-700/50 transition-all duration-200 border-b border-gray-700/30 last:border-b-0 ${
                      selectedCurrency.code === currency.code ? 'bg-blue-500/10 border-blue-500/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          selectedCurrency.code === currency.code 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {currency.symbol}
                        </div>
                        <div>
                          <div className={`font-medium ${
                            selectedCurrency.code === currency.code ? 'text-blue-300' : 'text-white'
                          }`}>
                            {currency.code}
                          </div>
                          <div className="text-xs text-gray-400">{currency.name}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-xs text-gray-400">Rate</div>
                          <div className="text-sm text-gray-300">{currency.rate.toFixed(4)}</div>
                        </div>
                        {selectedCurrency.code === currency.code && (
                          <Check className="w-5 h-5 text-blue-400" />
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-gray-700/50 bg-gray-900/30">
                <p className="text-xs text-gray-500 text-center">
                  Exchange rates are updated daily
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CurrencyDropdown;