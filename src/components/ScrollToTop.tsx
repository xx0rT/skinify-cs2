import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop — reset scroll on every navigation.
 *
 * Two important fixes vs the previous version:
 *   1. Instant, not smooth. Smooth-scrolling 2000px while React is also
 *      rendering the new route leaves the user mid-scroll on partially-
 *      mounted content. Instant snap is what every native app does.
 *   2. Watches BOTH pathname and search. The previous version only watched
 *      pathname, so /profile?tab=overview → /profile?tab=inventory kept
 *      the user scrolled half-way down the page.
 *
 * We also force `scrollTop` on documentElement + body for browsers where one
 * or the other holds the scroll position (mostly historical, costs nothing).
 */
const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
