import { motion, AnimatePresence } from 'framer-motion';
import { Settings, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useTranslationStore, languages } from '../../store/translationStore';
import { useToastStore } from '../../store/toastStore';
import CurrencyDropdown from '../ui/CurrencyDropdown';

export function TopHeader() {
  const navigate = useNavigate();
  const { addToast } = useToastStore();
  const {
    currentLanguage,
    setLanguageByCode,
    soundsEnabled,
    toggleSounds,
    soundVolume,
    setSoundVolume
  } = useTranslationStore();

  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  return (
    <motion.header
      role="banner"
      aria-label="Site header"
      className="fixed top-0 left-0 right-0 bg-gray-800 border-b border-gray-700/50 z-[60] h-12"
    >
      <div className="h-full flex items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          {/* Currency Dropdown */}
          <CurrencyDropdown />

          {/* Czech Flag */}
          <div className="text-xl">🇨🇿</div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettingsPanel(!showSettingsPanel)}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700/50"
            aria-label="Open settings panel"
            aria-expanded={showSettingsPanel}
          >
            <Settings size={18} aria-hidden="true" />
          </button>

          {/* Settings Panel Dropdown */}
          <AnimatePresence>
            {showSettingsPanel && (
              <>
                <div
                  className="fixed inset-0 z-[70]"
                  onClick={() => setShowSettingsPanel(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-80 bg-gray-800 border border-gray-600/50 rounded-xl shadow-2xl z-[80]"
                  style={{
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(168, 85, 247, 0.3)'
                  }}
                >
                  <div className="p-6 space-y-6 overflow-visible">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">Settings</h3>
                      <button
                        onClick={() => setShowSettingsPanel(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        ×
                      </button>
                    </div>

                    {/* Language Selection */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Language
                      </label>
                      <button
                        onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                        className={`w-full px-4 py-3 border border-gray-600/50 text-left flex items-center justify-between transition-all duration-300 ${
                          showLanguageDropdown
                            ? 'bg-gray-700 rounded-t-lg'
                            : 'bg-gray-700/50 rounded-lg hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{currentLanguage?.flag}</span>
                          <span className="text-gray-200">{currentLanguage?.name}</span>
                        </div>
                        <span className={`text-gray-400 transition-transform duration-300 ${showLanguageDropdown ? 'rotate-180' : ''}`}>▼</span>
                      </button>

                      <AnimatePresence>
                        {showLanguageDropdown && (
                          <>
                            <div
                              className="fixed inset-0 z-[85]"
                              onClick={() => setShowLanguageDropdown(false)}
                            />
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="absolute top-[calc(100%-0.5rem)] left-0 right-0 bg-gray-700 border border-gray-600/50 border-t-0 rounded-b-lg overflow-hidden shadow-2xl z-[90]"
                            >
                              <div className="max-h-64 overflow-y-auto">
                                {languages.map((lang) => (
                                  <button
                                    key={lang.code}
                                    onClick={() => {
                                      setShowLanguageDropdown(false);
                                      setLanguageByCode(lang.code.toLowerCase());
                                      addToast({
                                        type: 'success',
                                        title: 'Language Changed',
                                        message: `Switched to ${lang.name}`,
                                        duration: 2000
                                      });
                                    }}
                                    className={`w-full px-4 py-3 text-left flex items-center space-x-3 hover:bg-gray-600 transition-colors ${
                                      currentLanguage?.code === lang.code ? 'bg-purple-600/20 text-purple-400' : 'text-gray-300'
                                    }`}
                                  >
                                    <span className="text-lg">{lang.flag}</span>
                                    <span className="text-sm font-medium">{lang.name}</span>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Sound Settings */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-300">
                          Sound Effects
                        </label>
                        <button
                          onClick={toggleSounds}
                          className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                            soundsEnabled ? 'bg-purple-600' : 'bg-gray-600'
                          }`}
                        >
                          <motion.div
                            className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
                            animate={{ x: soundsEnabled ? 24 : 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          />
                        </button>
                      </div>

                      {soundsEnabled && (
                        <div className="flex items-center space-x-3">
                          <span className="text-orange-400">🔊</span>
                          <div className="flex-1 relative">
                            <div className="w-full h-2 bg-gray-700 rounded-full relative">
                              <div
                                className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full transition-all duration-200"
                                style={{ width: `${soundVolume}%` }}
                              />
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={soundVolume}
                                onChange={(e) => setSoundVolume(parseInt(e.target.value))}
                                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                              />
                            </div>
                          </div>
                          <span className="text-gray-400 text-sm w-8">{soundVolume}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Center Logo */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <img
            src="/logo-header.png"
            alt="Logo"
            className="h-24 w-auto object-contain cursor-pointer"
            onClick={() => navigate('/')}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/faq')}
            className="flex items-center space-x-2 p-2 text-gray-400 hover:text-purple-400 transition-colors rounded-lg hover:bg-gray-700/50"
          >
            <BookOpen size={18} />
            <span className="text-sm font-medium hidden md:inline">FAQ</span>
          </button>
        </div>
      </div>
    </motion.header>
  );
}
