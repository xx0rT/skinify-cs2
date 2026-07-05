import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, CreditCard as Edit, Trash2, RefreshCw, Eye, EyeOff, X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  target_audience: string;
  is_active: boolean;
  starts_at: string;
  ends_at?: string;
  created_at: string;
}

const NotificationsTab: React.FC<{ addToast: any }> = ({ addToast }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info',
    priority: 'normal',
    target_audience: 'all',
    is_active: true,
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: ''
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('global_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error: any) {
      console.error('Error:', error);
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();

      const notificationData: any = {
        ...formData,
        ends_at: formData.ends_at || null
      };
      /* Steam-auth admins have no Supabase session — only attach
         created_by when we actually have an auth uuid. */
      if (user?.id) notificationData.created_by = user.id;

      if (editingNotification) {
        const { error } = await supabase
          .from('global_notifications')
          .update(notificationData)
          .eq('id', editingNotification.id);

        if (error) throw error;
        addToast({ type: 'success', title: 'Success', message: 'Notification updated' });
      } else {
        const { error } = await supabase
          .from('global_notifications')
          .insert(notificationData);

        if (error) throw error;
        addToast({ type: 'success', title: 'Success', message: 'Notification created' });
      }

      setShowModal(false);
      resetForm();
      fetchNotifications();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      if (!supabase) return;

      const { error } = await supabase
        .from('global_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      addToast({ type: 'success', title: 'Success', message: 'Notification deleted' });
      fetchNotifications();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      if (!supabase) return;

      const { error } = await supabase
        .from('global_notifications')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      addToast({ type: 'success', title: 'Success', message: 'Status updated' });
      fetchNotifications();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      priority: 'normal',
      target_audience: 'all',
      is_active: true,
      starts_at: new Date().toISOString().slice(0, 16),
      ends_at: ''
    });
    setEditingNotification(null);
  };

  const openEditModal = (notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      target_audience: notification.target_audience,
      is_active: notification.is_active,
      starts_at: new Date(notification.starts_at).toISOString().slice(0, 16),
      ends_at: notification.ends_at ? new Date(notification.ends_at).toISOString().slice(0, 16) : ''
    });
    setShowModal(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-center gap-3">
        <div className="flex-1 flex items-center gap-2.5 h-10 px-4 rounded-full bg-subtle max-w-[360px] focus-within:ring-2 focus-within:ring-accent/40 transition-shadow">
          <Bell size={13} strokeWidth={2.2} className="text-ink-muted shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notifications…"
            className="flex-1 bg-transparent outline-none text-[13px] font-medium text-ink placeholder:text-ink-dim min-w-0"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={fetchNotifications}
            className="w-10 h-10 rounded-full bg-subtle hover:bg-surface grid place-items-center text-ink-muted hover:text-ink transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="h-10 px-4 rounded-full bg-accent hover:opacity-90 text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5 transition-opacity"
          >
            <Plus size={14} strokeWidth={2.6} />
            New notification
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="panel p-5">
          <div className="text-2xl font-bold text-ink">{notifications.length}</div>
          <div className="label-meta mt-2">Total</div>
        </div>
        <div className="panel p-5">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{notifications.filter(n => n.is_active).length}</div>
          <div className="label-meta mt-2">Active</div>
        </div>
        <div className="panel p-5">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{notifications.filter(n => n.priority === 'high' || n.priority === 'urgent').length}</div>
          <div className="label-meta mt-2">High priority</div>
        </div>
        <div className="panel p-5">
          <div className="text-2xl font-bold text-accent">{notifications.filter(n => new Date(n.starts_at) > new Date()).length}</div>
          <div className="label-meta mt-2">Scheduled</div>
        </div>
      </div>

      <div className="panel p-5">
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-ink-muted">
              No notifications yet. Create your first one!
            </div>
          ) : (
            notifications
              .filter(
                (n) =>
                  !search.trim() ||
                  n.title.toLowerCase().includes(search.toLowerCase()) ||
                  n.message.toLowerCase().includes(search.toLowerCase()),
              )
              .map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-subtle p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-ink">{notification.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        notification.type === 'error' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                        notification.type === 'warning' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        notification.type === 'announcement' ? 'bg-accent-soft text-accent' :
                        'bg-accent-soft text-accent'
                      }`}>
                        {notification.type}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        notification.priority === 'urgent' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                        notification.priority === 'high' ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' :
                        'bg-gray-500/20 text-ink-muted'
                      }`}>
                        {notification.priority}
                      </span>
                      {notification.is_active ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-ink-muted">Inactive</span>
                      )}
                    </div>
                    <p className="text-ink-muted mb-2">{notification.message}</p>
                    <div className="text-xs text-ink-dim space-x-4">
                      <span>Target: {notification.target_audience}</span>
                      <span>Starts: {new Date(notification.starts_at).toLocaleString()}</span>
                      {notification.ends_at && <span>Ends: {new Date(notification.ends_at).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => toggleActive(notification.id, notification.is_active)}
                      className={`p-2 rounded transition ${
                        notification.is_active
                          ? 'text-amber-600 dark:text-amber-400 hover:bg-yellow-500/10'
                          : 'text-emerald-600 dark:text-emerald-400 hover:bg-green-500/10'
                      }`}
                      title={notification.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {notification.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => openEditModal(notification)}
                      className="text-accent hover:bg-accent-soft p-2 rounded transition"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="text-rose-600 dark:text-rose-400 hover:bg-red-500/10 p-2 rounded transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
              ))
          )}
        </div>
      </div>

      <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => { setShowModal(false); resetForm(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="panel p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <span className="label-eyebrow">Notifications</span>
                <h3 className="text-[19px] font-bold text-ink tracking-tight mt-1 leading-none">
                  {editingNotification ? 'Edit notification' : 'New system notification'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
                className="w-9 h-9 rounded-full bg-subtle grid place-items-center text-ink-muted hover:text-ink transition-colors"
                aria-label="Close"
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-meta block mb-1.5">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-subtle rounded-xl px-4 py-2.5 text-ink text-[14px] font-medium outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                  required
                />
              </div>
              <div>
                <label className="label-meta block mb-1.5">Message *</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-subtle rounded-xl px-4 py-2.5 text-ink text-[14px] font-medium outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-meta block mb-1.5">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-subtle rounded-xl px-4 py-2.5 text-ink text-[14px] font-medium outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="announcement">Announcement</option>
                  </select>
                </div>
                <div>
                  <label className="label-meta block mb-1.5">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-subtle rounded-xl px-4 py-2.5 text-ink text-[14px] font-medium outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-meta block mb-1.5">Target Audience</label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  className="w-full bg-subtle rounded-xl px-4 py-2.5 text-ink text-[14px] font-medium outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                >
                  <option value="all">All Users</option>
                  <option value="verified">Verified Users</option>
                  <option value="vip">VIP Users</option>
                  <option value="traders">Active Traders</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-meta block mb-1.5">Starts At</label>
                  <input
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    className="w-full bg-subtle rounded-xl px-4 py-2.5 text-ink text-[14px] font-medium outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                  />
                </div>
                <div>
                  <label className="label-meta block mb-1.5">Ends At (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                    className="w-full bg-subtle rounded-xl px-4 py-2.5 text-ink text-[14px] font-medium outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <label className="text-ink-muted">Active</label>
              </div>
              {/* Live preview — exactly how users will see the banner */}
              {(formData.title || formData.message) && (
                <div>
                  <label className="label-meta block mb-1.5">Preview</label>
                  <motion.div
                    layout
                    className={`rounded-2xl p-4 flex items-start gap-3 ${
                      formData.type === 'error'
                        ? 'bg-rose-500/10'
                        : formData.type === 'warning'
                        ? 'bg-amber-500/10'
                        : formData.type === 'success'
                        ? 'bg-emerald-500/10'
                        : 'bg-accent-soft'
                    }`}
                  >
                    <Bell
                      size={16}
                      strokeWidth={2.2}
                      className={`mt-0.5 shrink-0 ${
                        formData.type === 'error'
                          ? 'text-rose-600 dark:text-rose-400'
                          : formData.type === 'warning'
                          ? 'text-amber-600 dark:text-amber-400'
                          : formData.type === 'success'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-accent'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-bold text-ink tracking-tight">
                        {formData.title || 'Notification title'}
                      </div>
                      <div className="text-[12.5px] text-ink-muted font-medium mt-0.5 whitespace-pre-wrap">
                        {formData.message || 'Message body…'}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-full bg-accent hover:opacity-90 text-on-accent text-[13px] font-bold transition-opacity"
                >
                  {editingNotification ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NotificationsTab;
