import {
  MapProvider,
  Objective,
  ScheduleResult,
  Stop,
  TravelMode,
} from './types';

export const SAMPLE_TEXT = `请帮我安排一个五天行程（上海及周边）：
D1 2026-05-01 上午从上海虹桥站出发，先去外滩游览 60 分钟；步行到南京路步行街逛街 60 分钟；中午在城隍庙附近吃午饭 75 分钟；下午参观豫园 60 分钟；晚上回新天地酒店。
D2 2026-05-02 上午从新天地酒店出发，参观上海博物馆 90 分钟；下午去陆家嘴东方明珠塔 90 分钟；参观上海中心大厦观光层 60 分钟；傍晚去田子坊逛逛 60 分钟；晚上回新天地酒店。
D3 2026-05-03 早上从新天地酒店出发乘高铁去苏州，参观拙政园 90 分钟；隔壁苏州博物馆 60 分钟；中午在平江路吃饭 75 分钟；下午游览寒山寺 60 分钟；傍晚高铁返回新天地酒店。
D4 2026-05-04 早上从新天地酒店出发驱车去朱家角古镇，游览水乡 120 分钟；古镇内午餐 60 分钟；游览课植园 60 分钟；下午返回新天地酒店。
D5 2026-05-05 早上从新天地酒店出发乘高铁去杭州，游览西湖断桥 60 分钟；参观雷峰塔 60 分钟；在河坊街午餐 75 分钟；下午拜访灵隐寺 90 分钟；傍晚返回上海浦东机场结束行程。`;

export const SEED_STOPS: Stop[] = [
  // Day 1: 上海外滩 & 南京路 (2026-05-01)
  { id: 'd1-1', day: 1, date: '2026-05-01', title: '虹桥站出发', location: '上海虹桥火车站', lat: 31.1945, lng: 121.3209, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'd1-2', day: 1, date: '2026-05-01', title: '外滩', location: '外滩', lat: 31.2394, lng: 121.4904, durationMin: 60 },
  { id: 'd1-3', day: 1, date: '2026-05-01', title: '南京路步行街', location: '南京路步行街', lat: 31.2348, lng: 121.4817, durationMin: 60 },
  { id: 'd1-4', day: 1, date: '2026-05-01', title: '城隍庙午餐', location: '城隍庙', lat: 31.2268, lng: 121.4932, durationMin: 75, latest: '13:00' },
  { id: 'd1-5', day: 1, date: '2026-05-01', title: '豫园', location: '豫园', lat: 31.2277, lng: 121.4921, durationMin: 60 },
  { id: 'd1-6', day: 1, date: '2026-05-01', title: '返回新天地酒店', location: '新天地', lat: 31.2199, lng: 121.4736, durationMin: 10, fixedOrder: true },
  // Day 2: 浦东 & 陆家嘴 (2026-05-02)
  { id: 'd2-1', day: 2, date: '2026-05-02', title: '新天地酒店出发', location: '新天地', lat: 31.2199, lng: 121.4736, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'd2-2', day: 2, date: '2026-05-02', title: '上海博物馆', location: '上海博物馆', lat: 31.2298, lng: 121.4742, durationMin: 90 },
  { id: 'd2-3', day: 2, date: '2026-05-02', title: '东方明珠塔', location: '东方明珠塔', lat: 31.2396, lng: 121.4997, durationMin: 90 },
  { id: 'd2-4', day: 2, date: '2026-05-02', title: '上海中心大厦', location: '上海中心大厦', lat: 31.2357, lng: 121.5025, durationMin: 60 },
  { id: 'd2-5', day: 2, date: '2026-05-02', title: '田子坊', location: '田子坊', lat: 31.2140, lng: 121.4642, durationMin: 60 },
  { id: 'd2-6', day: 2, date: '2026-05-02', title: '回新天地酒店', location: '新天地', lat: 31.2199, lng: 121.4736, durationMin: 10, fixedOrder: true },
  // Day 3: 苏州一日游 (2026-05-03)
  { id: 'd3-1', day: 3, date: '2026-05-03', title: '酒店出发去苏州', location: '新天地', lat: 31.2199, lng: 121.4736, durationMin: 10, earliest: '08:30', fixedOrder: true },
  { id: 'd3-2', day: 3, date: '2026-05-03', title: '拙政园', location: '苏州拙政园', lat: 31.3277, lng: 120.6296, durationMin: 90 },
  { id: 'd3-3', day: 3, date: '2026-05-03', title: '苏州博物馆', location: '苏州博物馆', lat: 31.3268, lng: 120.6285, durationMin: 60 },
  { id: 'd3-4', day: 3, date: '2026-05-03', title: '平江路午餐', location: '平江路', lat: 31.3217, lng: 120.6333, durationMin: 75, latest: '13:30' },
  { id: 'd3-5', day: 3, date: '2026-05-03', title: '寒山寺', location: '寒山寺 苏州', lat: 31.3055, lng: 120.5726, durationMin: 60 },
  { id: 'd3-6', day: 3, date: '2026-05-03', title: '返回新天地酒店', location: '新天地', lat: 31.2199, lng: 121.4736, durationMin: 10, fixedOrder: true },
  // Day 4: 朱家角古镇 (2026-05-04)
  { id: 'd4-1', day: 4, date: '2026-05-04', title: '酒店出发去朱家角', location: '新天地', lat: 31.2199, lng: 121.4736, durationMin: 10, earliest: '08:30', fixedOrder: true },
  { id: 'd4-2', day: 4, date: '2026-05-04', title: '朱家角古镇', location: '朱家角古镇', lat: 31.1131, lng: 121.0583, durationMin: 120 },
  { id: 'd4-3', day: 4, date: '2026-05-04', title: '古镇午餐', location: '朱家角', lat: 31.1140, lng: 121.0598, durationMin: 60, latest: '13:00' },
  { id: 'd4-4', day: 4, date: '2026-05-04', title: '课植园', location: '课植园 朱家角', lat: 31.1135, lng: 121.0575, durationMin: 60 },
  { id: 'd4-5', day: 4, date: '2026-05-04', title: '返回新天地酒店', location: '新天地', lat: 31.2199, lng: 121.4736, durationMin: 10, fixedOrder: true },
  // Day 5: 杭州一日游 (2026-05-05)
  { id: 'd5-1', day: 5, date: '2026-05-05', title: '酒店出发去杭州', location: '新天地', lat: 31.2199, lng: 121.4736, durationMin: 10, earliest: '08:00', fixedOrder: true },
  { id: 'd5-2', day: 5, date: '2026-05-05', title: '西湖断桥', location: '西湖断桥 杭州', lat: 30.2592, lng: 120.1548, durationMin: 60 },
  { id: 'd5-3', day: 5, date: '2026-05-05', title: '雷峰塔', location: '雷峰塔', lat: 30.2364, lng: 120.1488, durationMin: 60 },
  { id: 'd5-4', day: 5, date: '2026-05-05', title: '河坊街午餐', location: '河坊街 杭州', lat: 30.2436, lng: 120.1559, durationMin: 75, latest: '13:30' },
  { id: 'd5-5', day: 5, date: '2026-05-05', title: '灵隐寺', location: '灵隐寺', lat: 30.2387, lng: 120.1012, durationMin: 90 },
  { id: 'd5-6', day: 5, date: '2026-05-05', title: '浦东机场返程', location: '上海浦东国际机场', lat: 31.1525, lng: 121.8093, durationMin: 10, fixedOrder: true },
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

function sortDaysByDateThenDay(days: Record<number, Stop[]>) {
  const orderedDays = Object.keys(days).map(Number);
  return orderedDays.sort((a, b) => {
    const dateA = days[a].map((s) => s.date).find((d) => Boolean(d));
    const dateB = days[b].map((s) => s.date).find((d) => Boolean(d));
    if (dateA && dateB && dateA !== dateB) return dateA.localeCompare(dateB);
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    return a - b;
  });
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
  const orderedDays = sortDaysByDateThenDay(days);
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
  const orderedDays = sortDaysByDateThenDay(days);
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
