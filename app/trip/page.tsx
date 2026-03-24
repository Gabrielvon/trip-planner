'use client';

import { useMemo, useState } from 'react';
import {
  BackendOptimizedTrip,
  DataSource,
  MapProvider,
  Objective,
  ScheduleResult,
  Stop,
  TravelMode,
} from '@/lib/trip/types';
import {
  SAMPLE_TEXT,
  SEED_STOPS,
  buildMultiDaySchedule,
  groupByDay,
  optimizeMultiDay,
} from '@/lib/trip/mock';
import {
  getSourceLabel,
  navigationViaRouteOrMock,
  optimizeViaRouteOrMock,
  parseViaRouteOrMock,
} from '@/lib/trip/parse-client';

export default function TripPage() {
  const [tripText, setTripText] = useState(SAMPLE_TEXT);
  const [travelMode, setTravelMode] = useState<TravelMode>('transit');
  const [objective, setObjective] = useState<Objective>('fastest');
  const [mapProvider, setMapProvider] = useState<MapProvider>('amap');

  const [parsedStops, setParsedStops] = useState<Stop[]>(SEED_STOPS);
  const [optimizedStops, setOptimizedStops] = useState<Stop[]>(
    optimizeMultiDay(SEED_STOPS, 'transit', 'fastest', 'amap'),
  );
  const [schedule, setSchedule] = useState<ScheduleResult>(
    buildMultiDaySchedule(
      optimizeMultiDay(SEED_STOPS, 'transit', 'fastest', 'amap'),
      'transit',
      'amap',
    ),
  );

  const [navigationLinks, setNavigationLinks] = useState<Array<{ day: number; url: string }>>([]);
  const [runtimeSource, setRuntimeSource] = useState<DataSource>('mock');
  const [warningMessage, setWarningMessage] = useState(
    '当前默认使用 mock；接入真实 /api/trip/* 后会自动切到 API 模式。',
  );
  const [lastAction, setLastAction] = useState('已载入示例行程');
  const [backendOptimizedTrip, setBackendOptimizedTrip] =
    useState<BackendOptimizedTrip | null>(null);

  const [parseLoading, setParseLoading] = useState(false);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [navLoading, setNavLoading] = useState(false);

  const parsedDayMap = useMemo(() => groupByDay(parsedStops), [parsedStops]);
  const dayStops = useMemo(() => groupByDay(optimizedStops), [optimizedStops]);

  async function handleParse() {
    setParseLoading(true);
    setWarningMessage('');
    setLastAction('正在解析自然语言行程');

    try {
      const result = await parseViaRouteOrMock(tripText);
      setParsedStops(result.stops);
      setRuntimeSource(result.source);
      if (result.warning) setWarningMessage(result.warning);
      setLastAction(`解析完成（${getSourceLabel(result.source)}）`);
    } finally {
      setParseLoading(false);
    }
  }

  async function handleOptimize() {
    setOptimizeLoading(true);
    setWarningMessage('');
    setLastAction('正在执行分日优化');

    try {
      const result = await optimizeViaRouteOrMock(
        parsedStops,
        travelMode,
        objective,
        mapProvider,
      );
      setOptimizedStops(result.optimizedStops);
      setSchedule(result.schedule);
      setBackendOptimizedTrip(result.backendOptimizedTrip ?? null);
      setNavigationLinks([]);
      setRuntimeSource(result.source);
      if (result.warning) setWarningMessage(result.warning);
      setLastAction(`优化完成（${getSourceLabel(result.source)}）`);
    } finally {
      setOptimizeLoading(false);
    }
  }

  async function handleNavigation() {
    setNavLoading(true);
    setWarningMessage('');
    setLastAction('正在生成导航链接');

    try {
      const result = await navigationViaRouteOrMock(
        backendOptimizedTrip,
        optimizedStops,
        travelMode,
      );
      setNavigationLinks(result.links);
      setRuntimeSource(result.source);
      if (result.warning) setWarningMessage(result.warning);
      setLastAction(`导航链接已生成（${getSourceLabel(result.source)}）`);
    } finally {
      setNavLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-8 space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">行程安排工具</h1>
        <p className="text-sm text-slate-600">
          当前页面是一个薄壳。复杂逻辑已经拆到 lib/trip 下，别再把所有东西塞回 page.tsx。
        </p>
        <div className="text-sm text-slate-500">
          当前通道：{getSourceLabel(runtimeSource)} ｜ 当前状态：{lastAction}
        </div>
      </div>

      {warningMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {warningMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border p-4 space-y-3">
            <div className="font-medium">输入</div>
            <textarea
              className="w-full min-h-[220px] rounded-xl border p-3"
              value={tripText}
              onChange={(e) => setTripText(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                onClick={handleParse}
                disabled={parseLoading}
              >
                {parseLoading ? '解析中...' : '解析行程'}
              </button>
              <button
                className="rounded-xl border px-4 py-2"
                onClick={() => {
                  setTripText(SAMPLE_TEXT);
                  setLastAction('已重新载入示例行程');
                }}
              >
                载入示例
              </button>
            </div>
          </div>

          <div className="rounded-2xl border p-4 space-y-3">
            <div className="font-medium">参数</div>

            <div>
              <div className="mb-1 text-sm text-slate-600">出行方式</div>
              <select
                className="w-full rounded-xl border p-2"
                value={travelMode}
                onChange={(e) => setTravelMode(e.target.value as TravelMode)}
              >
                <option value="driving">驾车</option>
                <option value="walking">步行</option>
                <option value="cycling">骑行</option>
                <option value="transit">公共交通</option>
              </select>
            </div>

            <div>
              <div className="mb-1 text-sm text-slate-600">优化目标</div>
              <select
                className="w-full rounded-xl border p-2"
                value={objective}
                onChange={(e) => setObjective(e.target.value as Objective)}
              >
                <option value="fastest">用时最少</option>
                <option value="shortest">最顺路</option>
                <option value="balanced">平衡模式</option>
              </select>
            </div>

            <div>
              <div className="mb-1 text-sm text-slate-600">地图服务</div>
              <select
                className="w-full rounded-xl border p-2"
                value={mapProvider}
                onChange={(e) => setMapProvider(e.target.value as MapProvider)}
              >
                <option value="amap">高德地图</option>
                <option value="google">Google Maps</option>
                <option value="mapbox">Mapbox</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                onClick={handleOptimize}
                disabled={optimizeLoading}
              >
                {optimizeLoading ? '优化中...' : '执行优化'}
              </button>
              <button
                className="rounded-xl border px-4 py-2 disabled:opacity-50"
                onClick={handleNavigation}
                disabled={navLoading}
              >
                {navLoading ? '生成中...' : '生成导航'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border p-4 space-y-3">
            <div className="font-medium">解析结果</div>
            {Object.keys(parsedDayMap).map((dayKey) => {
              const day = Number(dayKey);
              const items = parsedDayMap[day];
              return (
                <div key={day} className="space-y-2">
                  <div className="text-sm font-medium">Day {day}</div>
                  {items.map((stop) => (
                    <div key={stop.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                      <div className="font-medium">{stop.title}</div>
                      <div className="text-slate-500">{stop.location}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border p-4">
            <div className="mb-3 font-medium">时间表</div>
            <div className="space-y-4">
              {schedule.days.map((daySchedule) => (
                <div key={daySchedule.day} className="space-y-2">
                  <div className="font-medium">Day {daySchedule.day}</div>
                  {daySchedule.timeline.map((item) => (
                    <div key={item.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>{item.title}</div>
                        <div className="text-slate-500">
                          {item.arrival} - {item.departure}
                        </div>
                      </div>
                      <div className="text-slate-500">{item.location}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="mb-3 font-medium">导航链接</div>
            <div className="space-y-3">
              {navigationLinks.length === 0 ? (
                <div className="text-sm text-slate-500">尚未生成</div>
              ) : (
                navigationLinks.map((item) => (
                  <div key={item.day} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="font-medium">Day {item.day}</div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-slate-600 underline"
                    >
                      {item.url}
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border p-4 text-sm text-slate-600">
            当前页面应该始终保持“薄”。  
            复杂逻辑继续放到 `lib/trip/*` 和 `app/api/trip/*`，别再把它们倒回这里。
          </div>
        </div>
      </div>
    </div>
  );
}