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
import {
  assertLiveParseDeploymentEnabled,
  assertLiveParseTextWithinLimit,
} from './live-parse-guard';
import {
  detectLocationFromIp,
  selectMapProviderByLocation,
  getMapProviderWithFallback,
  isMapProviderAccessible,
  extractIpFromRequest,
  GeoDetectionResult
} from './geolocation';
import { mapServiceManager } from './map-service-manager';

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

export async function parseTripTextToDraft(body: ParseBody, request?: Request): Promise<ParseRouteResponse> {
  const timezone = isNonEmptyString(body.timezone) ? body.timezone : 'Asia/Shanghai';
  const text = isNonEmptyString(body.text) ? body.text.trim() : '';

  if (!text) {
    throw new RouteContractError('text is required');
  }

  assertLiveParseDeploymentEnabled();
  assertLiveParseTextWithinLimit(text);

  if (!process.env.OPENAI_API_KEY) {
    throw new RouteContractError(
      'Live parse is unavailable because OPENAI_API_KEY is not set. Use demo parse instead.',
      503,
    );
  }

  // Detect user location from IP for intelligent map provider selection
  let geoDetection: GeoDetectionResult | undefined;
  try {
    // Extract IP from request if available
    const ip = request ? extractIpFromRequest(request) : undefined;
    geoDetection = await detectLocationFromIp(ip);
  } catch (error) {
    console.error('[parse] Geolocation detection failed:', error);
  }

  // Select map provider based on location
  const userPreferredProvider = body.mapProvider;
  const location = geoDetection?.location;
  const mapProvider = selectMapProviderByLocation(location, userPreferredProvider);
  
  // Get fallback provider in case primary fails
  const { primary, fallback } = getMapProviderWithFallback(mapProvider);
  const isPrimaryAccessible = isMapProviderAccessible(primary, location);
  
  let selectedProvider = primary;
  let fallbackWarning = '';
  
  if (!isPrimaryAccessible && primary !== fallback) {
    selectedProvider = fallback;
    fallbackWarning = `Selected ${primary} may not be accessible from your location. Using ${fallback} instead.`;
  }

  try {
    const result = await parseTripWithOpenAI(text, timezone, selectedProvider);
    
    // Add geolocation info to result
    if (geoDetection?.location) {
      result.warnings.push(
        `Detected location: ${geoDetection.location.country} (${geoDetection.location.countryCode})`
      );
    }
    
    if (fallbackWarning) {
      result.warnings.push(fallbackWarning);
    }
    
    // Try to resolve locations with the selected provider
    if (selectedProvider === 'amap' && process.env.AMAP_API_KEY) {
      try {
        result.trip.days = await resolveAllStops(result.trip.days, selectedProvider);
      } catch (error) {
        console.error('[parse] AMap geocoding failed, using unresolved coords:', error);
        result.warnings.push('AMap geocoding failed. Review unresolved places before optimization.');
        
        // Try fallback if AMap fails
        if (selectedProvider === 'amap' && fallback === 'google') {
          result.warnings.push('Falling back to Google Maps for navigation links.');
        }
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

export async function optimizeTripServer(
  body: OptimizeBody,
  request?: Request,
): Promise<OptimizeRouteResponse> {
  if (!body.trip) {
    throw new Error('trip is required');
  }

  const trip = { ...body.trip };

  // Detect location for intelligent provider selection if not specified
  if (!trip.mapProvider && request) {
    try {
      // Extract IP from request if available
      const ip = extractIpFromRequest(request);
      const geoDetection = await detectLocationFromIp(ip);
      const location = geoDetection?.location;
      trip.mapProvider = selectMapProviderByLocation(location);
    } catch (error) {
      console.error('[optimize] Geolocation detection failed:', error);
      // Fallback to default
      trip.mapProvider = 'amap';
    }
  }

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
  request?: Request,
): Promise<NavigationLinksRouteResponse> {
  if (!body.trip) {
    throw new Error('trip is required');
  }

  const trip = body.trip;

  // Detect location for intelligent provider selection
  let geoDetection: GeoDetectionResult | undefined;
  try {
    // Extract IP from request if available
    const ip = request ? extractIpFromRequest(request) : undefined;
    geoDetection = await detectLocationFromIp(ip);
  } catch (error) {
    console.error('[navigation] Geolocation detection failed:', error);
  }

  const daysWithNavigation = await Promise.all(
    trip.optimizedDays.map(async (day) => {
      const stops = day.orderedStops
        .filter((stop) => stop.resolvedPlace)
        .map((stop) => ({
          lng: stop.resolvedPlace!.lng,
          lat: stop.resolvedPlace!.lat,
          name: stop.resolvedPlace!.name,
        }));

      if (stops.length === 0) {
        return { day: day.day, navigationUrl: undefined };
      }

      try {
        // Use map service manager with intelligent fallback
        const result = await mapServiceManager.getNavigationUrl(
          stops,
          trip.transportMode,
          trip.mapProvider,
          geoDetection?.location
        );

        // Log warnings if any
        if (result.warnings.length > 0) {
          console.warn(`[navigation] Day ${day.day} warnings:`, result.warnings);
        }

        // If using fallback, update the trip's map provider for consistency
        if (result.isFallback && result.provider !== trip.mapProvider) {
          console.log(`[navigation] Day ${day.day}: Using ${result.provider} as fallback from ${trip.mapProvider}`);
        }

        return {
          day: day.day,
          navigationUrl: result.url,
          provider: result.provider,
          isFallback: result.isFallback,
          warnings: result.warnings
        };
      } catch (error) {
        console.error(`[navigation] Failed to generate navigation URL for day ${day.day}:`, error);
        
        // Even if all providers fail, we can create a basic map link
        if (stops.length > 0) {
          const firstStop = stops[0];
          const lastStop = stops[stops.length - 1];
          const basicUrl = `https://www.openstreetmap.org/directions?from=${firstStop.lat},${firstStop.lng}&to=${lastStop.lat},${lastStop.lng}`;
          
          return {
            day: day.day,
            navigationUrl: basicUrl,
            provider: 'mapbox' as MapProvider,
            isFallback: true,
            warnings: [`All map providers failed. Using OpenStreetMap as last resort: ${(error as Error).message}`]
          };
        }
        
        return { day: day.day, navigationUrl: undefined };
      }
    })
  );

  // Filter out provider info for backward compatibility
  return {
    days: daysWithNavigation.map(day => ({
      day: day.day,
      navigationUrl: day.navigationUrl
    }))
  };
}
