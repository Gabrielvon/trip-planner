import {
  DataSource,
  NavigationLinksRouteResponse,
  NavigationResult,
  OptimizeResult,
  OptimizeRouteResponse,
  ParseResult,
  ParseRouteResponse,
  Stop,
  TravelMode,
  Objective,
  MapProvider,
  BackendOptimizedTrip,
} from './types';
import {
  buildMockNavigationLinks,
  buildMultiDaySchedule,
  optimizeMultiDay,
  parseTripTextMock,
  wait,
} from './mock';
import { optimizedRouteToUi, tripToUiStops, uiStopsToBackendTrip } from './ui-mappers';

async function requestJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function sourceLabel(source: DataSource) {
  return source === 'api' ? '真实 API' : 'Mock 回退';
}

export function getSourceLabel(source: DataSource) {
  return sourceLabel(source);
}

async function mockParse(text: string): Promise<ParseResult> {
  await wait(500);
  return {
    stops: parseTripTextMock(text),
    source: 'mock',
    warning: '未检测到可用的 /api/trip/parse，已自动回退到本地 mock。',
  };
}

async function mockOptimize(
  stops: Stop[],
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
    warning: '未检测到可用的 /api/trip/optimize，已自动回退到本地优化器。',
    backendOptimizedTrip: null,
  };
}

async function mockNavigation(
  stops: Stop[],
  mode: TravelMode,
  mapProvider: MapProvider,
): Promise<NavigationResult> {
  await wait(300);
  return {
    links: buildMockNavigationLinks(stops, mode, mapProvider),
    source: 'mock',
    warning: '未检测到可用的 /api/trip/navigation-links，已自动回退到本地导航生成。',
  };
}

export async function parseViaRouteOrMock(text: string): Promise<ParseResult> {
  try {
    const response = await requestJson<ParseRouteResponse>('/api/trip/parse', {
      text,
      timezone: 'Asia/Tokyo',
      mapProvider: 'amap',
      calendarBlocks: [],
    });

    return {
      stops: tripToUiStops(response.trip),
      source: 'api',
      warning: response.warnings?.[0],
    };
  } catch {
    return mockParse(text);
  }
}

export async function optimizeViaRouteOrMock(
  stops: Stop[],
  travelMode: TravelMode,
  objective: Objective,
  mapProvider: MapProvider,
): Promise<OptimizeResult> {
  try {
    const response = await requestJson<OptimizeRouteResponse>('/api/trip/optimize', {
      trip: uiStopsToBackendTrip(stops, travelMode, objective, mapProvider),
    });

    const converted = optimizedRouteToUi(response);

    return {
      ...converted,
      source: 'api',
      warning: response.conflicts?.[0] || response.explanations?.[0],
    };
  } catch {
    return mockOptimize(stops, travelMode, objective, mapProvider);
  }
}

export async function navigationViaRouteOrMock(
  backendOptimizedTrip: BackendOptimizedTrip | null,
  optimizedStops: Stop[],
  mode: TravelMode,
  mapProvider: MapProvider,
): Promise<NavigationResult> {
  if (backendOptimizedTrip) {
    try {
      const response = await requestJson<NavigationLinksRouteResponse>(
        '/api/trip/navigation-links',
        { trip: backendOptimizedTrip },
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
    } catch {
      // ignore and fallback
    }
  }

  return mockNavigation(optimizedStops, mode, mapProvider);
}