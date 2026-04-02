import {
  MapProvider,
  OptimizedTrip,
  TripDraft,
} from './types';

export class RouteContractError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'RouteContractError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown, field: string) {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new RouteContractError(`${field} must be a string`);
  }
  return value;
}

function readMapProvider(value: unknown): MapProvider {
  if (value === undefined) return 'amap';
  if (value === 'amap' || value === 'google' || value === 'mapbox') {
    return value;
  }
  throw new RouteContractError('mapProvider must be one of: amap, google, mapbox');
}

export type ParseRequest = {
  text?: string;
  timezone?: string;
  mapProvider: MapProvider;
  calendarBlocks: Array<Record<string, unknown>>;
};

export function readParseRequest(body: unknown): ParseRequest {
  if (!isRecord(body)) {
    throw new RouteContractError('Request body must be an object');
  }

  const calendarBlocks = body.calendarBlocks;
  if (calendarBlocks !== undefined && !Array.isArray(calendarBlocks)) {
    throw new RouteContractError('calendarBlocks must be an array');
  }

  if (Array.isArray(calendarBlocks) && calendarBlocks.some((item) => !isRecord(item))) {
    throw new RouteContractError('calendarBlocks items must be objects');
  }

  return {
    text: readOptionalString(body.text, 'text'),
    timezone: readOptionalString(body.timezone, 'timezone'),
    mapProvider: readMapProvider(body.mapProvider),
    calendarBlocks: (calendarBlocks as Array<Record<string, unknown>> | undefined) ?? [],
  };
}

export type OptimizeRequest = {
  trip: TripDraft;
};

export function readOptimizeRequest(body: unknown): OptimizeRequest {
  if (!isRecord(body)) {
    throw new RouteContractError('Request body must be an object');
  }
  if (!isRecord(body.trip)) {
    throw new RouteContractError('trip is required');
  }
  return {
    trip: body.trip as TripDraft,
  };
}

export type NavigationRequest = {
  trip: OptimizedTrip;
};

export function readNavigationRequest(body: unknown): NavigationRequest {
  if (!isRecord(body)) {
    throw new RouteContractError('Request body must be an object');
  }
  if (!isRecord(body.trip)) {
    throw new RouteContractError('trip is required');
  }
  return {
    trip: body.trip as OptimizedTrip,
  };
}
