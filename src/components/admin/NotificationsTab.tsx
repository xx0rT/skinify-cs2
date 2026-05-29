import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Plus, CreditCard as Edit, Trash2, RefreshCw, Eye, EyeOff } from 'lucide-react';
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

      const notificationData = {
        ...formData,
        created_by: user?.id,
        ends_at: formData.ends_at || null
      };

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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-400" />
            Global Notifications
          </h2>
          <p className="text-gray-400 text-sm">Create and manage system-wide announcements</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchNotifications}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white flex items-center gap-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg text-white flex items-center gap-2"
          >
            <Plus size={16} />
            New Notification
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-white">{notifications.length}</div>
          <div className="text-gray-400 text-sm">Total Notifications</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-green-400">{notifications.filter(n => n.is_active).length}</div>
          <div className="text-gray-400 text-sm">Active</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-yellow-400">{notifications.filter(n => n.priority === 'high' || n.priority === 'urgent').length}</div>
          <div className="text-gray-400 text-sm">High Priority</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <div className="text-2xl font-bold text-blue-400">{notifications.filter(n => new Date(n.starts_at) > new Date()).length}</div>
          <div className="text-gray-400 text-sm">Scheduled</div>
        </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6">
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No notifications yet. Create your first one!
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-white">{notification.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        notification.type === 'error' ? 'bg-red-500/20 text-red-400' :
                        notification.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        notification.type === 'success' ? 'bg-green-500/20 text-green-400' :
                        notification.type === 'announcement' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {notification.type}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        notification.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                        notification.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {notification.priority}
                      </span>
                      {notification.is_active ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">Active</span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-500/20 text-gray-400">Inactive</span>
                      )}
                    </div>
                    <p className="text-gray-300 mb-2">{notification.message}</p>
                    <div className="text-xs text-gray-500 space-x-4">
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
                          ? 'text-yellow-400 hover:bg-yellow-500/10'
                          : 'text-green-400 hover:bg-green-500/10'
                      }`}
                      title={notification.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {notification.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button
                      onClick={() => openEditModal(notification)}
                      className="text-blue-400 hover:bg-blue-500/10 p-2 rounded transition"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="text-red-400 hover:bg-red-500/10 p-2 rounded transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingNotification ? 'Edit Notification' : 'Create New Notification'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Message *</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  rows={4}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="announcement">Announcement</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-2">Target Audience</label>
                <select
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="all">All Users</option>
                  <option value="verified">Verified Users</option>
                  <option value="vip">VIP Users</option>
                  <option value="traders">Active Traders</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-2">Starts At</label>
                  <input
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Ends At (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
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
                <label className="text-gray-300">Active</label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
                >
                  {editingNotification ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default NotificationsTab;
