import { motion } from 'framer-motion';
import {
  Activity,
  BarChart3,
  Box,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  Globe,
  LogOut,
  MessageSquare,
  Package,
  Radio,
  Search,
  Settings,
  Truck,
  User,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import * as React from 'react';

import { supabase } from '@/lib/supabaseClient';
import './dashboard13.css';

const jetBrainsMono = {
  className: 'font-mono',
  style: { fontFamily: "'JetBrains Mono', ui-monospace, monospace" },
};

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
} from '@/components/mapcn/map';
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type NavItem = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  isActive?: boolean;
  children?: NavItem[];
};
type NavGroup = { title: string; items: NavItem[]; defaultOpen?: boolean };
type UserData = { name: string; email: string; avatar: string };
type SidebarData = {
  logo: { src: string; alt: string; title: string; description: string };
  navGroups: NavGroup[];
  user?: UserData;
};

type GeoCountry = {
  name: string;
  flag: string;
  iso2: string;
  lat: number;
  lng: number;
  users: number;
};

// ============================================================================
// Formatters
// ============================================================================

const numberFormatter = new Intl.NumberFormat('en-US');
const compactNumberFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

// ============================================================================
// Country reference (ISO2 → name/flag/coords)
// ============================================================================

const COUNTRY_REF: Record<string, { name: string; flag: string; lat: number; lng: number }> = {
  CZ: { name: 'Czechia', flag: '🇨🇿', lat: 49.8, lng: 15.5 },
  SK: { name: 'Slovakia', flag: '🇸🇰', lat: 48.7, lng: 19.7 },
  DE: { name: 'Germany', flag: '🇩🇪', lat: 51.2, lng: 10.5 },
  PL: { name: 'Poland', flag: '🇵🇱', lat: 52, lng: 19 },
  AT: { name: 'Austria', flag: '🇦🇹', lat: 47.5, lng: 14.5 },
  GB: { name: 'United Kingdom', flag: '🇬🇧', lat: 54, lng: -2 },
  US: { name: 'United States', flag: '🇺🇸', lat: 38.9, lng: -97 },
  FR: { name: 'France', flag: '🇫🇷', lat: 46.2, lng: 2.2 },
  NL: { name: 'Netherlands', flag: '🇳🇱', lat: 52.1, lng: 5.3 },
  ES: { name: 'Spain', flag: '🇪🇸', lat: 40, lng: -3.7 },
  IT: { name: 'Italy', flag: '🇮🇹', lat: 42.8, lng: 12.8 },
  SE: { name: 'Sweden', flag: '🇸🇪', lat: 60, lng: 15 },
  NO: { name: 'Norway', flag: '🇳🇴', lat: 62, lng: 10 },
  DK: { name: 'Denmark', flag: '🇩🇰', lat: 56, lng: 10 },
  FI: { name: 'Finland', flag: '🇫🇮', lat: 64, lng: 26 },
  RU: { name: 'Russia', flag: '🇷🇺', lat: 61, lng: 90 },
  UA: { name: 'Ukraine', flag: '🇺🇦', lat: 49, lng: 32 },
  CA: { name: 'Canada', flag: '🇨🇦', lat: 56, lng: -106 },
  BR: { name: 'Brazil', flag: '🇧🇷', lat: -14, lng: -52 },
  AU: { name: 'Australia', flag: '🇦🇺', lat: -25, lng: 134 },
  JP: { name: 'Japan', flag: '🇯🇵', lat: 36, lng: 138 },
  IN: { name: 'India', flag: '🇮🇳', lat: 21, lng: 78 },
  CN: { name: 'China', flag: '🇨🇳', lat: 35, lng: 104 },
  TR: { name: 'Turkey', flag: '🇹🇷', lat: 39, lng: 35 },
  RO: { name: 'Romania', flag: '🇷🇴', lat: 46, lng: 25 },
  HU: { name: 'Hungary', flag: '🇭🇺', lat: 47, lng: 19.5 },
  BE: { name: 'Belgium', flag: '🇧🇪', lat: 50.6, lng: 4.5 },
  CH: { name: 'Switzerland', flag: '🇨🇭', lat: 46.8, lng: 8.2 },
  PT: { name: 'Portugal', flag: '🇵🇹', lat: 39.5, lng: -8 },
};

// ============================================================================
// Sidebar mock (nav only — the real app nav lives in the main admin panel)
// ============================================================================

const sidebarData: SidebarData = {
  logo: { src: '/favicon.png', alt: 'Skinify', title: 'Skinify Traffic', description: 'Realtime' },
  navGroups: [
    {
      title: 'Main',
      defaultOpen: true,
      items: [
        { label: 'Live overview', icon: Radio, href: '#', isActive: true },
        { label: 'Streams', icon: Activity, href: '#' },
        { label: 'Incidents', icon: ClipboardList, href: '#' },
      ],
    },
    {
      title: 'Pipelines',
      defaultOpen: true,
      items: [
        {
          label: 'Ingest',
          icon: Box,
          href: '#',
          children: [
            { label: 'HTTP API', icon: Package, href: '#' },
            { label: 'Webhooks', icon: Package, href: '#' },
          ],
        },
        { label: 'Routing', icon: Truck, href: '#' },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Explorer', icon: Globe, href: '#' },
        { label: 'Reports', icon: BarChart3, href: '#' },
        { label: 'Quotas', icon: Wallet, href: '#' },
      ],
    },
    { title: 'Audience', items: [{ label: 'Segments', icon: Users, href: '#' }, { label: 'Alerts', icon: MessageSquare, href: '#' }] },
    { title: 'Settings', items: [{ label: 'Settings', icon: Settings, href: '#' }] },
  ],
  user: { name: 'Admin', email: 'admin@skinify.gg', avatar: '' },
};

const secondaryNavigation = [
  { name: 'Live', href: '#', current: true },
  { name: 'Streams', href: '#', current: false },
  { name: 'Regions', href: '#', current: false },
  { name: 'Quality', href: '#', current: false },
];

const MAP_DEFAULT_CENTER: [number, number] = [15, 30];

type LiveEvent = {
  id: string;
  tone: 'ok' | 'warn' | 'info';
  title: string;
  detail: string;
  ago: string;
};

// ============================================================================
// Real data hook — reads user_activity
// ============================================================================

function useTrafficData() {
  const [activeNow, setActiveNow] = React.useState(0);
  const [eventsPerMin, setEventsPerMin] = React.useState(0);
  const [pageViewsToday, setPageViewsToday] = React.useState(0);
  const [uniqueToday, setUniqueToday] = React.useState(0);
  const [countries, setCountries] = React.useState<GeoCountry[]>([]);
  const [liveEvents, setLiveEvents] = React.useState<LiveEvent[]>([]);

  const load = React.useCallback(async () => {
    if (!supabase) return;
    const now = Date.now();
    const dayAgo = new Date(now - 24 * 3600 * 1000).toISOString();
    const fiveMinAgo = new Date(now - 5 * 60 * 1000).toISOString();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [dayRes, recentRes] = await Promise.all([
      supabase
        .from('user_activity')
        .select('event_type, session_id, country_code, created_at')
        .gte('created_at', dayAgo),
      supabase
        .from('user_activity')
        .select('event_type, page_url, country_code, user_steam_id, session_id, created_at')
        .order('created_at', { ascending: false })
        .limit(12),
    ]);

    const day = dayRes.data || [];
    // active now = distinct sessions in last 5 min
    const activeSessions = new Set(
      day.filter((a: any) => a.created_at >= fiveMinAgo).map((a: any) => a.session_id),
    );
    setActiveNow(activeSessions.size);
    // events/min = events in last 5 min * 12
    const last5 = day.filter((a: any) => a.created_at >= fiveMinAgo).length;
    setEventsPerMin(Math.round((last5 / 5) * 60) || last5);

    const todayEvents = day.filter((a: any) => a.created_at >= startOfDay.toISOString());
    setPageViewsToday(todayEvents.filter((a: any) => a.event_type === 'page_view').length);
    setUniqueToday(new Set(todayEvents.map((a: any) => a.session_id)).size);

    // country aggregation (distinct sessions per country, last 24h)
    const byCountry: Record<string, Set<string>> = {};
    day.forEach((a: any) => {
      const cc = (a.country_code || '').toUpperCase();
      if (!cc || !COUNTRY_REF[cc]) return;
      (byCountry[cc] ||= new Set()).add(a.session_id || a.created_at);
    });
    setCountries(
      Object.entries(byCountry)
        .map(([iso2, set]) => {
          const ref = COUNTRY_REF[iso2];
          return { iso2, name: ref.name, flag: ref.flag, lat: ref.lat, lng: ref.lng, users: set.size };
        })
        .sort((a, b) => b.users - a.users),
    );

    // live stream from recent events
    const recent = recentRes.data || [];
    setLiveEvents(
      recent.map((r: any, i: number) => {
        const tone: LiveEvent['tone'] =
          r.event_type === 'deposit' || r.event_type === 'purchase' ? 'ok'
          : r.event_type === 'click' ? 'info' : 'info';
        const secs = Math.max(0, Math.round((now - new Date(r.created_at).getTime()) / 1000));
        return {
          id: `${r.session_id}-${r.created_at}-${i}`,
          tone,
          title: String(r.event_type || 'event').replace('_', ' '),
          detail: `${r.page_url || '—'}${r.country_code ? ` · ${r.country_code}` : ''}`,
          ago: secs < 5 ? 'just now' : `${secs}s ago`,
        };
      }),
    );
  }, []);

  React.useEffect(() => {
    load();
    const id = window.setInterval(load, 15000);
    return () => window.clearInterval(id);
  }, [load]);

  return { activeNow, eventsPerMin, pageViewsToday, uniqueToday, countries, liveEvents };
}

// ============================================================================
// Sidebar components
// ============================================================================

const SidebarLogo = ({ logo }: { logo: SidebarData['logo'] }) => (
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" tooltip={logo.title}>
        <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary overflow-hidden">
          <img src={logo.src} alt={logo.alt} width={24} height={24} className="size-6" />
        </div>
        <div className="flex flex-col gap-0.5 leading-none">
          <span className="font-medium">{logo.title}</span>
          <span className="text-xs text-muted-foreground">{logo.description}</span>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
);

const NavMenuItem = ({ item }: { item: NavItem }) => {
  const Icon = item.icon;
  const hasChildren = item.children && item.children.length > 0;
  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.label}>
          <a href={item.href}>
            <Icon className="size-4" aria-hidden />
            <span>{item.label}</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }
  return (
    <Collapsible asChild defaultOpen className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton isActive={item.isActive} tooltip={item.label}>
            <Icon className="size-4" aria-hidden />
            <span>{item.label}</span>
            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" aria-hidden />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children!.map((child) => (
              <SidebarMenuSubItem key={child.label}>
                <SidebarMenuSubButton asChild isActive={child.isActive}>
                  <a href={child.href}>{child.label}</a>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

const NavUser = ({ user }: { user: UserData }) => {
  const initials = user.name.split(' ').map((n) => n[0]).join('');
  const avatar = (
    <Avatar className="size-8 rounded-md">
      <AvatarImage src={user.avatar} alt={user.name} />
      <AvatarFallback className="rounded-md">{initials}</AvatarFallback>
    </Avatar>
  );
  const info = (
    <div className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{user.name}</span>
      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
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
            <DropdownMenuItem>
              <User className="mr-2 size-4" aria-hidden /> Account
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 size-4" aria-hidden /> Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

const AppSidebar = () => (
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
        <SidebarLogo logo={sidebarData.logo} />
        <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
      </div>
    </SidebarHeader>
    <SidebarContent>
      <ScrollArea className="h-full">
        {sidebarData.navGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavMenuItem key={item.label} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </ScrollArea>
    </SidebarContent>
    <SidebarFooter>{sidebarData.user && <NavUser user={sidebarData.user} />}</SidebarFooter>
  </Sidebar>
);

// ============================================================================
// Header / nav
// ============================================================================

const DashboardHeader = () => (
  <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-4 sm:px-6">
    <SidebarTrigger className="md:hidden" />
    <div className="flex flex-1 items-center gap-3 self-stretch">
      <div className="flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
        <Radio className="size-3.5 shrink-0" aria-hidden />
        <span>Live</span>
        <Zap className="size-3.5 shrink-0 opacity-70" aria-hidden />
      </div>
      <form className="grid min-w-0 flex-1 grid-cols-1">
        <input
          name="search"
          type="search"
          placeholder="Search streams, regions, dashboards..."
          className="col-start-1 row-start-1 block size-full bg-transparent pl-8 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <Search aria-hidden className="pointer-events-none col-start-1 row-start-1 size-4 self-center text-muted-foreground" />
      </form>
    </div>
  </header>
);

const SecondaryNav = () => (
  <nav className="flex overflow-x-auto border-b border-border bg-background py-4">
    <ul className="flex min-w-full flex-none gap-x-6 px-4 text-sm/6 font-semibold text-muted-foreground sm:px-6">
      {secondaryNavigation.map((item) => (
        <li key={item.name}>
          <a href={item.href} className={item.current ? 'text-primary' : ''}>{item.name}</a>
        </li>
      ))}
    </ul>
  </nav>
);

const DashboardHeading = () => (
  <div className="border-b border-border px-4 py-4 sm:px-6">
    <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base/7">
      <span className="font-semibold text-foreground">Skinify Traffic</span>
      <span className="text-muted-foreground/60">/</span>
      <span className="font-semibold text-foreground">Live operations</span>
    </h1>
    <p className="mt-2 text-xs/6 text-muted-foreground">
      Real-time sessions, regional load, and page activity across skinify.gg
    </p>
  </div>
);

// ============================================================================
// KPI cards
// ============================================================================

const LiveKPI = ({ title, value, compact }: { title: string; value: number; compact?: boolean }) => (
  <div className="flex h-full flex-col gap-2 border-b border-border bg-card px-4 py-6 sm:px-6">
    <div className="flex items-center gap-2">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-600/45 dark:bg-emerald-400/35" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
      </span>
      <span className="text-xs text-muted-foreground">{title}</span>
    </div>
    <span className={cn(jetBrainsMono.className, 'text-2xl font-semibold tabular-nums')}>
      {compact ? compactNumberFormatter.format(value) : numberFormatter.format(value)}
    </span>
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Activity className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden />
      <span>Streaming</span>
    </div>
  </div>
);

const StaticKPI = ({ title, value, sub }: { title: string; value: string; sub?: string }) => (
  <div className="flex h-full flex-col gap-2 border-b border-border bg-card px-4 py-6 sm:px-6">
    <span className="text-xs text-muted-foreground">{title}</span>
    <span className={cn(jetBrainsMono.className, 'text-2xl font-semibold')}>{value}</span>
    {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
  </div>
);

const KPIRow = ({ activeNow, eventsPerMin, pageViewsToday, uniqueToday }: { activeNow: number; eventsPerMin: number; pageViewsToday: number; uniqueToday: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 [&>*]:border-r [&>*]:border-border [&>*:last-child]:border-r-0">
    <LiveKPI title="Active sessions" value={activeNow} />
    <LiveKPI title="Events per minute" value={eventsPerMin} compact />
    <StaticKPI title="Page views today" value={numberFormatter.format(pageViewsToday)} sub="since midnight" />
    <StaticKPI title="Unique visitors today" value={numberFormatter.format(uniqueToday)} sub="distinct sessions" />
  </div>
);

// ============================================================================
// Sessions map
// ============================================================================

const PALETTE = ['#8B49F2', '#B587FF', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

const SessionsMap = ({ countries }: { countries: GeoCountry[] }) => {
  const [active, setActive] = React.useState<string | null>(null);
  const maxUsers = Math.max(1, ...countries.map((c) => c.users));
  return (
    <div className="flex h-full min-w-0 flex-col gap-4 bg-card p-4 sm:gap-5 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Global live map</span>
            <span className="flex items-center gap-1 border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
              Live
            </span>
          </div>
          <span className={cn(jetBrainsMono.className, 'text-2xl font-semibold tabular-nums')}>
            {numberFormatter.format(countries.reduce((s, c) => s + c.users, 0))}
          </span>
          <p className="text-xs text-muted-foreground">Concurrent sessions by region, last 24h</p>
        </div>
      </div>
      <div className="relative w-full flex-1 min-h-[min(48vh,480px)] overflow-hidden rounded-lg">
        <Map center={MAP_DEFAULT_CENTER} zoom={1.1} minZoom={0.75} maxZoom={8} dragRotate={false} pitchWithRotate={false} className="size-full">
          <MapControls position="bottom-right" showZoom />
          {countries.map((c, i) => {
            const ratio = c.users / maxUsers;
            const px = 10 + ratio * 22;
            const color = PALETTE[i % PALETTE.length];
            const isActive = active === c.iso2;
            return (
              <MapMarker
                key={c.iso2}
                longitude={c.lng}
                latitude={c.lat}
                anchor="center"
                onMouseEnter={() => setActive(c.iso2)}
                onMouseLeave={() => setActive(null)}
              >
                <MarkerContent className="flex items-center justify-center">
                  <span
                    className="block rounded-full border-2 border-background shadow-md ring-2 ring-background/70 transition-all duration-200 motion-safe:animate-pulse"
                    style={{ width: px, height: px, backgroundColor: color, opacity: isActive ? 0.95 : 0.78 }}
                  />
                </MarkerContent>
                <MarkerTooltip className="min-w-40 border border-border bg-popover p-2.5 text-popover-foreground shadow-lg">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-medium text-foreground"><span className="mr-1">{c.flag}</span>{c.name}</div>
                    <span className={cn(jetBrainsMono.className, 'text-sm font-semibold text-foreground tabular-nums')}>
                      {numberFormatter.format(c.users)} sessions
                    </span>
                  </div>
                </MarkerTooltip>
              </MapMarker>
            );
          })}
        </Map>
        {countries.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center text-muted-foreground text-sm text-center px-6 pointer-events-none">
            No geo-tagged sessions in the last 24h — visitors get located automatically as they browse.
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Sessions by country list
// ============================================================================

const CountryList = ({ countries }: { countries: GeoCountry[] }) => {
  const total = countries.reduce((s, c) => s + c.users, 0) || 1;
  const maxUsers = Math.max(1, ...countries.map((c) => c.users));
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 bg-card p-4 sm:gap-5 sm:p-5">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Active sessions by country</span>
        <span className={cn(jetBrainsMono.className, 'text-2xl font-semibold tabular-nums sm:text-3xl')}>
          {numberFormatter.format(total)}
          <span className="text-lg font-medium text-muted-foreground sm:text-xl"> sessions</span>
        </span>
        <span className="text-xs text-muted-foreground">Distinct sessions · last 24h</span>
      </div>
      <div className="-mx-4 flex flex-col sm:-mx-5">
        {countries.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">No geo data yet.</div>
        ) : (
          countries.slice(0, 12).map((c, rank) => {
            const share = c.users / maxUsers;
            const pct = (c.users / total) * 100;
            return (
              <div key={c.iso2} className="flex items-center gap-3 px-4 py-1.5 sm:px-5">
                <span className="text-lg leading-none">{c.flag}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{c.name}</span>
                    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                      {rank === 0 && <span className="text-[10px] font-medium tracking-wide text-emerald-700 uppercase dark:text-emerald-500">TOP</span>}
                      <span className={cn(jetBrainsMono.className, 'text-sm font-semibold text-foreground tabular-nums')}>{numberFormatter.format(c.users)}</span>
                      <span className={cn(jetBrainsMono.className, 'text-sm font-medium text-muted-foreground tabular-nums w-12 text-right')}>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="relative mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/50 transition-[width] duration-300" style={{ width: `${share * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Live event stream
// ============================================================================

function LiveStream({ events }: { events: LiveEvent[] }) {
  const tone = {
    ok: 'border-emerald-500/25 text-emerald-700 bg-emerald-500/10 dark:text-emerald-400',
    warn: 'border-amber-500/25 text-amber-800 bg-amber-500/10 dark:text-amber-400',
    info: 'border-sky-500/25 text-sky-800 bg-sky-500/10 dark:text-sky-400',
  };
  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-4 sm:px-5">
        <h2 className="text-sm font-medium text-foreground">Live signal stream</h2>
        <span className="text-xs text-muted-foreground">Streaming</span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <ul className="flex h-full flex-col divide-y divide-border">
          {events.length === 0 ? (
            <li className="flex flex-1 items-center justify-center px-4 py-8 text-sm text-muted-foreground">No recent events.</li>
          ) : (
            events.map((e, i) => (
              <li key={e.id} className="flex min-h-20 flex-none flex-col justify-center px-4 py-3 sm:px-5">
                <motion.div
                  key={e.id}
                  initial={i === 0 ? { opacity: 0 } : false}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6 }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase', tone[e.tone])}>{e.tone}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">{e.ago}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground capitalize">{e.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate">{e.detail}</p>
                </motion.div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// Main
// ============================================================================

const DashboardContent = () => {
  const { activeNow, eventsPerMin, pageViewsToday, uniqueToday, countries, liveEvents } = useTrafficData();
  return (
    <main className="flex w-full flex-1 flex-col bg-card">
      <DashboardHeading />
      <KPIRow activeNow={activeNow} eventsPerMin={eventsPerMin} pageViewsToday={pageViewsToday} uniqueToday={uniqueToday} />
      <div className="grid lg:grid-cols-12 lg:items-stretch">
        <div className="flex min-h-0 flex-col border-b border-border lg:col-span-8 lg:border-r">
          <SessionsMap countries={countries} />
        </div>
        <div className="flex min-h-0 flex-col border-b border-border lg:col-span-4">
          <LiveStream events={liveEvents} />
        </div>
      </div>
      <div className="grid lg:grid-cols-2">
        <div className="border-b border-border lg:border-r">
          <CountryList countries={countries} />
        </div>
        <div className="border-b border-border">
          <LiveStream events={liveEvents} />
        </div>
      </div>
    </main>
  );
};

export default function TrafficDashboard() {
  return (
    <div className="dashboard13-scope">
      <TooltipProvider>
        <SidebarProvider className="bg-sidebar" style={{ '--sidebar-width': '18rem' } as React.CSSProperties}>
          <AppSidebar />
          <div className="h-svh w-full overflow-auto bg-background text-foreground">
            <DashboardHeader />
            <SecondaryNav />
            <DashboardContent />
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </div>
  );
}
