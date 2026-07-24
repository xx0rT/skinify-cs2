import * as React from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn } from '@/lib/utils';

/*
  Minimal mapcn-style wrapper over maplibre-gl — provides just the API
  the Dashboard13 traffic view consumes: <Map>, <MapControls>,
  <MapMarker> with <MarkerContent> / <MarkerTooltip> children.

  Uses a free, keyless raster basemap (CARTO dark-matter / positron
  tiles, {s}.basemaps.cartocdn) — no Mapbox token needed. The style is
  swapped on light/dark theme. Markers are real maplibre Markers whose
  DOM element is a React portal, so hover tooltips and click handlers
  work like normal React.
*/

const MapCtx = React.createContext<maplibregl.Map | null>(null);

function tilesFor(dark: boolean) {
  const base = dark
    ? 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
    : 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
  return {
    version: 8 as const,
    sources: {
      carto: {
        type: 'raster' as const,
        tiles: [base, base.replace('a.basemaps', 'b.basemaps'), base.replace('a.basemaps', 'c.basemaps')],
        tileSize: 256,
        attribution: '© OpenStreetMap © CARTO',
      },
    },
    layers: [{ id: 'carto', type: 'raster' as const, source: 'carto' }],
  };
}

export interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  center?: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  scrollZoom?: boolean;
  dragRotate?: boolean;
  pitchWithRotate?: boolean;
  doubleClickZoom?: boolean;
  onClick?: (e: any) => void;
}

export function Map({
  center = [0, 20],
  zoom = 1,
  minZoom,
  maxZoom,
  scrollZoom = true,
  dragRotate = false,
  pitchWithRotate = false,
  doubleClickZoom = true,
  className,
  children,
  onClick,
  ...rest
}: MapProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [map, setMap] = React.useState<maplibregl.Map | null>(null);
  const dark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';

  React.useEffect(() => {
    if (!containerRef.current) return;
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: tilesFor(dark) as any,
      center,
      zoom,
      minZoom,
      maxZoom,
      attributionControl: false,
      dragRotate,
      pitchWithRotate,
      doubleClickZoom,
    });
    if (!scrollZoom) m.scrollZoom.disable();
    if (onClick) m.on('click', onClick);
    m.on('load', () => setMap(m));
    return () => m.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)} {...rest}>
      {map && <MapCtx.Provider value={map}>{children}</MapCtx.Provider>}
    </div>
  );
}

export function MapControls({
  position = 'bottom-right',
  showZoom = true,
}: {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showZoom?: boolean;
}) {
  const map = React.useContext(MapCtx);
  React.useEffect(() => {
    if (!map || !showZoom) return;
    const ctrl = new maplibregl.NavigationControl({ showCompass: false });
    map.addControl(ctrl, position);
    return () => {
      try { map.removeControl(ctrl); } catch { /* map already gone */ }
    };
  }, [map, position, showZoom]);
  return null;
}

interface MarkerInternal {
  el: HTMLDivElement;
  tooltipEl: HTMLDivElement | null;
}

export function MapMarker({
  longitude,
  latitude,
  anchor = 'center',
  onClick,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  longitude: number;
  latitude: number;
  anchor?: maplibregl.PositionAnchor;
  onClick?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children?: React.ReactNode;
}) {
  const map = React.useContext(MapCtx);
  const [refs, setRefs] = React.useState<MarkerInternal | null>(null);

  React.useEffect(() => {
    if (!map) return;
    const el = document.createElement('div');
    el.style.cursor = onClick ? 'pointer' : 'default';
    const marker = new maplibregl.Marker({ element: el, anchor }).setLngLat([longitude, latitude]).addTo(map);
    const tooltipEl = document.createElement('div');
    setRefs({ el, tooltipEl });
    return () => {
      marker.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, longitude, latitude]);

  const [hovered, setHovered] = React.useState(false);

  if (!refs) return null;

  // split children into content vs tooltip
  let content: React.ReactNode = null;
  let tooltip: React.ReactNode = null;
  React.Children.forEach(children, (child: any) => {
    if (!child) return;
    if (child.type === MarkerTooltip) tooltip = child;
    else content = child;
  });

  return (
    <>
      {createPortalInto(
        refs.el,
        <div
          onClick={onClick}
          onMouseEnter={() => { setHovered(true); onMouseEnter?.(); }}
          onMouseLeave={() => { setHovered(false); onMouseLeave?.(); }}
          className="relative"
        >
          {content}
          {hovered && tooltip ? (
            <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-1.5">{tooltip}</div>
          ) : null}
        </div>,
      )}
    </>
  );
}

export function MarkerContent({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

export function MarkerTooltip({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn('rounded-md', className)}>{children}</div>;
}

/* Tiny portal helper so a React subtree renders inside a maplibre
   marker's plain DOM element. */
import { createPortal } from 'react-dom';
function createPortalInto(el: HTMLElement, node: React.ReactNode) {
  return createPortal(node, el);
}
