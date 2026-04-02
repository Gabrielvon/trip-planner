'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { loadAmapJs } from '@/lib/trip/amap-js';
import { DraftStop } from '@/lib/trip/types';

type TripMapProps = {
  stops: DraftStop[];
  mapProvider: 'amap' | 'google' | 'mapbox';
  selectedStopId?: string;
  onStopSelect?: (id: string) => void;
};

const DAY_COLORS = [
  '#0f172a',
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#d97706',
  '#7c3aed',
  '#0891b2',
];

function dayColor(day: number) {
  return DAY_COLORS[(day - 1) % DAY_COLORS.length];
}

function hasRenderableStops(stops: DraftStop[]) {
  return stops.some((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng));
}

function hasWebGLSupport() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

type MarkerMeta = { marker: any; color: string; idx: number };

function buildLabelContent(idx: number, color: string, active: boolean) {
  if (active) {
    return `<div style="padding:2px 8px;background:#fff;color:${color};border:2px solid ${color};border-radius:999px;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.25);">${idx + 1}</div>`;
  }
  return `<div style="padding:2px 6px;background:${color};color:#fff;border-radius:999px;font-size:11px;">${idx + 1}</div>`;
}

function applyMarkerActiveState(meta: MarkerMeta, active: boolean, AMap: any) {
  const { marker, color, idx } = meta;
  try {
    marker.setLabel({
      content: buildLabelContent(idx, color, active),
      offset: new AMap.Pixel(0, -20),
    });
  } catch {
    // Ignore label updates when the SDK does not support them.
  }
}

export default function TripMap({ stops, mapProvider, selectedStopId, onStopSelect }: TripMapProps) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const markerMetaRef = useRef<Map<string, MarkerMeta>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);

  const amapKey = process.env.NEXT_PUBLIC_AMAP_JS_KEY || process.env.NEXT_PUBLIC_AMAP_KEY;

  const routePoints = useMemo(() => {
    return stops
      .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng))
      .map((stop) => ({
        id: stop.id,
        title: stop.title,
        lng: stop.lng,
        lat: stop.lat,
        day: stop.day,
      }));
  }, [stops]);

  const renderableCount = routePoints.length;
  const unresolvedCount = Math.max(stops.length - renderableCount, 0);

  const googleEmbedUrl = useMemo(() => {
    if (routePoints.length === 0) return '';
    const first = routePoints[0];
    return `https://www.google.com/maps?q=${first.lat},${first.lng}&z=12&output=embed`;
  }, [routePoints]);

  useEffect(() => {
    function handleSdkRuntimeError(event: ErrorEvent) {
      const message = event?.message ?? '';
      if (message.includes('USERKEY_PLAT_NOMATCH')) {
        setLoadError(
          'AMap JS key does not match the current domain. Check the allowlist for NEXT_PUBLIC_AMAP_JS_KEY.',
        );
        return;
      }
      if (!message.includes('Unimplemented type: 3')) return;

      setLoadError(
        'AMap JS failed in this browser environment. Refresh or retry in a current Chrome or Edge build.',
      );
      if (mapRef.current) {
        try {
          mapRef.current.destroy();
        } catch {
          // Ignore destroy failures.
        }
        mapRef.current = null;
      }
    }

    window.addEventListener('error', handleSdkRuntimeError);
    return () => window.removeEventListener('error', handleSdkRuntimeError);
  }, []);

  useEffect(() => {
    if (mapProvider !== 'amap') {
      setLoadError(null);
      return;
    }

    if (!mapElRef.current) return;

    if (routePoints.length === 0) {
      setLoadError(null);
      return;
    }

    if (!amapKey) {
      setLoadError('Missing NEXT_PUBLIC_AMAP_JS_KEY. Live map preview is unavailable.');
      return;
    }

    if (!hasWebGLSupport()) {
      setLoadError(
        'This browser environment does not expose WebGL, so the AMap preview cannot load.',
      );
      return;
    }

    let destroyed = false;

    loadAmapJs(amapKey)
      .then((AMap) => {
        if (destroyed || !mapElRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new AMap.Map(mapElRef.current, {
            zoom: 11,
            center: [121.4737, 31.2304],
            viewMode: '2D',
            mapStyle: 'amap://styles/normal',
          });

          try {
            if (typeof AMap.Scale === 'function') {
              mapRef.current.addControl(new AMap.Scale());
            }
          } catch {
            // Keep the map usable even if a default control fails.
          }
        }

        setLoadError(null);
      })
      .catch((error) => {
        if (!destroyed) {
          setLoadError(error instanceof Error ? error.message : 'Map preview failed to load.');
        }
      });

    return () => {
      destroyed = true;
    };
  }, [amapKey, mapProvider, routePoints]);

  useEffect(() => {
    if (mapProvider === 'amap') return;
    if (mapRef.current) {
      try {
        mapRef.current.destroy();
      } catch {
        // Ignore destroy failures.
      }
      mapRef.current = null;
    }
    overlaysRef.current = [];
    markerMetaRef.current.clear();
  }, [mapProvider]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (overlaysRef.current.length > 0) {
      map.remove(overlaysRef.current);
      overlaysRef.current = [];
    }
    markerMetaRef.current.clear();

    if (!hasRenderableStops(stops)) return;

    const AMap = (window as any).AMap;
    if (!AMap) return;

    const dayGroups = new Map<number, (typeof routePoints)[number][]>();
    for (const point of routePoints) {
      const group = dayGroups.get(point.day) ?? [];
      group.push(point);
      dayGroups.set(point.day, group);
    }

    let globalIdx = 0;
    const allOverlays: any[] = [];

    for (const [day, points] of dayGroups) {
      const color = dayColor(day);

      for (const point of points) {
        const idx = globalIdx++;
        const marker = new AMap.Marker({
          position: [point.lng, point.lat],
          title: `${idx + 1}. ${point.title}`,
          label: {
            content: buildLabelContent(idx, color, false),
            offset: new AMap.Pixel(0, -20),
          },
        });
        if (onStopSelect) {
          marker.on('click', () => onStopSelect(point.id));
        }
        markerMetaRef.current.set(point.id, { marker, color, idx });
        allOverlays.push(marker);
      }

      if (points.length > 1) {
        const polyline = new AMap.Polyline({
          path: points.map((point) => [point.lng, point.lat]),
          strokeColor: color,
          strokeWeight: 4,
          strokeOpacity: 0.85,
          lineJoin: 'round',
          lineCap: 'round',
        });
        allOverlays.push(polyline);
      }
    }

    overlaysRef.current = allOverlays;
    map.add(allOverlays);
    map.setFitView(allOverlays, false, [40, 40, 40, 40]);
  }, [routePoints, stops, onStopSelect]);

  useEffect(() => {
    const map = mapRef.current;
    const AMap = (window as any).AMap;
    if (!map || !AMap) return;

    let selectedPos: [number, number] | null = null;
    for (const [id, meta] of markerMetaRef.current) {
      const active = id === selectedStopId;
      applyMarkerActiveState(meta, active, AMap);

      if (active && typeof meta.marker?.getPosition === 'function') {
        const position = meta.marker.getPosition();
        const lng = position?.lng ?? position?.getLng?.();
        const lat = position?.lat ?? position?.getLat?.();
        if (typeof lng === 'number' && typeof lat === 'number') {
          selectedPos = [lng, lat];
        }
      }
    }

    if (selectedPos && typeof map.panTo === 'function') {
      map.panTo(selectedPos);
    }
  }, [selectedStopId]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  function renderEmptyState(message: string) {
    return (
      <div className="flex h-[420px] w-full items-center justify-center rounded-xl bg-slate-100 px-6 text-center text-sm text-slate-500">
        {message}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-1 font-medium">Map preview</div>
      <div className="mb-3 text-xs text-slate-500">
        Draft rows need resolved coordinates before they can be previewed on the map.
      </div>

      {renderableCount > 0 ? (
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Showing {renderableCount} mapped {renderableCount === 1 ? 'stop' : 'stops'}.
          {unresolvedCount > 0
            ? ` ${unresolvedCount} draft ${unresolvedCount === 1 ? 'row still needs' : 'rows still need'} resolved coordinates, usually after live optimization.`
            : ' All current draft rows have map coordinates.'}
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {loadError}
        </div>
      ) : mapProvider === 'google' ? (
        googleEmbedUrl ? (
          <iframe
            className="h-[420px] w-full overflow-hidden rounded-xl bg-slate-100"
            src={googleEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          renderEmptyState(
            'No map preview yet. Run live parsing or optimization so the draft can resolve coordinates.',
          )
        )
      ) : mapProvider === 'amap' ? (
        renderableCount > 0 ? (
          <div ref={mapElRef} className="h-[420px] w-full overflow-hidden rounded-xl bg-slate-100" />
        ) : (
          renderEmptyState(
            'No map preview yet. Run live parsing or optimization so the draft can resolve coordinates.',
          )
        )
      ) : (
        renderEmptyState('Map preview is only available for AMap and Google right now.')
      )}
    </div>
  );
}
