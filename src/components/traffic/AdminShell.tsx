import * as React from 'react';
import { ChevronsUpDown, LogOut, PanelLeft, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import './dashboard13.css';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

/* Dashboard13 application shell, reused for the whole admin panel. Takes
   the real admin nav (grouped) + active tab + a select handler, and
   renders the tab content as children. The sidebar, header and user
   dropdown are the shadcn/Dashboard13 versions, scoped to
   .dashboard13-scope so they don't touch the rest of the app. */

export type ShellNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
};
export type ShellNavGroup = { name: string; items: ShellNavItem[] };

const SidebarLogo = () => (
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" tooltip="Skinify Admin">
        <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary overflow-hidden">
          <img src="/favicon.png" alt="" width={24} height={24} className="size-6" />
        </div>
        <div className="flex flex-col gap-0.5 leading-none">
          <span className="font-medium">Skinify Admin</span>
          <span className="text-xs text-muted-foreground">Control panel</span>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
);

const NavUser: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const name = user?.displayName || 'Admin';
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  const avatar = (
    <Avatar className="size-8 rounded-md">
      <AvatarImage src={user?.avatarUrl || ''} alt={name} />
      <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
    </Avatar>
  );
  const info = (
    <div className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{name}</span>
      <span className="truncate text-xs text-muted-foreground">{user?.steamId || 'admin'}</span>
    </div>
  );
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              {avatar}
              {info}
              <ChevronsUpDown className="ml-auto size-4" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" side="top" align="end" sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                {avatar}
                {info}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 size-4" aria-hidden /> Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/')}>
              <LogOut className="mr-2 size-4" aria-hidden /> Back to site
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

const AdminSidebar: React.FC<{
  groups: ShellNavGroup[];
  activeId: string;
  onSelect: (id: string) => void;
}> = ({ groups, activeId, onSelect }) => (
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
        <SidebarLogo />
        <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
      </div>
    </SidebarHeader>
    <SidebarContent>
      <ScrollArea className="h-full">
        {groups.map((group) => (
          <SidebarGroup key={group.name}>
            <SidebarGroupLabel>{group.name}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={activeId === item.id}
                        tooltip={item.label}
                        onClick={() => onSelect(item.id)}
                      >
                        <Icon className="size-4" aria-hidden />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </ScrollArea>
    </SidebarContent>
    <SidebarFooter>
      <NavUser />
    </SidebarFooter>
  </Sidebar>
);

export const AdminShell: React.FC<{
  groups: ShellNavGroup[];
  activeId: string;
  activeLabel: string;
  onSelect: (id: string) => void;
  children: React.ReactNode;
  /** Rendered flush at the top of the content area, no card padding
      (used by the traffic dashboard which owns its own full-bleed
      layout). Otherwise children sit inside a padded content region. */
  bleed?: boolean;
}> = ({ groups, activeId, activeLabel, onSelect, children, bleed }) => {
  return (
    <div className="dashboard13-scope">
      <TooltipProvider>
        <SidebarProvider className="bg-sidebar" style={{ '--sidebar-width': '18rem' } as React.CSSProperties}>
          <AdminSidebar groups={groups} activeId={activeId} onSelect={onSelect} />
          <div className="flex h-svh w-full flex-col overflow-auto bg-background text-foreground">
            <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
              <SidebarTrigger className="md:hidden">
                <PanelLeft />
              </SidebarTrigger>
              <div className="min-w-0">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground">Admin</div>
                <h1 className="truncate text-lg font-semibold leading-none">{activeLabel}</h1>
              </div>
            </header>
            <div className={cn('flex-1', bleed ? '' : 'px-4 py-5 sm:px-6')}>{children}</div>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </div>
  );
};

export default AdminShell;
