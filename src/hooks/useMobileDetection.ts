import { useState, useEffect } from 'react';

interface MobileDetectionResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  userAgent: string;
  screenWidth: number;
  screenHeight: number;
  touchSupport: boolean;
}

export const useMobileDetection = (): MobileDetectionResult => {
  const [detection, setDetection] = useState<MobileDetectionResult>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    userAgent: '',
    screenWidth: 0,
    screenHeight: 0,
    touchSupport: false
  });

  useEffect(() => {
    // Set initial theme color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#8B5CF6');
    }

    const detectDevice = () => {
      const userAgent = navigator.userAgent;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Check for touch support
      const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Mobile detection patterns
      const mobilePatterns = [
        /Android/i,
        /webOS/i,
        /iPhone/i,
        /iPad/i,
        /iPod/i,
        /BlackBerry/i,
        /Windows Phone/i,
        /Mobile/i
      ];
      
      // Tablet detection patterns
      const tabletPatterns = [
        /iPad/i,
        /Android(?=.*Tablet)/i,
        /Android(?=.*SM-T)/i,
        /Kindle/i
      ];
      
      const isMobileUserAgent = mobilePatterns.some(pattern => pattern.test(userAgent));
      const isTabletUserAgent = tabletPatterns.some(pattern => pattern.test(userAgent));
      
      // Screen size detection
      const isMobileScreen = screenWidth <= 768;
      const isTabletScreen = screenWidth > 768 && screenWidth <= 1024;
      
      // Final detection logic
      const isMobile = (isMobileUserAgent && !isTabletUserAgent) || 
                       (isMobileScreen && touchSupport);
      const isTablet = isTabletUserAgent || 
                       (isTabletScreen && touchSupport && !isMobileUserAgent);
      const isDesktop = !isMobile && !isTablet;
      
      console.log('🔍 Device Detection:', {
        userAgent,
        screenWidth,
        screenHeight,
        touchSupport,
        isMobileUserAgent,
        isTabletUserAgent,
        isMobileScreen,
        isTabletScreen,
        finalResult: { isMobile, isTablet, isDesktop }
      });
      
      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        userAgent,
        screenWidth,
        screenHeight,
        touchSupport
      });
    };

    // Initial detection
    detectDevice();
    
    // Re-detect on window resize
    const handleResize = () => {
      detectDevice();
    };
    
    window.addEventListener('resize', handleResize);
    
    // Re-detect on orientation change (mobile devices)
    const handleOrientationChange = () => {
      // Small delay to allow screen dimensions to update
      setTimeout(detectDevice, 100);
    };
    
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return detection;
};