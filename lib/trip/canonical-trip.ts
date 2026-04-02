import { groupByDay } from './mock';
import {
  DraftStop,
  MapProvider,
  Objective,
  OptimizedDay,
  OptimizedTrip,
  OptimizeRouteResponse,
  ScheduleResult,
  TripDraft,
  TripTaskStop,
  TravelMode,
} from './types';

const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  ['\u4e1c\u4eac\u7ad9']: { lat: 35.6812, lng: 139.7671 },
  ['\u6d45\u8349\u5bfa']: { lat: 35.7148, lng: 139.7967 },
  ['\u4e0a\u91ce']: { lat: 35.7138, lng: 139.7773 },
  ['\u4e1c\u4eac\u56fd\u7acb\u535a\u7269\u9986']: { lat: 35.7188, lng: 139.7765 },
  ['\u94f6\u5ea7']: { lat: 35.6717, lng: 139.765 },
  ['\u54c1\u5ddd']: { lat: 35.6285, lng: 139.7387 },
  ['\u6a2a\u6ee8\u7ea2\u7816\u4ed3\u5e93']: { lat: 35.4526, lng: 139.6425 },
  ['\u6e2f\u672a\u6765']: { lat: 35.4587, lng: 139.632 },
  ['\u676f\u9762\u535a\u7269\u9986 \u6a2a\u6ee8']: { lat: 35.4556, lng: 139.6389 },
  ['\u8bf7\u8865\u5145\u5730\u70b9']: { lat: 35.6812, lng: 139.7671 },
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

function backendStopToStop(
  stop: TripTaskStop,
  day: number,
  index: number,
  date?: string,
): DraftStop {
  const location =
    stop.resolvedPlace?.name || stop.rawLocation || stop.title || 'Untitled stop';
  const coords = stop.resolvedPlace || guessCoords(location, day, index);

  return {
    id: stop.id || `day-${day}-stop-${index + 1}`,
    day,
    date,
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

export function draftTripToStops(trip: TripDraft): DraftStop[] {
  const result: DraftStop[] = [];
  const orderedDays = [...trip.days].sort((a, b) => a.day - b.day);

  orderedDays.forEach((dayObj) => {
    if (dayObj.start) {
      const location =
        dayObj.start.resolvedPlace?.name || dayObj.start.rawLocation || dayObj.start.name;
      const coords = dayObj.start.resolvedPlace || guessCoords(location, dayObj.day, 0);

      result.push({
        id: `day-${dayObj.day}-start`,
        day: dayObj.day,
        date: dayObj.date,
        title: dayObj.start.name,
        location,
        lat: coords.lat,
        lng: coords.lng,
        durationMin: 10,
        earliest: dayObj.start.time,
        fixedOrder: true,
      });
    }

    dayObj.stops.forEach((stop, index) => {
      result.push(backendStopToStop(stop, dayObj.day, index, dayObj.date));
    });

    if (dayObj.end) {
      const location =
        dayObj.end.resolvedPlace?.name || dayObj.end.rawLocation || dayObj.end.name;
      const coords = dayObj.end.resolvedPlace || guessCoords(location, dayObj.day, 99);

      result.push({
        id: `day-${dayObj.day}-end`,
        day: dayObj.day,
        date: dayObj.date,
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

export function stopsToDraftTrip(
  stops: DraftStop[],
  travelMode: TravelMode,
  objective: Objective,
  mapProvider: MapProvider,
  timezone: string,
): TripDraft {
  const daysMap = groupByDay(stops);

  const days = Object.keys(daysMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map((day) => {
      const dayStops = daysMap[day];
      const dayDate = dayStops
        .map((stop) => stop.date)
        .find((date): date is string => Boolean(date));

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
    title: 'Frontend trip draft',
    timezone,
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

export function optimizedTripToClientModel(
  optimizedTrip: OptimizedTrip,
): {
  optimizedStops: DraftStop[];
  schedule: ScheduleResult;
  optimizedTrip: OptimizedTrip;
} {
  const dayDateByDay = new Map(optimizedTrip.days.map((day) => [day.day, day.date]));

  const optimizedStops: DraftStop[] = optimizedTrip.optimizedDays.flatMap((dayObj) =>
    dayObj.orderedStops.map((stop, index) => ({
      id: stop.id,
      day: stop.day,
      date: dayDateByDay.get(stop.day),
      title: stop.title,
      location: stop.resolvedPlace?.name || stop.rawLocation,
      lat: stop.resolvedPlace?.lat ?? guessCoords(stop.rawLocation, stop.day, index).lat,
      lng: stop.resolvedPlace?.lng ?? guessCoords(stop.rawLocation, stop.day, index).lng,
      durationMin: stop.durationMin,
      earliest: stop.earliestStart,
      latest: stop.latestArrival,
      fixedOrder: stop.fixedOrder,
    })),
  );

  const schedule: ScheduleResult = {
    days: optimizedTrip.optimizedDays.map((dayObj) => ({
      day: dayObj.day,
      totalMinutes: dayObj.totalMinutes,
      legs: dayObj.legs.map((leg) => ({
        day: leg.day,
        from: leg.from,
        to: leg.to,
        minutes: leg.travelMinutes,
      })),
      timeline: dayObj.orderedStops.map((stop, index) => ({
        id: stop.id,
        day: stop.day,
        date: dayDateByDay.get(stop.day),
        title: stop.title,
        location: stop.resolvedPlace?.name || stop.rawLocation,
        lat: stop.resolvedPlace?.lat ?? guessCoords(stop.rawLocation, stop.day, index).lat,
        lng: stop.resolvedPlace?.lng ?? guessCoords(stop.rawLocation, stop.day, index).lng,
        durationMin: stop.durationMin,
        earliest: stop.earliestStart,
        latest: stop.latestArrival,
        fixedOrder: stop.fixedOrder,
        arrival: stop.arrival,
        departure: stop.departure,
        travelFromPrev: stop.travelFromPrevMin,
      })),
    })),
    totalMinutes: optimizedTrip.summary.totalMinutes,
    totalTravel: optimizedTrip.summary.totalTravelMinutes,
    totalStay: optimizedTrip.summary.totalStopMinutes,
  };

  return {
    optimizedStops,
    schedule,
    optimizedTrip,
  };
}

export function optimizedRouteToClientModel(
  result: OptimizeRouteResponse,
): {
  optimizedStops: DraftStop[];
  schedule: ScheduleResult;
  optimizedTrip: OptimizedTrip;
} {
  return optimizedTripToClientModel(result.optimizedTrip);
}

export function scheduleToOptimizedTrip(
  sourceTrip: TripDraft,
  optimizedStops: DraftStop[],
  schedule: ScheduleResult,
): OptimizedTrip {
  const groupedStops = groupByDay(optimizedStops);
  const optimizedDays: OptimizedDay[] = schedule.days.map((daySchedule) => {
    const orderedStops = daySchedule.timeline.map((stop) => ({
      id: stop.id,
      title: stop.title,
      rawLocation: stop.location,
      resolvedPlace: {
        provider: sourceTrip.mapProvider,
        name: stop.location,
        lat: stop.lat,
        lng: stop.lng,
      },
      durationMin: stop.durationMin,
      earliestStart: stop.earliest,
      latestArrival: stop.latest,
      fixedOrder: stop.fixedOrder,
      category: 'custom',
      day: stop.day,
      arrival: stop.arrival,
      departure: stop.departure,
      travelFromPrevMin: stop.travelFromPrev,
    }));

    return {
      day: daySchedule.day,
      totalMinutes: daySchedule.totalMinutes,
      totalTravelMinutes: daySchedule.legs.reduce((sum, leg) => sum + leg.minutes, 0),
      totalStopMinutes: (groupedStops[daySchedule.day] || []).reduce(
        (sum, stop) => sum + stop.durationMin,
        0,
      ),
      orderedStops,
      legs: daySchedule.legs.map((leg) => ({
        day: leg.day,
        from: leg.from,
        to: leg.to,
        travelMinutes: leg.minutes,
      })),
    };
  });

  return {
    ...sourceTrip,
    optimizedDays,
    summary: {
      totalDays: schedule.days.length,
      totalMinutes: schedule.totalMinutes,
      totalTravelMinutes: schedule.totalTravel,
      totalStopMinutes: schedule.totalStay,
    },
  };
}
