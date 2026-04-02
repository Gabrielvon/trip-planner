import {
  DataSource,
  DraftStop,
  MapProvider,
  NavigationLinksRouteResponse,
  NavigationResult,
  Objective,
  OptimizedTrip,
  OptimizeResult,
  OptimizeRouteResponse,
  ParseResult,
  ParseRouteResponse,
  TravelMode,
} from './types';
import {
  buildMockNavigationLinks,
  buildMultiDaySchedule,
  optimizeMultiDay,
  parseTripTextMock,
  wait,
} from './mock';
import {
  draftTripToStops,
  optimizedRouteToClientModel,
  stopsToDraftTrip,
} from './canonical-trip';

type TripAction = 'parse' | 'optimize' | 'navigation';

type ParseContext = {
  timezone?: string;
  mapProvider?: MapProvider;
};

export class TripClientError extends Error {
  action: TripAction;

  constructor(action: TripAction, message: string) {
    super(message);
    this.name = 'TripClientError';
    this.action = action;
  }
}

function sourceLabel(source: DataSource) {
  switch (source) {
    case 'api':
      return 'Live service';
    case 'mock':
      return 'Demo mode';
    case 'manual':
      return 'Manual draft';
    default:
      return 'Unknown source';
  }
}

export function getSourceLabel(source: DataSource) {
  return sourceLabel(source);
}

async function extractErrorMessage(response: Response, fallback: string) {
  const raw = await response.text();

  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as { error?: string; detail?: string };
    return parsed.detail || parsed.error || fallback;
  } catch {
    return raw;
  }
}

async function requestJson<T>(
  url: string,
  body: unknown,
  action: TripAction,
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const fallback = `Request failed: ${response.status}`;
    const message = await extractErrorMessage(response, fallback);
    throw new TripClientError(action, message);
  }

  return (await response.json()) as T;
}

export async function parseViaDemo(text: string): Promise<ParseResult> {
  await wait(500);
  return {
    stops: parseTripTextMock(text),
    source: 'mock',
    warning: 'Demo mode: using the local sample parser instead of the live parse API.',
  };
}

export async function optimizeViaDemo(
  stops: DraftStop[],
  travelMode: TravelMode,
  objective: Objective,
  mapProvider: MapProvider,
): Promise<OptimizeResult> {
  await wait(600);
  const optimizedStops = optimizeMultiDay(stops, travelMode, objective, mapProvider);
  const schedule = buildMultiDaySchedule(optimizedStops, travelMode, mapProvider);

  return {
    optimizedStops,
    schedule,
    source: 'mock',
    warning: 'Demo mode: using the local optimizer instead of the live optimize API.',
    optimizedTrip: null,
  };
}

export async function navigationViaDemo(
  stops: DraftStop[],
  mode: TravelMode,
  mapProvider: MapProvider,
): Promise<NavigationResult> {
  await wait(300);
  return {
    links: buildMockNavigationLinks(stops, mode, mapProvider),
    source: 'mock',
    warning: 'Demo mode: using local navigation links instead of the live navigation API.',
  };
}

export async function parseViaRoute(
  text: string,
  context: ParseContext = {},
): Promise<ParseResult> {
  const timezone = context.timezone || 'Asia/Shanghai';
  const mapProvider = context.mapProvider || 'amap';
  const response = await requestJson<ParseRouteResponse>(
    '/api/trip/parse',
    {
      text,
      timezone,
      mapProvider,
      calendarBlocks: [],
    },
    'parse',
  );

  return {
    stops: draftTripToStops(response.trip),
    source: 'api',
    warning: response.warnings?.[0],
  };
}

export async function optimizeViaRoute(
  stops: DraftStop[],
  travelMode: TravelMode,
  objective: Objective,
  mapProvider: MapProvider,
  timezone: string,
): Promise<OptimizeResult> {
  const response = await requestJson<OptimizeRouteResponse>(
    '/api/trip/optimize',
    {
      trip: stopsToDraftTrip(stops, travelMode, objective, mapProvider, timezone),
    },
    'optimize',
  );

  const converted = optimizedRouteToClientModel(response);

  return {
    ...converted,
    source: 'api',
    warning: response.conflicts?.[0] || response.explanations?.[0],
  };
}

export async function navigationViaRoute(
  optimizedTrip: OptimizedTrip | null,
): Promise<NavigationResult> {
  if (!optimizedTrip) {
    throw new TripClientError(
      'navigation',
      'Live navigation requires a live optimized trip. Re-run optimization in live mode first.',
    );
  }

  const response = await requestJson<NavigationLinksRouteResponse>(
    '/api/trip/navigation-links',
    { trip: optimizedTrip },
    'navigation',
  );

  return {
    links: response.days
      .filter((item) => item.navigationUrl)
      .map((item) => ({
        day: item.day,
        url: item.navigationUrl as string,
      })),
    source: 'api',
  };
}
