import {
  BackendMultiDayTrip,
  BackendOptimizedTrip,
  BackendTaskStop,
  MapProvider,
  Objective,
  OptimizeRouteResponse,
  ScheduleResult,
  Stop,
  StructuredStop,
  TravelMode,
} from './types';
import { groupByDay } from './mock';

const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  东京站: { lat: 35.6812, lng: 139.7671 },
  浅草寺: { lat: 35.7148, lng: 139.7967 },
  上野: { lat: 35.7138, lng: 139.7773 },
  东京国立博物馆: { lat: 35.7188, lng: 139.7765 },
  银座: { lat: 35.6717, lng: 139.765 },
  品川: { lat: 35.6285, lng: 139.7387 },
  横滨红砖仓库: { lat: 35.4526, lng: 139.6425 },
  港未来: { lat: 35.4587, lng: 139.632 },
  '杯面博物馆 横滨': { lat: 35.4556, lng: 139.6389 },
  '请补充地点': { lat: 35.6812, lng: 139.7671 },
};

export function guessCoords(location: string, day = 1, index = 0) {
  const direct = LOCATION_COORDS[location];
  if (direct) return direct;

  let seed = 0;
  for (let i = 0; i < location.length; i++) seed += location.charCodeAt(i);

  return {
    lat: 35.65 + ((seed + day + index) % 30) * 0.002,
    lng: 139.7 + ((seed + day * 3 + index) % 30) * 0.002,
  };
}

/**
 * Convert structured form rows directly into UI Stop[] (no LLM call).
 * Coordinates use guessCoords; real geocoding happens in the optimize step.
 */
export function structuredStopsToUiStops(rows: StructuredStop[]): Stop[] {
  return [...rows]
    .sort((a, b) => a.day - b.day)
    .map((s, idx) => {
      const location = s.location.trim() || s.title.trim();
      const coords = guessCoords(location, s.day, idx);
      return {
        id: s.id,
        day: s.day,
        date: s.date,
        title: s.title.trim() || '未命名地点',
        location,
        lat: coords.lat,
        lng: coords.lng,
        durationMin: s.durationMin,
        earliest: s.earliestStart,
        fixedOrder: s.fixedOrder ?? false,
      };
    });
}

function backendStopToUiStop(stop: BackendTaskStop, day: number, index: number): Stop {
  const location = stop.resolvedPlace?.name || stop.rawLocation || stop.title || '未命名地点';
  const coords = stop.resolvedPlace || guessCoords(location, day, index);

  return {
    id: stop.id || `day-${day}-stop-${index + 1}`,
    day,
    date: undefined,
    title: stop.title || location,
    location,
    lat: coords.lat,
    lng: coords.lng,
    durationMin: stop.durationMin || 60,
    earliest: stop.earliestStart,
    latest: stop.latestArrival,
    fixedOrder: stop.fixedOrder,
  };
}

export function tripToUiStops(trip: BackendMultiDayTrip): Stop[] {
  const result: Stop[] = [];
  const orderedDays = [...trip.days].sort((a, b) => a.day - b.day);

  orderedDays.forEach((dayObj) => {
    if (dayObj.start) {
      const location =
        dayObj.start.resolvedPlace?.name || dayObj.start.rawLocation || dayObj.start.name;
      const coords = dayObj.start.resolvedPlace || guessCoords(location, dayObj.day, 0);

      result.push({
        id: `day-${dayObj.day}-start`,
        day: dayObj.day,
        title: dayObj.start.name,
        location,
        lat: coords.lat,
        lng: coords.lng,
        durationMin: 10,
        earliest: dayObj.start.time,
        fixedOrder: true,
      });
    }

    dayObj.stops.forEach((stop, idx) => {
      result.push(backendStopToUiStop(stop, dayObj.day, idx));
    });

    if (dayObj.end) {
      const location =
        dayObj.end.resolvedPlace?.name || dayObj.end.rawLocation || dayObj.end.name;
      const coords = dayObj.end.resolvedPlace || guessCoords(location, dayObj.day, 99);

      result.push({
        id: `day-${dayObj.day}-end`,
        day: dayObj.day,
        title: dayObj.end.name,
        location,
        lat: coords.lat,
        lng: coords.lng,
        durationMin: 10,
        fixedOrder: true,
      });
    }
  });

  return result;
}

export function uiStopsToBackendTrip(
  stops: Stop[],
  travelMode: TravelMode,
  objective: Objective,
  mapProvider: MapProvider,
): BackendMultiDayTrip {
  const daysMap = groupByDay(stops);

  const days = Object.keys(daysMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((day) => {
      const dayStops = daysMap[day];
      const dayDate = dayStops
        .map((s) => s.date)
        .find((d): d is string => Boolean(d));

      return {
        day,
        date: dayDate,
        stops: dayStops.map((stop) => ({
        id: stop.id,
        title: stop.title,
        rawLocation: stop.location,
        resolvedPlace: {
          provider: mapProvider,
          name: stop.location,
          lat: stop.lat,
          lng: stop.lng,
        },
        durationMin: stop.durationMin,
        earliestStart: stop.earliest,
        latestArrival: stop.latest,
        fixedOrder: stop.fixedOrder,
        category: 'custom',
        })),
      };
    });

  return {
    title: '前端桥接行程',
    timezone: 'Asia/Tokyo',
    mapProvider,
    transportMode: travelMode,
    objective,
    preferences: {
      avoidBacktracking: true,
      preferAreaClustering: true,
    },
    days,
    hardConstraints: [],
    source: {
      fromText: true,
      fromManualEdit: true,
    },
  };
}

export function optimizedRouteToUi(result: OptimizeRouteResponse): {
  optimizedStops: Stop[];
  schedule: ScheduleResult;
  backendOptimizedTrip: BackendOptimizedTrip;
} {
  const optimizedStops: Stop[] = result.optimizedTrip.optimizedDays.flatMap((dayObj) =>
    dayObj.orderedStops.map((stop, idx) => ({
      id: stop.id,
      day: stop.day,
      date: undefined,
      title: stop.title,
      location: stop.resolvedPlace?.name || stop.rawLocation,
      lat: stop.resolvedPlace?.lat ?? guessCoords(stop.rawLocation, stop.day, idx).lat,
      lng: stop.resolvedPlace?.lng ?? guessCoords(stop.rawLocation, stop.day, idx).lng,
      durationMin: stop.durationMin,
      earliest: stop.earliestStart,
      latest: stop.latestArrival,
      fixedOrder: stop.fixedOrder,
    })),
  );

  const schedule: ScheduleResult = {
    days: result.optimizedTrip.optimizedDays.map((dayObj) => ({
      day: dayObj.day,
      totalMinutes: dayObj.totalMinutes,
      legs: dayObj.legs.map((leg) => ({
        day: leg.day,
        from: leg.from,
        to: leg.to,
        minutes: leg.travelMinutes,
      })),
      timeline: dayObj.orderedStops.map((stop, idx) => ({
        id: stop.id,
        day: stop.day,
        title: stop.title,
        location: stop.resolvedPlace?.name || stop.rawLocation,
        lat: stop.resolvedPlace?.lat ?? guessCoords(stop.rawLocation, stop.day, idx).lat,
        lng: stop.resolvedPlace?.lng ?? guessCoords(stop.rawLocation, stop.day, idx).lng,
        durationMin: stop.durationMin,
        earliest: stop.earliestStart,
        latest: stop.latestArrival,
        fixedOrder: stop.fixedOrder,
        arrival: stop.arrival,
        departure: stop.departure,
        travelFromPrev: stop.travelFromPrevMin,
      })),
    })),
    totalMinutes: result.optimizedTrip.summary.totalMinutes,
    totalTravel: result.optimizedTrip.summary.totalTravelMinutes,
    totalStay: result.optimizedTrip.summary.totalStopMinutes,
  };

  return {
    optimizedStops,
    schedule,
    backendOptimizedTrip: result.optimizedTrip,
  };
}