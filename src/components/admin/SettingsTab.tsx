import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Plus, Trash2 } from 'lucide-react';
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

/* Shown when the system_settings table is empty — gives the admin a
   readable picture of what the platform runs on even before the table
   is seeded. Editing these local defaults is disabled (no row to save). */
const DEFAULT_SETTINGS: SystemSetting[] = [
  { id: '', key: 'marketplace_commission', value: { percentage: 5 }, description: 'Commission percentage taken from marketplace sales', category: 'finance', updated_at: '' },
  { id: '', key: 'withdrawal_minimum', value: { amount: 100 }, description: 'Minimum withdrawal amount in CZK', category: 'finance', updated_at: '' },
  { id: '', key: 'withdrawal_maximum', value: { amount: 100000 }, description: 'Maximum withdrawal amount per transaction in CZK', category: 'finance', updated_at: '' },
  { id: '', key: 'daily_withdrawal_limit', value: { amount: 500000 }, description: 'Maximum total withdrawals per user per day in CZK', category: 'finance', updated_at: '' },
  { id: '', key: 'require_email_verification', value: { enabled: false }, description: 'Require users to verify email before trading', category: 'security', updated_at: '' },
  { id: '', key: 'require_steam_guard', value: { enabled: true }, description: 'Require Steam Guard to be enabled for trading', category: 'security', updated_at: '' },
  { id: '', key: 'max_login_attempts', value: { attempts: 5, lockout_minutes: 30 }, description: 'Maximum login attempts before temporary lockout', category: 'security', updated_at: '' },
  { id: '', key: 'maintenance_mode', value: { enabled: false, message: 'System maintenance in progress' }, description: 'Enable maintenance mode for the platform', category: 'system', updated_at: '' },
  { id: '', key: 'trading_enabled', value: { enabled: true }, description: 'Enable or disable trading functionality', category: 'system', updated_at: '' },
  { id: '', key: 'new_user_bonus', value: { amount: 50 }, description: 'Welcome bonus for new users in CZK', category: 'finance', updated_at: '' },
];

const categoryPill = (category: string) =>
  category === 'finance'
    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : category === 'security'
      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
      : category === 'system'
        ? 'bg-accent-soft text-accent'
        : 'bg-subtle text-ink-muted';

const stagger = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.04 } },
};
const rise = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, y: 0 },
};

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
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
      if (supabase) {
        const { data, error } = await supabase
          .from('system_settings')
          .select('*')
          .order('category', { ascending: true });
        if (!error && data && data.length > 0) {
          setSettings(data);
          return;
        }
      }
      setSettings(DEFAULT_SETTINGS);
    } catch {
      setSettings(DEFAULT_SETTINGS);
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

      /* Rows from DEFAULT_SETTINGS have no id — upsert them by key so the
         first edit seeds the table instead of silently updating nothing. */
      const { error } = editModal.id
        ? await supabase
            .from('system_settings')
            .update({ value: parsedValue, updated_at: new Date().toISOString() })
            .eq('id', editModal.id)
        : await supabase.from('system_settings').insert([
            {
              key: editModal.key,
              value: parsedValue,
              description: editModal.description,
              category: editModal.category,
            },
          ]);

      if (error) throw error;

      addToast({ type: 'success', title: 'Saved', message: `${editModal.key} updated` });
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
      const { error } = await supabase.from('promo_codes').insert([
        {
          code: newPromo.code.toUpperCase(),
          discount_type: newPromo.discount_type,
          discount_value: newPromo.discount_value,
          max_uses: newPromo.max_uses,
          current_uses: 0,
          valid_from: newPromo.valid_from,
          valid_until: newPromo.valid_until,
          is_active: true,
        },
      ]);
      if (error) throw error;

      addToast({ type: 'success', title: 'Created', message: `Promo code ${newPromo.code.toUpperCase()} is live` });
      setPromoModal(false);
      setNewPromo({
        code: '',
        discount_type: 'percentage',
        discount_value: 0,
        max_uses: 100,
        valid_from: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      fetchPromoCodes();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message || 'Failed to create promo code' });
    }
  };

  const handleTogglePromo = async (promoId: string, isActive: boolean) => {
    try {
      if (!supabase) return;
      const { error } = await supabase.from('promo_codes').update({ is_active: !isActive }).eq('id', promoId);
      if (error) throw error;
      addToast({ type: 'success', title: 'Updated', message: `Promo code ${!isActive ? 'activated' : 'deactivated'}` });
      fetchPromoCodes();
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to toggle promo code' });
    }
  };

  const handleDeletePromo = async (promoId: string) => {
    try {
      if (!supabase) return;
      if (!confirm('Are you sure you want to delete this promo code?')) return;
      const { error } = await supabase.from('promo_codes').delete().eq('id', promoId);
      if (error) throw error;
      addToast({ type: 'success', title: 'Deleted', message: 'Promo code deleted' });
      fetchPromoCodes();
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to delete promo code' });
    }
  };

  const inputCls =
    'w-full h-11 bg-subtle rounded-xl px-4 text-[13px] text-ink font-medium outline-none focus:ring-2 focus:ring-accent/40 transition-shadow';

  return (
    <motion.div initial="hidden" animate="shown" variants={stagger} className="space-y-4">
      {/* Header row: segmented tabs + refresh */}
      <motion.div variants={rise} className="flex items-center justify-between gap-3">
        <div className="relative flex items-center gap-1 p-1 rounded-full bg-subtle">
          {([
            { id: 'settings', label: 'Platform' },
            { id: 'promos', label: 'Promo codes' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative h-9 px-4 rounded-full text-[12.5px] font-bold transition-colors ${
                activeTab === tab.id ? 'text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="admin-settings-tab-pill"
                  className="absolute inset-0 rounded-full bg-surface"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'promos' && (
            <button
              onClick={() => setPromoModal(true)}
              className="h-10 px-4 rounded-full bg-accent text-on-accent text-[12.5px] font-bold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={2.6} />
              New code
            </button>
          )}
          <button
            onClick={() => {
              fetchSettings();
              fetchPromoCodes();
            }}
            className="w-10 h-10 rounded-full bg-subtle hover:bg-surface grid place-items-center text-ink-muted hover:text-ink transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <p className="text-[12.5px] text-ink-muted font-medium mb-3 px-1">
              Platform parameters stored in the database — values are edited as JSON.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loading ? (
                <div className="col-span-2 text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
                </div>
              ) : (
                settings.map((setting, i) => (
                  <motion.button
                    key={setting.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    whileHover={{ y: -2 }}
                    onClick={() => openEditModal(setting)}
                    className="panel p-5 text-left group"
                  >
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="text-[14px] font-bold text-ink tracking-tight font-mono truncate">
                        {setting.key}
                      </span>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${categoryPill(setting.category)}`}
                      >
                        {setting.category}
                      </span>
                    </div>
                    <p className="text-[12px] text-ink-muted font-medium mb-3 line-clamp-2">
                      {setting.description}
                    </p>
                    <div className="kv-row !py-2 rounded-xl bg-subtle px-3">
                      <span className="text-[12px] font-mono text-ink truncate">
                        {JSON.stringify(setting.value)}
                      </span>
                      <span className="text-[11.5px] font-bold text-ink-dim group-hover:text-accent transition-colors shrink-0 ml-2">
                        Edit
                      </span>
                    </div>
                  </motion.button>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'promos' && (
          <motion.div
            key="promos"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {promoCodes.length === 0 ? (
              <div className="panel p-10 text-center">
                <p className="text-[14px] font-bold text-ink mb-1">No promo codes yet</p>
                <p className="text-[12.5px] text-ink-muted font-medium">
                  Create a code to give users a deposit or checkout discount.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {promoCodes.map((promo, i) => (
                  <motion.div
                    key={promo.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`panel p-5 ${promo.is_active ? '' : 'opacity-60'}`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-[16px] font-bold text-ink font-mono tracking-tight">
                        {promo.code}
                      </span>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          promo.is_active
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-subtle text-ink-muted'
                        }`}
                      >
                        {promo.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="space-y-0 mb-4">
                      <div className="kv-row">
                        <span className="kv-label">Discount</span>
                        <span className="kv-value">
                          {promo.discount_type === 'percentage'
                            ? `${promo.discount_value}%`
                            : `${promo.discount_value} Kč`}
                        </span>
                      </div>
                      <div className="kv-row">
                        <span className="kv-label">Uses</span>
                        <span className="kv-value">
                          {promo.current_uses} / {promo.max_uses}
                        </span>
                      </div>
                      <div className="kv-row">
                        <span className="kv-label">Valid until</span>
                        <span className="kv-value">
                          {new Date(promo.valid_until).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTogglePromo(promo.id, promo.is_active)}
                        className="flex-1 h-9 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[12px] font-bold transition-colors"
                      >
                        {promo.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeletePromo(promo.id)}
                        className="w-9 h-9 rounded-full bg-subtle hover:bg-rose-500/10 text-ink-muted hover:text-rose-500 grid place-items-center transition-colors"
                        aria-label="Delete promo code"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit-setting modal */}
      <AnimatePresence>
        {editModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setEditModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="panel p-6 max-w-xl w-full"
            >
              <span className="label-eyebrow">System setting</span>
              <h3 className="text-[18px] font-bold text-ink tracking-tight font-mono mt-1 mb-1.5">
                {editModal.key}
              </h3>
              <p className="text-[12.5px] text-ink-muted font-medium mb-4">{editModal.description}</p>

              <label className="label-meta block mb-1.5">Value (JSON)</label>
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full bg-subtle rounded-xl px-4 py-3 text-[13px] text-ink font-mono outline-none focus:ring-2 focus:ring-accent/40 transition-shadow resize-y"
                rows={6}
              />
              <p className="text-ink-dim text-[11px] font-medium mt-1.5 mb-4">Must be valid JSON.</p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditModal(null)}
                  className="h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSetting}
                  className="h-11 px-5 rounded-full bg-accent hover:opacity-90 text-on-accent text-[13px] font-bold transition-opacity"
                >
                  Save changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create-promo modal */}
      <AnimatePresence>
        {promoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setPromoModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="panel p-6 max-w-xl w-full"
            >
              <span className="label-eyebrow">Promotions</span>
              <h3 className="text-[18px] font-bold text-ink tracking-tight mt-1 mb-4">
                Create promo code
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="label-meta block mb-1.5">Code *</label>
                  <input
                    type="text"
                    value={newPromo.code}
                    onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value.toUpperCase() })}
                    placeholder="SUMMER2026"
                    className={`${inputCls} font-mono`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-meta block mb-1.5">Discount type *</label>
                    <select
                      value={newPromo.discount_type}
                      onChange={(e) =>
                        setNewPromo({ ...newPromo, discount_type: e.target.value as 'percentage' | 'fixed' })
                      }
                      className={inputCls}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed amount (Kč)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-meta block mb-1.5">Value *</label>
                    <input
                      type="number"
                      value={newPromo.discount_value}
                      onChange={(e) =>
                        setNewPromo({ ...newPromo, discount_value: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="10"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="label-meta block mb-1.5">Max uses</label>
                  <input
                    type="number"
                    value={newPromo.max_uses}
                    onChange={(e) => setNewPromo({ ...newPromo, max_uses: parseInt(e.target.value) || 0 })}
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label-meta block mb-1.5">Valid from</label>
                    <input
                      type="date"
                      value={newPromo.valid_from}
                      onChange={(e) => setNewPromo({ ...newPromo, valid_from: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="label-meta block mb-1.5">Valid until</label>
                    <input
                      type="date"
                      value={newPromo.valid_until}
                      onChange={(e) => setNewPromo({ ...newPromo, valid_until: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setPromoModal(false)}
                  className="h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePromo}
                  className="h-11 px-5 rounded-full bg-accent hover:opacity-90 text-on-accent text-[13px] font-bold transition-opacity"
                >
                  Create code
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SettingsTab;
