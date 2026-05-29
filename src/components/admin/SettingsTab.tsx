import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, RefreshCw, Edit, Save, Plus, Trash2, Tag, Percent, Calendar, Users, Gift } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface SystemSetting {
  id: string;
  key: string;
  value: any;
  description: string;
  category: string;
  updated_at: string;
}

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number;
  current_uses: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

interface SettingsTabProps {
  addToast: (toast: any) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ addToast }) => {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState<SystemSetting | null>(null);
  const [editValue, setEditValue] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'promos'>('settings');

  const [promoModal, setPromoModal] = useState(false);
  const [newPromo, setNewPromo] = useState({
    code: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    max_uses: 100,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    fetchSettings();
    fetchPromoCodes();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const defaultSettings: SystemSetting[] = [
        {
          id: '1',
          key: 'marketplace_commission',
          value: { percentage: 5 },
          description: 'Commission percentage taken from marketplace sales',
          category: 'finance',
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          key: 'withdrawal_minimum',
          value: { amount: 100 },
          description: 'Minimum withdrawal amount in CZK',
          category: 'finance',
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          key: 'withdrawal_maximum',
          value: { amount: 100000 },
          description: 'Maximum withdrawal amount per transaction in CZK',
          category: 'finance',
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          key: 'daily_withdrawal_limit',
          value: { amount: 500000 },
          description: 'Maximum total withdrawals per user per day in CZK',
          category: 'finance',
          updated_at: new Date().toISOString()
        },
        {
          id: '5',
          key: 'require_email_verification',
          value: { enabled: false },
          description: 'Require users to verify email before trading',
          category: 'security',
          updated_at: new Date().toISOString()
        },
        {
          id: '6',
          key: 'require_steam_guard',
          value: { enabled: true },
          description: 'Require Steam Guard to be enabled for trading',
          category: 'security',
          updated_at: new Date().toISOString()
        },
        {
          id: '7',
          key: 'max_login_attempts',
          value: { attempts: 5, lockout_minutes: 30 },
          description: 'Maximum login attempts before temporary lockout',
          category: 'security',
          updated_at: new Date().toISOString()
        },
        {
          id: '8',
          key: 'maintenance_mode',
          value: { enabled: false, message: 'System maintenance in progress' },
          description: 'Enable maintenance mode for the platform',
          category: 'system',
          updated_at: new Date().toISOString()
        },
        {
          id: '9',
          key: 'trading_enabled',
          value: { enabled: true },
          description: 'Enable or disable trading functionality',
          category: 'system',
          updated_at: new Date().toISOString()
        },
        {
          id: '10',
          key: 'new_user_bonus',
          value: { amount: 50 },
          description: 'Welcome bonus for new users in CZK',
          category: 'finance',
          updated_at: new Date().toISOString()
        }
      ];

      setSettings(defaultSettings);
    } catch (error: any) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPromoCodes = async () => {
    try {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPromoCodes(data || []);
    } catch (error: any) {
      console.error('Error fetching promo codes:', error);
    }
  };

  const openEditModal = (setting: SystemSetting) => {
    setEditModal(setting);
    setEditValue(JSON.stringify(setting.value, null, 2));
  };

  const handleSaveSetting = async () => {
    try {
      if (!supabase || !editModal) return;

      const parsedValue = JSON.parse(editValue);

      const { error } = await supabase
        .from('system_settings')
        .update({ value: parsedValue, updated_at: new Date().toISOString() })
        .eq('id', editModal.id);

      if (error) throw error;

      addToast({ type: 'success', title: 'Success', message: 'Setting updated successfully' });
      setEditModal(null);
      fetchSettings();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to update setting' });
    }
  };

  const handleCreatePromo = async () => {
    try {
      if (!supabase) return;

      if (!newPromo.code || newPromo.discount_value <= 0) {
        addToast({ type: 'error', title: 'Error', message: 'Please fill all required fields' });
        return;
      }

      const { error } = await supabase
        .from('promo_codes')
        .insert([{
          code: newPromo.code.toUpperCase(),
          discount_type: newPromo.discount_type,
          discount_value: newPromo.discount_value,
          max_uses: newPromo.max_uses,
          current_uses: 0,
          valid_from: newPromo.valid_from,
          valid_until: newPromo.valid_until,
          is_active: true
        }]);

      if (error) throw error;

      addToast({ type: 'success', title: 'Success', message: 'Promo code created successfully' });
      setPromoModal(false);
      setNewPromo({
        code: '',
        discount_type: 'percentage',
        discount_value: 0,
        max_uses: 100,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      fetchPromoCodes();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to create promo code' });
    }
  };

  const handleTogglePromo = async (promoId: string, isActive: boolean) => {
    try {
      if (!supabase) return;

      const { error } = await supabase
        .from('promo_codes')
        .update({ is_active: !isActive })
        .eq('id', promoId);

      if (error) throw error;

      addToast({ type: 'success', title: 'Success', message: `Promo code ${!isActive ? 'activated' : 'deactivated'}` });
      fetchPromoCodes();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to toggle promo code' });
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    try {
      if (!supabase) return;
      if (!confirm('Are you sure you want to delete this promo code?')) return;

      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', promoId);

      if (error) throw error;

      addToast({ type: 'success', title: 'Success', message: 'Promo code deleted' });
      fetchPromoCodes();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to delete promo code' });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-400" />
            System Settings
          </h2>
          <p className="text-purple-300/80 text-sm">Configure platform settings and manage promo codes</p>
        </div>
        <button
          onClick={() => { fetchSettings(); fetchPromoCodes(); }}
          className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-white flex items-center gap-2 shadow-lg shadow-purple-500/30"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 border-b border-purple-500/30">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'settings'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-purple-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings size={18} />
            System Settings
          </div>
        </button>
        <button
          onClick={() => setActiveTab('promos')}
          className={`px-6 py-3 font-medium transition-all ${
            activeTab === 'promos'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-purple-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Tag size={18} />
            Promo Codes
          </div>
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loading ? (
            <div className="col-span-2 text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : settings.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-gray-400">
              No settings found. Please run the database setup script.
            </div>
          ) : (
            settings.map((setting) => (
              <div key={setting.id} className="bg-gradient-to-br from-purple-900/20 via-gray-900/50 to-gray-900/50 rounded-xl border border-purple-500/30 p-6 shadow-lg" style={{ boxShadow: '0 0 30px rgba(168, 85, 247, 0.1)' }}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-white">{setting.key}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    setting.category === 'finance' ? 'bg-purple-500/20 text-purple-400' :
                    setting.category === 'security' ? 'bg-pink-500/20 text-pink-400' :
                    setting.category === 'system' ? 'bg-fuchsia-500/20 text-fuchsia-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {setting.category}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-4">{setting.description}</p>
                <div className="bg-gray-800/50 rounded px-3 py-2 text-purple-300 font-mono text-sm mb-4 overflow-x-auto border border-purple-500/20">
                  {JSON.stringify(setting.value)}
                </div>
                <button
                  onClick={() => openEditModal(setting)}
                  className="w-full bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded text-white text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
                >
                  <Edit size={16} />
                  Edit Setting
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'promos' && (
        <div>
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setPromoModal(true)}
              className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-white flex items-center gap-2 shadow-lg shadow-purple-500/30"
            >
              <Plus size={18} />
              Create Promo Code
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promoCodes.map((promo) => (
              <div key={promo.id} className={`bg-gradient-to-br from-purple-900/20 via-gray-900/50 to-gray-900/50 rounded-xl border p-6 shadow-lg ${promo.is_active ? 'border-purple-500/30' : 'border-gray-700/50'}`} style={{ boxShadow: promo.is_active ? '0 0 30px rgba(168, 85, 247, 0.1)' : 'none' }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-purple-400" />
                    <h3 className="text-xl font-bold text-white font-mono">{promo.code}</h3>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    promo.is_active ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {promo.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Percent className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">
                      {promo.discount_type === 'percentage'
                        ? `${promo.discount_value}% off`
                        : `${promo.discount_value} CZK off`
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">
                      {promo.current_uses} / {promo.max_uses} uses
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-gray-300">
                      Valid until {new Date(promo.valid_until).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleTogglePromo(promo.id, promo.is_active)}
                    className={`flex-1 px-3 py-2 rounded text-sm transition ${
                      promo.is_active
                        ? 'bg-gray-600 hover:bg-gray-500 text-white'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                    }`}
                  >
                    {promo.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDeletePromo(promo.id)}
                    className="px-3 py-2 rounded text-sm bg-red-600 hover:bg-red-500 text-white transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {promoCodes.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No promo codes found. Create your first promo code!
            </div>
          )}
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-purple-900/20 rounded-xl border border-purple-500/30 p-6 max-w-2xl w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Edit Setting: {editModal.key}</h3>
            <p className="text-gray-400 text-sm mb-4">{editModal.description}</p>

            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Value (JSON format)</label>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-gray-800 border border-purple-500/30 rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:border-purple-500"
                rows={6}
              />
              <p className="text-gray-500 text-xs mt-2">Make sure to use valid JSON format</p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setEditModal(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSetting}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition shadow-lg shadow-purple-500/30"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {promoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-purple-900/20 rounded-xl border border-purple-500/30 p-6 max-w-2xl w-full shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Tag className="w-6 h-6 text-purple-400" />
              Create Promo Code
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Promo Code *</label>
                <input
                  type="text"
                  value={newPromo.code}
                  onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2025"
                  className="w-full bg-gray-800 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Discount Type *</label>
                  <select
                    value={newPromo.discount_type}
                    onChange={(e) => setNewPromo({ ...newPromo, discount_type: e.target.value as 'percentage' | 'fixed' })}
                    className="w-full bg-gray-800 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (CZK)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Discount Value *</label>
                  <input
                    type="number"
                    value={newPromo.discount_value}
                    onChange={(e) => setNewPromo({ ...newPromo, discount_value: parseFloat(e.target.value) })}
                    placeholder="10"
                    className="w-full bg-gray-800 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Max Uses</label>
                <input
                  type="number"
                  value={newPromo.max_uses}
                  onChange={(e) => setNewPromo({ ...newPromo, max_uses: parseInt(e.target.value) })}
                  className="w-full bg-gray-800 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Valid From</label>
                  <input
                    type="date"
                    value={newPromo.valid_from}
                    onChange={(e) => setNewPromo({ ...newPromo, valid_from: e.target.value })}
                    className="w-full bg-gray-800 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Valid Until</label>
                  <input
                    type="date"
                    value={newPromo.valid_until}
                    onChange={(e) => setNewPromo({ ...newPromo, valid_until: e.target.value })}
                    className="w-full bg-gray-800 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setPromoModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePromo}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition shadow-lg shadow-purple-500/30"
              >
                Create Promo Code
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SettingsTab;
