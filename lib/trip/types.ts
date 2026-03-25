export type TravelMode = 'driving' | 'walking' | 'cycling' | 'transit';
export type Objective = 'fastest' | 'shortest' | 'balanced';
export type MapProvider = 'amap' | 'google' | 'mapbox';
export type DataSource = 'api' | 'mock';

/** One row in the structured input form — converted directly to Stop[] without an LLM call. */
export type StructuredStop = {
  id: string;
  day: number;
  date?: string;           // YYYY-MM-DD
  title: string;
  location: string;
  earliestStart?: string;   // HH:MM
  durationMin: number;
  category: 'meeting' | 'meal' | 'sightseeing' | 'hotel' | 'transport' | 'custom';
  fixedOrder?: boolean;
  notes?: string;
};

export type Stop = {
  id: string;
  day: number;
  date?: string; // YYYY-MM-DD
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

export type TimelineStop = Stop & {
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

export type BackendResolvedPlace = {
  provider: MapProvider;
  placeId?: string;
  name: string;
  address?: string;
  city?: string;
  district?: string;
  lat: number;
  lng: number;
};

export type BackendTaskStop = {
  id: string;
  title: string;
  rawLocation: string;
  resolvedPlace?: BackendResolvedPlace;
  durationMin: number;
  earliestStart?: string;
  latestArrival?: string;
  fixedOrder?: boolean;
  priority?: number;
  category?: string;
  notes?: string;
};

export type BackendTripDay = {
  day: number;
  date?: string;
  start?: {
    name: string;
    rawLocation?: string;
    resolvedPlace?: BackendResolvedPlace;
    time?: string;
  };
  end?: {
    name: string;
    rawLocation?: string;
    resolvedPlace?: BackendResolvedPlace;
    time?: string;
  };
  stops: BackendTaskStop[];
};

export type BackendMultiDayTrip = {
  tripId?: string;
  title?: string;
  timezone: string;
  mapProvider: MapProvider;
  transportMode: TravelMode;
  objective: Objective;
  preferences?: Record<string, unknown>;
  days: BackendTripDay[];
  hardConstraints: Array<Record<string, unknown>>;
  source?: Record<string, boolean>;
};

export type BackendOptimizedDay = {
  day: number;
  totalMinutes: number;
  totalTravelMinutes: number;
  totalStopMinutes: number;
  orderedStops: Array<
    BackendTaskStop & {
      day: number;
      arrival: string;
      departure: string;
      travelFromPrevMin: number;
    }
  >;
  legs: Array<{
    day: number;
    from: string;
    to: string;
    travelMinutes: number;
  }>;
};

export type BackendOptimizedTrip = BackendMultiDayTrip & {
  optimizedDays: BackendOptimizedDay[];
  summary: {
    totalDays: number;
    totalMinutes: number;
    totalTravelMinutes: number;
    totalStopMinutes: number;
  };
};

export type ParseRouteResponse = {
  trip: BackendMultiDayTrip;
  warnings: string[];
};

export type OptimizeRouteResponse = {
  optimizedTrip: BackendOptimizedTrip;
  explanations: string[];
  conflicts: string[];
};

export type NavigationLinksRouteResponse = {
  days: Array<{
    day: number;
    navigationUrl?: string;
  }>;
};

export type ParseResult = {
  stops: Stop[];
  source: DataSource;
  warning?: string;
};

export type OptimizeResult = {
  optimizedStops: Stop[];
  schedule: ScheduleResult;
  source: DataSource;
  warning?: string;
  backendOptimizedTrip?: BackendOptimizedTrip | null;
};

export type NavigationResult = {
  links: Array<{ day: number; url: string }>;
  source: DataSource;
  warning?: string;
};