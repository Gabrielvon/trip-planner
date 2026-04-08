import {
  DataSource,
  DraftStop,
  LLMConfig,
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
  scheduleToOptimizedTrip,
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
  timezone = 'Asia/Shanghai',
): Promise<OptimizeResult> {
  await wait(600);
  const optimizedStops = optimizeMultiDay(stops, travelMode, objective, mapProvider);
  const schedule = buildMultiDaySchedule(optimizedStops, travelMode, mapProvider);
  const sourceTrip = stopsToDraftTrip(
    stops,
    travelMode,
    objective,
    mapProvider,
    timezone,
  );
  const optimizedTrip = scheduleToOptimizedTrip(sourceTrip, optimizedStops, schedule);

  return {
    optimizedStops,
    schedule,
    source: 'mock',
    warning: 'Demo mode: using the local optimizer instead of the live optimize API.',
    optimizedTrip,
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

// ---------------------------------------------------------------------------
// Parse with user-provided LLM config
// ---------------------------------------------------------------------------

type CustomParseResponse = {
  trip: ParseRouteResponse['trip'];
  warnings: string[];
};

/**
 * Parse trip text using user-provided LLM configuration.
 * 
 * Strategy:
 * 1. First, try direct frontend call to user's API endpoint
 * 2. If CORS error or other network failure, fall back to server proxy
 */
export async function parseViaUserLLM(
  text: string,
  config: LLMConfig,
  context: ParseContext = {},
): Promise<ParseResult> {
  const timezone = context.timezone || 'Asia/Shanghai';
  const mapProvider = context.mapProvider || 'amap';

  // Try direct frontend call first
  try {
    const directResult = await parseDirectToFrontend(text, config, timezone, mapProvider);
    return {
      stops: draftTripToStops(directResult.trip),
      source: 'api',
      warning: directResult.warnings?.[0],
    };
  } catch (directError) {
    // Check if it's a CORS or network error that we should retry via proxy
    if (shouldFallbackToProxy(directError)) {
      console.log('Direct LLM call failed (CORS/network), falling back to server proxy');
      
      const proxyResult = await parseViaProxy(text, config, timezone, mapProvider);
      return {
        stops: draftTripToStops(proxyResult.trip),
        source: 'api',
        warning: proxyResult.warnings?.[0],
      };
    }
    
    // Re-throw other errors
    throw directError;
  }
}

/**
 * Direct frontend call to user's configured LLM endpoint
 */
async function parseDirectToFrontend(
  text: string,
  config: LLMConfig,
  timezone: string,
  mapProvider: MapProvider,
): Promise<CustomParseResponse> {
  // Build request for OpenAI-compatible API
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelName,
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(),
        },
        {
          role: 'user',
          content: `Parse this trip description. Use timezone="${timezone}" and mapProvider="${mapProvider}".\n\n${text}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new TripClientError('parse', `LLM API error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    throw new TripClientError('parse', 'LLM returned empty content');
  }

  try {
    const parsed = JSON.parse(raw) as CustomParseResponse['trip'] & { warnings?: string[] };
    const warnings = parsed.warnings ?? [];
    delete (parsed as Record<string, unknown>).warnings;
    
    return { trip: parsed, warnings };
  } catch {
    throw new TripClientError('parse', 'Failed to parse LLM response as JSON');
  }
}

/**
 * Server proxy fallback for CORS/network issues
 */
async function parseViaProxy(
  text: string,
  config: LLMConfig,
  timezone: string,
  mapProvider: MapProvider,
): Promise<CustomParseResponse> {
  const response = await requestJson<CustomParseResponse>(
    '/api/trip/parse-custom',
    {
      text,
      timezone,
      mapProvider,
      llmConfig: config,
    },
    'parse',
  );

  return response;
}

/**
 * Determine if we should retry via server proxy
 */
function shouldFallbackToProxy(error: unknown): boolean {
  if (error instanceof TypeError) {
    // Network errors, CORS errors, fetch failures
    const message = error.message.toLowerCase();
    return (
      message.includes('failed to fetch') ||
      message.includes('network error') ||
      message.includes('cors') ||
      message.includes('blocked') ||
      message.includes('enotfound') ||
      message.includes('econnrefused')
    );
  }
  
  // Also catch TripClientError from network issues
  if (error instanceof TripClientError) {
    const message = error.message.toLowerCase();
    return (
      message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('cors')
    );
  }
  
  return false;
}

/**
 * System prompt for custom LLM calls (matches parse-openai.ts)
 */
function getSystemPrompt(): string {
  return `You are a structured trip planning assistant. Parse natural language trip descriptions into a strict JSON object.

Rules:
1. Extract every day (D1, D2, 第一天, 第二天, Day 1, etc.) as a separate entry in "days".
2. For each day, identify a start point (earliest mentioned location/departure) and end point (last mentioned location/return).
3. Everything between start and end goes in "stops". Assign unique IDs like "d1-s1", "d1-s2", "d2-s1", etc.
4. Estimate durationMin based on explicit durations in the text (e.g. "60 分钟" = 60). If not mentioned, guess based on activity type: meals ~60, sightseeing ~90, meetings ~60, transport ~15.
5. Set earliestStart / latestArrival ONLY when the text specifies a time constraint. Use HH:MM format.
6. Set fixedOrder: true only for stops that MUST happen in a specific order (typically start, end, and time-constrained events).
7. Set category from: meeting, meal, sightseeing, hotel, transport, custom.
8. If the input is ambiguous, incomplete, or missing information, emit a warning in the "warnings" array instead of guessing confidently.
9. Use "amap" as default mapProvider, "transit" as default transportMode, "balanced" as default objective.
10. For hardConstraints, extract explicit time windows, fixed appointments, or logistical anchors (flights, trains).
11. title should be a concise trip name derived from the input.
12. timezone: infer from location names if possible (e.g. Tokyo → Asia/Tokyo, Beijing → Asia/Shanghai). Default to "Asia/Shanghai".
13. For fields whose schema allows null, use null when unknown. For required non-null string fields, use empty string "" when unknown.

Return ONLY valid JSON matching the schema. No explanations.`;
}
