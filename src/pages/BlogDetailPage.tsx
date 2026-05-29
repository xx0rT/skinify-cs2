import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Eye, Tag, Clock, TrendingUp, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/Header';
import Footer from '../components/Footer';

const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [blog, setBlog] = useState<any>(null);
  const [relatedBlogs, setRelatedBlogs] = useState<any[]>([]);
  const [popularBlogs, setPopularBlogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionEmail, setSubscriptionEmail] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subscriptionMessage, setSubscriptionMessage] = useState('');

  useEffect(() => {
    const fetchBlog = async () => {
      if (!slug) {
        setError('No blog slug provided');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single();

        if (error) throw error;

        if (!data) {
          setError('Blog post not found');
          setLoading(false);
          return;
        }

        setBlog(data);

        // Increment view count
        await supabase
          .from('blog_posts')
          .update({ views: (data.views || 0) + 1 })
          .eq('id', data.id);

        // Fetch related blogs (same category, exclude current)
        const { data: related } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('is_published', true)
          .eq('category', data.category)
          .neq('id', data.id)
          .order('published_at', { ascending: false })
          .limit(3);

        setRelatedBlogs(related || []);

        // Fetch popular blogs (most viewed, exclude current)
        const { data: popular } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('is_published', true)
          .neq('id', data.id)
          .order('views', { ascending: false })
          .limit(5);

        setPopularBlogs(popular || []);

      } catch (error: any) {
        console.error('Error fetching blog:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-screen">
          <div className="text-purple-400 text-xl">Loading blog post...</div>
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header />
        <div className="flex flex-col items-center justify-center h-screen px-4">
          <div className="text-red-400 text-xl mb-4">Blog post not found</div>
          <button
            onClick={() => navigate('/')}
            className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg flex items-center space-x-2"
          >
            <ArrowLeft size={20} />
            <span>Back to Home</span>
          </button>
        </div>
      </div>
    );
  }

  // Calculate reading time (average 200 words per minute)
  const wordCount = blog.content.split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="text-purple-400 hover:text-purple-300 flex items-center space-x-2 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Blog Header */}
              <div className="mb-8 bg-gradient-to-br from-gray-800/40 via-gray-800/20 to-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8">
                {/* Category Badge */}
                <div className="mb-4">
                  <span className="inline-block bg-purple-600/20 backdrop-blur-sm text-purple-400 px-4 py-2 rounded-full text-sm font-medium border border-purple-500/30">
                    {blog.category}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                  {blog.title}
                </h1>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-6 text-gray-400 text-sm pb-6 border-b border-gray-700/50">
                  <div className="flex items-center space-x-2 bg-gray-800/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <User size={16} />
                    <span>{blog.author_name}</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-gray-800/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <Calendar size={16} />
                    <span>{new Date(blog.published_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-gray-800/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <Clock size={16} />
                    <span>{readingTime} min read</span>
                  </div>
                  <div className="flex items-center space-x-2 bg-gray-800/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <Eye size={16} />
                    <span>{blog.views} views</span>
                  </div>
                </div>
              </div>

              {/* Cover Image */}
              {blog.cover_image_url && (
                <div className="mb-12 rounded-xl overflow-hidden">
                  <img
                    src={blog.cover_image_url}
                    alt={blog.title}
                    className="w-full h-auto max-h-[500px] object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Blog Content */}
              <div className="mb-12 bg-gradient-to-br from-gray-800/30 via-gray-800/10 to-gray-900/30 backdrop-blur-md border border-gray-700/40 rounded-2xl p-10 shadow-xl">
                <div className="prose prose-invert prose-lg max-w-none">
                  <div className="text-gray-200 leading-loose space-y-4">
                    {blog.content.split('\n').map((line: string, index: number) => {
                      // Handle markdown-style headers
                      if (line.startsWith('# ')) {
                        return (
                          <h1 key={index} className="text-4xl font-extrabold text-white mt-16 mb-8 first:mt-0 leading-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            {line.substring(2)}
                          </h1>
                        );
                      } else if (line.startsWith('## ')) {
                        return (
                          <h2 key={index} className="text-3xl font-bold text-white mt-12 mb-6 leading-snug border-l-4 border-purple-500 pl-4">
                            {line.substring(3)}
                          </h2>
                        );
                      } else if (line.startsWith('### ')) {
                        return (
                          <h3 key={index} className="text-2xl font-semibold text-purple-300 mt-10 mb-4 leading-snug">
                            {line.substring(4)}
                          </h3>
                        );
                      } else if (line.startsWith('- ')) {
                        return (
                          <li key={index} className="ml-8 mb-3 text-gray-200 list-disc marker:text-purple-400 pl-2 leading-relaxed text-base">
                            {line.substring(2)}
                          </li>
                        );
                      } else if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <p key={index} className="font-bold text-white my-6 text-lg bg-purple-500/10 border-l-4 border-purple-500 pl-4 py-3 rounded-r">
                            {line.substring(2, line.length - 2)}
                          </p>
                        );
                      } else if (line.startsWith('> ')) {
                        return (
                          <blockquote key={index} className="border-l-4 border-purple-500 pl-6 py-4 my-6 bg-gray-800/40 rounded-r italic text-gray-300">
                            {line.substring(2)}
                          </blockquote>
                        );
                      } else if (line.trim() === '') {
                        return <div key={index} className="h-6" />;
                      } else {
                        return (
                          <p key={index} className="text-gray-200 leading-loose text-base my-4 font-light tracking-wide">
                            {line}
                          </p>
                        );
                      }
                    })}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {blog.tags && blog.tags.length > 0 && (
                <div className="mb-12 pb-8 border-b border-gray-700/50">
                  <div className="flex items-center space-x-2 text-gray-400 mb-3">
                    <Tag size={18} />
                    <span className="font-medium">Tags:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {blog.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 text-gray-300 px-3 py-1 rounded-full text-sm cursor-pointer transition-colors"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Blogs */}
              {relatedBlogs.length > 0 && (
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">More from {blog.category}</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {relatedBlogs.map((relatedBlog) => (
                      <div
                        key={relatedBlog.id}
                        onClick={() => navigate(`/blog/${relatedBlog.slug}`)}
                        className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6 cursor-pointer hover:border-purple-500/50 transition-colors group"
                      >
                        <h4 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                          {relatedBlog.title}
                        </h4>
                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                          {relatedBlog.excerpt}
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Calendar size={12} />
                            <span>{new Date(relatedBlog.published_at).toLocaleDateString()}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Eye size={12} />
                            <span>{relatedBlog.views}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Popular Posts Widget */}
                {popularBlogs.length > 0 && (
                  <div className="bg-gradient-to-br from-gray-800/60 via-gray-800/40 to-gray-900/60 backdrop-blur-md border border-gray-600/50 rounded-2xl p-6 shadow-2xl">
                    <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-700/50">
                      <div className="p-2 bg-purple-600/20 rounded-lg">
                        <TrendingUp className="text-purple-400" size={22} />
                      </div>
                      <h3 className="text-xl font-bold text-white">Popular Posts</h3>
                    </div>
                    <div className="space-y-5">
                      {popularBlogs.map((popularBlog, index) => (
                        <div
                          key={popularBlog.id}
                          onClick={() => navigate(`/blog/${popularBlog.slug}`)}
                          className="cursor-pointer group hover:bg-gray-700/30 rounded-lg p-3 transition-all duration-300"
                        >
                          <div className="flex space-x-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-lg">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors line-clamp-2 mb-2 leading-snug">
                                {popularBlog.title}
                              </h4>
                              <div className="flex items-center space-x-3 text-xs text-gray-400">
                                <span className="flex items-center space-x-1 bg-gray-800/60 px-2 py-1 rounded">
                                  <Eye size={12} />
                                  <span>{popularBlog.views} views</span>
                                </span>
                                <span className="flex items-center space-x-1 bg-gray-800/60 px-2 py-1 rounded">
                                  <Calendar size={12} />
                                  <span>{new Date(popularBlog.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Categories Widget */}
                <div className="bg-gradient-to-br from-gray-800/60 via-gray-800/40 to-gray-900/60 backdrop-blur-md border border-gray-600/50 rounded-2xl p-6 shadow-2xl">
                  <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-700/50">
                    <div className="p-2 bg-purple-600/20 rounded-lg">
                      <BookOpen className="text-purple-400" size={22} />
                    </div>
                    <h3 className="text-xl font-bold text-white">Categories</h3>
                  </div>
                  <div className="space-y-2">
                    {['News', 'Guide', 'Tutorial', 'Update'].map((category) => (
                      <div
                        key={category}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-700/40 cursor-pointer transition-all duration-300 group border border-transparent hover:border-purple-500/30"
                      >
                        <span className="text-gray-200 group-hover:text-purple-400 transition-colors font-medium">
                          {category}
                        </span>
                        <span className="text-gray-500 group-hover:text-purple-400 transition-colors">→</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Newsletter Widget */}
                <div className="bg-gradient-to-br from-purple-600/30 to-purple-800/30 border border-purple-500/40 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
                  <h3 className="text-lg font-bold text-white mb-2">Stay Updated</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Get the latest CS:GO news and guides delivered to your inbox.
                  </p>

                  {subscriptionStatus === 'success' ? (
                    <div className="bg-green-600/20 border border-green-500/50 rounded-lg p-4 text-center">
                      <div className="text-green-400 font-medium mb-1">Subscribed!</div>
                      <div className="text-green-300 text-sm">{subscriptionMessage}</div>
                    </div>
                  ) : (
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setSubscriptionStatus('loading');

                      try {
                        const { error } = await supabase
                          .from('blog_subscriptions')
                          .insert([{ email: subscriptionEmail }]);

                        if (error) {
                          if (error.code === '23505') {
                            setSubscriptionMessage('This email is already subscribed!');
                            setSubscriptionStatus('error');
                          } else {
                            throw error;
                          }
                        } else {
                          setSubscriptionMessage('Check your email to confirm!');
                          setSubscriptionStatus('success');
                          setSubscriptionEmail('');
                        }
                      } catch (error: any) {
                        setSubscriptionMessage(error.message || 'Failed to subscribe');
                        setSubscriptionStatus('error');
                      }

                      setTimeout(() => {
                        setSubscriptionStatus('idle');
                        setSubscriptionMessage('');
                      }, 5000);
                    }}>
                      <input
                        type="email"
                        required
                        value={subscriptionEmail}
                        onChange={(e) => setSubscriptionEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full bg-gray-900/50 border border-gray-700 text-white px-4 py-2 rounded-lg mb-3 focus:outline-none focus:border-purple-500 transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={subscriptionStatus === 'loading'}
                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg font-medium transition-colors"
                      >
                        {subscriptionStatus === 'loading' ? 'Subscribing...' : 'Subscribe'}
                      </button>
                      {subscriptionStatus === 'error' && (
                        <div className="mt-2 text-red-400 text-xs text-center">{subscriptionMessage}</div>
                      )}
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogDetailPage;
