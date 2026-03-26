import {
  BackendMultiDayTrip,
  BackendOptimizedDay,
  BackendOptimizedTrip,
  BackendTaskStop,
  MapProvider,
  NavigationLinksRouteResponse,
  OptimizeRouteResponse,
  ParseRouteResponse,
  Stop,
  TravelMode,
} from './types';
import {
  buildMultiDaySchedule,
  groupByDay,
  optimizeMultiDay,
  SEED_STOPS,
} from './mock';
import { guessCoords } from './ui-mappers';
import { parseTripWithOpenAI } from './parse-openai';
import { resolveAllStops } from './amap-provider';

type ParseBody = {
  text?: string;
  timezone?: string;
  mapProvider?: MapProvider;
  calendarBlocks?: Array<Record<string, unknown>>;
};

type OptimizeBody = {
  trip?: BackendMultiDayTrip;
};

type NavigationBody = {
  trip?: BackendOptimizedTrip;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stopToBackendTaskStop(stop: Stop, provider: MapProvider): BackendTaskStop {
  return {
    id: stop.id,
    title: stop.title,
    rawLocation: stop.location,
    resolvedPlace: {
      provider,
      name: stop.location,
      lat: stop.lat,
      lng: stop.lng,
    },
    durationMin: stop.durationMin,
    earliestStart: stop.earliest,
    latestArrival: stop.latest,
    fixedOrder: stop.fixedOrder,
    category: 'custom',
  };
}

function buildSampleDraftTrip(
  timezone: string,
  mapProvider: MapProvider,
): BackendMultiDayTrip {
  const days = groupByDay(SEED_STOPS);
  const orderedDays = Object.keys(days).map(Number).sort((a, b) => a - b);

  return {
    title: '示例多日行程',
    timezone,
    mapProvider,
    transportMode: 'transit',
    objective: 'balanced',
    preferences: {
      avoidBacktracking: true,
      preferAreaClustering: true,
    },
    hardConstraints: [],
    source: {
      fromText: true,
      fromCalendar: false,
      fromManualEdit: false,
    },
    days: orderedDays.map((day) => {
      const dayStops = days[day];
      const first = dayStops[0];
      const last = dayStops[dayStops.length - 1];
      const middle = dayStops.slice(1, -1);

      return {
        day,
        start: {
          name: first.title,
          rawLocation: first.location,
          resolvedPlace: {
            provider: mapProvider,
            name: first.location,
            lat: first.lat,
            lng: first.lng,
          },
          time: first.earliest,
        },
        end: {
          name: last.title,
          rawLocation: last.location,
          resolvedPlace: {
            provider: mapProvider,
            name: last.location,
            lat: last.lat,
            lng: last.lng,
          },
        },
        stops: middle.map((stop) => stopToBackendTaskStop(stop, mapProvider)),
      };
    }),
  };
}

function buildPlaceholderDraftTrip(
  text: string,
  timezone: string,
  mapProvider: MapProvider,
): BackendMultiDayTrip {
  const hasDay2 = /\bD2\b|Day\s*2|第二天/i.test(text);

  return {
    title: '行程草稿',
    timezone,
    mapProvider,
    transportMode: 'transit',
    objective: 'balanced',
    preferences: {
      avoidBacktracking: true,
      preferAreaClustering: true,
    },
    hardConstraints: [],
    source: {
      fromText: true,
      fromCalendar: false,
      fromManualEdit: false,
    },
    days: [
      {
        day: 1,
        stops: [
          {
            id: 'd1-s1',
            title: '待确认事项 1',
            rawLocation: '请补充地点',
            durationMin: 60,
            priority: 5,
            category: 'custom',
          },
        ],
      },
      ...(hasDay2
        ? [
            {
              day: 2,
              stops: [
                {
                  id: 'd2-s1',
                  title: '待确认事项 2',
                  rawLocation: '请补充地点',
                  durationMin: 60,
                  priority: 5,
                  category: 'custom',
                },
              ],
            },
          ]
        : []),
    ],
  };
}

function draftTripToUiStops(trip: BackendMultiDayTrip): Stop[] {
  const result: Stop[] = [];

  const orderedDays = [...trip.days].sort((a, b) => a.day - b.day);
  for (const dayObj of orderedDays) {
    if (dayObj.start) {
      const location =
        dayObj.start.resolvedPlace?.name ||
        dayObj.start.rawLocation ||
        dayObj.start.name;
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
      const location = stop.resolvedPlace?.name || stop.rawLocation || stop.title;
      const coords = stop.resolvedPlace || guessCoords(location, dayObj.day, idx);

      result.push({
        id: stop.id,
        day: dayObj.day,
        title: stop.title,
        location,
        lat: coords.lat,
        lng: coords.lng,
        durationMin: stop.durationMin,
        earliest: stop.earliestStart,
        latest: stop.latestArrival,
        fixedOrder: stop.fixedOrder,
      });
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
  }

  return result;
}

function uiOptimizedToBackendOptimizedTrip(
  sourceTrip: BackendMultiDayTrip,
  optimizedStops: Stop[],
  schedule: ReturnType<typeof buildMultiDaySchedule>,
): BackendOptimizedTrip {
  const groupedStops = groupByDay(optimizedStops);
  const optimizedDays: BackendOptimizedDay[] = schedule.days.map((daySchedule) => {
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

function buildAmapNavigationUrl(stops: Array<{
  lng: number;
  lat: number;
  name: string;
}>, mode: TravelMode) {
  if (stops.length === 0) return undefined;
  const from = stops[0];
  const to = stops[stops.length - 1];
  const mids = stops.slice(1, -1);
  const waypoints = mids.map((s) => `${s.lng},${s.lat}`).join(';');

  const amapMode =
    mode === 'driving'
      ? 'car'
      : mode === 'walking'
      ? 'walk'
      : mode === 'cycling'
      ? 'ride'
      : 'bus';

  let url = `https://uri.amap.com/navigation?from=${from.lng},${from.lat},${encodeURIComponent(from.name)}&to=${to.lng},${to.lat},${encodeURIComponent(to.name)}&mode=${amapMode}&policy=1&coordinate=gaode&callnative=0`;
  if (waypoints) {
    url += `&waypoints=${encodeURIComponent(waypoints)}&via=${encodeURIComponent(waypoints)}`;
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

  let url = `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=${googleMode}`;
  if (mids.length > 0) {
    const waypoints = mids.map((s) => `${s.lat},${s.lng}`).join('|');
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }
  return url;
}

function hasMissingResolvedPlace(trip: BackendMultiDayTrip): boolean {
  return trip.days.some((day) => {
    const startMissing = Boolean(day.start?.rawLocation && !day.start.resolvedPlace);
    const endMissing = Boolean(day.end?.rawLocation && !day.end.resolvedPlace);
    const stopMissing = day.stops.some(
      (stop) => Boolean(stop.rawLocation && !stop.resolvedPlace),
    );
    return startMissing || endMissing || stopMissing;
  });
}

export async function parseTripTextToDraft(
  body: ParseBody,
): Promise<ParseRouteResponse> {
  const timezone = isNonEmptyString(body.timezone) ? body.timezone : 'Asia/Shanghai';
  const mapProvider = body.mapProvider ?? 'amap';
  const text = isNonEmptyString(body.text) ? body.text.trim() : '';

  if (!text) {
    return {
      trip: buildPlaceholderDraftTrip('', timezone, mapProvider),
      warnings: ['输入为空，已返回空白草稿。'],
    };
  }

  // Try real OpenAI Structured Outputs when the API key is configured.
  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await parseTripWithOpenAI(text, timezone, mapProvider);
      if (process.env.AMAP_API_KEY && mapProvider === 'amap') {
        try {
          result.trip.days = await resolveAllStops(result.trip.days, mapProvider);
        } catch (err) {
          console.error('[parse] AMap geocoding failed, using unresolved coords:', err);
          result.warnings.push('AMap 地理编码失败，坐标将使用估算值。');
        }
      }
      return result;
    } catch (err) {
      // Log and fall through to heuristic path so the UI stays usable.
      console.error('[parse] OpenAI call failed, falling back to heuristic:', err);
    }
  }

  // Heuristic fallback — return the sample trip for the built-in demo text,
  // otherwise return a placeholder draft so the optimize step still has
  // something to work with.
  const looksLikeSample =
    text.includes('上海') ||
    text.includes('深圳') ||
    text.includes('北京') ||
    text.includes('浅草寺') ||
    text.includes('东京') ||
    text.includes('日本') ||
    text.includes('纽约') ||
    /New\s*York|Tokyo/i.test(text) ||
    /\bD2\b|Day\s*2|第二天/i.test(text);

  if (looksLikeSample) {
    return {
      trip: buildSampleDraftTrip(timezone, mapProvider),
      warnings: [
        process.env.OPENAI_API_KEY
          ? 'OpenAI 调用失败，已回退到示例数据。'
          : 'OPENAI_API_KEY 未设置，已回退到示例数据。请在 .env.local 中配置 key。',
      ],
    };
  }

  return {
    trip: buildPlaceholderDraftTrip(text, timezone, mapProvider),
    warnings: [
      process.env.OPENAI_API_KEY
        ? 'OpenAI 调用失败，已返回占位草稿。'
        : 'OPENAI_API_KEY 未设置，已返回占位草稿。请在 .env.local 中配置 key。',
    ],
  };
}

export async function optimizeTripServer(
  body: OptimizeBody,
): Promise<OptimizeRouteResponse> {
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
    } catch (err) {
      console.error('[optimize] AMap geocoding failed, falling back to guessed coords:', err);
    }
  }

  const uiStops = draftTripToUiStops(trip);

  if (uiStops.length === 0) {
    throw new Error('trip contains no optimizable stops');
  }

  const optimizedStops = optimizeMultiDay(
    uiStops,
    trip.transportMode,
    trip.objective,
    trip.mapProvider,
  );

  const schedule = buildMultiDaySchedule(
    optimizedStops,
    trip.transportMode,
    trip.mapProvider,
  );

  const optimizedTrip = uiOptimizedToBackendOptimizedTrip(
    trip,
    optimizedStops,
    schedule,
  );

  return {
    optimizedTrip,
    explanations: [
      `已按 ${trip.objective} 目标完成分日优化。`,
      '当前优化器仍为启发式版本，后续可替换为更严格的时间窗求解器。',
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
    days: trip.optimizedDays.map((dayObj) => {
      const stops = dayObj.orderedStops
        .filter((stop) => stop.resolvedPlace)
        .map((stop) => ({
          lng: stop.resolvedPlace!.lng,
          lat: stop.resolvedPlace!.lat,
          name: stop.resolvedPlace!.name,
        }));

      return {
        day: dayObj.day,
        navigationUrl:
          trip.mapProvider === 'google'
            ? buildGoogleNavigationUrl(stops, trip.transportMode)
            : buildAmapNavigationUrl(stops, trip.transportMode),
      };
    }),
  };
}