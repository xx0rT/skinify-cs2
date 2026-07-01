import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { useNavigate } from 'react-router-dom';
import { Home, Shield, Users, DollarSign, Package, Lock, BarChart3, Settings, MessageSquare, Wrench, Wallet, Bell, Activity, Database, AlertTriangle, Search, Filter, RefreshCw, Download, Upload, CheckCircle, X, Ban, AlertOctagon, Send, Eye, CreditCard as Edit3, Trash2, Plus, TrendingUp, Crown, Mail, Calendar, Clock, Heart, Star, Award, FileText, Code, TestTube, BookOpen } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useAdminAuth } from '../hooks/useAdminAuth';
import SteamLogin from '../components/auth/SteamLogin';
import UserProfile from '../components/auth/UserProfile';
import { createClient } from '@supabase/supabase-js';
import DashboardTab from '../components/admin/DashboardTab';
import UsersTab from '../components/admin/UsersTab';
import FinanceTab from '../components/admin/FinanceTab';
import SettingsTab from '../components/admin/SettingsTab';
import { InventoryTab, AnalyticsTab, SupportTab, DeveloperTab, WithdrawalsTab, MonitoringTab } from '../components/admin/RemainingTabs';
import NotificationsTab from '../components/admin/NotificationsTab';

// Blogs Tab Component
const BlogsTab: React.FC<{ addToast: any; supabase: any }> = ({ addToast, supabase }) => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBlog, setEditingBlog] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchBlogs = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBlogs(data || []);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supabase) fetchBlogs();
  }, [supabase]);

  const deleteBlog = async (id: number) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      addToast({ type: 'success', title: 'Success', message: 'Blog post deleted' });
      fetchBlogs();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const togglePublished = async (blog: any) => {
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ is_published: !blog.is_published })
        .eq('id', blog.id);

      if (error) throw error;
      addToast({ type: 'success', title: 'Success', message: 'Blog status updated' });
      fetchBlogs();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Blog Posts Management</h2>
        <button
          onClick={() => { setShowForm(true); setEditingBlog(null); }}
          className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus size={18} />
          <span>New Post</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading blogs...</div>
      ) : (
        <div className="grid gap-4">
          {blogs.map((blog) => (
            <div key={blog.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">{blog.title}</h3>
                  <p className="text-gray-400 text-sm mb-2">{blog.excerpt}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <BookOpen size={14} />
                      <span>{blog.category}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>{new Date(blog.created_at).toLocaleDateString()}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Eye size={14} />
                      <span>{blog.views} views</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => togglePublished(blog)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      blog.is_published
                        ? 'bg-green-600/20 text-green-400'
                        : 'bg-gray-600/20 text-gray-400'
                    }`}
                  >
                    {blog.is_published ? 'Published' : 'Draft'}
                  </button>
                  <button
                    onClick={() => deleteBlog(blog.id)}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminPanelNew: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isAdmin, role, loading: adminLoading } = useAdminAuth();
  const { addToast } = useToastStore();
  const [activeSection, setActiveSection] = useState('Admin');
  const [hoveredNavItem, setHoveredNavItem] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);

  // Initialize Supabase
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  const sidebarSections = [
    {
      name: 'Navigation',
      items: [
        { icon: Home, label: 'Home', onClick: () => navigate('/') },
        { icon: Shield, label: 'Admin', active: true, onClick: () => {} }
      ]
    },
    {
      name: 'Core Management',
      items: [
        { icon: Users, label: 'Users', onClick: () => setActiveTab('users') },
        { icon: DollarSign, label: 'Finance', onClick: () => setActiveTab('finance') },
        { icon: Package, label: 'Inventory', onClick: () => setActiveTab('inventory') },
        { icon: Wallet, label: 'Withdrawals', onClick: () => setActiveTab('withdrawals') },
        { icon: BookOpen, label: 'Blog Posts', onClick: () => setActiveTab('blogs') }
      ]
    },
    {
      name: 'Security & Analytics',
      items: [
        { icon: Bell, label: 'Notifications', onClick: () => setActiveTab('notifications') },
        { icon: BarChart3, label: 'Analytics', onClick: () => setActiveTab('analytics') },
        { icon: Activity, label: 'Monitoring', onClick: () => setActiveTab('monitoring') }
      ]
    },
    {
      name: 'Support & Settings',
      items: [
        { icon: MessageSquare, label: 'Support', onClick: () => setActiveTab('support') },
        { icon: Settings, label: 'Settings', onClick: () => setActiveTab('settings') },
        { icon: Wrench, label: 'Developer', onClick: () => setActiveTab('developer') }
      ]
    }
  ];

  const navigationItems = [
    { name: 'Dashboard', icon: BarChart3, onClick: () => setActiveTab('dashboard') },
    { name: 'Users', icon: Users, onClick: () => setActiveTab('users') },
    { name: 'Finance', icon: DollarSign, onClick: () => setActiveTab('finance') },
    { name: 'Withdrawals', icon: Wallet, onClick: () => setActiveTab('withdrawals') },
    { name: 'Inventory', icon: Package, onClick: () => setActiveTab('inventory') },
    { name: 'Notifications', icon: Bell, onClick: () => setActiveTab('notifications') },
    { name: 'Analytics', icon: BarChart3, onClick: () => setActiveTab('analytics') },
    { name: 'Support', icon: MessageSquare, onClick: () => setActiveTab('support') },
    { name: 'Settings', icon: Settings, onClick: () => setActiveTab('settings') }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-purple-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Admin Access Required</h1>
          <p className="text-gray-400 mb-8">Please sign in to access the admin panel</p>
          <SteamLogin />
        </div>
      </div>
    );
  }

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-6"></div>
          <p className="text-gray-400">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertOctagon className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-4">You don't have admin permissions to access this page</p>
          <p className="text-gray-500 text-sm mb-8">Contact an administrator if you believe this is an error</p>
          <button
            onClick={() => navigate('/')}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg transition-all duration-300"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900 text-white overflow-hidden">
      <div className="flex min-h-screen">
        {/* Left Sidebar */}
        <motion.div className="group fixed left-0 top-0 h-full z-50 w-16 hover:w-64 bg-gradient-to-b from-gray-900 via-gray-900 to-purple-900/20 border-r border-purple-500/30 flex flex-col transition-all duration-300 ease-in-out py-4 shadow-2xl" style={{ boxShadow: '0 0 40px rgba(168, 85, 247, 0.2)' }}>
          {/* Logo */}
          <div className="h-12 flex items-center justify-center mb-4 mx-auto group-hover:mx-3 overflow-hidden">
            <div className="relative flex items-center">
              <motion.img
                src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                alt="Skinify Logo"
                className="h-12 w-auto object-contain cursor-pointer"
                onClick={() => navigate('/')}
              />
              <div className="hidden group-hover:block">
                <motion.img
                  src="https://i.postimg.cc/xqdxTY2d/skinify2-2-removebg-preview.png"
                  alt="Skinify Logo Extended"
                  className="h-12 w-auto object-contain cursor-pointer"
                  onClick={() => navigate('/')}
                />
              </div>
            </div>
          </div>

          {/* Sidebar Items */}
          <div className="flex flex-col space-y-1 flex-1 px-2 group-hover:px-3">
            {sidebarSections.map((section, sectionIndex) => (
              <div key={section.name} className="relative">
                {sectionIndex > 0 && (
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent my-2 mx-2" />
                )}
                <div className="hidden group-hover:block mb-2">
                  <div className="text-xs text-purple-400 font-medium px-3 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200">
                    {section.name}
                  </div>
                </div>
                {section.items.map((item, itemIndex) => (
                  <motion.button
                    key={itemIndex}
                    onClick={item.onClick}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex items-center p-3 rounded-lg transition-all duration-300 overflow-hidden group/item w-full mb-1 ${
                      item.active ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/50' : 'text-gray-400 hover:text-white hover:bg-purple-600/20 hover:shadow-lg hover:shadow-purple-500/20'
                    }`}
                  >
                    <item.icon size={20} className="flex-shrink-0" />
                    <div className="hidden group-hover:block ml-3">
                      <span className="text-current whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
                        {item.label}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col ml-16 relative">
          {/* Header Navigation */}
          <motion.header className="fixed top-0 left-16 right-0 bg-gradient-to-r from-gray-900 via-purple-900/20 to-gray-900 border-b border-purple-500/30 p-4 z-30 shadow-2xl backdrop-blur-sm" style={{ boxShadow: '0 0 40px rgba(168, 85, 247, 0.2)' }}>
            <div className="flex items-center relative">
              <div className="flex justify-center w-full">
                <Flipper flipKey={`${activeSection}-${hoveredNavItem}`}>
                  <motion.nav>
                    <div className="flex justify-center space-x-1 bg-gradient-to-r from-gray-900 via-purple-900/20 to-gray-900 px-6 py-3 border border-purple-500/40 shadow-2xl rounded-lg" style={{ boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)' }}>
                      {navigationItems.slice(0, 8).map((item) => (
                        <Flipped key={item.name} flipId={`header-nav-${item.name}`}>
                          <motion.button
                            onClick={item.onClick}
                            onMouseEnter={() => setHoveredNavItem(item.name)}
                            onMouseLeave={() => setHoveredNavItem(null)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`flex justify-center relative px-4 py-2 text-sm font-medium transition-all duration-300 flex items-center space-x-2 rounded-lg ${
                              activeTab === item.name.toLowerCase()
                                ? 'text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 shadow-lg shadow-purple-500/50'
                                : 'text-gray-300 hover:text-white hover:bg-purple-600/30'
                            }`}
                          >
                            <item.icon size={16} />
                            <span>{item.name}</span>
                          </motion.button>
                        </Flipped>
                      ))}
                    </div>
                  </motion.nav>
                </Flipper>
              </div>
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <UserProfile />
              </div>
            </div>
          </motion.header>

          {/* Content Area */}
          <div className="flex-1 pt-24 pb-12 px-6">
            <div className="container mx-auto max-w-7xl">
              {/* Admin Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50">
                    <Crown className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">
                      Admin Control Panel
                    </h1>
                    <p className="text-sm text-purple-300/80">Complete marketplace management system</p>
                  </div>
                </div>
              </motion.div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'users' && <UsersTab addToast={addToast} />}
                {activeTab === 'finance' && <FinanceTab addToast={addToast} />}
                {activeTab === 'inventory' && <InventoryTab addToast={addToast} />}
                {activeTab === 'notifications' && <NotificationsTab addToast={addToast} />}
                {activeTab === 'analytics' && <AnalyticsTab addToast={addToast} />}
                {activeTab === 'support' && <SupportTab addToast={addToast} user={user} />}
                {activeTab === 'settings' && <SettingsTab addToast={addToast} />}
                {activeTab === 'developer' && <DeveloperTab addToast={addToast} />}
                {activeTab === 'withdrawals' && <WithdrawalsTab addToast={addToast} />}
                {activeTab === 'blogs' && <BlogsTab addToast={addToast} supabase={supabase} />}
                {activeTab === 'monitoring' && <MonitoringTab addToast={addToast} />}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanelNew;
