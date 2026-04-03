'use client';

import TripMap from '@/components/trip/trip-map';
import type { NavigationLink } from '@/lib/trip/trip-workspace-state';
import type {
  DraftStop,
  MapProvider,
  Objective,
  ScheduleResult,
  TravelMode,
} from '@/lib/trip/types';

type TripReviewPanelProps = {
  travelMode: TravelMode;
  onTravelModeChange: (value: TravelMode) => void;
  objective: Objective;
  onObjectiveChange: (value: Objective) => void;
  mapProvider: MapProvider;
  onMapProviderChange: (value: MapProvider) => void;
  schedule: ScheduleResult;
  navigationLinks: NavigationLink[];
  optimizedStops: DraftStop[];
  selectedStopId?: string;
  onStopSelect: (stopId: string) => void;
};

export default function TripReviewPanel({
  travelMode,
  onTravelModeChange,
  objective,
  onObjectiveChange,
  mapProvider,
  onMapProviderChange,
  schedule,
  navigationLinks,
  optimizedStops,
  selectedStopId,
  onStopSelect,
}: TripReviewPanelProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-2xl border p-4">
        <div className="font-medium">Planning Settings</div>

        <div>
          <div className="mb-1 text-sm text-slate-600">Travel mode</div>
          <select
            className="w-full rounded-xl border p-2"
            value={travelMode}
            onChange={(event) => onTravelModeChange(event.target.value as TravelMode)}
          >
            <option value="driving">Driving</option>
            <option value="walking">Walking</option>
            <option value="cycling">Cycling</option>
            <option value="transit">Transit</option>
          </select>
        </div>

        <div>
          <div className="mb-1 text-sm text-slate-600">Optimization goal</div>
          <select
            className="w-full rounded-xl border p-2"
            value={objective}
            onChange={(event) => onObjectiveChange(event.target.value as Objective)}
          >
            <option value="fastest">Fastest</option>
            <option value="shortest">Shortest</option>
            <option value="balanced">Balanced</option>
          </select>
        </div>

        <div>
          <div className="mb-1 text-sm text-slate-600">Map provider</div>
          <select
            className="w-full rounded-xl border p-2"
            value={mapProvider}
            onChange={(event) => onMapProviderChange(event.target.value as MapProvider)}
          >
            <option value="amap">AMap</option>
            <option value="google">Google Maps</option>
            <option value="mapbox">Mapbox</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="mb-3 font-medium">Optimized Timeline</div>
        <div className="space-y-4">
          {schedule.days.length === 0 ? (
            <div className="text-sm text-slate-500">
              No optimized result yet. Confirm a draft and run optimization first.
            </div>
          ) : (
            schedule.days.map((daySchedule) => (
              <div key={daySchedule.day} className="space-y-2">
                <div className="font-medium">
                  Day {daySchedule.day}
                  {daySchedule.timeline.find((stop) => stop.date)?.date
                    ? ` (${daySchedule.timeline.find((stop) => stop.date)?.date})`
                    : ''}
                </div>
                {daySchedule.timeline.map((item) => (
                  <div
                    key={item.id}
                    className={`cursor-pointer rounded-xl p-3 text-sm transition-colors ${
                      selectedStopId === item.id
                        ? 'bg-slate-200 ring-2 ring-slate-400'
                        : 'bg-slate-50 hover:bg-slate-100'
                    }`}
                    onClick={() => onStopSelect(item.id)}
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
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="mb-3 font-medium">Navigation Links</div>
        <div className="space-y-3">
          {navigationLinks.length === 0 ? (
            <div className="text-sm text-slate-500">
              No navigation links yet. Generate them from the optimized trip.
            </div>
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
        onStopSelect={onStopSelect}
      />
    </div>
  );
}
