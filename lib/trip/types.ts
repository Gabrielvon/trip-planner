export type TravelMode = 'driving' | 'walking' | 'cycling' | 'transit';
export type Objective = 'fastest' | 'shortest' | 'balanced';
export type MapProvider = 'amap' | 'google' | 'mapbox';
export type DataSource = 'api' | 'mock' | 'manual';

/**
 * User-configurable LLM settings for OpenAI-compatible APIs.
 * Stored in localStorage, takes precedence over system default (env vars).
 */
export type LLMConfig = {
  apiKey: string;
  baseUrl: string;
  modelName: string;
};

export type StructuredDraftStop = {
  id: string;
  day: number;
  date?: string;
  title: string;
  location: string;
  earliestStart?: string;
  durationMin: number;
  category: 'meeting' | 'meal' | 'sightseeing' | 'hotel' | 'transport' | 'custom';
  fixedOrder?: boolean;
  notes?: string;
};

export type DraftStop = {
  id: string;
  day: number;
  date?: string;
  title: string;
  location: string;
  lat: number;
  lng: number;
  durationMin: number;
  earliest?: string;
  latest?: string;
  fixedOrder?: boolean;
};

export type RouteLeg = {
  day: number;
  from: string;
  to: string;
  minutes: number;
};

export type TimelineStop = DraftStop & {
  arrival: string;
  departure: string;
  travelFromPrev: number;
};

export type DaySchedule = {
  day: number;
  timeline: TimelineStop[];
  legs: RouteLeg[];
  totalMinutes: number;
};

export type ScheduleResult = {
  days: DaySchedule[];
  totalMinutes: number;
  totalTravel: number;
  totalStay: number;
};

export type ResolvedPlace = {
  provider: MapProvider;
  placeId?: string;
  name: string;
  address?: string;
  city?: string;
  district?: string;
  lat: number;
  lng: number;
};

export type TripTaskStop = {
  id: string;
  title: string;
  rawLocation: string;
  resolvedPlace?: ResolvedPlace;
  durationMin: number;
  earliestStart?: string;
  latestArrival?: string;
  fixedOrder?: boolean;
  priority?: number;
  category?: string;
  notes?: string;
};

export type TripAnchor = {
  name: string;
  rawLocation?: string;
  resolvedPlace?: ResolvedPlace;
  time?: string;
};

export type TripDay = {
  day: number;
  date?: string;
  start?: TripAnchor;
  end?: TripAnchor;
  stops: TripTaskStop[];
};

export type TripDraft = {
  tripId?: string;
  title?: string;
  timezone: string;
  mapProvider: MapProvider;
  transportMode: TravelMode;
  objective: Objective;
  preferences?: Record<string, unknown>;
  days: TripDay[];
  hardConstraints: Array<Record<string, unknown>>;
  source?: Record<string, boolean>;
};

export type OptimizedTaskStop = TripTaskStop & {
  day: number;
  arrival: string;
  departure: string;
  travelFromPrevMin: number;
};

export type OptimizedDay = {
  day: number;
  totalMinutes: number;
  totalTravelMinutes: number;
  totalStopMinutes: number;
  orderedStops: OptimizedTaskStop[];
  legs: Array<{
    day: number;
    from: string;
    to: string;
    travelMinutes: number;
  }>;
};

export type OptimizedTrip = TripDraft & {
  optimizedDays: OptimizedDay[];
  summary: {
    totalDays: number;
    totalMinutes: number;
    totalTravelMinutes: number;
    totalStopMinutes: number;
  };
};

export type NavigationPlan = {
  days: Array<{
    day: number;
    navigationUrl?: string;
  }>;
};

export type ParseRouteResponse = {
  trip: TripDraft;
  warnings: string[];
};

export type OptimizeRouteResponse = {
  optimizedTrip: OptimizedTrip;
  explanations: string[];
  conflicts: string[];
};

export type NavigationLinksRouteResponse = NavigationPlan;

export type ParseResult = {
  stops: DraftStop[];
  source: DataSource;
  warning?: string;
};

export type OptimizeResult = {
  optimizedStops: DraftStop[];
  schedule: ScheduleResult;
  source: DataSource;
  warning?: string;
  optimizedTrip?: OptimizedTrip | null;
};

export type NavigationResult = {
  links: Array<{ day: number; url: string }>;
  source: DataSource;
  warning?: string;
};
