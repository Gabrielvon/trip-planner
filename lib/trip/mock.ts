import {
  MapProvider,
  Objective,
  ScheduleResult,
  Stop,
  TravelMode,
} from './types';

export type SamplePreset = {
  id: string;
  label: string;
  provider: MapProvider;
  text: string;
};

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'shanghai-amap',
    label: '上海及周边（高德）',
    provider: 'amap',
    text: `请帮我安排一个五天行程（上海及周边）：
D1 2026-05-01 上午从上海虹桥站出发，先去外滩游览 60 分钟；步行到南京路步行街逛街 60 分钟；中午在城隍庙附近吃午饭 75 分钟；下午参观豫园 60 分钟；晚上回新天地酒店。
D2 2026-05-02 上午从新天地酒店出发，参观上海博物馆 90 分钟；下午去陆家嘴东方明珠塔 90 分钟；参观上海中心大厦观光层 60 分钟；傍晚去田子坊逛逛 60 分钟；晚上回新天地酒店。
D3 2026-05-03 早上从新天地酒店出发乘高铁去苏州，参观拙政园 90 分钟；隔壁苏州博物馆 60 分钟；中午在平江路吃饭 75 分钟；下午游览寒山寺 60 分钟；傍晚高铁返回新天地酒店。
D4 2026-05-04 早上从新天地酒店出发驱车去朱家角古镇，游览水乡 120 分钟；古镇内午餐 60 分钟；游览课植园 60 分钟；下午返回新天地酒店。
D5 2026-05-05 早上从新天地酒店出发乘高铁去杭州，游览西湖断桥 60 分钟；参观雷峰塔 60 分钟；在河坊街午餐 75 分钟；下午拜访灵隐寺 90 分钟；傍晚返回上海浦东机场结束行程。`,
  },
  {
    id: 'shenzhen-amap',
    label: '深圳城市一日（高德）',
    provider: 'amap',
    text: `请帮我安排一个深圳一日行程：
D1 2026-06-01 上午从深圳北站出发，先到莲花山公园停留 60 分钟；再去市民中心参观 60 分钟；中午在福田中心区吃饭 75 分钟；下午到华强北逛街 90 分钟；傍晚去深圳湾公园散步 60 分钟；晚上回福田酒店。`,
  },
  {
    id: 'beijing-amap',
    label: '北京经典一日（高德）',
    provider: 'amap',
    text: `请帮我安排一个北京一日行程：
D1 2026-06-08 上午从北京南站出发，先去天安门广场停留 45 分钟；再游览故宫 120 分钟；中午在王府井附近吃饭 75 分钟；下午去景山公园 60 分钟；傍晚返回东直门酒店。`,
  },
  {
    id: 'japan-google',
    label: '东京一日（Google Maps）',
    provider: 'google',
    text: `Please plan a one-day Tokyo itinerary:
Day 1 starts at Tokyo Station, then Senso-ji, Ueno Park, Tokyo Skytree, Shibuya Crossing, and ends at Shinjuku hotel in the evening.`,
  },
  {
    id: 'newyork-google',
    label: '纽约一日（Google Maps）',
    provider: 'google',
    text: `Please plan a one-day New York itinerary:
Day 1 starts at Penn Station, then Times Square, Central Park South, The Met, Brooklyn Bridge Park, and ends at JFK Airport in the evening.`,
  },
];

export const SAMPLE_TEXT = SAMPLE_PRESETS[0].text;

const SHANGHAI_SEED_STOPS: Stop[] = [
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

const SHENZHEN_SEED_STOPS: Stop[] = [
  { id: 'sz-1', day: 1, date: '2026-06-01', title: '深圳北站出发', location: '深圳北站', lat: 22.6087, lng: 114.0294, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'sz-2', day: 1, date: '2026-06-01', title: '莲花山公园', location: '莲花山公园', lat: 22.5523, lng: 114.0542, durationMin: 60 },
  { id: 'sz-3', day: 1, date: '2026-06-01', title: '市民中心', location: '深圳市民中心', lat: 22.5431, lng: 114.0579, durationMin: 60 },
  { id: 'sz-4', day: 1, date: '2026-06-01', title: '福田午餐', location: '福田中心区', lat: 22.5416, lng: 114.0678, durationMin: 75, latest: '13:30' },
  { id: 'sz-5', day: 1, date: '2026-06-01', title: '华强北', location: '华强北', lat: 22.5464, lng: 114.0868, durationMin: 90 },
  { id: 'sz-6', day: 1, date: '2026-06-01', title: '深圳湾公园', location: '深圳湾公园', lat: 22.5106, lng: 113.9422, durationMin: 60 },
  { id: 'sz-7', day: 1, date: '2026-06-01', title: '返回福田酒店', location: '福田酒店', lat: 22.5401, lng: 114.0646, durationMin: 10, fixedOrder: true },
];

const BEIJING_SEED_STOPS: Stop[] = [
  { id: 'bj-1', day: 1, date: '2026-06-08', title: '北京南站出发', location: '北京南站', lat: 39.8652, lng: 116.3786, durationMin: 10, earliest: '08:30', fixedOrder: true },
  { id: 'bj-2', day: 1, date: '2026-06-08', title: '天安门广场', location: '天安门广场', lat: 39.9087, lng: 116.3975, durationMin: 45 },
  { id: 'bj-3', day: 1, date: '2026-06-08', title: '故宫', location: '故宫博物院', lat: 39.9163, lng: 116.3972, durationMin: 120 },
  { id: 'bj-4', day: 1, date: '2026-06-08', title: '王府井午餐', location: '王府井', lat: 39.9149, lng: 116.4119, durationMin: 75, latest: '13:30' },
  { id: 'bj-5', day: 1, date: '2026-06-08', title: '景山公园', location: '景山公园', lat: 39.924, lng: 116.3964, durationMin: 60 },
  { id: 'bj-6', day: 1, date: '2026-06-08', title: '返回东直门酒店', location: '东直门', lat: 39.941, lng: 116.4335, durationMin: 10, fixedOrder: true },
];

const TOKYO_SEED_STOPS: Stop[] = [
  { id: 'jp-1', day: 1, date: '2026-06-15', title: 'Tokyo Station Start', location: 'Tokyo Station', lat: 35.6812, lng: 139.7671, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'jp-2', day: 1, date: '2026-06-15', title: 'Senso-ji', location: 'Senso-ji', lat: 35.7148, lng: 139.7967, durationMin: 60 },
  { id: 'jp-3', day: 1, date: '2026-06-15', title: 'Ueno Park', location: 'Ueno Park', lat: 35.7142, lng: 139.7741, durationMin: 60 },
  { id: 'jp-4', day: 1, date: '2026-06-15', title: 'Tokyo Skytree', location: 'Tokyo Skytree', lat: 35.7101, lng: 139.8107, durationMin: 60 },
  { id: 'jp-5', day: 1, date: '2026-06-15', title: 'Shibuya Crossing', location: 'Shibuya Crossing', lat: 35.6595, lng: 139.7005, durationMin: 60 },
  { id: 'jp-6', day: 1, date: '2026-06-15', title: 'Shinjuku Hotel End', location: 'Shinjuku', lat: 35.6896, lng: 139.7006, durationMin: 10, fixedOrder: true },
];

const NEWYORK_SEED_STOPS: Stop[] = [
  { id: 'ny-1', day: 1, date: '2026-06-22', title: 'Penn Station Start', location: 'Penn Station', lat: 40.7506, lng: -73.9935, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'ny-2', day: 1, date: '2026-06-22', title: 'Times Square', location: 'Times Square', lat: 40.758, lng: -73.9855, durationMin: 45 },
  { id: 'ny-3', day: 1, date: '2026-06-22', title: 'Central Park South', location: 'Central Park South', lat: 40.7661, lng: -73.9776, durationMin: 60 },
  { id: 'ny-4', day: 1, date: '2026-06-22', title: 'The Met', location: 'The Metropolitan Museum of Art', lat: 40.7794, lng: -73.9632, durationMin: 90 },
  { id: 'ny-5', day: 1, date: '2026-06-22', title: 'Brooklyn Bridge Park', location: 'Brooklyn Bridge Park', lat: 40.7003, lng: -73.9967, durationMin: 60 },
  { id: 'ny-6', day: 1, date: '2026-06-22', title: 'JFK End', location: 'JFK Airport', lat: 40.6413, lng: -73.7781, durationMin: 10, fixedOrder: true },
];

export const SEED_STOPS: Stop[] = SHANGHAI_SEED_STOPS;

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
  const text = raw.trim();
  if (!text) return SHANGHAI_SEED_STOPS;

  if (text.includes('深圳')) return SHENZHEN_SEED_STOPS;
  if (text.includes('北京')) return BEIJING_SEED_STOPS;
  if (/东京|日本|Tokyo|Japan/i.test(text)) return TOKYO_SEED_STOPS;
  if (/纽约|纽约市|New\s*York|NYC/i.test(text)) return NEWYORK_SEED_STOPS;
  return SHANGHAI_SEED_STOPS;
}

function mapAmapMode(mode: TravelMode) {
  switch (mode) {
    case 'driving':
      return 'car';
    case 'walking':
      return 'walk';
    case 'cycling':
      return 'ride';
    default:
      return 'bus';
  }
}

function mapGoogleMode(mode: TravelMode) {
  switch (mode) {
    case 'driving':
      return 'driving';
    case 'walking':
      return 'walking';
    case 'cycling':
      return 'bicycling';
    default:
      return 'transit';
  }
}

function buildAmapUrl(dayStops: Stop[], mode: TravelMode) {
  const from = dayStops[0];
  const to = dayStops[dayStops.length - 1];
  const mids = dayStops.slice(1, -1);

  let url = `https://uri.amap.com/navigation?from=${from.lng},${from.lat},${encodeURIComponent(from.location)}&to=${to.lng},${to.lat},${encodeURIComponent(to.location)}&mode=${mapAmapMode(mode)}&policy=1&coordinate=gaode&callnative=0`;
  
  // Use all intermediate coordinates for better AMap URI compatibility.
  if (mids.length > 0) {
    const waypointCoords = mids.map((s) => `${s.lng},${s.lat}`).join(';');
    url += `&waypoints=${encodeURIComponent(waypointCoords)}`;
  }
  return url;
}

function buildGoogleUrl(dayStops: Stop[], mode: TravelMode) {
  const from = dayStops[0];
  const to = dayStops[dayStops.length - 1];
  const mids = dayStops.slice(1, -1);

  let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(from.location || from.title)}&destination=${encodeURIComponent(to.location || to.title)}&travelmode=${mapGoogleMode(mode)}`;
  if (mids.length > 0) {
    const waypoints = mids.map((s) => s.location || s.title).join('|');
    url += `&waypoints=${encodeURIComponent(waypoints)}`;
  }
  return url;
}

export function buildMockNavigationLinks(
  stops: Stop[],
  mode: TravelMode,
  provider: MapProvider = 'amap',
) {
  const days = groupByDay(stops);
  return Object.keys(days).map((dayKey) => {
    const dayStops = days[Number(dayKey)];
    const url =
      provider === 'google'
        ? buildGoogleUrl(dayStops, mode)
        : buildAmapUrl(dayStops, mode);

    return {
      day: Number(dayKey),
      url,
    };
  });
}

export async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
