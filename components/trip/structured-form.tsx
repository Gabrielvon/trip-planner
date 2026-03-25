'use client';

import { useState, useMemo } from 'react';
import { StructuredStop } from '@/lib/trip/types';

// Per-day start / end configuration
type DayEndpoint = {
  startTitle: string;
  startLocation: string;
  startTime: string;
  endTitle: string;
  endLocation: string;
  hasEnd: boolean;
};

const CATEGORIES: { value: StructuredStop['category']; label: string }[] = [
  { value: 'sightseeing', label: '观光' },
  { value: 'meal', label: '餐饮' },
  { value: 'meeting', label: '会议' },
  { value: 'hotel', label: '住宿' },
  { value: 'transport', label: '交通' },
  { value: 'custom', label: '自定义' },
];

function makeId() {
  return `sf-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyStop(day: number): StructuredStop {
  return {
    id: makeId(),
    day,
    title: '',
    location: '',
    durationMin: 90,
    category: 'sightseeing',
  };
}

function emptyEndpoint(): DayEndpoint {
  return {
    startTitle: '',
    startLocation: '',
    startTime: '',
    endTitle: '',
    endLocation: '',
    hasEnd: false,
  };
}

type Props = {
  stops?: StructuredStop[];   // allow pre-populating from file importer
  onApply: (stops: StructuredStop[]) => void;
};

export default function StructuredForm({ stops: initialStops, onApply }: Props) {
  const [stops, setStops] = useState<StructuredStop[]>(
    initialStops ?? [emptyStop(1), emptyStop(1)],
  );
  const [endpoints, setEndpoints] = useState<Record<number, DayEndpoint>>({});

  const uniqueDays = useMemo(
    () => [...new Set(stops.map((s) => s.day))].sort((a, b) => a - b),
    [stops],
  );

  const maxDay = Math.max(...stops.map((s) => s.day), 1);
  const dayOptions = Array.from({ length: maxDay + 1 }, (_, i) => i + 1);

  function addStop() {
    const lastDay = stops[stops.length - 1]?.day ?? 1;
    setStops((prev) => [...prev, emptyStop(lastDay)]);
  }

  function removeStop(id: string) {
    if (stops.length <= 1) return;
    setStops((prev) => prev.filter((s) => s.id !== id));
  }

  function updateStop(id: string, patch: Partial<StructuredStop>) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function getEndpoint(day: number): DayEndpoint {
    return endpoints[day] ?? emptyEndpoint();
  }

  function updateEndpoint(day: number, patch: Partial<DayEndpoint>) {
    setEndpoints((prev) => ({ ...prev, [day]: { ...getEndpoint(day), ...patch } }));
  }

  const hasContent = stops.some((s) => s.title.trim());

  function handleApply() {
    const result: StructuredStop[] = [];

    // For each day, inject start → stops → end (optional)
    for (const day of uniqueDays) {
      const ep = getEndpoint(day);
      const dayStops = stops.filter((s) => s.day === day && s.title.trim());
      const dayDate = dayStops.map((s) => s.date).find((d): d is string => Boolean(d));

      if (ep.startTitle.trim()) {
        result.push({
          id: `ep-start-d${day}`,
          day,
          date: dayDate,
          title: ep.startTitle.trim(),
          location: ep.startLocation.trim() || ep.startTitle.trim(),
          durationMin: 10,
          category: 'transport',
          earliestStart: ep.startTime || undefined,
          fixedOrder: true,
        });
      }

      result.push(...dayStops);

      if (ep.hasEnd && ep.endTitle.trim()) {
        result.push({
          id: `ep-end-d${day}`,
          day,
          date: dayDate,
          title: ep.endTitle.trim(),
          location: ep.endLocation.trim() || ep.endTitle.trim(),
          durationMin: 10,
          category: 'transport',
          fixedOrder: true,
        });
      }
    }

    onApply(result);
  }

  return (
    <div className="space-y-4">
      {/* ── Per-day start / end ─────────────────────────────────── */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-500">每日出发地 / 返回地</div>
        <div className="grid gap-2 md:grid-cols-2">
          {uniqueDays.map((day) => {
            const ep = getEndpoint(day);
            return (
              <div key={day} className="rounded-xl border bg-slate-50 p-3 space-y-2">
                <div className="text-xs font-semibold text-slate-700">Day {day}</div>

                {/* Start row */}
                <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1.3fr_96px] gap-1.5">
                  <input
                    type="text"
                    placeholder="出发地名称"
                    className="rounded-lg border bg-white px-2 py-2 text-xs w-full"
                    value={ep.startTitle}
                    onChange={(e) => updateEndpoint(day, { startTitle: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="出发地地址（可省）"
                    className="rounded-lg border bg-white px-2 py-2 text-xs w-full"
                    value={ep.startLocation}
                    onChange={(e) => updateEndpoint(day, { startLocation: e.target.value })}
                  />
                  <input
                    type="time"
                    className="rounded-lg border bg-white px-2 py-2 text-xs w-full"
                    value={ep.startTime}
                    onChange={(e) => updateEndpoint(day, { startTime: e.target.value })}
                  />
                </div>

                {/* End toggle + row */}
                <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={ep.hasEnd}
                    onChange={(e) => updateEndpoint(day, { hasEnd: e.target.checked })}
                    className="rounded"
                  />
                  设置返回地
                </label>

                {ep.hasEnd && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      placeholder="返回地名称"
                      className="rounded-lg border bg-white px-2 py-2 text-xs w-full"
                      value={ep.endTitle}
                      onChange={(e) => updateEndpoint(day, { endTitle: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="返回地地址（可省）"
                      className="rounded-lg border bg-white px-2 py-2 text-xs w-full"
                      value={ep.endLocation}
                      onChange={(e) => updateEndpoint(day, { endLocation: e.target.value })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stop list ───────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-xl border p-2">
        <div className="min-w-[900px] space-y-1.5">
          <div className="grid grid-cols-[72px_132px_1.1fr_1.3fr_104px_80px_100px_28px] gap-1.5 px-1 text-xs text-slate-400 font-medium">
            <span>天</span>
            <span>日期</span>
            <span>地点名称</span>
            <span>地址 / 区域</span>
            <span>到达时间</span>
            <span>时长(分)</span>
            <span>类型</span>
            <span />
          </div>

          {stops.map((stop) => (
            <div
              key={stop.id}
              className="grid grid-cols-[72px_132px_1.1fr_1.3fr_104px_80px_100px_28px] gap-1.5 items-start"
            >
          {/* Day */}
          <select
            className="rounded-lg border px-2 py-2 text-xs w-full"
            value={stop.day}
            onChange={(e) => updateStop(stop.id, { day: Number(e.target.value) })}
          >
            {dayOptions.map((d) => (
              <option key={d} value={d}>
                D{d}
              </option>
            ))}
          </select>

          {/* Date */}
          <input
            type="date"
            className="rounded-lg border px-2 py-2 text-xs w-full"
            value={stop.date ?? ''}
            onChange={(e) => updateStop(stop.id, { date: e.target.value || undefined })}
          />

          {/* Title */}
          <input
            type="text"
            placeholder="浅草寺"
            className="rounded-lg border px-2 py-2 text-xs w-full"
            value={stop.title}
            onChange={(e) => updateStop(stop.id, { title: e.target.value })}
          />

          {/* Location */}
          <input
            type="text"
            placeholder="东京都台东区"
            className="rounded-lg border px-2 py-2 text-xs w-full"
            value={stop.location}
            onChange={(e) => updateStop(stop.id, { location: e.target.value })}
          />

          {/* Earliest arrival */}
          <input
            type="time"
            className="rounded-lg border px-2 py-2 text-xs w-full"
            value={stop.earliestStart ?? ''}
            onChange={(e) =>
              updateStop(stop.id, { earliestStart: e.target.value || undefined })
            }
          />

          {/* Duration */}
          <input
            type="number"
            min={5}
            max={480}
            step={5}
            className="rounded-lg border px-2 py-2 text-xs w-full"
            value={stop.durationMin}
            onChange={(e) =>
              updateStop(stop.id, { durationMin: Math.max(5, Number(e.target.value)) })
            }
          />

          <select
            className="rounded-lg border px-2 py-2 text-xs w-full"
            value={stop.category}
            onChange={(e) =>
              updateStop(stop.id, { category: e.target.value as StructuredStop['category'] })
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Remove */}
          <button
            type="button"
            onClick={() => removeStop(stop.id)}
            disabled={stops.length <= 1}
            className="mt-1 text-slate-300 hover:text-red-400 disabled:opacity-30 text-lg leading-none"
            title="删除"
          >
            ×
          </button>
            </div>
          ))}
        </div>
      </div>

      {/* Category / notes secondary row */}
      <div className="space-y-1">
        {stops.map((stop, idx) => (
          <div key={stop.id} className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-[72px] shrink-0 text-right text-slate-300">#{idx + 1}</span>
            <input
              type="text"
              placeholder="备注（可选）"
              className="flex-1 rounded-lg border px-2 py-1 text-xs"
              value={stop.notes ?? ''}
              onChange={(e) =>
                updateStop(stop.id, { notes: e.target.value || undefined })
              }
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={addStop}
          className="flex-1 rounded-xl border-2 border-dashed py-2 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700"
        >
          + 添加地点
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!hasContent}
          className="flex-1 rounded-xl bg-slate-900 py-2 text-xs text-white disabled:opacity-40"
        >
          应用到行程 →
        </button>
      </div>
    </div>
  );
}
