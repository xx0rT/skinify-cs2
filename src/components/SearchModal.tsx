import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { items } = useMarketplaceItems();

  // Auto-focus when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Filter suggestions based on search query
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filtered = items
        .filter(item =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.market_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.condition.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 8); // Show max 8 suggestions
      
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery, items]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isOpen, onClose]);

  const handleSuggestionClick = (item: any) => {
    navigate(`/item/${item.id}`);
    onClose();
    setSearchQuery('');
  };

  // Get actual gun image based on item type and name
  const getItemImage = (type: string, name: string) => {
    // Use the item's actual image from Steam
    const itemData = items.find(item => item.name === name || item.market_name === name);
    if (itemData?.image) {
      return itemData.image;
    }

    // Fallback to generic weapon icons based on type
    if (name.toLowerCase().includes('sticker')) {
      return 'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICfTH5s2H6IhxFcH8E2SbkCPAL-fYJ0zJyZKgdP4nzCjsLa45O';
    }
    
    if (type.toLowerCase().includes('knife') || name.includes('★')) {
      return 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpovbSsLQJf0ebcZThQ6tCvq4GGqPP7I6vdk3lu-M1wmeyQyoD8j1yg5RVtMmCmctOWdFI5ZA2G8lG_lbvq1sC4vp7Lyntl63Uj7X_Umke_hE4aP-M90PDPTw3PVrM7XWs';
    }
    
    if (type.toLowerCase().includes('rifle') || name.includes('AK-47') || name.includes('M4A') || name.includes('AWP')) {
      return 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhIWZlP_1IbzUklRc7cF4n-T--Y3nj1H6-ENkMWv7LYCRewdtNAmCrFO5l-lucZW_vo74h2wj5Hes8hnXzg';
    }
    
    if (type.toLowerCase().includes('pistol') || name.includes('Glock') || name.includes('USP') || name.includes('Desert Eagle')) {
      return 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLAtl7PLFTi5H7c-im5KGqPv9NLPF2D4EsZQh077Dpo-g3lLj_RJlMGHxcYDAdFdoNAqBrFW9k-zs0ZC_7c_XiSw0S4tskNk';
    }
    
    if (type.toLowerCase().includes('gloves') || name.includes('Gloves')) {
      return 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLAtl7PLFTi5H7c-im5KGqPv9NLPF2D4EsZQh077Dpo-g3lLj_RJlMGHxcYDAdFdoNAqBrFW9k-zs0ZC_7c_XiSw0S4tskNk';
    }
    
    if (type.toLowerCase().includes('smg') || name.includes('P90') || name.includes('MP')) {
      return 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLAtl7PLFTi5H7c-im5KGqPv9NLPF2D4EsZQh077Dpo-g3lLj_RJlMGHxcYDAdFdoNAqBrFW9k-zs0ZC_7c_XiSw0S4tskNk';
    }

    // Default fallback image
    return 'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICfTH5s2H6IhxFcH8E2SbkCPAL-fYJ0zJyZKgdP4nzCjsLa45O';
  };

  const getItemCount = (item: any) => {
    // Generate pseudo-random but consistent numbers based on item ID
    const hash = item.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return Math.abs(hash) % 1000 + 1;
  };

  const getItemBreadcrumb = (item: any) => {
    const type = item.type || 'Unknown';
    const name = item.name || item.market_name || 'Unknown';
    
    // Extract weapon name from full item name
    let weaponName = '';
    let itemName = name;
    
    if (name.includes('|')) {
      const parts = name.split('|');
      weaponName = parts[0].trim();
      itemName = parts[1]?.trim() || parts[0].trim();
    } else if (name.includes('★')) {
      // For knives and gloves
      const cleanName = name.replace('★', '').trim();
      if (cleanName.includes('|')) {
        const parts = cleanName.split('|');
        weaponName = parts[0].trim();
        itemName = parts[1]?.trim() || parts[0].trim();
      } else {
        weaponName = cleanName;
        itemName = cleanName;
      }
    } else {
      weaponName = name;
    }
    
    return { type, weaponName, itemName };
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center pt-16"
        onClick={onClose}
      >
        <Flipper flipKey={`search-modal-${searchQuery}`}>
          <motion.div
            initial={{ 
              opacity: 0, 
              y: -30, 
              scale: 0.95,
              filter: 'blur(4px)'
            }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              filter: 'blur(0px)'
            }}
            exit={{ 
              opacity: 0, 
              y: -30, 
              scale: 0.95,
              filter: 'blur(4px)'
            }}
            transition={{ 
              duration: 0.4,
              type: "spring",
              stiffness: 300,
              damping: 25
            }}
            className="bg-gray-800/95 backdrop-blur-xl rounded-2xl border border-gray-600/50 w-full max-w-2xl mx-4 overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: `
                0 0 60px rgba(147, 51, 234, 0.4),
                0 0 100px rgba(59, 130, 246, 0.3),
                0 20px 40px rgba(0, 0, 0, 0.6),
                inset 0 1px 0 rgba(255, 255, 255, 0.1)
              `
            }}
          >
            {/* Animated glow border */}
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(45deg, rgba(147, 51, 234, 0.3), rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3))',
                backgroundSize: '400% 400%',
                padding: '2px'
              }}
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <div className="w-full h-full bg-gray-800/95 rounded-2xl" />
            </motion.div>

            {/* Search Header */}
            <div className="relative z-10 p-6 border-b border-gray-600/30">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <motion.input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search CS2 items..."
                    className="w-full bg-gray-700/50 border border-gray-500/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300 text-lg"
                    initial={{ scale: 0.98 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, duration: 0.3 }}
                    style={{
                      boxShadow: searchQuery ? '0 0 20px rgba(147, 51, 234, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.3)'
                    }}
                  />
                </div>
                
                <motion.button
                  onClick={onClose}
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  className="p-3 text-gray-400 hover:text-white transition-all duration-300 rounded-full hover:bg-gray-600/50 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
                  <X size={24} className="relative z-10" />
                </motion.button>
              </div>
            </div>

            {/* Suggestions - Only show when typing */}
            <Flipped flipId="suggestions-container">
              <div className="relative z-10">
                {searchQuery.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="max-h-96 overflow-y-auto"
                  >
                    <div className="p-4">
                      <motion.h3 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.3 }}
                        className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider flex items-center"
                      >
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse" />
                        Suggestions
                      </motion.h3>
                      
                      <div className="space-y-1">
                        <Flipper flipKey={suggestions.map(s => s.id).join('-')}>
                          {suggestions.length > 0 ? (
                            suggestions.map((item, index) => {
                              const breadcrumb = getItemBreadcrumb(item);
                              return (
                                <Flipped key={item.id} flipId={`suggestion-${item.id}`}>
                                  <motion.button
                                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    transition={{ 
                                      delay: index * 0.05, 
                                      duration: 0.3,
                                      type: "spring",
                                      stiffness: 300,
                                      damping: 25
                                    }}
                                    onClick={() => handleSuggestionClick(item)}
                                    onMouseEnter={() => setHoveredIndex(index)}
                                    onMouseLeave={() => setHoveredIndex(null)}
                                    className="w-full flex items-center space-x-4 p-4 hover:bg-gray-700/50 rounded-xl transition-all duration-300 group relative overflow-hidden"
                                    whileHover={{ 
                                      scale: 1.02,
                                      transition: { duration: 0.2 }
                                    }}
                                    style={{
                                      boxShadow: hoveredIndex === index ? '0 8px 25px rgba(147, 51, 234, 0.2)' : 'none'
                                    }}
                                  >
                                    {/* Hover background glow */}
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ 
                                        opacity: hoveredIndex === index ? 1 : 0,
                                        scale: hoveredIndex === index ? 1 : 0.8
                                      }}
                                      transition={{ duration: 0.3 }}
                                      className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 rounded-xl"
                                    />
                                    
                                    {/* Item Image */}
                                    <div className="w-12 h-12 bg-gray-600/30 rounded-lg flex items-center justify-center group-hover:bg-gray-500/30 transition-all duration-300 relative overflow-hidden flex-shrink-0">
                                      <img
                                        src={getItemImage(item.type, item.name)}
                                        alt={item.name}
                                        className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-110"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.src = 'https://community.cloudflare.steamstatic.com/economy/image/IzMF03bi9WpSBq-S-ekoE33L-iLqGFHVaU25ZzQNQcXdEH9myp0erksICfTH5s2H6IhxFcH8E2SbkCPAL-fYJ0zJyZKgdP4nzCjsLa45O';
                                        }}
                                      />
                                    </div>
                                    
                                    {/* Item Details with Breadcrumb */}
                                    <div className="flex-1 text-left relative z-10">
                                      <div className="flex items-center space-x-2 mb-1">
                                        <motion.span 
                                          className="text-white text-sm transition-all duration-300 hover:text-purple-300 cursor-pointer"
                                          whileHover={{ scale: 1.05 }}
                                        >
                                          {breadcrumb.type}
                                        </motion.span>
                                        <span className="text-gray-500 text-sm">{'>'}</span>
                                        <motion.span 
                                          className="text-white text-sm transition-all duration-300 hover:text-blue-300 cursor-pointer"
                                          whileHover={{ scale: 1.05 }}
                                        >
                                          {breadcrumb.weaponName}
                                        </motion.span>
                                        <span className="text-gray-500 text-sm">{'>'}</span>
                                        <motion.span 
                                          className="text-white font-normal group-hover:text-purple-300 transition-all duration-300 cursor-pointer"
                                          whileHover={{ scale: 1.05 }}
                                        >
                                          {breadcrumb.itemName}
                                        </motion.span>
                                      </div>
                                      {item.condition && (
                                        <div className="text-gray-500 text-xs">
                                          {item.condition}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Item Count */}
                                    <div className="text-gray-400 text-sm font-normal flex-shrink-0 relative z-10">
                                      {getItemCount(item)}
                                    </div>
                                  </motion.button>
                                </Flipped>
                              );
                            })
                          ) : (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.2 }}
                              className="text-center py-12"
                            >
                              <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-gray-500" />
                              </div>
                              <div className="text-gray-500 text-sm">
                                No items found for "{searchQuery}"
                              </div>
                            </motion.div>
                          )}
                        </Flipper>
                      </div>

                      {/* Show All Button - Only when there are results */}
                      {suggestions.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.3 }}
                          className="mt-4 pt-4 border-t border-gray-600/30"
                        >
                          <Flipped flipId="show-all-button">
                            <motion.button
                              onClick={() => {
                                navigate(`/?search=${encodeURIComponent(searchQuery)}`);
                                onClose();
                                setSearchQuery('');
                              }}
                              whileHover={{ 
                                scale: 1.02,
                                boxShadow: '0 4px 20px rgba(147, 51, 234, 0.3)'
                              }}
                              whileTap={{ scale: 0.98 }}
                              className="w-full text-center text-gray-400 hover:text-purple-400 transition-all duration-300 text-sm bg-gradient-to-r from-gray-700/30 to-gray-600/30 hover:from-purple-500/20 hover:to-blue-500/20 py-3 px-4 rounded-lg border border-gray-600/20 hover:border-purple-500/30"
                            >
                              <motion.span
                                whileHover={{ 
                                  color: '#A855F7',
                                  textShadow: '0 0 8px rgba(168, 85, 247, 0.6)'
                                }}
                                transition={{ duration: 0.2 }}
                              >
                                Show all results for "{searchQuery}"
                              </motion.span>
                            </motion.button>
                          </Flipped>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </Flipped>

            {/* Empty State - Only show when no search query */}
            {searchQuery.trim().length === 0 && (
              <Flipped flipId="empty-state">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="p-12 text-center relative z-10"
                >
                  <motion.div 
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      delay: 0.4, 
                      duration: 0.6,
                      type: "spring",
                      stiffness: 200,
                      damping: 20
                    }}
                    className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/30"
                    style={{
                      boxShadow: '0 0 30px rgba(147, 51, 234, 0.3)'
                    }}
                  >
                    <Search className="w-10 h-10 text-purple-400" />
                  </motion.div>
                  <motion.h3 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.3 }}
                    className="text-xl font-semibold text-white mb-3"
                  >
                    Search CS2 Items
                  </motion.h3>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.3 }}
                    className="text-gray-400 text-sm"
                  >
                    Find knives, rifles, pistols, stickers, and more
                  </motion.p>
                </motion.div>
              </Flipped>
            )}
          </motion.div>
        </Flipper>
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchModal;