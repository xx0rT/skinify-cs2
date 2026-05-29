const CACHE_NAME = 'csgo-marketplace-images-v1';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface CachedImage {
  blob: Blob;
  timestamp: number;
}

class ImageCache {
  private memoryCache: Map<string, string> = new Map();
  private pendingRequests: Map<string, Promise<string>> = new Map();
  private maxMemoryCacheSize = 50;

  async getImage(url: string): Promise<string> {
    // Check memory cache first (fastest)
    if (this.memoryCache.has(url)) {
      return this.memoryCache.get(url)!;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(url)) {
      return this.pendingRequests.get(url)!;
    }

    // Create new request promise
    const requestPromise = this.fetchAndCacheImage(url);
    this.pendingRequests.set(url, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(url);
    }
  }

  private async fetchAndCacheImage(url: string): Promise<string> {
    try {
      // Check Cache API (persistent storage)
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(url);

      if (cachedResponse) {
        const blob = await cachedResponse.blob();
        const objectUrl = URL.createObjectURL(blob);
        this.memoryCache.set(url, objectUrl);
        return objectUrl;
      }

      // Fetch from network with no-cors mode for Steam CDN
      const response = await fetch(url, {
        cache: 'force-cache',
        mode: 'no-cors',
      });

      if (response.type === 'opaque') {
        // For opaque responses (no-cors), just return the original URL
        // The browser will cache it naturally
        this.memoryCache.set(url, url);
        return url;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      // Clone response for caching
      const responseClone = response.clone();

      // Store in Cache API
      await cache.put(url, responseClone);

      // Create object URL for memory cache
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      // Limit memory cache size to prevent excessive RAM usage
      if (this.memoryCache.size >= this.maxMemoryCacheSize) {
        const firstKey = this.memoryCache.keys().next().value;
        const oldUrl = this.memoryCache.get(firstKey);
        if (oldUrl && oldUrl.startsWith('blob:')) {
          URL.revokeObjectURL(oldUrl);
        }
        this.memoryCache.delete(firstKey);
      }

      this.memoryCache.set(url, objectUrl);

      return objectUrl;
    } catch (error) {
      // Silently fallback to original URL if caching fails
      // This allows images to still load via browser's native caching
      this.memoryCache.set(url, url);
      return url;
    }
  }

  async preloadImages(urls: string[]): Promise<void> {
    const promises = urls.map(url => this.getImage(url));
    await Promise.allSettled(promises);
  }

  async clearCache(): Promise<void> {
    // Clear memory cache
    this.memoryCache.forEach(objectUrl => {
      URL.revokeObjectURL(objectUrl);
    });
    this.memoryCache.clear();

    // Clear Cache API
    await caches.delete(CACHE_NAME);
  }

  async clearExpiredCache(): Promise<void> {
    try {
      const cache = await caches.open(CACHE_NAME);
      const requests = await cache.keys();
      const now = Date.now();

      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const dateHeader = response.headers.get('date');
          if (dateHeader) {
            const cacheTime = new Date(dateHeader).getTime();
            if (now - cacheTime > CACHE_EXPIRY) {
              await cache.delete(request);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }
}

export const imageCache = new ImageCache();

// Clear expired cache on initialization
imageCache.clearExpiredCache();
