import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  DollarSign,
  Edit3,
  Eye,
  LayoutGrid,
  MessageSquare,
  Package,
  Plus,
  Settings,
  Shield,
  Trash2,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { useAdminAuth } from '../hooks/useAdminAuth';
import SteamLogin from '../components/auth/SteamLogin';
import UserProfile from '../components/auth/UserProfile';
import { createClient } from '@supabase/supabase-js';
import { spring, tap } from '../lib/motion';
import DashboardTab from '../components/admin/DashboardTab';
import UsersTab from '../components/admin/UsersTab';
import FinanceTab from '../components/admin/FinanceTab';
import SettingsTab from '../components/admin/SettingsTab';
import { InventoryTab, AnalyticsTab, SupportTab, DeveloperTab, WithdrawalsTab, MonitoringTab } from '../components/admin/RemainingTabs';
import NotificationsTab from '../components/admin/NotificationsTab';

/* ─────────────────────────────────────────────────────────────────────────
   Admin panel — clean flat shell.

   Same design language as the rest of the app (theme tokens, .panel
   surfaces, accent pills) instead of the old purple-neon gradients.
   Left: grouped sidebar with a gliding active pill. Right: header with
   the current section + account chip, then the tab content cross-fades
   with a spring.
   ───────────────────────────────────────────────────────────────────────── */

type TabId =
  | 'dashboard'
  | 'users'
  | 'finance'
  | 'withdrawals'
  | 'inventory'
  | 'blogs'
  | 'notifications'
  | 'analytics'
  | 'monitoring'
  | 'support'
  | 'settings'
  | 'developer';

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<any>;
}
interface NavGroup {
  name: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    name: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutGrid }],
  },
  {
    name: 'Management',
    items: [
      { id: 'users', label: 'Users', icon: Users },
      { id: 'finance', label: 'Finance', icon: DollarSign },
      { id: 'withdrawals', label: 'Withdrawals', icon: Wallet },
      { id: 'inventory', label: 'Inventory', icon: Package },
      { id: 'blogs', label: 'Blog posts', icon: BookOpen },
    ],
  },
  {
    name: 'Insights',
    items: [
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'monitoring', label: 'Monitoring', icon: Activity },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ],
  },
  {
    name: 'System',
    items: [
      { id: 'support', label: 'Support', icon: MessageSquare },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'developer', label: 'Developer', icon: Wrench },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

const sidebarVariants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.03, delayChildren: 0.05 } },
} as const;
const sidebarItem = {
  hidden: { opacity: 0, x: -12 },
  shown: { opacity: 1, x: 0, transition: spring },
} as const;

const AdminPanelNew: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isAdmin, loading: adminLoading } = useAdminAuth();
  const { addToast } = useToastStore();
  /* Deep-links like /admin?tab=withdrawals (used by notification "Open"
     buttons) land on the matching tab instead of always Dashboard. */
  const [adminParams] = useSearchParams();
  const ADMIN_TABS: TabId[] = ['dashboard', 'users', 'finance', 'withdrawals', 'inventory', 'blogs', 'notifications', 'analytics', 'monitoring', 'support', 'settings', 'developer'];
  const paramTab = adminParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    paramTab && ADMIN_TABS.includes(paramTab) ? paramTab : 'dashboard',
  );

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  /* ── Access states — flat, quiet, on-brand ── */
  if (!user || adminLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-bg text-ink grid place-items-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="panel p-10 sm:p-14 text-center max-w-md w-full"
        >
          <div className="icon-chip-lg bg-accent-soft mx-auto mb-5">
            <Shield size={22} strokeWidth={2.2} className="text-accent" />
          </div>
          {adminLoading && user ? (
            <>
              <h1 className="text-[22px] font-bold tracking-tight">Checking access…</h1>
              <p className="text-[13.5px] text-ink-muted font-medium mt-2">
                Verifying your admin permissions.
              </p>
            </>
          ) : !user ? (
            <>
              <h1 className="text-[22px] font-bold tracking-tight">Admin access</h1>
              <p className="text-[13.5px] text-ink-muted font-medium mt-2 mb-6">
                Sign in to open the control panel.
              </p>
              <div className="flex justify-center">
                <SteamLogin />
              </div>
            </>
          ) : (
            <>
              <h1 className="text-[22px] font-bold tracking-tight">Access denied</h1>
              <p className="text-[13.5px] text-ink-muted font-medium mt-2 mb-6">
                This account doesn't have admin permissions.
              </p>
              <button
                onClick={() => navigate('/')}
                className="h-11 px-5 rounded-full bg-accent text-on-accent text-[13.5px] font-bold"
              >
                Back to marketplace
              </button>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  const activeItem = ALL_ITEMS.find((i) => i.id === activeTab);

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 lg:py-6">
        {/* ── Header ── */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex items-center gap-3 mb-5"
        >
          <motion.button
            whileTap={tap}
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-subtle hover:bg-surface grid place-items-center text-ink-muted hover:text-ink transition-colors shrink-0"
            aria-label="Back to site"
          >
            <ArrowLeft size={16} strokeWidth={2.4} />
          </motion.button>
          <div className="min-w-0 flex-1">
            <span className="label-eyebrow">Admin</span>
            <AnimatePresence mode="wait">
              <motion.h1
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ ...spring, mass: 0.5 }}
                className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-none mt-1"
              >
                {activeItem?.label || 'Dashboard'}
              </motion.h1>
            </AnimatePresence>
          </div>
          <UserProfile />
        </motion.header>

        {/* ── Mobile tab strip (<lg) — underline tabs, same pattern as
              the profile page. ── */}
        <div className="lg:hidden -mx-4 sm:-mx-6 px-4 sm:px-6 mb-5 border-b border-line overflow-x-auto scrollbar-hide">
          <nav className="flex gap-5 min-w-max" aria-label="Admin sections">
            {ALL_ITEMS.map((item) => {
              const active = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-2 py-3 shrink-0 transition-colors ${
                    active ? 'text-ink' : 'text-ink-muted'
                  }`}
                >
                  <Icon size={15} strokeWidth={active ? 2.4 : 2} />
                  <span className="text-[13.5px] font-semibold tracking-tight whitespace-nowrap">
                    {item.label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="admin-mobile-underline"
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-accent"
                      transition={spring}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          {/* ── Sidebar (lg+) ── */}
          <motion.aside
            variants={sidebarVariants}
            initial="hidden"
            animate="shown"
            className="hidden lg:block panel p-3 self-start sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto scrollbar-thin"
          >
            {NAV_GROUPS.map((group) => (
              <div key={group.name} className="mb-4 last:mb-0">
                <motion.div variants={sidebarItem} className="label-meta px-3 mb-1.5">
                  {group.name}
                </motion.div>
                <nav className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <motion.button
                        variants={sidebarItem}
                        whileTap={tap}
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`relative h-10 px-3 rounded-xl flex items-center gap-2.5 text-left transition-colors ${
                          active ? 'text-ink' : 'text-ink-muted hover:text-ink hover:bg-subtle'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="admin-sidebar-pill"
                            className="absolute inset-0 rounded-xl bg-accent-soft"
                            transition={spring}
                          />
                        )}
                        <Icon
                          size={15}
                          strokeWidth={active ? 2.4 : 2}
                          className={`relative shrink-0 ${active ? 'text-accent' : ''}`}
                        />
                        <span className="relative text-[13px] font-semibold tracking-tight">
                          {item.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </motion.aside>

          {/* ── Content — spring cross-fade between tabs ── */}
          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ ...spring, mass: 0.6 }}
              >
                {activeTab === 'dashboard' && (
                  <DashboardTab onGoTo={(t) => setActiveTab(t as TabId)} />
                )}
                {activeTab === 'users' && <UsersTab />}
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
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Blogs tab — flat list styled with theme tokens. ── */
/* adminPost — shared caller for the admin-settings edge function. Blog
   reads/writes must run as service_role: anon can only SELECT published
   posts (drafts invisible) and every write is RLS-blocked. */
const useAdminPost = () => {
  const adminSteamId = useAuthStore((s) => s.user?.steamId);
  return async (payload: Record<string, unknown>): Promise<any> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    const res = await fetch(`${supabaseUrl}/functions/v1/admin-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
        'X-Steam-Id': adminSteamId || '',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Server error (${res.status})`);
    return data;
  };
};

interface BlogDraft {
  id?: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category: string;
  tags: string;
  is_published: boolean;
  is_featured: boolean;
}

const EMPTY_BLOG: BlogDraft = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_image_url: '',
  category: 'News',
  tags: '',
  is_published: false,
  is_featured: false,
};

const BlogsTab: React.FC<{ addToast: any; supabase: any }> = ({ addToast }) => {
  const adminPost = useAdminPost();
  const [blogs, setBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogDraft | null>(null);
  const [savingBlog, setSavingBlog] = useState(false);

  const fetchBlogs = async () => {
    try {
      const { blogs: data } = await adminPost({ action: 'list_blogs' });
      setBlogs(data || []);
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteBlog = async (id: number) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    try {
      await adminPost({ action: 'delete_blog', id });
      addToast({ type: 'success', title: 'Success', message: 'Blog post deleted' });
      fetchBlogs();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const togglePublished = async (blog: any) => {
    try {
      await adminPost({
        action: 'save_blog',
        blog: { ...blog, is_published: !blog.is_published },
      });
      addToast({ type: 'success', title: 'Success', message: 'Blog status updated' });
      fetchBlogs();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Error', message: error.message });
    }
  };

  const openEditor = (blog?: any) => {
    if (!blog) {
      setEditing({ ...EMPTY_BLOG });
      return;
    }
    setEditing({
      id: blog.id,
      title: blog.title || '',
      slug: blog.slug || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      cover_image_url: blog.cover_image_url || '',
      category: blog.category || 'News',
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
      is_published: !!blog.is_published,
      is_featured: !!blog.is_featured,
    });
  };

  const saveBlog = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.content.trim()) {
      addToast({ type: 'warning', title: 'Missing fields', message: 'Title and content are required.' });
      return;
    }
    setSavingBlog(true);
    try {
      await adminPost({
        action: 'save_blog',
        blog: {
          ...editing,
          tags: editing.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });
      addToast({
        type: 'success',
        title: editing.id ? 'Post updated' : 'Post created',
        message: editing.title,
      });
      setEditing(null);
      fetchBlogs();
    } catch (error: any) {
      addToast({ type: 'error', title: 'Save failed', message: error.message });
    } finally {
      setSavingBlog(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted font-medium">
          {loading ? 'Loading posts…' : `${blogs.length} post${blogs.length === 1 ? '' : 's'}`}
        </p>
        <motion.button
          whileTap={tap}
          onClick={() => openEditor()}
          className="h-10 px-4 rounded-full bg-accent text-on-accent text-[13px] font-bold inline-flex items-center gap-1.5"
        >
          <Plus size={14} strokeWidth={2.6} />
          New post
        </motion.button>
      </div>

      {/* Editor modal */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => !savingBlog && setEditing(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="card-elevated w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="shrink-0 px-6 pt-5 pb-4 border-b border-line flex items-center justify-between gap-3">
                <div>
                  <span className="label-eyebrow">Blog</span>
                  <h2 className="text-[19px] font-bold text-ink tracking-tight mt-1 leading-none">
                    {editing.id ? 'Edit post' : 'New post'}
                  </h2>
                </div>
                <button
                  onClick={() => setEditing(null)}
                  className="h-9 w-9 rounded-full bg-subtle hover:bg-bg grid place-items-center text-ink-muted hover:text-ink transition-colors"
                  aria-label="Close"
                >
                  <X size={15} strokeWidth={2.4} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <BlogField label="Title *">
                  <input
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    placeholder="How to spot undervalued skins"
                    className="blog-input"
                  />
                </BlogField>
                <div className="grid sm:grid-cols-2 gap-4">
                  <BlogField label="Slug (auto from title if empty)">
                    <input
                      value={editing.slug}
                      onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                      placeholder="how-to-spot-undervalued-skins"
                      className="blog-input font-mono text-[12px]"
                    />
                  </BlogField>
                  <BlogField label="Category">
                    <input
                      value={editing.category}
                      onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                      placeholder="News"
                      className="blog-input"
                    />
                  </BlogField>
                </div>
                <BlogField label="Excerpt — short teaser shown on cards">
                  <textarea
                    rows={2}
                    value={editing.excerpt}
                    onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                    className="blog-input resize-none"
                  />
                </BlogField>
                <BlogField label="Content * (markdown)">
                  <textarea
                    rows={10}
                    value={editing.content}
                    onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                    className="blog-input font-mono text-[12.5px] resize-y"
                  />
                </BlogField>
                <div className="grid sm:grid-cols-2 gap-4">
                  <BlogField label="Cover image URL">
                    <input
                      value={editing.cover_image_url}
                      onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })}
                      placeholder="https://…"
                      className="blog-input"
                    />
                  </BlogField>
                  <BlogField label="Tags (comma separated)">
                    <input
                      value={editing.tags}
                      onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                      placeholder="skins, trading, guide"
                      className="blog-input"
                    />
                  </BlogField>
                </div>
                {editing.cover_image_url && (
                  <img
                    src={editing.cover_image_url}
                    alt=""
                    className="h-32 rounded-2xl object-cover ring-1 ring-line"
                    onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
                  />
                )}
                <div className="flex items-center gap-5">
                  <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editing.is_published}
                      onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                      className="accent-[rgb(var(--accent))] w-4 h-4"
                    />
                    Published
                  </label>
                  <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editing.is_featured}
                      onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })}
                      className="accent-[rgb(var(--accent))] w-4 h-4"
                    />
                    Featured
                  </label>
                </div>
              </div>

              <div className="shrink-0 px-6 py-4 border-t border-line flex gap-2">
                <button
                  onClick={() => setEditing(null)}
                  disabled={savingBlog}
                  className="h-11 px-5 rounded-full bg-subtle hover:bg-bg text-ink text-[13px] font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveBlog}
                  disabled={savingBlog}
                  className="flex-1 h-11 rounded-full bg-accent text-on-accent text-[13.5px] font-bold disabled:opacity-60"
                >
                  {savingBlog ? 'Saving…' : editing.id ? 'Save changes' : 'Create post'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="panel p-10 text-center text-[13.5px] text-ink-muted font-medium">
          Loading blogs…
        </div>
      ) : blogs.length === 0 ? (
        <div className="panel p-10 text-center text-[13.5px] text-ink-muted font-medium">
          No blog posts yet.
        </div>
      ) : (
        <div className="space-y-2">
          {blogs.map((blog, i) => (
            <motion.div
              key={blog.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: Math.min(i * 0.04, 0.3) }}
              className="panel p-5 flex items-start justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold text-ink tracking-tight truncate">
                  {blog.title}
                </h3>
                <p className="text-[12.5px] text-ink-muted font-medium mt-1 line-clamp-1">
                  {blog.excerpt}
                </p>
                <div className="mt-2.5 flex items-center gap-4 text-[11px] text-ink-dim font-semibold">
                  <span className="inline-flex items-center gap-1">
                    <BookOpen size={12} /> {blog.category}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} /> {new Date(blog.created_at).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Eye size={12} /> {blog.views} views
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => togglePublished(blog)}
                  className={`h-8 px-3 rounded-full text-[11.5px] font-bold transition-colors ${
                    blog.is_published
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-subtle text-ink-muted'
                  }`}
                >
                  {blog.is_published ? 'Published' : 'Draft'}
                </button>
                <button
                  onClick={() => openEditor(blog)}
                  className="h-8 px-3 rounded-full bg-subtle hover:bg-accent-soft text-ink text-[11.5px] font-bold inline-flex items-center gap-1 transition-colors"
                >
                  <Edit3 size={12} strokeWidth={2.4} />
                  Edit
                </button>
                <button
                  onClick={() => deleteBlog(blog.id)}
                  className="w-8 h-8 rounded-full grid place-items-center text-ink-muted hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  aria-label="Delete post"
                >
                  <Trash2 size={14} strokeWidth={2.2} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const BlogField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-[11px] font-bold uppercase tracking-wider text-ink-dim mb-1.5">{label}</div>
    {children}
  </div>
);

export default AdminPanelNew;
