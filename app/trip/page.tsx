'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BackendOptimizedTrip,
  DataSource,
  MapProvider,
  Objective,
  ScheduleResult,
  Stop,
  TravelMode,
} from '@/lib/trip/types';
import { StructuredStop } from '@/lib/trip/types';
import {
  SAMPLE_PRESETS,
  buildMultiDaySchedule,
  groupByDay,
  optimizeMultiDay,
  parseTripTextMock,
} from '@/lib/trip/mock';
import {
  getSourceLabel,
  navigationViaRouteOrMock,
  optimizeViaRouteOrMock,
  parseViaRouteOrMock,
} from '@/lib/trip/parse-client';
import TripMap from '@/components/trip/trip-map';
import StructuredForm from '@/components/trip/structured-form';
import FileImporter from '@/components/trip/file-importer';
import { structuredStopsToUiStops, uiStopsToStructuredStops } from '@/lib/trip/ui-mappers';

export default function TripPage() {
  const [tripText, setTripText] = useState('');
  const [travelMode, setTravelMode] = useState<TravelMode>('transit');
  const [objective, setObjective] = useState<Objective>('fastest');
  const [mapProvider, setMapProvider] = useState<MapProvider>('amap');

  const [parsedStops, setParsedStops] = useState<Stop[]>([]);
  const [optimizedStops, setOptimizedStops] = useState<Stop[]>([]);
  const [schedule, setSchedule] = useState<ScheduleResult>({
    days: [],
    totalMinutes: 0,
    totalTravel: 0,
    totalStay: 0,
  });

  const [navigationLinks, setNavigationLinks] = useState<Array<{ day: number; url: string }>>([]);
  const [runtimeSource, setRuntimeSource] = useState<DataSource>('mock');
  const [warningMessage, setWarningMessage] = useState('');
  const [lastAction, setLastAction] = useState('');
  const [backendOptimizedTrip, setBackendOptimizedTrip] =
    useState<BackendOptimizedTrip | null>(null);

  const [parseLoading, setParseLoading] = useState(false);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [optimizeSlow, setOptimizeSlow] = useState(false);
  const [navSlow, setNavSlow] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | undefined>(undefined);
  const [inputMode, setInputMode] = useState<'text' | 'structured' | 'file'>('text');
  const [samplePresetId, setSamplePresetId] = useState(SAMPLE_PRESETS[0].id);
  // Stops imported from file; bumping formRevision forces StructuredForm to reload
  const [formImportedStops, setFormImportedStops] = useState<StructuredStop[]>([]);
  const [formRevision, setFormRevision] = useState(0);

  const parsedDayMap = useMemo(() => groupByDay(parsedStops), [parsedStops]);
  const hasStarted =
    tripText.trim().length > 0 ||
    formImportedStops.length > 0 ||
    parsedStops.length > 0 ||
    optimizedStops.length > 0 ||
    navigationLinks.length > 0;

  function resetResults() {
    setParsedStops([]);
    setOptimizedStops([]);
    setSchedule({ days: [], totalMinutes: 0, totalTravel: 0, totalStay: 0 });
    setNavigationLinks([]);
    setBackendOptimizedTrip(null);
    setSelectedStopId(undefined);
  }

  function loadSamplePreset(targetInput: 'text' | 'structured') {
    const preset =
      SAMPLE_PRESETS.find((item) => item.id === samplePresetId) || SAMPLE_PRESETS[0];
    setMapProvider(preset.provider);
    setWarningMessage('');
    resetResults();

    if (targetInput === 'text') {
      setTripText(preset.text);
      setLastAction(`已载入示例：${preset.label}`);
      return;
    }

    const stops = parseTripTextMock(preset.text);
    const rows = uiStopsToStructuredStops(stops);
    setFormImportedStops(rows);
    setFormRevision((r) => r + 1);
    setLastAction(`已载入结构化示例：${preset.label}`);
  }

  useEffect(() => {
    if (!optimizeLoading) {
      setOptimizeSlow(false);
      return;
    }
    const timer = setTimeout(() => setOptimizeSlow(true), 1200);
    return () => clearTimeout(timer);
  }, [optimizeLoading]);

  useEffect(() => {
    if (!navLoading) {
      setNavSlow(false);
      return;
    }
    const timer = setTimeout(() => setNavSlow(true), 1200);
    return () => clearTimeout(timer);
  }, [navLoading]);

  async function handleParse() {
    setParseLoading(true);
    setWarningMessage('');
    setLastAction('正在解析自然语言行程');

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
      const result = await parseViaRouteOrMock(tripText, { timezone, mapProvider });
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
        mapProvider,
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
    <div className="mx-auto max-w-7xl p-6 lg:p-8 space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">行程安排工具</h1>
        <p className="text-sm text-slate-600">
          当前页面是一个薄壳。复杂逻辑已经拆到 lib/trip 下，别再把所有东西塞回 page.tsx。
        </p>
        {lastAction && (
          <div className="text-sm text-slate-500">
            当前通道：{getSourceLabel(runtimeSource)} ｜ 当前状态：{lastAction}
          </div>
        )}
      </div>

      {warningMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {warningMessage}
        </div>
      )}

      <div className={`grid gap-6 ${hasStarted ? 'lg:grid-cols-[minmax(500px,560px)_minmax(0,1fr)]' : 'lg:grid-cols-1'}`}>
        <div className="space-y-4">
          <div className="rounded-2xl border p-4 space-y-3">
            {/* Input mode tabs */}
            <div className="flex rounded-xl border overflow-hidden">
              <button
                className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                  inputMode === 'text'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                onClick={() => setInputMode('text')}
              >
                自然语言
              </button>
              <button
                className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                  inputMode === 'structured'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                onClick={() => setInputMode('structured')}
              >
                结构化表单
              </button>
              <button
                className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                  inputMode === 'file'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                onClick={() => setInputMode('file')}
              >
                文件导入
              </button>
            </div>

            {inputMode === 'text' ? (
              <>
                <textarea
                  className="w-full min-h-[220px] rounded-xl border p-3"
                  value={tripText}
                  onChange={(e) => setTripText(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="rounded-xl border p-2"
                    value={samplePresetId}
                    onChange={(e) => setSamplePresetId(e.target.value)}
                  >
                    {SAMPLE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                    onClick={handleParse}
                    disabled={parseLoading || !tripText.trim()}
                  >
                    {parseLoading ? '解析中...' : '解析行程'}
                  </button>
                  <button
                    className="rounded-xl border px-4 py-2"
                    onClick={() => {
                      loadSamplePreset('text');
                    }}
                  >
                    载入示例
                  </button>
                </div>
              </>
            ) : inputMode === 'structured' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="rounded-xl border p-2"
                    value={samplePresetId}
                    onChange={(e) => setSamplePresetId(e.target.value)}
                  >
                    {SAMPLE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-xl border px-4 py-2"
                    onClick={() => loadSamplePreset('structured')}
                  >
                    载入示例到表单
                  </button>
                </div>
                <StructuredForm
                  key={formRevision}
                  stops={formImportedStops.length > 0 ? formImportedStops : undefined}
                  onApply={(rows) => {
                    const stops = structuredStopsToUiStops(rows);
                    setParsedStops(stops);
                    setRuntimeSource('mock');
                    setLastAction(`已从结构化表单导入 ${stops.length} 个地点，请执行优化`);
                    setWarningMessage('');
                    setNavigationLinks([]);
                  }}
                />
              </>
            ) : (
              <FileImporter
                onToForm={(rows) => {
                  setFormImportedStops(rows);
                  setFormRevision((r) => r + 1);
                  setInputMode('structured');
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
              onClick={handleOptimize}
              disabled={optimizeLoading || parsedStops.length === 0}
            >
              {optimizeLoading ? '优化中...' : '执行优化'}
            </button>
            <button
              className="rounded-xl border px-4 py-2 disabled:opacity-50"
              onClick={handleNavigation}
              disabled={navLoading || optimizeLoading || optimizedStops.length === 0}
            >
              {navLoading ? '生成中...' : '生成导航'}
            </button>
          </div>

          {(optimizeLoading || navLoading) && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-blue-300 border-t-blue-700 animate-spin" />
              <span>
                {optimizeLoading
                  ? optimizeSlow
                    ? '优化仍在进行中，可能正在请求地图/地理编码服务，请稍候...'
                    : '正在执行优化，请稍候...'
                  : navSlow
                  ? '导航链接生成较慢，可能在等待服务响应，请稍候...'
                  : '正在生成导航链接，请稍候...'}
              </span>
            </div>
          )}

          {parsedStops.length > 0 && (
          <div className="rounded-2xl border p-4 space-y-3">
            <div className="font-medium">解析结果</div>
            {Object.keys(parsedDayMap).map((dayKey) => {
              const day = Number(dayKey);
              const items = parsedDayMap[day];
              const dayDate = items.find((s) => s.date)?.date;
              return (
                <div key={day} className="space-y-2">
                  <div className="text-sm font-medium">
                    Day {day}
                    {dayDate ? ` · ${dayDate}` : ''}
                  </div>
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
          )}
        </div>

        {hasStarted && (
        <div className="space-y-6">
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
          </div>

          <div className="rounded-2xl border p-4">
            <div className="mb-3 font-medium">时间表</div>
            <div className="space-y-4">
              {schedule.days.map((daySchedule) => (
                <div key={daySchedule.day} className="space-y-2">
                  <div className="font-medium">
                    Day {daySchedule.day}
                    {daySchedule.timeline.find((s) => s.date)?.date
                      ? ` · ${daySchedule.timeline.find((s) => s.date)?.date}`
                      : ''}
                  </div>
                  {daySchedule.timeline.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl p-3 text-sm cursor-pointer transition-colors ${
                        selectedStopId === item.id
                          ? 'bg-slate-200 ring-2 ring-slate-400'
                          : 'bg-slate-50 hover:bg-slate-100'
                      }`}
                      onClick={() =>
                        setSelectedStopId((prev) => (prev === item.id ? undefined : item.id))
                      }
                    >
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

          <TripMap
            stops={optimizedStops}
            mapProvider={mapProvider}
            selectedStopId={selectedStopId}
            onStopSelect={(id) => setSelectedStopId((prev) => (prev === id ? undefined : id))}
          />

        </div>
        )}
      </div>
    </div>
  );
}
