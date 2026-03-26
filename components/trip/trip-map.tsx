'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { loadAmapJs } from '@/lib/trip/amap-js';
import { Stop } from '@/lib/trip/types';

type TripMapProps = {
  stops: Stop[];
  mapProvider: 'amap' | 'google' | 'mapbox';
  selectedStopId?: string;
  onStopSelect?: (id: string) => void;
};

const DAY_COLORS = [
  '#0f172a', // day 1 — slate
  '#2563eb', // day 2 — blue
  '#16a34a', // day 3 — green
  '#dc2626', // day 4 — red
  '#d97706', // day 5 — amber
  '#7c3aed', // day 6 — violet
  '#0891b2', // day 7 — cyan
];

function dayColor(day: number) {
  return DAY_COLORS[(day - 1) % DAY_COLORS.length];
}

function hasRenderableStops(stops: Stop[]) {
  return stops.some((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
}

function hasWebGLSupport() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl'),
    );
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
  // Update label content to reflect active/inactive state (AMap v2 compatible).
  try {
    marker.setLabel({
      content: buildLabelContent(idx, color, active),
      offset: new AMap.Pixel(0, -20),
    });
  } catch {
    // AMap may not support setLabel — silently ignore.
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
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng))
      .map((s) => ({
        id: s.id,
        title: s.title,
        lng: s.lng,
        lat: s.lat,
        day: s.day,
      }));
  }, [stops]);

  useEffect(() => {
    function handleSdkRuntimeError(event: ErrorEvent) {
      const message = event?.message ?? '';
      if (!message.includes('Unimplemented type: 3')) return;

      setLoadError('AMap JS SDK 当前环境渲染异常，已自动降级。请稍后刷新重试或更换浏览器。');
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
      setLoadError('当前仅支持 AMap JS 预览，切换到 amap 可显示地图。');
      return;
    }

    if (!amapKey) {
      setLoadError('缺少 NEXT_PUBLIC_AMAP_JS_KEY，无法加载地图。');
      return;
    }

    if (!mapElRef.current) return;

    if (!hasWebGLSupport()) {
      setLoadError('当前运行环境缺少 WebGL，AMap 2.0 容易触发渲染错误。请改用 Chrome/Edge 最新版。');
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

          // Some environments may fail when attaching default controls.
          try {
            if (typeof AMap.Scale === 'function') {
              mapRef.current.addControl(new AMap.Scale());
            }
          } catch {
            // Keep the map usable even if a control fails to initialize.
          }
        }

        setLoadError(null);
      })
      .catch((err) => {
        if (!destroyed) {
          setLoadError(err instanceof Error ? err.message : '地图加载失败');
        }
      });

    return () => {
      destroyed = true;
    };
  }, [amapKey, mapProvider]);

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

    // Group stops by day — each day gets its own coloured polyline
    const dayGroups = new Map<number, (typeof routePoints)[number][]>();
    for (const p of routePoints) {
      const g = dayGroups.get(p.day) ?? [];
      g.push(p);
      dayGroups.set(p.day, g);
    }

    let globalIdx = 0;
    const allOverlays: any[] = [];

    for (const [day, pts] of dayGroups) {
      const color = dayColor(day);

      for (const p of pts) {
        const idx = globalIdx++;
        const marker = new AMap.Marker({
          position: [p.lng, p.lat],
          title: `${idx + 1}. ${p.title}`,
          label: {
            content: buildLabelContent(idx, color, false),
            offset: new AMap.Pixel(0, -20),
          },
        });
        if (onStopSelect) {
          marker.on('click', () => onStopSelect(p.id));
        }
        markerMetaRef.current.set(p.id, { marker, color, idx });
        allOverlays.push(marker);
      }

      if (pts.length > 1) {
        const polyline = new AMap.Polyline({
          path: pts.map((p) => [p.lng, p.lat]),
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

  // Highlight the selected marker via label update (AMap v2 compatible)
  useEffect(() => {
    const map = mapRef.current;
    const AMap = (window as any).AMap;
    if (!map || !AMap) return;

    let selectedPos: [number, number] | null = null;
    for (const [id, meta] of markerMetaRef.current) {
      const active = id === selectedStopId;
      applyMarkerActiveState(meta, active, AMap);

      if (active && typeof meta.marker?.getPosition === 'function') {
        const pos = meta.marker.getPosition();
        // AMap v2 LngLat: .lng / .lat
        const lng = pos?.lng ?? pos?.getLng?.();
        const lat = pos?.lat ?? pos?.getLat?.();
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

  return (
    <div className="rounded-2xl border p-4">
      <div className="mb-3 font-medium">地图预览</div>
      {loadError ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          {loadError}
        </div>
      ) : null}
      <div ref={mapElRef} className="h-[420px] w-full overflow-hidden rounded-xl bg-slate-100" />
    </div>
  );
}
