import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Heart, Search, Plus, Eye, Code, Sparkles, Palette, TrendingUp, Clock } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { getSupabaseCredentials } from '../utils/supabaseHelpers';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface CSSPreset {
  id: string;
  user_id: string;
  name: string;
  description: string;
  css_code: string;
  preview_image_url?: string;
  is_public: boolean;
  download_count: number;
  like_count: number;
  category: string;
  tags: string[];
  version: string;
  created_at: string;
  creator?: {
    display_name: string;
    avatar_url: string;
  };
}

const CSSPresetsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();
  const [presets, setPresets] = useState<CSSPreset[]>([]);
  const [filteredPresets, setFilteredPresets] = useState<CSSPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'liked'>('popular');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<CSSPreset | null>(null);

  const categories = [
    { id: 'all', name: 'All Presets', icon: Sparkles },
    { id: 'dark', name: 'Dark Themes', icon: Palette },
    { id: 'light', name: 'Light Themes', icon: Palette },
    { id: 'colorful', name: 'Colorful', icon: Palette },
    { id: 'minimal', name: 'Minimal', icon: Palette },
    { id: 'gaming', name: 'Gaming', icon: Palette },
    { id: 'professional', name: 'Professional', icon: Palette },
  ];

  useEffect(() => {
    fetchPresets();
  }, []);

  useEffect(() => {
    filterAndSortPresets();
  }, [presets, searchQuery, selectedCategory, sortBy]);

  const fetchPresets = async () => {
    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      const response = await fetch(`${supabaseUrl}/functions/v1/css-presets`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPresets(data.presets || []);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
      addToast('Failed to load CSS presets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPresets = () => {
    let filtered = [...presets];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'popular') return b.download_count - a.download_count;
      if (sortBy === 'liked') return b.like_count - a.like_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setFilteredPresets(filtered);
  };

  const handleDownloadPreset = async (preset: CSSPreset) => {
    if (!user) {
      addToast('Please log in to download presets', 'error');
      return;
    }

    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      await fetch(`${supabaseUrl}/functions/v1/css-presets/download`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preset_id: preset.id,
          steam_id: user.steamId
        })
      });

      const blob = new Blob([preset.css_code], { type: 'text/css' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${preset.name.replace(/\s+/g, '-').toLowerCase()}.css`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast('Preset downloaded successfully!', 'success');
      fetchPresets();
    } catch (error) {
      console.error('Download failed:', error);
      addToast('Failed to download preset', 'error');
    }
  };

  const handleLikePreset = async (presetId: string) => {
    if (!user) {
      addToast('Please log in to like presets', 'error');
      return;
    }

    try {
      const { supabaseUrl, supabaseKey } = getSupabaseCredentials();
      await fetch(`${supabaseUrl}/functions/v1/css-presets/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preset_id: presetId,
          steam_id: user.steamId
        })
      });

      addToast('Preset liked!', 'success');
      fetchPresets();
    } catch (error) {
      console.error('Like failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <main className="container mx-auto px-4 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Palette className="w-12 h-12 text-purple-400" />
            <h1 className="text-5xl font-bold text-white">CSS Style Presets</h1>
          </div>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Customize your marketplace experience with community-created CSS themes. Download, apply, and share your own unique styles!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 sticky top-24">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Categories
              </h3>
              <div className="space-y-2">
                {categories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      selectedCategory === category.id
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-gray-400 hover:bg-gray-700/30 hover:text-white'
                    }`}
                  >
                    <category.icon className="w-5 h-5" />
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>

              {user && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all font-semibold"
                >
                  <Plus className="w-5 h-5" />
                  Create Preset
                </button>
              )}
            </div>
          </motion.div>

          <div className="lg:col-span-3">
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search presets by name, description, or tags..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 bg-gray-800/50 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
              >
                <option value="popular">Most Downloaded</option>
                <option value="liked">Most Liked</option>
                <option value="recent">Recently Added</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-purple-500"></div>
                <p className="mt-4 text-gray-400">Loading presets...</p>
              </div>
            ) : filteredPresets.length === 0 ? (
              <div className="text-center py-20">
                <Palette className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-xl text-gray-400">No presets found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPresets.map((preset, index) => (
                  <motion.div
                    key={preset.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
                          {preset.name}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">{preset.description}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        preset.category === 'dark' ? 'bg-gray-700 text-gray-300' :
                        preset.category === 'light' ? 'bg-gray-200 text-gray-800' :
                        preset.category === 'colorful' ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {preset.category}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {preset.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          {preset.download_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {preset.like_count}
                        </span>
                      </div>
                      <span className="text-xs">{preset.version}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedPreset(preset)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-white rounded-lg transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleLikePreset(preset.id)}
                        className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all"
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPreset(preset)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedPreset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPreset(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-gray-900 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">{selectedPreset.name}</h2>
                <button
                  onClick={() => setSelectedPreset(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <div className="bg-gray-800 rounded-lg p-4 mb-4 font-mono text-sm text-gray-300 overflow-x-auto">
                <pre>{selectedPreset.css_code}</pre>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadPreset(selectedPreset)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all font-semibold"
                >
                  <Download className="w-5 h-5" />
                  Download Preset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CSSPresetsPage;
