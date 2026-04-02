/**
 * AMap (Gaode) geocoding adapter.
 *
 * Wraps the AMap Web Service API:
 * - geocode:   converts a place name to lat/lng + place ID
 * - searchPOI: searches for a POI by keyword within a city
 *
 * Only called server-side. Requires AMAP_API_KEY in the environment.
 * Falls back to undefined when the key is absent or the request fails — callers
 * are responsible for handling the fallback (guessCoords or skipping).
 *
 * AMap coordinate system: GCJ-02 (China encrypted). Do NOT convert to WGS-84
 * here — keep GCJ-02 throughout so AMap navigation links remain accurate.
 */

import { MapProvider, ResolvedPlace, TripDay } from './types';

const AMAP_BASE = 'https://restapi.amap.com/v3';

export type GeocodeResult = {
  lat: number;
  lng: number;
  placeId?: string;
  address?: string;
  city?: string;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function amapGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const apiKey = process.env.AMAP_API_KEY;
  if (!apiKey) throw new Error('AMAP_API_KEY is not set');

  const url = new URL(`${AMAP_BASE}${path}`);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('output', 'JSON');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
    // Short timeout — geocoding is a fast call
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`AMap API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Geocode: place name → lat/lng
// ---------------------------------------------------------------------------

type AmapGeocodeResponse = {
  status: string;
  infocode: string;
  geocodes?: Array<{
    location: string; // "lng,lat"
    adcode?: string;
    city?: string;
    district?: string;
    formatted_address?: string;
  }>;
};

export async function geocodePlace(
  query: string,
  city?: string,
): Promise<GeocodeResult | undefined> {
  const params: Record<string, string> = { address: query };
  if (city) params.city = city;

  const data = await amapGet<AmapGeocodeResponse>('/geocode/geo', params);

  if (data.status !== '1' || !data.geocodes?.length) return undefined;

  const first = data.geocodes[0];
  const [lngStr, latStr] = first.location.split(',');
  const lng = parseFloat(lngStr);
  const lat = parseFloat(latStr);

  if (isNaN(lat) || isNaN(lng)) return undefined;

  return {
    lat,
    lng,
    address: first.formatted_address,
    city: Array.isArray(first.city) ? undefined : (first.city ?? undefined),
  };
}

// ---------------------------------------------------------------------------
// POI search: keyword within a city → best match lat/lng
// ---------------------------------------------------------------------------

type AmapPoiResponse = {
  status: string;
  pois?: Array<{
    id: string;
    name: string;
    location: string;
    address?: string;
    cityname?: string;
    adname?: string;
  }>;
};

export async function searchPOI(
  keyword: string,
  city?: string,
): Promise<GeocodeResult | undefined> {
  const params: Record<string, string> = { keywords: keyword };
  if (city) params.city = city;

  const data = await amapGet<AmapPoiResponse>('/place/text', params);

  if (data.status !== '1' || !data.pois?.length) return undefined;

  const first = data.pois[0];
  const [lngStr, latStr] = first.location.split(',');
  const lng = parseFloat(lngStr);
  const lat = parseFloat(latStr);

  if (isNaN(lat) || isNaN(lng)) return undefined;

  return {
    lat,
    lng,
    placeId: first.id,
    address: first.address,
    city: first.cityname,
  };
}

// ---------------------------------------------------------------------------
// Resolve a raw location string to a ResolvedPlace.
// Tries geocode first, then POI search, then returns undefined.
// ---------------------------------------------------------------------------

export async function resolveLocation(
  rawLocation: string,
  provider: MapProvider = 'amap',
  city?: string,
): Promise<ResolvedPlace | undefined> {
  if (!process.env.AMAP_API_KEY) return undefined;

  try {
    // Try geocode first (better for addresses and well-known names)
    const geo = await geocodePlace(rawLocation, city);
    if (geo) {
      return {
        provider,
        name: rawLocation,
        address: geo.address,
        city: geo.city,
        lat: geo.lat,
        lng: geo.lng,
        placeId: geo.placeId,
      };
    }

    // Fall back to POI keyword search
    const poi = await searchPOI(rawLocation, city);
    if (poi) {
      return {
        provider,
        name: rawLocation,
        address: poi.address,
        city: poi.city,
        lat: poi.lat,
        lng: poi.lng,
        placeId: poi.placeId,
      };
    }
  } catch (err) {
    console.error(`[amap] resolveLocation failed for "${rawLocation}":`, err);
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Batch resolve all stops in a trip draft (server-side, after parse).
// Returns a new copy of the days array with resolvedPlace filled in where possible.
// ---------------------------------------------------------------------------

export async function resolveAllStops(
  days: TripDay[],
  provider: MapProvider = 'amap',
): Promise<TripDay[]> {
  // Run all geocoding in parallel — AMap rate limit is generous.
  return Promise.all(
    days.map(async (day) => {
      const [resolvedStops, resolvedStart, resolvedEnd] = await Promise.all([
        // Stops
        Promise.all(
          day.stops.map(async (stop) => {
            if (stop.resolvedPlace) return stop; // already resolved
            const place = await resolveLocation(stop.rawLocation, provider);
            return place ? { ...stop, resolvedPlace: place } : stop;
          }),
        ),
        // Start endpoint
        day.start && !day.start.resolvedPlace
          ? resolveLocation(day.start.rawLocation || day.start.name, provider).then(
              (place) =>
                place ? { ...day.start!, resolvedPlace: place } : day.start,
            )
          : Promise.resolve(day.start),
        // End endpoint
        day.end && !day.end.resolvedPlace
          ? resolveLocation(day.end.rawLocation || day.end.name, provider).then(
              (place) =>
                place ? { ...day.end!, resolvedPlace: place } : day.end,
            )
          : Promise.resolve(day.end),
      ]);

      return {
        ...day,
        stops: resolvedStops,
        start: resolvedStart,
        end: resolvedEnd,
      };
    }),
  );
}
