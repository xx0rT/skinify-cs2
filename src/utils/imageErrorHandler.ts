// Placeholder image as data URL (gray box with CS2 icon)
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzM3NDE1MSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';

const erroredImages = new Set<string>();

export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
  const img = e.currentTarget;
  const originalSrc = img.src;

  // Prevent infinite loop - if this image already errored, just hide it or use placeholder
  if (erroredImages.has(originalSrc)) {
    img.src = PLACEHOLDER_IMAGE;
    img.onerror = null; // Stop trying
    return;
  }

  // Mark this image as errored
  erroredImages.add(originalSrc);

  // Set placeholder
  img.src = PLACEHOLDER_IMAGE;
  img.onerror = null; // Prevent further errors
};

// Alternative handler that hides the image instead
export const handleImageErrorHide = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
  const img = e.currentTarget;
  img.style.display = 'none';
  img.onerror = null;
};

// Handler for avatar images with Steam fallback
export const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
  const img = e.currentTarget;
  const originalSrc = img.src;

  // If already tried fallback, use placeholder
  if (erroredImages.has(originalSrc) || originalSrc.includes('steamstatic.com')) {
    img.src = PLACEHOLDER_IMAGE;
    img.onerror = null;
    return;
  }

  erroredImages.add(originalSrc);

  // Try Steam default avatar
  img.src = 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg';
};

// Clear error cache if needed (e.g., on page navigation)
export const clearImageErrorCache = (): void => {
  erroredImages.clear();
};
