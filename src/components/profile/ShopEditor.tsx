import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Eye, Palette, LayoutGrid as Layout, Type, Image as ImageIcon, Link as LinkIcon, Sparkles, Wand2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface Shop {
  id: string;
  shop_name: string;
  shop_url: string;
  description: string;
  logo_url: string;
  banner_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  layout_style: string;
  items_per_page: number;
  show_categories: boolean;
  show_filters: boolean;
  email: string;
  discord_username: string;
  twitter_url: string;
  instagram_url: string;
}

const themePresets = [
  { name: 'Purple Haze', primary: '#9333EA', secondary: '#A855F7', accent: '#EC4899' },
  { name: 'Ocean Blue', primary: '#0EA5E9', secondary: '#06B6D4', accent: '#3B82F6' },
  { name: 'Forest Green', primary: '#10B981', secondary: '#059669', accent: '#34D399' },
  { name: 'Sunset Orange', primary: '#F97316', secondary: '#FB923C', accent: '#FDBA74' },
  { name: 'Royal Gold', primary: '#EAB308', secondary: '#FACC15', accent: '#FDE047' },
  { name: 'Dark Red', primary: '#DC2626', secondary: '#EF4444', accent: '#F87171' },
];

interface ShopEditorProps {
  shop: Shop;
  onClose: () => void;
}

const ShopEditor: React.FC<ShopEditorProps> = ({ shop, onClose }) => {
  const [activeTab, setActiveTab] = useState<'branding' | 'layout' | 'contact' | 'advanced'>('branding');
  const [formData, setFormData] = useState({ ...shop });
  const [saving, setSaving] = useState(false);

  const applyThemePreset = (preset: typeof themePresets[0]) => {
    setFormData({
      ...formData,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_shops')
        .update({
          shop_name: formData.shop_name,
          description: formData.description,
          logo_url: formData.logo_url || null,
          banner_url: formData.banner_url || null,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          accent_color: formData.accent_color,
          layout_style: formData.layout_style,
          items_per_page: formData.items_per_page,
          show_categories: formData.show_categories,
          show_filters: formData.show_filters,
          email: formData.email || null,
          discord_username: formData.discord_username || null,
          twitter_url: formData.twitter_url || null,
          instagram_url: formData.instagram_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', shop.id);

      if (error) throw error;

      alert('Shop updated successfully!');
      onClose();
    } catch (error: any) {
      console.error('Error updating shop:', error);
      alert(error.message || 'Failed to update shop');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-6xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">Customize Your Shop</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="grid md:grid-cols-[250px_1fr] gap-6 p-6 overflow-y-auto flex-1">
          {/* Sidebar */}
          <div className="space-y-2">
            <button
              onClick={() => setActiveTab('branding')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'branding'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Palette size={20} />
              Branding
            </button>
            <button
              onClick={() => setActiveTab('layout')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'layout'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Layout size={20} />
              Layout
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'advanced'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Wand2 size={20} />
              Advanced Design
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'contact'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <LinkIcon size={20} />
              Contact & Social
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {activeTab === 'branding' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Shop Name</label>
                  <input
                    type="text"
                    value={formData.shop_name}
                    onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    rows={4}
                    placeholder="Tell customers about your shop..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium flex items-center gap-2">
                      <ImageIcon size={18} />
                      Logo URL
                    </label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium flex items-center gap-2">
                      <ImageIcon size={18} />
                      Banner URL
                    </label>
                    <input
                      type="url"
                      value={formData.banner_url}
                      onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Theme Presets */}
                <div>
                  <label className="block text-gray-300 mb-3 font-medium flex items-center gap-2">
                    <Sparkles size={18} />
                    Theme Presets
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {themePresets.map((preset) => (
                      <motion.button
                        key={preset.name}
                        onClick={() => applyThemePreset(preset)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-3 rounded-lg border-2 border-gray-600 hover:border-purple-500 transition-all group"
                      >
                        <div className="flex gap-2 mb-2">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.primary }} />
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.secondary }} />
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.accent }} />
                        </div>
                        <div className="text-white text-sm font-medium group-hover:text-purple-400 transition">
                          {preset.name}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-3 font-medium">Custom Color Scheme</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Primary</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="w-12 h-12 rounded border border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Secondary</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="w-12 h-12 rounded border border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Accent</label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.accent_color}
                          onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                          className="w-12 h-12 rounded border border-gray-600 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={formData.accent_color}
                          onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-white font-semibold mb-4">Preview</h3>
                  <div className="space-y-4">
                    <div
                      className="h-32 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: formData.primary_color }}
                    >
                      <span className="text-white font-bold">Primary Color</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className="h-20 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: formData.secondary_color }}
                      >
                        <span className="text-white text-sm">Secondary</span>
                      </div>
                      <div
                        className="h-20 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: formData.accent_color }}
                      >
                        <span className="text-white text-sm">Accent</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'layout' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <label className="block text-gray-300 mb-3 font-medium">Layout Style</label>
                  <div className="grid grid-cols-3 gap-4">
                    {['grid', 'list', 'masonry'].map((style) => (
                      <button
                        key={style}
                        onClick={() => setFormData({ ...formData, layout_style: style })}
                        className={`p-4 rounded-lg border-2 transition ${
                          formData.layout_style === style
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }`}
                      >
                        <div className="text-white font-medium capitalize mb-2">{style}</div>
                        <div className="text-gray-400 text-xs">
                          {style === 'grid' && 'Equal sized cards in a grid'}
                          {style === 'list' && 'Horizontal list view'}
                          {style === 'masonry' && 'Pinterest-style layout'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Items Per Page</label>
                  <input
                    type="number"
                    min="6"
                    max="48"
                    step="6"
                    value={formData.items_per_page}
                    onChange={(e) => setFormData({ ...formData, items_per_page: parseInt(e.target.value) })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.show_categories}
                      onChange={(e) => setFormData({ ...formData, show_categories: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-600"
                    />
                    <div>
                      <div className="text-white font-medium">Show Categories</div>
                      <div className="text-gray-400 text-sm">Display category filter in your shop</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.show_filters}
                      onChange={(e) => setFormData({ ...formData, show_filters: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-600"
                    />
                    <div>
                      <div className="text-white font-medium">Show Filters</div>
                      <div className="text-gray-400 text-sm">Display price and condition filters</div>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}

            {activeTab === 'advanced' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <Sparkles size={18} />
                    <h3 className="font-semibold">Advanced Customization</h3>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Fine-tune your shop's appearance with advanced styling options.
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 mb-3 font-medium">Card Style</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="text-white font-medium mb-2">Rounded Corners</div>
                      <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                        <option>Small (4px)</option>
                        <option>Medium (8px)</option>
                        <option>Large (12px)</option>
                        <option>Extra Large (16px)</option>
                      </select>
                    </div>
                    <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                      <div className="text-white font-medium mb-2">Shadow Intensity</div>
                      <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                        <option>None</option>
                        <option>Subtle</option>
                        <option>Medium</option>
                        <option>Strong</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-3 font-medium">Typography</label>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Heading Font</label>
                      <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500">
                        <option>Inter (Default)</option>
                        <option>Poppins</option>
                        <option>Montserrat</option>
                        <option>Roboto</option>
                        <option>Open Sans</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Body Font</label>
                      <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500">
                        <option>Inter (Default)</option>
                        <option>Poppins</option>
                        <option>Montserrat</option>
                        <option>Roboto</option>
                        <option>Open Sans</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-3 font-medium">Spacing & Density</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Content Padding</label>
                      <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                        <option>Compact</option>
                        <option>Normal</option>
                        <option>Comfortable</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-2">Item Spacing</label>
                      <select className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-purple-500">
                        <option>Tight</option>
                        <option>Normal</option>
                        <option>Relaxed</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-3 font-medium">Effects & Animations</label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 rounded border-gray-600"
                      />
                      <div>
                        <div className="text-white font-medium">Hover Effects</div>
                        <div className="text-gray-400 text-sm">Show animations on item hover</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5 rounded border-gray-600"
                      />
                      <div>
                        <div className="text-white font-medium">Gradient Backgrounds</div>
                        <div className="text-gray-400 text-sm">Use gradient overlays on cards</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded border-gray-600"
                      />
                      <div>
                        <div className="text-white font-medium">Glow Effects</div>
                        <div className="text-gray-400 text-sm">Add subtle glow to rare items</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 mb-3 font-medium">Background Style</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button className="p-4 bg-gray-900 rounded-lg border-2 border-purple-500">
                      <div className="text-white text-sm font-medium">Dark</div>
                    </button>
                    <button className="p-4 bg-gray-700 rounded-lg border-2 border-gray-600 hover:border-purple-500 transition">
                      <div className="text-white text-sm font-medium">Dimmed</div>
                    </button>
                    <button className="p-4 bg-gray-50 rounded-lg border-2 border-gray-600 hover:border-purple-500 transition">
                      <div className="text-gray-900 text-sm font-medium">Light</div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'contact' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="shop@example.com"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Discord Username</label>
                  <input
                    type="text"
                    value={formData.discord_username}
                    onChange={(e) => setFormData({ ...formData, discord_username: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="username#1234"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Twitter URL</label>
                  <input
                    type="url"
                    value={formData.twitter_url}
                    onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://twitter.com/..."
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-medium">Instagram URL</label>
                  <input
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={() => window.open(`/shop/${shop.shop_url}`, '_blank')}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition flex items-center gap-2"
          >
            <Eye size={18} />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ShopEditor;
