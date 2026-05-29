import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component that automatically scrolls to the top of the page
 * whenever the route changes (when user navigates to a new page)
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to the top of the page whenever the pathname changes
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth' // Smooth scroll animation
    });
  }, [pathname]);

  return null; // This component doesn't render anything
};

export default ScrollToTop;