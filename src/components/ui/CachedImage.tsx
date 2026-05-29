import React from 'react';
import { useCachedImage } from '../../hooks/useCachedImage';

interface CachedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  fallback?: string;
  showLoader?: boolean;
}

export const CachedImage: React.FC<CachedImageProps> = ({
  src: imageUrl,
  alt = '',
  fallback,
  showLoader = true,
  className = '',
  style,
  ...props
}) => {
  const { src, isLoading, error } = useCachedImage(imageUrl);

  if (error && fallback) {
    return (
      <img
        src={fallback}
        alt={alt}
        className={className}
        style={style}
        {...props}
      />
    );
  }

  return (
    <>
      {showLoader && isLoading && (
        <div
          className={`flex items-center justify-center ${className}`}
          style={style}
        >
          <div className="animate-pulse bg-gray-700/50 w-full h-full rounded" />
        </div>
      )}
      <img
        src={src || imageUrl}
        alt={alt}
        className={`${className} ${isLoading && showLoader ? 'hidden' : ''}`}
        style={style}
        loading="lazy"
        decoding="async"
        {...props}
      />
    </>
  );
};
