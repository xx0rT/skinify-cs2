import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Eye, Palette, Code, Download, Upload, Heart, Maximize2, Minimize2, Store, Sparkles, Image as ImageIcon, Share2, Copy, Check, Grid2x2 as Grid, List } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';

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
  custom_css?: string;
}

interface VisualShopEditorProps {
  shop: Shop;
  onClose: () => void;
}

interface CSSTemplate {
  id: string;
  name: string;
  description: string;
  css_code: string;
  creator_steam_id: string;
  creator_name: string;
  downloads: number;
  likes: number;
}

interface StyleSettings {
  cardBorderRadius: number;
  cardBorderWidth: number;
  cardBorderColor: string;
  cardBackgroundOpacity: number;
  cardBackgroundColor: string;
  hoverElevation: number;
  hoverScale: number;
  shadowIntensity: number;
  priceSize: number;
  buttonBorderRadius: number;
}

const themePresets = [
  { name: 'Purple Haze', primary: '#9333EA', secondary: '#A855F7', accent: '#EC4899' },
  { name: 'Ocean Blue', primary: '#0EA5E9', secondary: '#06B6D4', accent: '#3B82F6' },
  { name: 'Forest Green', primary: '#10B981', secondary: '#059669', accent: '#34D399' },
  { name: 'Sunset Orange', primary: '#F97316', secondary: '#FB923C', accent: '#FDBA74' },
  { name: 'Royal Gold', primary: '#EAB308', secondary: '#FACC15', accent: '#FDE047' },
  { name: 'Dark Red', primary: '#DC2626', secondary: '#EF4444', accent: '#F87171' },
];

const VisualShopEditor: React.FC<VisualShopEditorProps> = ({ shop, onClose }) => {
  const user = useAuthStore((state) => state.user);
  const [formData, setFormData] = useState({ ...shop });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'templates' | 'css-editor'>('basic');
  const [cssTemplates, setCssTemplates] = useState<CSSTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [isCodeFullscreen, setIsCodeFullscreen] = useState(false);
  const [editorWidth, setEditorWidth] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');
  const editorRef = useRef<HTMLDivElement>(null);

  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    cardBorderRadius: 16,
    cardBorderWidth: 1,
    cardBorderColor: '#374151',
    cardBackgroundOpacity: 60,
    cardBackgroundColor: '#1e293b',
    hoverElevation: 8,
    hoverScale: 1.02,
    shadowIntensity: 40,
    priceSize: 24,
    buttonBorderRadius: 8,
  });

  useEffect(() => {
    if (activeTab === 'templates') {
      loadCSSTemplates();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && editorRef.current) {
        const newWidth = window.innerWidth - e.clientX;
        setEditorWidth(Math.max(400, Math.min(newWidth, window.innerWidth - 400)));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const loadCSSTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data, error } = await supabase
        .from('css_presets')
        .select('*')
        .eq('is_public', true)
        .order('downloads', { ascending: false })
        .limit(20);

      if (error) throw error;
      setCssTemplates(data || []);
    } catch (error) {
      console.error('Error loading CSS templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplate = (template: CSSTemplate) => {
    setFormData({ ...formData, custom_css: template.css_code });
    supabase
      .from('css_presets')
      .update({ downloads: template.downloads + 1 })
      .eq('id', template.id)
      .then(() => loadCSSTemplates());
  };

  const uploadTemplate = async () => {
    if (!formData.custom_css || !user) {
      alert('Please write some CSS code first');
      return;
    }

    const templateName = prompt('Enter a name for your template:');
    if (!templateName) return;

    const templateDescription = prompt('Enter a description:');
    if (!templateDescription) return;

    try {
      const { error } = await supabase
        .from('css_presets')
        .insert({
          name: templateName,
          description: templateDescription,
          css_code: formData.custom_css,
          creator_steam_id: user.steamId,
          creator_name: user.displayName,
          is_public: true,
          downloads: 0,
          likes: 0,
        });

      if (error) throw error;
      alert('Template uploaded successfully!');
      loadCSSTemplates();
    } catch (error: any) {
      alert(error.message || 'Failed to upload template');
    }
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
          custom_css: formData.custom_css || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', shop.id);

      if (error) throw error;
      alert('Shop updated successfully! The page will refresh to show your changes.');
      window.location.reload();
    } catch (error: any) {
      alert(error.message || 'Failed to update shop');
    } finally {
      setSaving(false);
    }
  };

  const applyThemePreset = (preset: typeof themePresets[0]) => {
    setFormData({
      ...formData,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent
    });
  };

  const generateCSS = () => {
    const css = `/* 🎨 Custom Shop Styles - Generated ${new Date().toLocaleString()} */

/* Shop Container */
.shop-container {
  background: transparent;
  padding: 2rem;
}

/* Item Cards */
.item-card {
  background: ${styleSettings.cardBackgroundColor}${Math.round(styleSettings.cardBackgroundOpacity * 2.55).toString(16).padStart(2, '0')};
  backdrop-filter: blur(12px);
  border: ${styleSettings.cardBorderWidth}px solid ${styleSettings.cardBorderColor};
  border-radius: ${styleSettings.cardBorderRadius}px;
  padding: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.item-card:hover {
  transform: translateY(-${styleSettings.hoverElevation}px) scale(${styleSettings.hoverScale});
  box-shadow: 0 ${styleSettings.hoverElevation * 2}px ${styleSettings.shadowIntensity}px ${formData.primary_color}${Math.round(styleSettings.shadowIntensity * 2.55).toString(16).padStart(2, '0')};
  border-color: ${formData.accent_color};
}

/* Item Names */
.item-name {
  color: #ffffff;
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

/* Item Prices */
.item-price {
  color: ${formData.accent_color};
  font-size: ${styleSettings.priceSize}px;
  font-weight: 700;
  text-shadow: 0 0 20px ${formData.accent_color}60;
}

/* Buy Buttons */
.item-card button {
  background: linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color});
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: ${styleSettings.buttonBorderRadius}px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.item-card button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px ${formData.primary_color}60;
}

/* Shop Header Styling */
.shop-header {
  background: linear-gradient(135deg, ${formData.primary_color}30 0%, ${formData.secondary_color}30 100%);
  border-radius: 16px;
  padding: 2rem;
  margin-bottom: 2rem;
}`;
    setFormData({ ...formData, custom_css: css });
    setActiveTab('css-editor');
  };

  const shareCSS = async () => {
    if (!formData.custom_css) {
      alert('No CSS code to share');
      return;
    }

    try {
      await navigator.clipboard.writeText(formData.custom_css);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert('Failed to copy CSS to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full h-full max-w-[98vw] max-h-[98vh] flex flex-col rounded-xl overflow-hidden shadow-2xl bg-[#1a1d29] border border-gray-800"
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1d29] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Visual Shop Editor</h2>
              <p className="text-gray-400 text-xs">Customize your shop with live preview</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/shop/${shop.shop_url}`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition text-white text-sm"
            >
              <Eye size={16} />
              Preview Shop
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition text-white disabled:opacity-50 font-medium text-sm"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs - Sticky */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#141720] border-b border-gray-800 sticky top-0 z-10 flex-shrink-0">
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${
              activeTab === 'basic'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <Palette size={16} />
            Basic Styling
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${
              activeTab === 'templates'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <Download size={16} />
            CSS Templates
            {cssTemplates.length > 0 && (
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                {cssTemplates.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('css-editor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${
              activeTab === 'css-editor'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <Code size={16} />
            CSS Editor
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Controls */}
          <div className="w-80 border-r border-gray-800 overflow-y-auto bg-[#1a1d29]">
            <div className="p-4 space-y-5">
              {/* BASIC TAB */}
              {activeTab === 'basic' && (
                <div className="space-y-5">
                  {/* Theme Presets */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
                      <Sparkles size={16} className="text-purple-400" />
                      Quick Theme Presets
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {themePresets.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => applyThemePreset(preset)}
                          className="p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition"
                        >
                          <div className="flex gap-1.5 mb-1.5">
                            <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.primary }} />
                            <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.secondary }} />
                            <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.accent }} />
                          </div>
                          <span className="text-white text-xs font-medium">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Pickers */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 text-sm">Shop Colors</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Primary Color', key: 'primary_color' },
                        { label: 'Secondary Color', key: 'secondary_color' },
                        { label: 'Accent Color', key: 'accent_color' }
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <label className="block text-gray-400 text-xs mb-1.5 font-medium">{label}</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={formData[key as keyof Shop] as string}
                              onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                              className="w-12 h-12 rounded-lg cursor-pointer border border-gray-700"
                            />
                            <input
                              type="text"
                              value={formData[key as keyof Shop] as string}
                              onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                              className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm border border-gray-700"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Advanced Card Styling */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 text-sm">Card Styling</h3>
                    <div className="space-y-4">
                      {/* Border Radius */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-gray-400 text-xs font-medium">Border Radius</label>
                          <span className="text-purple-400 text-xs font-mono">{styleSettings.cardBorderRadius}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="32"
                          value={styleSettings.cardBorderRadius}
                          onChange={(e) => setStyleSettings({ ...styleSettings, cardBorderRadius: Number(e.target.value) })}
                          className="w-full accent-purple-600"
                        />
                      </div>

                      {/* Border Width */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-gray-400 text-xs font-medium">Border Width</label>
                          <span className="text-purple-400 text-xs font-mono">{styleSettings.cardBorderWidth}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="8"
                          value={styleSettings.cardBorderWidth}
                          onChange={(e) => setStyleSettings({ ...styleSettings, cardBorderWidth: Number(e.target.value) })}
                          className="w-full accent-purple-600"
                        />
                      </div>

                      {/* Border Color */}
                      <div>
                        <label className="block text-gray-400 text-xs mb-1.5 font-medium">Border Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={styleSettings.cardBorderColor}
                            onChange={(e) => setStyleSettings({ ...styleSettings, cardBorderColor: e.target.value })}
                            className="w-12 h-10 rounded-lg cursor-pointer border border-gray-700"
                          />
                          <input
                            type="text"
                            value={styleSettings.cardBorderColor}
                            onChange={(e) => setStyleSettings({ ...styleSettings, cardBorderColor: e.target.value })}
                            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs border border-gray-700"
                          />
                        </div>
                      </div>

                      {/* Background Color */}
                      <div>
                        <label className="block text-gray-400 text-xs mb-1.5 font-medium">Background Color</label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={styleSettings.cardBackgroundColor}
                            onChange={(e) => setStyleSettings({ ...styleSettings, cardBackgroundColor: e.target.value })}
                            className="w-12 h-10 rounded-lg cursor-pointer border border-gray-700"
                          />
                          <input
                            type="text"
                            value={styleSettings.cardBackgroundColor}
                            onChange={(e) => setStyleSettings({ ...styleSettings, cardBackgroundColor: e.target.value })}
                            className="flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs border border-gray-700"
                          />
                        </div>
                      </div>

                      {/* Background Opacity */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-gray-400 text-xs font-medium">Background Opacity</label>
                          <span className="text-purple-400 text-xs font-mono">{styleSettings.cardBackgroundOpacity}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={styleSettings.cardBackgroundOpacity}
                          onChange={(e) => setStyleSettings({ ...styleSettings, cardBackgroundOpacity: Number(e.target.value) })}
                          className="w-full accent-purple-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hover Effects */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 text-sm">Hover Effects</h3>
                    <div className="space-y-4">
                      {/* Hover Elevation */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-gray-400 text-xs font-medium">Lift Height</label>
                          <span className="text-purple-400 text-xs font-mono">{styleSettings.hoverElevation}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={styleSettings.hoverElevation}
                          onChange={(e) => setStyleSettings({ ...styleSettings, hoverElevation: Number(e.target.value) })}
                          className="w-full accent-purple-600"
                        />
                      </div>

                      {/* Hover Scale */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-gray-400 text-xs font-medium">Scale</label>
                          <span className="text-purple-400 text-xs font-mono">{styleSettings.hoverScale}x</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="1.2"
                          step="0.01"
                          value={styleSettings.hoverScale}
                          onChange={(e) => setStyleSettings({ ...styleSettings, hoverScale: Number(e.target.value) })}
                          className="w-full accent-purple-600"
                        />
                      </div>

                      {/* Shadow Intensity */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-gray-400 text-xs font-medium">Shadow Intensity</label>
                          <span className="text-purple-400 text-xs font-mono">{styleSettings.shadowIntensity}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={styleSettings.shadowIntensity}
                          onChange={(e) => setStyleSettings({ ...styleSettings, shadowIntensity: Number(e.target.value) })}
                          className="w-full accent-purple-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Typography */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 text-sm">Typography</h3>
                    <div className="space-y-4">
                      {/* Price Size */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-gray-400 text-xs font-medium">Price Size</label>
                          <span className="text-purple-400 text-xs font-mono">{styleSettings.priceSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="16"
                          max="48"
                          value={styleSettings.priceSize}
                          onChange={(e) => setStyleSettings({ ...styleSettings, priceSize: Number(e.target.value) })}
                          className="w-full accent-purple-600"
                        />
                      </div>

                      {/* Button Border Radius */}
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-gray-400 text-xs font-medium">Button Radius</label>
                          <span className="text-purple-400 text-xs font-mono">{styleSettings.buttonBorderRadius}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="24"
                          value={styleSettings.buttonBorderRadius}
                          onChange={(e) => setStyleSettings({ ...styleSettings, buttonBorderRadius: Number(e.target.value) })}
                          className="w-full accent-purple-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shop Info */}
                  <div>
                    <h3 className="text-white font-semibold mb-3 text-sm flex items-center gap-2">
                      <ImageIcon size={16} className="text-purple-400" />
                      Shop Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-gray-400 text-xs mb-1.5 font-medium">Shop Name</label>
                        <input
                          type="text"
                          value={formData.shop_name}
                          onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-700 text-sm"
                          placeholder="Enter shop name"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-xs mb-1.5 font-medium">Description</label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] resize-none border border-gray-700 text-sm"
                          placeholder="Describe your shop..."
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-xs mb-1.5 font-medium">Logo URL</label>
                        <input
                          type="url"
                          value={formData.logo_url}
                          onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                          className="w-full bg-gray-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-700 text-sm"
                          placeholder="https://example.com/logo.png"
                        />
                        {formData.logo_url && (
                          <img
                            src={formData.logo_url}
                            alt="Logo preview"
                            className="mt-2 w-20 h-20 rounded-lg object-cover border border-gray-700"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Generate CSS Button */}
                  <button
                    onClick={generateCSS}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-3 rounded-lg transition font-bold flex items-center justify-center gap-2 text-sm shadow-lg"
                  >
                    <Sparkles size={18} />
                    Generate CSS Code
                  </button>
                </div>
              )}

              {/* TEMPLATES TAB */}
              {activeTab === 'templates' && (
                <div className="space-y-3">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                      <Download className="text-purple-400" size={16} />
                      Community Templates
                    </h3>
                    <p className="text-gray-400 text-xs mb-3">Browse and apply CSS templates</p>
                    <button
                      onClick={uploadTemplate}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-4 py-2 rounded-lg transition font-medium flex items-center justify-center gap-2 text-sm"
                    >
                      <Upload size={16} />
                      Upload Your Template
                    </button>
                  </div>

                  {loadingTemplates ? (
                    <div className="text-center text-gray-400 py-8">
                      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm">Loading templates...</p>
                    </div>
                  ) : cssTemplates.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <p className="text-sm">No templates available yet.</p>
                      <p className="text-xs mt-1">Be the first to upload one!</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cssTemplates.map((template) => (
                        <div key={template.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition">
                          <h4 className="text-white font-semibold text-sm mb-1">{template.name}</h4>
                          <p className="text-gray-400 text-xs mb-2">{template.description}</p>
                          <p className="text-gray-500 text-xs mb-2">by {template.creator_name}</p>
                          <div className="flex items-center gap-3 mb-2 text-xs">
                            <span className="text-gray-400 flex items-center gap-1">
                              <Download size={12} />
                              {template.downloads}
                            </span>
                            <span className="text-pink-400 flex items-center gap-1">
                              <Heart size={12} />
                              {template.likes}
                            </span>
                          </div>
                          <button
                            onClick={() => applyTemplate(template)}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-3 py-2 rounded-lg transition font-medium text-xs"
                          >
                            Apply Template
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CSS EDITOR TAB */}
              {activeTab === 'css-editor' && !isCodeFullscreen && (
                <div className="space-y-3">
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                      <Code className="text-purple-400" size={16} />
                      CSS Code Editor
                    </h3>
                    <p className="text-gray-400 text-xs mb-3">Edit and share your custom CSS</p>
                    <button
                      onClick={shareCSS}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-4 py-2 rounded-lg transition font-medium flex items-center justify-center gap-2 text-sm"
                    >
                      {copied ? <Check size={16} /> : <Share2 size={16} />}
                      {copied ? 'Copied!' : 'Share CSS Code'}
                    </button>
                  </div>

                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                    <p className="text-gray-300 text-xs font-semibold mb-2">CSS Selectors:</p>
                    <div className="space-y-1 text-xs text-gray-400 font-mono">
                      <code className="block bg-gray-900 px-2 py-1 rounded">.shop-container</code>
                      <code className="block bg-gray-900 px-2 py-1 rounded">.item-card</code>
                      <code className="block bg-gray-900 px-2 py-1 rounded">.item-name</code>
                      <code className="block bg-gray-900 px-2 py-1 rounded">.item-price</code>
                      <code className="block bg-gray-900 px-2 py-1 rounded">.shop-header</code>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setFormData({ ...formData, custom_css: '' })}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition font-medium border border-gray-700 text-xs"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={generateCSS}
                      className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition font-medium border border-gray-700 text-xs"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - CSS Editor or Live Preview */}
          <div
            ref={editorRef}
            className="flex-1 overflow-hidden flex flex-col bg-[#0d1117]"
            style={activeTab === 'css-editor' ? { width: `${editorWidth}px`, flexShrink: 0 } : {}}
          >
            {activeTab === 'css-editor' && (
              <>
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 bg-gray-700 hover:bg-purple-500 cursor-col-resize transition z-10"
                  onMouseDown={() => setIsResizing(true)}
                />

                <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-[#0d1117] flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <Code className="text-purple-400" size={18} />
                    <span className="text-white font-semibold text-sm">CSS Code Editor</span>
                    <span className="text-xs text-gray-500">
                      {(formData.custom_css || '').length} / 51200 chars
                    </span>
                  </div>
                  <button
                    onClick={() => setIsCodeFullscreen(!isCodeFullscreen)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white"
                    title="Toggle Fullscreen"
                  >
                    {isCodeFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-4 bg-[#0d1117]">
                  <textarea
                    value={formData.custom_css || ''}
                    onChange={(e) => setFormData({ ...formData, custom_css: e.target.value })}
                    placeholder="/* Write your custom CSS here */&#10;/* Click 'Generate CSS Code' in Basic Styling tab */&#10;&#10;.shop-container {&#10;  background: linear-gradient(135deg, #1e1b4b, #3b0764);&#10;  padding: 2rem;&#10;}&#10;&#10;.item-card {&#10;  background: rgba(30, 41, 59, 0.6);&#10;  border: 1px solid rgba(168, 85, 247, 0.3);&#10;  border-radius: 16px;&#10;}"
                    className="w-full h-full min-h-[600px] bg-[#0d1117] text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg p-3 border border-gray-800"
                    style={{
                      lineHeight: '1.6',
                      tabSize: 2,
                      caretColor: '#A855F7'
                    }}
                    spellCheck={false}
                  />
                </div>
              </>
            )}

            {activeTab !== 'css-editor' && (
              <>
                <div className="p-3 flex items-center justify-between border-b border-gray-800 bg-[#0d1117] flex-shrink-0">
                  <span className="inline-block bg-gradient-to-r from-green-500 via-purple-500 to-pink-500 text-white px-4 py-1.5 rounded-full text-xs font-bold">
                    🔴 LIVE PREVIEW (1:1 Replica)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewStyle('grid')}
                      className={`p-2 rounded-lg transition ${viewStyle === 'grid' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                      <Grid size={16} />
                    </button>
                    <button
                      onClick={() => setViewStyle('list')}
                      className={`p-2 rounded-lg transition ${viewStyle === 'list' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                    >
                      <List size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto">
                  <style dangerouslySetInnerHTML={{ __html: formData.custom_css || '' }} />

                  {/* 1:1 Replica of UserShopPage */}
                  <div className="min-h-screen bg-gray-900">
                    {/* Shop Header - Exact Replica */}
                    <div className="shop-header p-8 mb-6 bg-gray-800/20">
                      <div className="flex items-start gap-6">
                        {formData.logo_url ? (
                          <motion.img
                            src={formData.logo_url}
                            alt="Logo"
                            className="w-24 h-24 rounded-2xl object-cover shadow-lg"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          />
                        ) : (
                          <motion.div
                            className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: formData.primary_color }}
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          >
                            <Store className="w-12 h-12 text-white" />
                          </motion.div>
                        )}
                        <div className="flex-1">
                          <motion.h1
                            className="text-4xl font-bold text-white mb-2"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                          >
                            {formData.shop_name}
                          </motion.h1>
                          {formData.description && (
                            <motion.p
                              className="text-gray-300 mb-4 max-w-3xl"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                            >
                              {formData.description}
                            </motion.p>
                          )}
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 text-gray-400">
                              <Eye size={18} />
                              <span>123 views</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                              <Store size={18} />
                              <span>45 sales</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* View Toggle */}
                    <div className="px-8 mb-6 flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-white">Shop Items</h2>
                    </div>

                    {/* Items Grid/List - Exact Replica */}
                    <div className="shop-container px-8 pb-12">
                      <div className={viewStyle === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-4'}>
                        {[
                          { name: 'Sawed-Off | Forest DDPAT', price: 65, wear: 'Minimal Wear' },
                          { name: 'SSG 08 | Blue Spruce', price: 25, wear: 'Battle-Scarred' },
                          { name: 'Tec-9 | Army Mesh', price: 56, wear: 'Field-Tested' }
                        ].map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{
                              y: -styleSettings.hoverElevation,
                              scale: styleSettings.hoverScale,
                              transition: { duration: 0.2 }
                            }}
                            className={`item-card group relative overflow-hidden cursor-pointer transition-all ${
                              viewStyle === 'list' ? 'flex gap-4' : ''
                            }`}
                            style={{
                              background: `${styleSettings.cardBackgroundColor}${Math.round(styleSettings.cardBackgroundOpacity * 2.55).toString(16).padStart(2, '0')}`,
                              backdropFilter: 'blur(12px)',
                              border: `${styleSettings.cardBorderWidth}px solid ${styleSettings.cardBorderColor}`,
                              borderRadius: `${styleSettings.cardBorderRadius}px`,
                            }}
                          >
                            <div
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                              style={{
                                background: `radial-gradient(circle at center, ${formData.primary_color}15 0%, transparent 70%)`
                              }}
                            />

                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                              <div
                                className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"
                                style={{
                                  background: `linear-gradient(90deg, transparent, ${formData.primary_color}20, transparent)`
                                }}
                              />
                            </div>

                            <div className={`relative ${viewStyle === 'list' ? 'w-48' : 'w-full h-48'} overflow-hidden`}>
                              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                                <div className="text-6xl">🔫</div>
                              </div>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>

                            <div className="p-4 relative z-10">
                              <h3 className="item-name text-white font-medium mb-2 text-sm">{item.name}</h3>
                              <span className="inline-block px-2 py-1 rounded text-xs bg-gray-700/50 text-gray-300 mb-3">
                                {item.wear}
                              </span>
                              <div className="flex items-center justify-between">
                                <span
                                  className="item-price font-bold"
                                  style={{
                                    color: formData.accent_color,
                                    fontSize: `${styleSettings.priceSize}px`,
                                    textShadow: `0 0 20px ${formData.accent_color}60`
                                  }}
                                >
                                  {item.price} Kč
                                </span>
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="px-4 py-2 text-white text-sm font-medium transition-all"
                                  style={{
                                    background: `linear-gradient(135deg, ${formData.primary_color}, ${formData.secondary_color})`,
                                    borderRadius: `${styleSettings.buttonBorderRadius}px`
                                  }}
                                >
                                  Buy Now
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Fullscreen Code Editor Modal */}
      <AnimatePresence>
        {isCodeFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-[60] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 bg-[#0d1117] border-b border-gray-800">
              <div className="flex items-center gap-3">
                <Code className="text-purple-400" size={20} />
                <span className="text-white font-bold">Fullscreen CSS Editor</span>
                <span className="text-sm text-gray-500">
                  {(formData.custom_css || '').length} / 51200 chars
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={shareCSS}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition text-white text-sm"
                >
                  {copied ? <Check size={16} /> : <Share2 size={16} />}
                  {copied ? 'Copied!' : 'Share CSS'}
                </button>
                <button
                  onClick={() => setIsCodeFullscreen(false)}
                  className="p-2 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white"
                >
                  <Minimize2 size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-[#0d1117]">
              <div className="max-w-6xl mx-auto">
                <textarea
                  value={formData.custom_css || ''}
                  onChange={(e) => setFormData({ ...formData, custom_css: e.target.value })}
                  placeholder="/* Write your custom CSS here */&#10;/* Click 'Generate CSS Code' in Basic Styling tab */&#10;&#10;.shop-container {&#10;  background: linear-gradient(135deg, #1e1b4b, #3b0764);&#10;}&#10;&#10;.item-card {&#10;  background: rgba(30, 41, 59, 0.6);&#10;}"
                  className="w-full min-h-[calc(100vh-120px)] bg-[#0d1117] text-gray-100 font-mono text-base resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg p-4 border border-gray-800"
                  style={{
                    lineHeight: '1.8',
                    tabSize: 2,
                    caretColor: '#A855F7'
                  }}
                  spellCheck={false}
                  autoFocus
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VisualShopEditor;
