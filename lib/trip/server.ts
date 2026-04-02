import {
  MapProvider,
  NavigationLinksRouteResponse,
  OptimizedTrip,
  OptimizeRouteResponse,
  ParseRouteResponse,
  TripDraft,
  TravelMode,
} from './types';
import { buildMultiDaySchedule, optimizeMultiDay } from './mock';
import { draftTripToStops, scheduleToOptimizedTrip } from './canonical-trip';
import { parseTripWithOpenAI } from './parse-openai';
import { resolveAllStops } from './amap-provider';
import { RouteContractError } from './contracts';

type ParseBody = {
  text?: string;
  timezone?: string;
  mapProvider?: MapProvider;
  calendarBlocks?: Array<Record<string, unknown>>;
};

type OptimizeBody = {
  trip?: TripDraft;
};

type NavigationBody = {
  trip?: OptimizedTrip;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function buildAmapNavigationUrl(
  stops: Array<{
    lng: number;
    lat: number;
    name: string;
  }>,
  mode: TravelMode,
) {
  if (stops.length === 0) return undefined;
  const from = stops[0];
  const to = stops[stops.length - 1];
  const mids = stops.slice(1, -1);

  const amapMode =
    mode === 'driving'
      ? 'car'
      : mode === 'walking'
        ? 'walk'
        : mode === 'cycling'
          ? 'ride'
          : 'bus';

  let url = `https://uri.amap.com/navigation?from=${from.lng},${from.lat},${encodeURIComponent(from.name)}&to=${to.lng},${to.lat},${encodeURIComponent(to.name)}&mode=${amapMode}&policy=1&coordinate=gaode&callnative=0`;

  if (mids.length > 0) {
    const waypointCoords = mids.map((stop) => `${stop.lng},${stop.lat}`).join(';');
    url += `&waypoints=${encodeURIComponent(waypointCoords)}`;
  }

  return url;
}

function buildGoogleNavigationUrl(
  stops: Array<{
    lng: number;
    lat: number;
    name: string;
  }>,
  mode: TravelMode,
) {
  if (stops.length === 0) return undefined;
  const from = stops[0];
  const to = stops[stops.length - 1];
  const mids = stops.slice(1, -1);

  const googleMode =
    mode === 'driving'
      ? 'driving'
      : mode === 'walking'
        ? 'walking'
        : mode === 'cycling'
          ? 'bicycling'
          : 'transit';

  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from.name)}&destination=${encodeURIComponent(to.name)}&travelmode=${googleMode}`;
  if (mids.length > 0) {
    const waypoints = mids.map((stop) => stop.name).join('|');
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }
  return url;
}

function hasMissingResolvedPlace(trip: TripDraft): boolean {
  return trip.days.some((day) => {
    const startMissing = Boolean(day.start?.rawLocation && !day.start.resolvedPlace);
    const endMissing = Boolean(day.end?.rawLocation && !day.end.resolvedPlace);
    const stopMissing = day.stops.some(
      (stop) => Boolean(stop.rawLocation && !stop.resolvedPlace),
    );
    return startMissing || endMissing || stopMissing;
  });
}

export async function parseTripTextToDraft(body: ParseBody): Promise<ParseRouteResponse> {
  const timezone = isNonEmptyString(body.timezone) ? body.timezone : 'Asia/Shanghai';
  const mapProvider = body.mapProvider ?? 'amap';
  const text = isNonEmptyString(body.text) ? body.text.trim() : '';

  if (!text) {
    throw new RouteContractError('text is required');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'Live parse is unavailable because OPENAI_API_KEY is not set. Use demo parse instead.',
    );
  }

  try {
    const result = await parseTripWithOpenAI(text, timezone, mapProvider);
    if (process.env.AMAP_API_KEY && mapProvider === 'amap') {
      try {
        result.trip.days = await resolveAllStops(result.trip.days, mapProvider);
      } catch (error) {
        console.error('[parse] AMap geocoding failed, using unresolved coords:', error);
        result.warnings.push('AMap geocoding failed. Review unresolved places before optimization.');
      }
    }
    return result;
  } catch (error) {
    console.error('[parse] OpenAI call failed:', error);
    throw new Error(
      'Live parse failed. Switch to demo parse or fix the live parser configuration.',
    );
  }
}

export async function optimizeTripServer(body: OptimizeBody): Promise<OptimizeRouteResponse> {
  if (!body.trip) {
    throw new Error('trip is required');
  }

  const trip = { ...body.trip };

  if (
    process.env.AMAP_API_KEY &&
    trip.mapProvider === 'amap' &&
    hasMissingResolvedPlace(trip)
  ) {
    try {
      trip.days = await resolveAllStops(trip.days, trip.mapProvider);
    } catch (error) {
      console.error('[optimize] AMap geocoding failed, falling back to guessed coords:', error);
    }
  }

  const draftStops = draftTripToStops(trip);
  if (draftStops.length === 0) {
    throw new Error('trip contains no optimizable stops');
  }

  const optimizedStops = optimizeMultiDay(
    draftStops,
    trip.transportMode,
    trip.objective,
    trip.mapProvider,
  );
  const schedule = buildMultiDaySchedule(optimizedStops, trip.transportMode, trip.mapProvider);
  const optimizedTrip = scheduleToOptimizedTrip(trip, optimizedStops, schedule);

  return {
    optimizedTrip,
    explanations: [
      `Completed multi-day optimization for the "${trip.objective}" objective.`, 
      'The current optimizer is still heuristic and can be replaced later with a stricter time-window solver.',
    ],
    conflicts: [],
  };
}

export async function buildNavigationLinksServer(
  body: NavigationBody,
): Promise<NavigationLinksRouteResponse> {
  if (!body.trip) {
    throw new Error('trip is required');
  }

  const trip = body.trip;

  return {
    days: trip.optimizedDays.map((day) => {
      const stops = day.orderedStops
        .filter((stop) => stop.resolvedPlace)
        .map((stop) => ({
          lng: stop.resolvedPlace!.lng,
          lat: stop.resolvedPlace!.lat,
          name: stop.resolvedPlace!.name,
        }));

      return {
        day: day.day,
        navigationUrl:
          trip.mapProvider === 'google'
            ? buildGoogleNavigationUrl(stops, trip.transportMode)
            : buildAmapNavigationUrl(stops, trip.transportMode),
      };
    }),
  };
}
