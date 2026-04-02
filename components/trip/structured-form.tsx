'use client';

import { useMemo, useState } from 'react';
import { StructuredDraftStop } from '@/lib/trip/types';

type DayEndpoint = {
  startTitle: string;
  startLocation: string;
  startTime: string;
  endTitle: string;
  endLocation: string;
  hasEnd: boolean;
};

const CATEGORIES: { value: StructuredDraftStop['category']; label: string }[] = [
  { value: 'sightseeing', label: 'Sightseeing' },
  { value: 'meal', label: 'Meal' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'transport', label: 'Transport' },
  { value: 'custom', label: 'Custom' },
];

function makeId() {
  return `sf-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyStop(day: number): StructuredDraftStop {
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
  stops?: StructuredDraftStop[];
  onApply: (stops: StructuredDraftStop[]) => void;
};

export default function StructuredForm({ stops: initialStops, onApply }: Props) {
  const [stops, setStops] = useState<StructuredDraftStop[]>(
    initialStops ?? [emptyStop(1), emptyStop(1)],
  );
  const [endpoints, setEndpoints] = useState<Record<number, DayEndpoint>>({});

  const uniqueDays = useMemo(
    () => [...new Set(stops.map((stop) => stop.day))].sort((a, b) => a - b),
    [stops],
  );
  const maxDay = Math.max(...stops.map((stop) => stop.day), 1);
  const dayOptions = Array.from({ length: maxDay + 1 }, (_, index) => index + 1);
  const hasContent = stops.some((stop) => stop.title.trim());

  function addStop() {
    const lastDay = stops[stops.length - 1]?.day ?? 1;
    setStops((prev) => [...prev, emptyStop(lastDay)]);
  }

  function removeStop(id: string) {
    if (stops.length <= 1) return;
    setStops((prev) => prev.filter((stop) => stop.id !== id));
  }

  function updateStop(id: string, patch: Partial<StructuredDraftStop>) {
    setStops((prev) => prev.map((stop) => (stop.id === id ? { ...stop, ...patch } : stop)));
  }

  function getEndpoint(day: number): DayEndpoint {
    return endpoints[day] ?? emptyEndpoint();
  }

  function updateEndpoint(day: number, patch: Partial<DayEndpoint>) {
    setEndpoints((prev) => ({ ...prev, [day]: { ...getEndpoint(day), ...patch } }));
  }

  function handleApply() {
    const result: StructuredDraftStop[] = [];

    for (const day of uniqueDays) {
      const endpoint = getEndpoint(day);
      const dayStops = stops.filter((stop) => stop.day === day && stop.title.trim());
      const dayDate = dayStops.map((stop) => stop.date).find((date): date is string => Boolean(date));

      if (endpoint.startTitle.trim()) {
        result.push({
          id: `ep-start-d${day}`,
          day,
          date: dayDate,
          title: endpoint.startTitle.trim(),
          location: endpoint.startLocation.trim() || endpoint.startTitle.trim(),
          durationMin: 10,
          category: 'transport',
          earliestStart: endpoint.startTime || undefined,
          fixedOrder: true,
        });
      }

      result.push(...dayStops);

      if (endpoint.hasEnd && endpoint.endTitle.trim()) {
        result.push({
          id: `ep-end-d${day}`,
          day,
          date: dayDate,
          title: endpoint.endTitle.trim(),
          location: endpoint.endLocation.trim() || endpoint.endTitle.trim(),
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
      <div className="space-y-1">
        <div className="text-xs font-medium text-slate-500">Draft editor</div>
        <div className="text-xs text-slate-400">
          Build the draft here. Optimization and navigation run after you apply it.
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-500">Daily anchors</div>
        <div className="grid gap-2 md:grid-cols-2">
          {uniqueDays.map((day) => {
            const endpoint = getEndpoint(day);
            return (
              <div key={day} className="space-y-2 rounded-xl border bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-700">Day {day}</div>

                <div className="grid grid-cols-1 gap-1.5 md:grid-cols-[1.1fr_1.3fr_96px]">
                  <input
                    type="text"
                    placeholder="Start anchor"
                    className="w-full rounded-lg border bg-white px-2 py-2 text-xs"
                    value={endpoint.startTitle}
                    onChange={(event) => updateEndpoint(day, { startTitle: event.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Start location (optional)"
                    className="w-full rounded-lg border bg-white px-2 py-2 text-xs"
                    value={endpoint.startLocation}
                    onChange={(event) => updateEndpoint(day, { startLocation: event.target.value })}
                  />
                  <input
                    type="time"
                    className="w-full rounded-lg border bg-white px-2 py-2 text-xs"
                    value={endpoint.startTime}
                    onChange={(event) => updateEndpoint(day, { startTime: event.target.value })}
                  />
                </div>

                <label className="flex cursor-pointer select-none items-center gap-1 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={endpoint.hasEnd}
                    onChange={(event) => updateEndpoint(day, { hasEnd: event.target.checked })}
                    className="rounded"
                  />
                  Add a return anchor for this day
                </label>

                {endpoint.hasEnd ? (
                  <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Return anchor"
                      className="w-full rounded-lg border bg-white px-2 py-2 text-xs"
                      value={endpoint.endTitle}
                      onChange={(event) => updateEndpoint(day, { endTitle: event.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Return location (optional)"
                      className="w-full rounded-lg border bg-white px-2 py-2 text-xs"
                      value={endpoint.endLocation}
                      onChange={(event) => updateEndpoint(day, { endLocation: event.target.value })}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border p-2">
        <div className="min-w-[900px] space-y-1.5">
          <div className="grid grid-cols-[72px_132px_1.1fr_1.3fr_104px_96px_112px_28px] gap-1.5 px-1 text-xs font-medium text-slate-400">
            <span>Day</span>
            <span>Date</span>
            <span>Draft stop</span>
            <span>Location</span>
            <span>Earliest start</span>
            <span>Duration</span>
            <span>Category</span>
            <span />
          </div>

          {stops.map((stop) => (
            <div
              key={stop.id}
              className="grid grid-cols-[72px_132px_1.1fr_1.3fr_104px_96px_112px_28px] items-start gap-1.5"
            >
              <select
                className="w-full rounded-lg border px-2 py-2 text-xs"
                value={stop.day}
                onChange={(event) => updateStop(stop.id, { day: Number(event.target.value) })}
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    D{day}
                  </option>
                ))}
              </select>

              <input
                type="date"
                className="w-full rounded-lg border px-2 py-2 text-xs"
                value={stop.date ?? ''}
                onChange={(event) => updateStop(stop.id, { date: event.target.value || undefined })}
              />

              <input
                type="text"
                placeholder="Senso-ji"
                className="w-full rounded-lg border px-2 py-2 text-xs"
                value={stop.title}
                onChange={(event) => updateStop(stop.id, { title: event.target.value })}
              />

              <input
                type="text"
                placeholder="Asakusa, Tokyo"
                className="w-full rounded-lg border px-2 py-2 text-xs"
                value={stop.location}
                onChange={(event) => updateStop(stop.id, { location: event.target.value })}
              />

              <input
                type="time"
                className="w-full rounded-lg border px-2 py-2 text-xs"
                value={stop.earliestStart ?? ''}
                onChange={(event) =>
                  updateStop(stop.id, { earliestStart: event.target.value || undefined })
                }
              />

              <input
                type="number"
                min={5}
                max={480}
                step={5}
                className="w-full rounded-lg border px-2 py-2 text-xs"
                value={stop.durationMin}
                onChange={(event) =>
                  updateStop(stop.id, { durationMin: Math.max(5, Number(event.target.value)) })
                }
              />

              <select
                className="w-full rounded-lg border px-2 py-2 text-xs"
                value={stop.category}
                onChange={(event) =>
                  updateStop(stop.id, {
                    category: event.target.value as StructuredDraftStop['category'],
                  })
                }
              >
                {CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => removeStop(stop.id)}
                disabled={stops.length <= 1}
                className="mt-1 text-lg leading-none text-slate-300 hover:text-red-400 disabled:opacity-30"
                title="Remove draft row"
              >
                ��
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {stops.map((stop, index) => (
          <div key={stop.id} className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-[72px] shrink-0 text-right text-slate-300">#{index + 1}</span>
            <input
              type="text"
              placeholder="Notes (optional)"
              className="flex-1 rounded-lg border px-2 py-1 text-xs"
              value={stop.notes ?? ''}
              onChange={(event) => updateStop(stop.id, { notes: event.target.value || undefined })}
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
          + Add draft row
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!hasContent}
          className="flex-1 rounded-xl bg-slate-900 py-2 text-xs text-white disabled:opacity-40"
        >
          Apply draft
        </button>
      </div>
    </div>
  );
}
