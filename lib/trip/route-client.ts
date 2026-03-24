import {
  MapProvider,
  Objective,
  ScheduleResult,
  Stop,
  TravelMode,
} from './types';

export const SAMPLE_TEXT = `请帮我安排一个两天行程：
D1 上午从东京站出发，先去浅草寺，停留 60 分钟；中午 12:30 前到上野吃饭，停留 75 分钟；下午去东京国立博物馆 90 分钟；17:30 前到银座见客户，晚上回品川酒店。
D2 早上从品川酒店出发，去横滨红砖仓库 60 分钟；中午在港未来附近吃饭 70 分钟；下午去杯面博物馆 90 分钟；傍晚回到东京站。`;

export const SEED_STOPS: Stop[] = [
  { id: 'd1-1', day: 1, title: '东京站出发', location: '东京站', lat: 35.6812, lng: 139.7671, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'd1-2', day: 1, title: '浅草寺', location: '浅草寺', lat: 35.7148, lng: 139.7967, durationMin: 60 },
  { id: 'd1-3', day: 1, title: '上野午餐', location: '上野', lat: 35.7138, lng: 139.7773, durationMin: 75, latest: '12:30' },
  { id: 'd1-4', day: 1, title: '东京国立博物馆', location: '东京国立博物馆', lat: 35.7188, lng: 139.7765, durationMin: 90 },
  { id: 'd1-5', day: 1, title: '银座会面', location: '银座', lat: 35.6717, lng: 139.765, durationMin: 60, latest: '17:30', fixedOrder: true },
  { id: 'd1-6', day: 1, title: '返回酒店', location: '品川', lat: 35.6285, lng: 139.7387, durationMin: 10, fixedOrder: true },
  { id: 'd2-1', day: 2, title: '酒店出发', location: '品川', lat: 35.6285, lng: 139.7387, durationMin: 10, earliest: '09:30', fixedOrder: true },
  { id: 'd2-2', day: 2, title: '横滨红砖仓库', location: '横滨红砖仓库', lat: 35.4526, lng: 139.6425, durationMin: 60 },
  { id: 'd2-3', day: 2, title: '港未来午餐', location: '港未来', lat: 35.4587, lng: 139.632, durationMin: 70, latest: '13:00' },
  { id: 'd2-4', day: 2, title: '杯面博物馆', location: '杯面博物馆 横滨', lat: 35.4556, lng: 139.6389, durationMin: 90 },
  { id: 'd2-5', day: 2, title: '回到东京站', location: '东京站', lat: 35.6812, lng: 139.7671, durationMin: 10, fixedOrder: true },
];

function toMinutes(t?: string) {
  if (!t) return undefined;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatMin(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function haversine(a: Stop, b: Stop) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const aa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(aa));
}

function travelSpeed(mode: TravelMode) {
  switch (mode) {
    case 'walking':
      return 4.8;
    case 'cycling':
      return 14;
    case 'transit':
      return 22;
    default:
      return 28;
  }
}

function providerFactor(provider: MapProvider) {
  switch (provider) {
    case 'amap':
      return 1.0;
    case 'google':
      return 0.98;
    case 'mapbox':
      return 1.03;
    default:
      return 1;
  }
}

export function groupByDay(stops: Stop[]) {
  return stops.reduce<Record<number, Stop[]>>((acc, stop) => {
    acc[stop.day] = acc[stop.day] || [];
    acc[stop.day].push(stop);
    return acc;
  }, {});
}

export function estimatedTravelMinutes(
  a: Stop,
  b: Stop,
  mode: TravelMode,
  provider: MapProvider,
) {
  const km = haversine(a, b) * 1.22;
  const base = (km / travelSpeed(mode)) * 60;
  const fixed = mode === 'transit' ? 8 : mode === 'walking' ? 2 : 4;
  return Math.max(5, Math.round((base + fixed) * providerFactor(provider)));
}

function nearestNeighborForDay(
  stops: Stop[],
  mode: TravelMode,
  objective: Objective,
  provider: MapProvider,
) {
  if (stops.length <= 2) return stops;

  const fixedStart = stops[0];
  const fixedEnd = stops[stops.length - 1];
  const middle = stops.slice(1, -1);
  const ordered: Stop[] = [fixedStart];
  let current = fixedStart;
  const remaining = [...middle];

  while (remaining.length) {
    let bestIndex = 0;
    let bestScore = Infinity;

    remaining.forEach((candidate, i) => {
      const travel = estimatedTravelMinutes(current, candidate, mode, provider);
      const deadline = toMinutes(candidate.latest);
      const deadlinePenalty =
        deadline ? Math.max(0, deadline - 12 * 60) / (objective === 'fastest' ? 35 : 50) : 0;
      const score = objective === 'shortest' ? haversine(current, candidate) : travel + deadlinePenalty;

      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    });

    const next = remaining.splice(bestIndex, 1)[0];
    ordered.push(next);
    current = next;
  }

  ordered.push(fixedEnd);
  return ordered;
}

export function optimizeMultiDay(
  stops: Stop[],
  mode: TravelMode,
  objective: Objective,
  provider: MapProvider,
) {
  const days = groupByDay(stops);
  const orderedDays = Object.keys(days).map(Number).sort((a, b) => a - b);
  return orderedDays.flatMap((day) =>
    nearestNeighborForDay(days[day], mode, objective, provider),
  );
}

function buildScheduleForDay(
  stops: Stop[],
  mode: TravelMode,
  provider: MapProvider,
) {
  const timeline = [];
  const legs = [];
  let cursor = toMinutes(stops[0]?.earliest) ?? 9 * 60;

  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i];

    if (i === 0) {
      const depart = cursor + stop.durationMin;
      timeline.push({
        ...stop,
        arrival: formatMin(cursor),
        departure: formatMin(depart),
        travelFromPrev: 0,
      });
      cursor = depart;
      continue;
    }

    const prev = stops[i - 1];
    const travel = estimatedTravelMinutes(prev, stop, mode, provider);
    cursor += travel;

    const earliest = toMinutes(stop.earliest);
    if (earliest && cursor < earliest) cursor = earliest;

    const arrival = cursor;
    const departure = arrival + stop.durationMin;

    legs.push({
      day: stop.day,
      from: prev.title,
      to: stop.title,
      minutes: travel,
    });

    timeline.push({
      ...stop,
      arrival: formatMin(arrival),
      departure: formatMin(departure),
      travelFromPrev: travel,
    });

    cursor = departure;
  }

  return {
    day: stops[0]?.day ?? 1,
    timeline,
    legs,
    totalMinutes: cursor - (toMinutes(stops[0]?.earliest) ?? 9 * 60),
  };
}

export function buildMultiDaySchedule(
  stops: Stop[],
  mode: TravelMode,
  provider: MapProvider,
): ScheduleResult {
  const days = groupByDay(stops);
  const orderedDays = Object.keys(days).map(Number).sort((a, b) => a - b);
  const schedules = orderedDays.map((day) =>
    buildScheduleForDay(days[day], mode, provider),
  );

  return {
    days: schedules,
    totalMinutes: schedules.reduce((sum, item) => sum + item.totalMinutes, 0),
    totalTravel: schedules.flatMap((item) => item.legs).reduce((sum, leg) => sum + leg.minutes, 0),
    totalStay: stops.reduce((sum, stop) => sum + stop.durationMin, 0),
  };
}

export function parseTripTextMock(raw: string): Stop[] {
  if (!raw.trim()) return SEED_STOPS;
  return SEED_STOPS;
}

export function buildMockNavigationLinks(stops: Stop[], mode: TravelMode) {
  const days = groupByDay(stops);
  return Object.keys(days).map((dayKey) => {
    const dayStops = days[Number(dayKey)];
    const from = dayStops[0];
    const to = dayStops[dayStops.length - 1];

    return {
      day: Number(dayKey),
      url: `https://uri.amap.com/navigation?from=${from.lng},${from.lat},${encodeURIComponent(from.location)}&to=${to.lng},${to.lat},${encodeURIComponent(to.location)}&mode=${mode}`,
    };
  });
}

export async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}