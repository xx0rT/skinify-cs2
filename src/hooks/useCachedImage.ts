import { useState, useEffect } from 'react';
import { imageCache } from '../utils/imageCache';

export function useCachedImage(imageUrl: string | undefined): {
  src: string;
  isLoading: boolean;
  error: Error | null;
} {
  const [src, setSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    imageCache.getImage(imageUrl)
      .then(cachedUrl => {
        if (isMounted) {
          setSrc(cachedUrl);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setSrc(imageUrl); // Fallback to original URL
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  return { src, isLoading, error };
}

export function usePreloadImages(imageUrls: string[]): boolean {
  const [isPreloaded, setIsPreloaded] = useState(false);

  useEffect(() => {
    if (imageUrls.length === 0) {
      setIsPreloaded(true);
      return;
    }

    imageCache.preloadImages(imageUrls)
      .then(() => setIsPreloaded(true))
      .catch(err => {
        console.error('Error preloading images:', err);
        setIsPreloaded(true); // Continue even if preload fails
      });
  }, [imageUrls.join(',')]);

  return isPreloaded;
}
