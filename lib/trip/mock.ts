import {
  DraftStop,
  MapProvider,
  Objective,
  ScheduleResult,
  TravelMode,
} from './types';

export type SamplePreset = {
  id: string;
  label: string;
  provider: MapProvider;
  text: string;
  language?: 'zh' | 'en'; // 添加语言标识
};

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'shanghai-amap',
    label: 'Shanghai multi-day draft (AMap)',
    provider: 'amap',
    language: 'en',
    text: `Compile a 5-day Shanghai itinerary with AMap.
Day 1 starts at Hongqiao Railway Station, then The Bund, Yu Garden, Nanjing Road, Xintiandi, and ends near People's Square.
Day 2 starts near People's Square, then Shanghai Museum, Jing'an Temple, Wukang Road, and ends near the hotel.
Day 3 is a Suzhou side trip with classic gardens and a return to Shanghai at night.
Day 4 is a Zhujiajiao water town day trip with a return to Shanghai.
Day 5 covers Hangzhou highlights and ends at Pudong Airport.`,
  },
  {
    id: 'shanghai-chinese',
    label: '上海五日游行程草稿 (中文)',
    provider: 'amap',
    language: 'zh',
    text: `请帮我规划一个5天的上海行程，使用高德地图。
第一天从虹桥火车站开始，然后去外滩、豫园、南京路、新天地，最后在人民广场附近结束。
第二天从人民广场附近开始，然后去上海博物馆、静安寺、武康路，最后回酒店。
第三天是苏州一日游，参观古典园林，晚上返回上海。
第四天是朱家角水乡一日游，返回上海。
第五天游览杭州主要景点，最后到浦东机场结束。`,
  },
  {
    id: 'shenzhen-amap',
    label: 'Shenzhen day trip draft (AMap)',
    provider: 'amap',
    language: 'en',
    text: `Compile a 1-day Shenzhen itinerary with AMap.
Day 1 starts at Shenzhen North Station, then Splendid China Folk Village, OCT Harbour, Shenzhen Bay Park, Nantou Ancient Town, and ends at Shenzhen Bao'an Airport.`,
  },
  {
    id: 'shenzhen-chinese',
    label: '深圳一日游行程草稿 (中文)',
    provider: 'amap',
    language: 'zh',
    text: `请帮我规划一个1天的深圳行程，使用高德地图。
第一天从深圳北站开始，然后去锦绣中华民俗村、欢乐海岸、深圳湾公园、南头古城，最后在深圳宝安机场结束。`,
  },
  {
    id: 'beijing-amap',
    label: 'Beijing day trip draft (AMap)',
    provider: 'amap',
    language: 'en',
    text: `Compile a 1-day Beijing itinerary with AMap.
Day 1 starts at Beijing South Railway Station, then Tiananmen Square, the Forbidden City, Jingshan Park, Wangfujing, and ends near the Lama Temple.`,
  },
  {
    id: 'beijing-chinese',
    label: '北京一日游行程草稿 (中文)',
    provider: 'amap',
    language: 'zh',
    text: `请帮我规划一个1天的北京行程，使用高德地图。
第一天从北京南站开始，然后去天安门广场、故宫、景山公园、王府井，最后在雍和宫附近结束。`,
  },
  {
    id: 'japan-google',
    label: 'Tokyo day trip draft (Google Maps)',
    provider: 'google',
    language: 'en',
    text: `Compile a 1-day Tokyo itinerary with Google Maps.
Day 1 starts at Tokyo Station, then Senso-ji, Ueno Park, Tokyo Skytree, Shibuya Crossing, and ends at Shinjuku hotel in the evening.`,
  },
  {
    id: 'japan-chinese',
    label: '东京一日游行程草稿 (中文)',
    provider: 'google',
    language: 'zh',
    text: `请帮我规划一个1天的东京行程，使用Google地图。
第一天从东京站开始，然后去浅草寺、上野公园、东京晴空塔、涩谷十字路口，最后在晚上到新宿酒店结束。`,
  },
  {
    id: 'newyork-google',
    label: 'New York day trip draft (Google Maps)',
    provider: 'google',
    language: 'en',
    text: `Compile a 1-day New York itinerary with Google Maps.
Day 1 starts at Penn Station, then Times Square, Central Park South, The Met, Brooklyn Bridge Park, and ends at JFK Airport in the evening.`,
  },
  {
    id: 'newyork-chinese',
    label: '纽约一日游行程草稿 (中文)',
    provider: 'google',
    language: 'zh',
    text: `请帮我规划一个1天的纽约行程，使用Google地图。
第一天从宾夕法尼亚车站开始，然后去时代广场、中央公园南侧、大都会艺术博物馆、布鲁克林大桥公园，最后在晚上到肯尼迪机场结束。`,
  },
  {
    id: 'taiwan-chinese',
    label: '台湾三日游行程草稿 (中文)',
    provider: 'google',
    language: 'zh',
    text: `请帮我规划一个3天的台湾行程，使用Google地图。
第一天从台北松山机场开始，然后去中正纪念堂、台北101、西门町，最后在台北车站附近结束。
第二天从台北车站开始，然后去九份老街、十分瀑布、平溪放天灯，最后返回台北。
第三天从台北开始，然后去淡水老街、渔人码头、士林夜市，最后到桃园机场结束。`,
  },
  {
    id: 'hongkong-chinese',
    label: '香港两日游行程草稿 (中文)',
    provider: 'google',
    language: 'zh',
    text: `请帮我规划一个2天的香港行程，使用Google地图。
第一天从香港西九龙站开始，然后去维多利亚港、太平山顶、兰桂坊，最后在尖沙咀附近结束。
第二天从尖沙咀开始，然后去迪士尼乐园、铜锣湾购物、庙街夜市，最后到香港机场结束。`,
  },
];

export const SAMPLE_TEXT = SAMPLE_PRESETS[0].text;

const SHANGHAI_SEED_STOPS: DraftStop[] = [
  { id: 'd1-1', day: 1, date: '2026-05-01', title: 'Hongqiao Railway Station', location: 'Shanghai Hongqiao Railway Station', lat: 31.1945, lng: 121.3209, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'd1-2', day: 1, date: '2026-05-01', title: 'The Bund', location: 'The Bund, Shanghai', lat: 31.2394, lng: 121.4904, durationMin: 60 },
  { id: 'd1-3', day: 1, date: '2026-05-01', title: 'Yu Garden', location: 'Yu Garden, Shanghai', lat: 31.2274, lng: 121.4921, durationMin: 60 },
  { id: 'd1-4', day: 1, date: '2026-05-01', title: 'Nanjing Road Lunch', location: 'Nanjing Road, Shanghai', lat: 31.2348, lng: 121.4817, durationMin: 75, latest: '13:00' },
  { id: 'd1-5', day: 1, date: '2026-05-01', title: 'Xintiandi', location: 'Xintiandi, Shanghai', lat: 31.2199, lng: 121.4736, durationMin: 60 },
  { id: 'd1-6', day: 1, date: '2026-05-01', title: "People's Square Hotel", location: "People's Square, Shanghai", lat: 31.2304, lng: 121.4737, durationMin: 10, fixedOrder: true },

  { id: 'd2-1', day: 2, date: '2026-05-02', title: "People's Square Hotel", location: "People's Square, Shanghai", lat: 31.2304, lng: 121.4737, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'd2-2', day: 2, date: '2026-05-02', title: 'Shanghai Museum', location: 'Shanghai Museum', lat: 31.2305, lng: 121.4737, durationMin: 90 },
  { id: 'd2-3', day: 2, date: '2026-05-02', title: "Jing'an Temple", location: "Jing'an Temple, Shanghai", lat: 31.2237, lng: 121.4451, durationMin: 60 },
  { id: 'd2-4', day: 2, date: '2026-05-02', title: 'Wukang Road', location: 'Wukang Road, Shanghai', lat: 31.211, lng: 121.4374, durationMin: 90 },
  { id: 'd2-5', day: 2, date: '2026-05-02', title: 'French Concession Coffee Stop', location: 'Former French Concession, Shanghai', lat: 31.2093, lng: 121.4537, durationMin: 60 },
  { id: 'd2-6', day: 2, date: '2026-05-02', title: 'Hotel Return', location: "People's Square, Shanghai", lat: 31.2304, lng: 121.4737, durationMin: 10, fixedOrder: true },

  { id: 'd3-1', day: 3, date: '2026-05-03', title: 'Shanghai Railway Hub', location: 'Shanghai Railway Station', lat: 31.2492, lng: 121.4557, durationMin: 10, earliest: '08:30', fixedOrder: true },
  { id: 'd3-2', day: 3, date: '2026-05-03', title: 'Humble Administrator Garden', location: 'Suzhou Humble Administrator Garden', lat: 31.3277, lng: 120.6296, durationMin: 90 },
  { id: 'd3-3', day: 3, date: '2026-05-03', title: 'Lion Grove Garden', location: 'Lion Grove Garden, Suzhou', lat: 31.3268, lng: 120.6285, durationMin: 60 },
  { id: 'd3-4', day: 3, date: '2026-05-03', title: 'Pingjiang Road Lunch', location: 'Pingjiang Road, Suzhou', lat: 31.3217, lng: 120.6333, durationMin: 75, latest: '13:30' },
  { id: 'd3-5', day: 3, date: '2026-05-03', title: 'Shantang Street', location: 'Shantang Street, Suzhou', lat: 31.3055, lng: 120.5726, durationMin: 60 },
  { id: 'd3-6', day: 3, date: '2026-05-03', title: 'Shanghai Hotel Return', location: "People's Square, Shanghai", lat: 31.2304, lng: 121.4737, durationMin: 10, fixedOrder: true },

  { id: 'd4-1', day: 4, date: '2026-05-04', title: 'Shanghai Hotel Start', location: "People's Square, Shanghai", lat: 31.2304, lng: 121.4737, durationMin: 10, earliest: '08:30', fixedOrder: true },
  { id: 'd4-2', day: 4, date: '2026-05-04', title: 'Zhujiajiao Ancient Town', location: 'Zhujiajiao Ancient Town', lat: 31.1131, lng: 121.0583, durationMin: 120 },
  { id: 'd4-3', day: 4, date: '2026-05-04', title: 'Canal Lunch', location: 'Zhujiajiao Old Street', lat: 31.114, lng: 121.0598, durationMin: 60, latest: '13:00' },
  { id: 'd4-4', day: 4, date: '2026-05-04', title: 'Boat Ride', location: 'Zhujiajiao Water Canal', lat: 31.1135, lng: 121.0575, durationMin: 60 },
  { id: 'd4-5', day: 4, date: '2026-05-04', title: 'Shanghai Hotel Return', location: "People's Square, Shanghai", lat: 31.2304, lng: 121.4737, durationMin: 10, fixedOrder: true },

  { id: 'd5-1', day: 5, date: '2026-05-05', title: 'Shanghai Hotel Checkout', location: "People's Square, Shanghai", lat: 31.2304, lng: 121.4737, durationMin: 10, earliest: '08:00', fixedOrder: true },
  { id: 'd5-2', day: 5, date: '2026-05-05', title: 'West Lake', location: 'West Lake, Hangzhou', lat: 30.2592, lng: 120.1548, durationMin: 60 },
  { id: 'd5-3', day: 5, date: '2026-05-05', title: 'Lingyin Temple', location: 'Lingyin Temple, Hangzhou', lat: 30.2429, lng: 120.1018, durationMin: 60 },
  { id: 'd5-4', day: 5, date: '2026-05-05', title: 'Longjing Village Lunch', location: 'Longjing Village, Hangzhou', lat: 30.2148, lng: 120.1043, durationMin: 75, latest: '13:30' },
  { id: 'd5-5', day: 5, date: '2026-05-05', title: 'Qinghefang Street', location: 'Qinghefang Street, Hangzhou', lat: 30.2415, lng: 120.1689, durationMin: 90 },
  { id: 'd5-6', day: 5, date: '2026-05-05', title: 'Pudong Airport', location: 'Shanghai Pudong International Airport', lat: 31.1522, lng: 121.8053, durationMin: 10, fixedOrder: true },
];

const SHENZHEN_SEED_STOPS: DraftStop[] = [
  { id: 'sz-1', day: 1, date: '2026-06-01', title: 'Shenzhen North Station', location: 'Shenzhen North Station', lat: 22.6087, lng: 114.0294, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'sz-2', day: 1, date: '2026-06-01', title: 'Splendid China Folk Village', location: 'Splendid China Folk Village', lat: 22.5423, lng: 113.9734, durationMin: 60 },
  { id: 'sz-3', day: 1, date: '2026-06-01', title: 'OCT Harbour', location: 'OCT Harbour, Shenzhen', lat: 22.5347, lng: 113.9831, durationMin: 60 },
  { id: 'sz-4', day: 1, date: '2026-06-01', title: 'Shenzhen Bay Park', location: 'Shenzhen Bay Park', lat: 22.5145, lng: 113.9469, durationMin: 75, latest: '13:30' },
  { id: 'sz-5', day: 1, date: '2026-06-01', title: 'Nantou Ancient Town', location: 'Nantou Ancient Town, Shenzhen', lat: 22.5338, lng: 113.9304, durationMin: 90 },
  { id: 'sz-6', day: 1, date: '2026-06-01', title: "Window of the World", location: "Window of the World, Shenzhen", lat: 22.5401, lng: 113.9737, durationMin: 60 },
  { id: 'sz-7', day: 1, date: '2026-06-01', title: "Bao'an Airport", location: "Shenzhen Bao'an International Airport", lat: 22.6393, lng: 113.8107, durationMin: 10, fixedOrder: true },
];

const BEIJING_SEED_STOPS: DraftStop[] = [
  { id: 'bj-1', day: 1, date: '2026-06-08', title: 'Beijing South Station', location: 'Beijing South Railway Station', lat: 39.8652, lng: 116.3786, durationMin: 10, earliest: '08:30', fixedOrder: true },
  { id: 'bj-2', day: 1, date: '2026-06-08', title: 'Tiananmen Square', location: 'Tiananmen Square', lat: 39.903, lng: 116.3975, durationMin: 45 },
  { id: 'bj-3', day: 1, date: '2026-06-08', title: 'Forbidden City', location: 'Forbidden City, Beijing', lat: 39.9163, lng: 116.3972, durationMin: 120 },
  { id: 'bj-4', day: 1, date: '2026-06-08', title: 'Jingshan Park', location: 'Jingshan Park, Beijing', lat: 39.923, lng: 116.3961, durationMin: 75, latest: '13:30' },
  { id: 'bj-5', day: 1, date: '2026-06-08', title: 'Wangfujing', location: 'Wangfujing, Beijing', lat: 39.9155, lng: 116.4111, durationMin: 60 },
  { id: 'bj-6', day: 1, date: '2026-06-08', title: 'Lama Temple End', location: 'Lama Temple, Beijing', lat: 39.947, lng: 116.417, durationMin: 10, fixedOrder: true },
];

const TOKYO_SEED_STOPS: DraftStop[] = [
  { id: 'jp-1', day: 1, date: '2026-06-15', title: 'Tokyo Station Start', location: 'Tokyo Station', lat: 35.6812, lng: 139.7671, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'jp-2', day: 1, date: '2026-06-15', title: 'Senso-ji', location: 'Senso-ji', lat: 35.7148, lng: 139.7967, durationMin: 60 },
  { id: 'jp-3', day: 1, date: '2026-06-15', title: 'Ueno Park', location: 'Ueno Park', lat: 35.7142, lng: 139.7741, durationMin: 60 },
  { id: 'jp-4', day: 1, date: '2026-06-15', title: 'Tokyo Skytree', location: 'Tokyo Skytree', lat: 35.7101, lng: 139.8107, durationMin: 60 },
  { id: 'jp-5', day: 1, date: '2026-06-15', title: 'Shibuya Crossing', location: 'Shibuya Crossing', lat: 35.6595, lng: 139.7005, durationMin: 60 },
  { id: 'jp-6', day: 1, date: '2026-06-15', title: 'Shinjuku Hotel End', location: 'Shinjuku', lat: 35.6896, lng: 139.7006, durationMin: 10, fixedOrder: true },
];

const NEWYORK_SEED_STOPS: DraftStop[] = [
  { id: 'ny-1', day: 1, date: '2026-06-22', title: 'Penn Station Start', location: 'Penn Station', lat: 40.7506, lng: -73.9935, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'ny-2', day: 1, date: '2026-06-22', title: 'Times Square', location: 'Times Square', lat: 40.758, lng: -73.9855, durationMin: 45 },
  { id: 'ny-3', day: 1, date: '2026-06-22', title: 'Central Park South', location: 'Central Park South', lat: 40.7661, lng: -73.9776, durationMin: 60 },
  { id: 'ny-4', day: 1, date: '2026-06-22', title: 'The Met', location: 'The Metropolitan Museum of Art', lat: 40.7794, lng: -73.9632, durationMin: 90 },
  { id: 'ny-5', day: 1, date: '2026-06-22', title: 'Brooklyn Bridge Park', location: 'Brooklyn Bridge Park', lat: 40.7003, lng: -73.9967, durationMin: 60 },
  { id: 'ny-6', day: 1, date: '2026-06-22', title: 'JFK End', location: 'JFK Airport', lat: 40.6413, lng: -73.7781, durationMin: 10, fixedOrder: true },
];

// Chinese versions of seed stops for Chinese sample presets
const SHANGHAI_SEED_STOPS_CN: DraftStop[] = [
  { id: 'd1-1', day: 1, date: '2026-05-01', title: '虹桥火车站', location: '上海虹桥火车站', lat: 31.1945, lng: 121.3209, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'd1-2', day: 1, date: '2026-05-01', title: '外滩', location: '上海外滩', lat: 31.2394, lng: 121.4904, durationMin: 60 },
  { id: 'd1-3', day: 1, date: '2026-05-01', title: '豫园', location: '上海豫园', lat: 31.2274, lng: 121.4921, durationMin: 60 },
  { id: 'd1-4', day: 1, date: '2026-05-01', title: '南京路午餐', location: '上海南京路', lat: 31.2348, lng: 121.4817, durationMin: 75, latest: '13:00' },
  { id: 'd1-5', day: 1, date: '2026-05-01', title: '新天地', location: '上海新天地', lat: 31.2199, lng: 121.4736, durationMin: 60 },
  { id: 'd1-6', day: 1, date: '2026-05-01', title: '人民广场酒店', location: '上海人民广场', lat: 31.2304, lng: 121.4737, durationMin: 10, fixedOrder: true },

  { id: 'd2-1', day: 2, date: '2026-05-02', title: '人民广场酒店', location: '上海人民广场', lat: 31.2304, lng: 121.4737, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'd2-2', day: 2, date: '2026-05-02', title: '上海博物馆', location: '上海博物馆', lat: 31.2305, lng: 121.4737, durationMin: 90 },
  { id: 'd2-3', day: 2, date: '2026-05-02', title: '静安寺', location: '上海静安寺', lat: 31.2237, lng: 121.4451, durationMin: 60 },
  { id: 'd2-4', day: 2, date: '2026-05-02', title: '武康路', location: '上海武康路', lat: 31.211, lng: 121.4374, durationMin: 90 },
  { id: 'd2-5', day: 2, date: '2026-05-02', title: '法租界咖啡小憩', location: '上海原法租界', lat: 31.2093, lng: 121.4537, durationMin: 60 },
  { id: 'd2-6', day: 2, date: '2026-05-02', title: '回酒店', location: '上海人民广场', lat: 31.2304, lng: 121.4737, durationMin: 10, fixedOrder: true },

  { id: 'd3-1', day: 3, date: '2026-05-03', title: '上海火车站', location: '上海火车站', lat: 31.2492, lng: 121.4557, durationMin: 10, earliest: '08:30', fixedOrder: true },
  { id: 'd3-2', day: 3, date: '2026-05-03', title: '拙政园', location: '苏州拙政园', lat: 31.3277, lng: 120.6296, durationMin: 90 },
  { id: 'd3-3', day: 3, date: '2026-05-03', title: '狮子林', location: '苏州狮子林', lat: 31.3268, lng: 120.6285, durationMin: 60 },
  { id: 'd3-4', day: 3, date: '2026-05-03', title: '平江路午餐', location: '苏州平江路', lat: 31.3217, lng: 120.6333, durationMin: 75, latest: '13:30' },
  { id: 'd3-5', day: 3, date: '2026-05-03', title: '山塘街', location: '苏州山塘街', lat: 31.3055, lng: 120.5726, durationMin: 60 },
  { id: 'd3-6', day: 3, date: '2026-05-03', title: '返回上海酒店', location: '上海人民广场', lat: 31.2304, lng: 121.4737, durationMin: 10, fixedOrder: true },

  { id: 'd4-1', day: 4, date: '2026-05-04', title: '酒店出发', location: '上海人民广场', lat: 31.2304, lng: 121.4737, durationMin: 10, earliest: '08:30', fixedOrder: true },
  { id: 'd4-2', day: 4, date: '2026-05-04', title: '朱家角古镇', location: '朱家角古镇', lat: 31.1131, lng: 121.0583, durationMin: 120 },
  { id: 'd4-3', day: 4, date: '2026-05-04', title: '运河午餐', location: '朱家角老街', lat: 31.114, lng: 121.0598, durationMin: 60, latest: '13:00' },
  { id: 'd4-4', day: 4, date: '2026-05-04', title: '乘船游览', location: '朱家角水运河', lat: 31.1135, lng: 121.0575, durationMin: 60 },
  { id: 'd4-5', day: 4, date: '2026-05-04', title: '返回上海酒店', location: '上海人民广场', lat: 31.2304, lng: 121.4737, durationMin: 10, fixedOrder: true },

  { id: 'd5-1', day: 5, date: '2026-05-05', title: '酒店退房', location: '上海人民广场', lat: 31.2304, lng: 121.4737, durationMin: 10, earliest: '08:00', fixedOrder: true },
  { id: 'd5-2', day: 5, date: '2026-05-05', title: '西湖', location: '杭州西湖', lat: 30.2592, lng: 120.1548, durationMin: 60 },
  { id: 'd5-3', day: 5, date: '2026-05-05', title: '灵隐寺', location: '杭州灵隐寺', lat: 30.2429, lng: 120.1018, durationMin: 60 },
  { id: 'd5-4', day: 5, date: '2026-05-05', title: '龙井村午餐', location: '杭州龙井村', lat: 30.2148, lng: 120.1043, durationMin: 75, latest: '13:30' },
  { id: 'd5-5', day: 5, date: '2026-05-05', title: '清河坊街', location: '杭州清河坊街', lat: 30.2415, lng: 120.1689, durationMin: 90 },
  { id: 'd5-6', day: 5, date: '2026-05-05', title: '浦东机场', location: '上海浦东国际机场', lat: 31.1522, lng: 121.8053, durationMin: 10, fixedOrder: true },
];

const SHENZHEN_SEED_STOPS_CN: DraftStop[] = [
  { id: 'sz-1', day: 1, date: '2026-06-01', title: '深圳北站', location: '深圳北站', lat: 22.6087, lng: 114.0294, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'sz-2', day: 1, date: '2026-06-01', title: '锦绣中华民俗村', location: '锦绣中华民俗村', lat: 22.5423, lng: 113.9734, durationMin: 60 },
  { id: 'sz-3', day: 1, date: '2026-06-01', title: '欢乐海岸', location: '深圳欢乐海岸', lat: 22.5347, lng: 113.9831, durationMin: 60 },
  { id: 'sz-4', day: 1, date: '2026-06-01', title: '深圳湾公园', location: '深圳湾公园', lat: 22.5145, lng: 113.9469, durationMin: 75, latest: '13:30' },
  { id: 'sz-5', day: 1, date: '2026-06-01', title: '南头古城', location: '深圳南头古城', lat: 22.5338, lng: 113.9304, durationMin: 90 },
  { id: 'sz-6', day: 1, date: '2026-06-01', title: '世界之窗', location: '深圳世界之窗', lat: 22.5401, lng: 113.9737, durationMin: 60 },
  { id: 'sz-7', day: 1, date: '2026-06-01', title: '宝安机场', location: '深圳宝安国际机场', lat: 22.6393, lng: 113.8107, durationMin: 10, fixedOrder: true },
];

const BEIJING_SEED_STOPS_CN: DraftStop[] = [
  { id: 'bj-1', day: 1, date: '2026-06-08', title: '北京南站', location: '北京南站', lat: 39.8652, lng: 116.3786, durationMin: 10, earliest: '08:30', fixedOrder: true },
  { id: 'bj-2', day: 1, date: '2026-06-08', title: '天安门广场', location: '天安门广场', lat: 39.903, lng: 116.3975, durationMin: 45 },
  { id: 'bj-3', day: 1, date: '2026-06-08', title: '故宫', location: '北京故宫', lat: 39.9163, lng: 116.3972, durationMin: 120 },
  { id: 'bj-4', day: 1, date: '2026-06-08', title: '景山公园', location: '北京景山公园', lat: 39.923, lng: 116.3961, durationMin: 75, latest: '13:30' },
  { id: 'bj-5', day: 1, date: '2026-06-08', title: '王府井', location: '北京王府井', lat: 39.9155, lng: 116.4111, durationMin: 60 },
  { id: 'bj-6', day: 1, date: '2026-06-08', title: '雍和宫', location: '北京雍和宫', lat: 39.947, lng: 116.417, durationMin: 10, fixedOrder: true },
];

const TOKYO_SEED_STOPS_CN: DraftStop[] = [
  { id: 'jp-1', day: 1, date: '2026-06-15', title: '东京站', location: '东京站', lat: 35.6812, lng: 139.7671, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'jp-2', day: 1, date: '2026-06-15', title: '浅草寺', location: '浅草寺', lat: 35.7148, lng: 139.7967, durationMin: 60 },
  { id: 'jp-3', day: 1, date: '2026-06-15', title: '上野公园', location: '上野公园', lat: 35.7142, lng: 139.7741, durationMin: 60 },
  { id: 'jp-4', day: 1, date: '2026-06-15', title: '东京晴空塔', location: '东京晴空塔', lat: 35.7101, lng: 139.8107, durationMin: 60 },
  { id: 'jp-5', day: 1, date: '2026-06-15', title: '涩谷十字路口', location: '涩谷十字路口', lat: 35.6595, lng: 139.7005, durationMin: 60 },
  { id: 'jp-6', day: 1, date: '2026-06-15', title: '新宿酒店', location: '新宿', lat: 35.6896, lng: 139.7006, durationMin: 10, fixedOrder: true },
];

const NEWYORK_SEED_STOPS_CN: DraftStop[] = [
  { id: 'ny-1', day: 1, date: '2026-06-22', title: '宾夕法尼亚车站', location: '宾夕法尼亚车站', lat: 40.7506, lng: -73.9935, durationMin: 10, earliest: '09:00', fixedOrder: true },
  { id: 'ny-2', day: 1, date: '2026-06-22', title: '时代广场', location: '时代广场', lat: 40.758, lng: -73.9855, durationMin: 45 },
  { id: 'ny-3', day: 1, date: '2026-06-22', title: '中央公园南侧', location: '中央公园南侧', lat: 40.7661, lng: -73.9776, durationMin: 60 },
  { id: 'ny-4', day: 1, date: '2026-06-22', title: '大都会艺术博物馆', location: '大都会艺术博物馆', lat: 40.7794, lng: -73.9632, durationMin: 90 },
  { id: 'ny-5', day: 1, date: '2026-06-22', title: '布鲁克林大桥公园', location: '布鲁克林大桥公园', lat: 40.7003, lng: -73.9967, durationMin: 60 },
  { id: 'ny-6', day: 1, date: '2026-06-22', title: '肯尼迪机场', location: '肯尼迪机场', lat: 40.6413, lng: -73.7781, durationMin: 10, fixedOrder: true },
];

export const SEED_STOPS: DraftStop[] = SHANGHAI_SEED_STOPS;

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

function haversine(a: DraftStop, b: DraftStop) {
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

export function groupByDay(stops: DraftStop[]) {
  return stops.reduce<Record<number, DraftStop[]>>((acc, stop) => {
    acc[stop.day] = acc[stop.day] || [];
    acc[stop.day].push(stop);
    return acc;
  }, {});
}

function sortDaysByDateThenDay(days: Record<number, DraftStop[]>) {
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
  a: DraftStop,
  b: DraftStop,
  mode: TravelMode,
  provider: MapProvider,
) {
  const km = haversine(a, b) * 1.22;
  const base = (km / travelSpeed(mode)) * 60;
  const fixed = mode === 'transit' ? 8 : mode === 'walking' ? 2 : 4;
  return Math.max(5, Math.round((base + fixed) * providerFactor(provider)));
}

function nearestNeighborForDay(
  stops: DraftStop[],
  mode: TravelMode,
  objective: Objective,
  provider: MapProvider,
) {
  if (stops.length <= 2) return stops;

  const fixedStart = stops[0];
  const fixedEnd = stops[stops.length - 1];
  const middle = stops.slice(1, -1);
  const ordered: DraftStop[] = [fixedStart];
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
  stops: DraftStop[],
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
  stops: DraftStop[],
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
  stops: DraftStop[],
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

export function parseTripTextMock(raw: string, presetId?: string): DraftStop[] {
  const text = raw.trim();
  if (!text) return SHANGHAI_SEED_STOPS;

  // If presetId is provided, use it to determine language and location
  if (presetId) {
    const isChinese = presetId.includes('-chinese');

    // Chinese presets
    if (isChinese) {
      if (presetId.includes('shanghai')) return SHANGHAI_SEED_STOPS_CN;
      if (presetId.includes('shenzhen')) return SHENZHEN_SEED_STOPS_CN;
      if (presetId.includes('beijing')) return BEIJING_SEED_STOPS_CN;
      if (presetId.includes('japan') || presetId.includes('tokyo')) return TOKYO_SEED_STOPS_CN;
      if (presetId.includes('newyork')) return NEWYORK_SEED_STOPS_CN;
      // Taiwan and Hong Kong use Shanghai and Shenzhen as placeholders
      if (presetId.includes('taiwan')) return SHANGHAI_SEED_STOPS_CN;
      if (presetId.includes('hongkong')) return SHENZHEN_SEED_STOPS_CN;
    } else {
      // English presets
      if (presetId.includes('shanghai')) return SHANGHAI_SEED_STOPS;
      if (presetId.includes('shenzhen')) return SHENZHEN_SEED_STOPS;
      if (presetId.includes('beijing')) return BEIJING_SEED_STOPS;
      if (presetId.includes('japan') || presetId.includes('tokyo')) return TOKYO_SEED_STOPS;
      if (presetId.includes('newyork')) return NEWYORK_SEED_STOPS;
    }
  }

  // Fallback: Check for Chinese location names first
  if (/深圳/i.test(text)) return SHENZHEN_SEED_STOPS;
  if (/北京/i.test(text)) return BEIJING_SEED_STOPS;
  if (/东京|日本/i.test(text)) return TOKYO_SEED_STOPS;
  if (/纽约/i.test(text)) return NEWYORK_SEED_STOPS;
  if (/上海/i.test(text)) return SHANGHAI_SEED_STOPS;
  if (/台湾|台北/i.test(text)) return SHANGHAI_SEED_STOPS;
  if (/香港/i.test(text)) return SHENZHEN_SEED_STOPS;

  // Check for English location names
  if (/Shenzhen/i.test(text)) return SHENZHEN_SEED_STOPS;
  if (/Beijing/i.test(text)) return BEIJING_SEED_STOPS;
  if (/Tokyo|Japan/i.test(text)) return TOKYO_SEED_STOPS;
  if (/New\s*York|NYC/i.test(text)) return NEWYORK_SEED_STOPS;
  if (/Shanghai/i.test(text)) return SHANGHAI_SEED_STOPS;

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

function buildAmapUrl(dayStops: DraftStop[], mode: TravelMode) {
  const from = dayStops[0];
  const to = dayStops[dayStops.length - 1];
  const mids = dayStops.slice(1, -1);

  let url = `https://uri.amap.com/navigation?from=${from.lng},${from.lat},${encodeURIComponent(from.location)}&to=${to.lng},${to.lat},${encodeURIComponent(to.location)}&mode=${mapAmapMode(mode)}&policy=1&coordinate=gaode&callnative=0`;

  if (mids.length > 0) {
    const waypointCoords = mids.map((s) => `${s.lng},${s.lat}`).join(';');
    url += `&waypoints=${encodeURIComponent(waypointCoords)}`;
  }
  return url;
}

function buildGoogleUrl(dayStops: DraftStop[], mode: TravelMode) {
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
  stops: DraftStop[],
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
