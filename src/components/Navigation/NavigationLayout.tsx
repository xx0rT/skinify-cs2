import { ReactNode } from 'react';
import { TopHeader } from './TopHeader';
import { MainNav } from './MainNav';
import { LeftSidebar } from './LeftSidebar';

interface NavigationLayoutProps {
  children: ReactNode;
  onSearchOpen?: () => void;
  showNavigation?: boolean;
}

export function NavigationLayout({
  children,
  onSearchOpen,
  showNavigation = true
}: NavigationLayoutProps) {
  if (!showNavigation) {
    return <>{children}</>;
  }

  return (
    <>
      <TopHeader />
      <MainNav onSearchOpen={onSearchOpen} />
      <LeftSidebar />

      {/* Main Content Area - adjusted for navigation */}
      <div className="fixed top-[149px] left-16 right-0 bottom-0 overflow-y-auto">
        {children}
      </div>
    </>
  );
}
