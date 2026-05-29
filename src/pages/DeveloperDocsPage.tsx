import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Palette, Download, Eye, Share2, Sparkles, BookOpen, FileCode } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const DeveloperDocsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('getting-started');

  const sections = [
    { id: 'getting-started', name: 'Getting Started', icon: BookOpen },
    { id: 'css-structure', name: 'CSS Structure', icon: FileCode },
    { id: 'variables', name: 'CSS Variables', icon: Code },
    { id: 'selectors', name: 'Available Selectors', icon: Palette },
    { id: 'examples', name: 'Example Themes', icon: Sparkles },
    { id: 'publishing', name: 'Publishing Presets', icon: Share2 },
  ];

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
            <h1 className="text-5xl font-bold text-white">CSS Customization Guide</h1>
          </div>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Learn how to create beautiful custom CSS themes for your shop and share them with the community
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 sticky top-24">
              <h3 className="text-lg font-semibold text-white mb-4">Documentation</h3>
              <nav className="space-y-2">
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      activeSection === section.id
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'text-gray-400 hover:bg-gray-700/30 hover:text-white'
                    }`}
                  >
                    <section.icon className="w-5 h-5" />
                    <span>{section.name}</span>
                  </button>
                ))}
              </nav>
            </div>
          </motion.div>

          <div className="lg:col-span-3">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-purple-500/20">
              {activeSection === 'getting-started' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-white mb-4">Getting Started with CSS Customization</h2>

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
                    <h3 className="text-xl font-semibold text-purple-400 mb-3">What is CSS Customization?</h3>
                    <p className="text-gray-300">
                      CSS customization allows you to completely transform the appearance of your shop page.
                      You can change colors, fonts, layouts, animations, and more to create a unique brand identity.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400">Quick Start</h3>
                    <ol className="list-decimal list-inside text-gray-300 space-y-3">
                      <li>Navigate to your Profile → My Shop</li>
                      <li>Click "Visual Editor" or "Advanced Settings"</li>
                      <li>In Advanced Settings, find the "Custom CSS" section</li>
                      <li>Write your CSS code or browse community presets</li>
                      <li>Click "Save Changes" to apply</li>
                      <li>Visit your shop to see the results</li>
                    </ol>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400">Basic Example</h3>
                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre className="text-gray-300">
{`/* Change the shop background */
.shop-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Customize item cards */
.item-card {
  border: 2px solid #a78bfa;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(167, 139, 250, 0.3);
}

/* Style item titles */
.item-name {
  color: #ffffff;
  font-weight: bold;
  font-size: 18px;
}`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'css-structure' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-white mb-4">CSS Structure</h2>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400">How Custom CSS Works</h3>
                    <p className="text-gray-300">
                      Your custom CSS is injected into your shop page as a scoped style tag. This means:
                    </p>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                      <li>Your styles only affect YOUR shop page</li>
                      <li>You can override any default styles</li>
                      <li>Use standard CSS syntax including media queries</li>
                      <li>Supports modern CSS features (flexbox, grid, animations, etc.)</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400">Shop Page Structure</h3>
                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre className="text-gray-300">
{`<div class="shop-page">
  <div class="shop-header">
    <div class="shop-banner">...</div>
    <div class="shop-info">
      <h1 class="shop-name">...</h1>
      <p class="shop-description">...</p>
    </div>
  </div>

  <div class="shop-stats">
    <div class="stat-item">...</div>
  </div>

  <div class="shop-items-grid">
    <div class="item-card">
      <img class="item-image" />
      <h3 class="item-name">...</h3>
      <div class="item-details">
        <span class="item-price">...</span>
        <span class="item-condition">...</span>
      </div>
    </div>
  </div>
</div>`}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'variables' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-white mb-4">CSS Variables</h2>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400">Available CSS Variables</h3>
                    <p className="text-gray-300">
                      The shop uses CSS variables that you can override for consistent theming:
                    </p>

                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                      <pre className="text-gray-300">
{`:root {
  /* Primary Colors */
  --primary-color: #a78bfa;
  --primary-dark: #7c3aed;
  --primary-light: #c4b5fd;

  /* Background Colors */
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;

  /* Text Colors */
  --text-primary: #ffffff;
  --text-secondary: #d1d5db;
  --text-muted: #9ca3af;

  /* Accent Colors */
  --accent-success: #10b981;
  --accent-warning: #f59e0b;
  --accent-error: #ef4444;

  /* Spacing */
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}`}
                      </pre>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                      <p className="text-gray-300">
                        <strong className="text-purple-400">Pro Tip:</strong> Override these variables in your CSS
                        for instant theme changes across all elements!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'selectors' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-white mb-4">Available CSS Selectors</h2>

                  <div className="space-y-6">
                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-white mb-3">Layout Classes</h4>
                      <div className="space-y-2 font-mono text-sm">
                        <div className="text-purple-400">.shop-page</div>
                        <p className="text-gray-400 text-xs ml-4">Main container for the entire shop</p>

                        <div className="text-purple-400">.shop-header</div>
                        <p className="text-gray-400 text-xs ml-4">Header section with banner and info</p>

                        <div className="text-purple-400">.shop-items-grid</div>
                        <p className="text-gray-400 text-xs ml-4">Grid container for all items</p>
                      </div>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-white mb-3">Item Card Classes</h4>
                      <div className="space-y-2 font-mono text-sm">
                        <div className="text-purple-400">.item-card</div>
                        <p className="text-gray-400 text-xs ml-4">Individual item card container</p>

                        <div className="text-purple-400">.item-image</div>
                        <p className="text-gray-400 text-xs ml-4">Item image element</p>

                        <div className="text-purple-400">.item-name</div>
                        <p className="text-gray-400 text-xs ml-4">Item name/title</p>

                        <div className="text-purple-400">.item-price</div>
                        <p className="text-gray-400 text-xs ml-4">Price display</p>

                        <div className="text-purple-400">.item-condition</div>
                        <p className="text-gray-400 text-xs ml-4">Item condition badge</p>

                        <div className="text-purple-400">.item-rarity</div>
                        <p className="text-gray-400 text-xs ml-4">Rarity indicator</p>
                      </div>
                    </div>

                    <div className="bg-gray-900 rounded-lg p-4">
                      <h4 className="text-lg font-semibold text-white mb-3">Shop Info Classes</h4>
                      <div className="space-y-2 font-mono text-sm">
                        <div className="text-purple-400">.shop-name</div>
                        <p className="text-gray-400 text-xs ml-4">Shop title/name</p>

                        <div className="text-purple-400">.shop-description</div>
                        <p className="text-gray-400 text-xs ml-4">Shop description text</p>

                        <div className="text-purple-400">.shop-stats</div>
                        <p className="text-gray-400 text-xs ml-4">Statistics section</p>

                        <div className="text-purple-400">.stat-item</div>
                        <p className="text-gray-400 text-xs ml-4">Individual stat display</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'examples' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-white mb-4">Example Themes</h2>

                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-purple-400">Dark Neon Theme</h3>
                      <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                        <pre className="text-gray-300">
{`/* Neon cyberpunk theme */
.shop-page {
  background: #000000;
  background-image:
    radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.3), transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255, 77, 109, 0.3), transparent 50%);
}

.item-card {
  background: rgba(20, 20, 40, 0.8);
  border: 1px solid #00ffff;
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.item-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 0 30px rgba(255, 0, 255, 0.5);
  border-color: #ff00ff;
}

.item-name {
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
}

.item-price {
  color: #ff00ff;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
}`}
                        </pre>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-purple-400">Minimalist Clean Theme</h3>
                      <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                        <pre className="text-gray-300">
{`/* Clean minimal design */
.shop-page {
  background: #ffffff;
  font-family: 'Inter', sans-serif;
}

.item-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.item-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.item-name {
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.item-price {
  color: #6366f1;
  font-size: 18px;
  font-weight: 700;
}`}
                        </pre>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-purple-400">Premium Gold Theme</h3>
                      <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                        <pre className="text-gray-300">
{`/* Luxury gold theme */
.shop-page {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
}

.item-card {
  background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
  border: 2px solid #d4af37;
  box-shadow: 0 4px 20px rgba(212, 175, 55, 0.2);
}

.item-name {
  color: #d4af37;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.item-price {
  background: linear-gradient(135deg, #ffd700 0%, #d4af37 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 20px;
  font-weight: 800;
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'publishing' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-white mb-4">Publishing CSS Presets</h2>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400">Share Your Theme</h3>
                    <p className="text-gray-300">
                      Created an amazing theme? Share it with the community in the CSS Presets Marketplace!
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400">How to Publish</h3>
                    <ol className="list-decimal list-inside text-gray-300 space-y-3">
                      <li>Go to the <a href="/css-presets" className="text-purple-400 hover:text-purple-300 underline">CSS Presets</a> page</li>
                      <li>Click "Submit Your Preset"</li>
                      <li>Fill in the details:
                        <ul className="list-disc list-inside ml-8 mt-2 space-y-1">
                          <li>Preset name</li>
                          <li>Description</li>
                          <li>Category (Dark, Light, Colorful, etc.)</li>
                          <li>Your CSS code</li>
                        </ul>
                      </li>
                      <li>Preview your preset</li>
                      <li>Submit for publication</li>
                    </ol>
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-purple-400 mb-3">Preset Guidelines</h4>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                      <li>Test your CSS thoroughly before publishing</li>
                      <li>Ensure it works on different screen sizes</li>
                      <li>Avoid using !important unless necessary</li>
                      <li>Include comments to explain complex styles</li>
                      <li>Keep performance in mind (avoid heavy animations)</li>
                      <li>Make sure text is readable with good contrast</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-purple-400">Benefits of Publishing</h3>
                    <ul className="list-disc list-inside text-gray-300 space-y-2">
                      <li>Get recognition in the community</li>
                      <li>Earn downloads and ratings</li>
                      <li>Help other users customize their shops</li>
                      <li>Build your reputation as a designer</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DeveloperDocsPage;
