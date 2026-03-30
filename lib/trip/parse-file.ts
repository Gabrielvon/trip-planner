/**
 * Client-side file parsers: CSV, Markdown table, ICS (iCalendar).
 * All functions are pure — no network calls, no server deps.
 *
 * Supported column order for CSV / Markdown:
 *   天 | 地点名称 | 地址/区域 | 到达时间 | 时长(分) | 类型 | 备注
 *
 * ICS: each VEVENT maps to one stop. Day index is inferred from DTSTART date.
 */

import { StructuredStop } from './types';

const CATEGORY_MAP: Record<string, StructuredStop['category']> = {
  观光: 'sightseeing',
  sightseeing: 'sightseeing',
  餐饮: 'meal',
  meal: 'meal',
  会议: 'meeting',
  meeting: 'meeting',
  住宿: 'hotel',
  hotel: 'hotel',
  交通: 'transport',
  transport: 'transport',
  自定义: 'custom',
  custom: 'custom',
};

function makeId() {
  return `fi-${Math.random().toString(36).slice(2, 8)}`;
}

function toCategory(raw: string): StructuredStop['category'] {
  return CATEGORY_MAP[raw?.trim().toLowerCase()] ?? 'custom';
}

function toDuration(raw: string): number {
  const n = parseInt(raw?.trim().replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 90;
}

function toDay(raw: string): number {
  const n = parseInt(raw?.trim().replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function toTime(raw: string): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  // Accept HH:MM or HH:MM:SS
  const m = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    return `${m[1].padStart(2, '0')}:${m[2]}`;
  }
  return undefined;
}

function parseQuotedDelimitedLine(line: string, delim: ',' | '\t'): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // Escaped quote inside quoted cell: ""
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === delim && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  out.push(current.trim());
  return out;
}

function parseLiteralDelimitedLine(line: string, delim: ',' | '\t'): string[] {
  return line.split(delim).map((cell) => cell.trim());
}

type DelimitedParseOptions = {
  delim?: ',' | '\t';
  quotedFields?: boolean;
};

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------
// Supports comma or tab delimited. First row can be a header (auto-detected).
// Column order: 天,名称,地址,到达时间,时长,类型,备注
function parseDelimitedText(text: string, options: DelimitedParseOptions = {}): StructuredStop[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delim = options.delim ?? (lines[0].includes('\t') ? '\t' : ',');
  const parseLine = options.quotedFields
    ? parseQuotedDelimitedLine
    : parseLiteralDelimitedLine;

  // Skip header row if it looks like one (first cell is not a number)
  const firstCell = parseLine(lines[0], delim)[0]?.trim() ?? '';
  const startIndex = /^\d+$/.test(firstCell) ? 0 : 1;

  const stops: StructuredStop[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseLine(lines[i], delim);
    if (cols.length < 2) continue;

    const [dayRaw, title, location = '', timeRaw = '', durRaw = '', catRaw = '', notes = ''] =
      cols;

    if (!title) continue;

    stops.push({
      id: makeId(),
      day: toDay(dayRaw),
      title,
      location: location || title,
      earliestStart: toTime(timeRaw),
      durationMin: toDuration(durRaw),
      category: toCategory(catRaw),
      notes: notes || undefined,
    });
  }

  return stops;
}

export function parseCSV(text: string): StructuredStop[] {
  return parseDelimitedText(text, { delim: ',', quotedFields: true });
}

// ---------------------------------------------------------------------------
// Markdown table parser
// ---------------------------------------------------------------------------
// Accepts standard GFM table:
//   | 天 | 名称 | 地址 | 时间 | 时长 | 类型 | 备注 |
//   |---|---|---|---|---|---|---|
//   | 1 | 浅草寺 | 东京浅草 | 09:00 | 90 | 观光 | |
export function parseMarkdown(text: string): StructuredStop[] {
  const stops: StructuredStop[] = [];

  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'));

  for (const row of rows) {
    const cols = row
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());

    // Skip header / separator rows
    if (cols.every((c) => !c || /^[-:]+$/.test(c))) continue;
    if (!/^\d/.test(cols[0])) continue;

    const [dayRaw, title, location = '', timeRaw = '', durRaw = '', catRaw = '', notes = ''] =
      cols;

    if (!title) continue;

    stops.push({
      id: makeId(),
      day: toDay(dayRaw),
      title,
      location: location || title,
      earliestStart: toTime(timeRaw),
      durationMin: toDuration(durRaw),
      category: toCategory(catRaw),
      notes: notes || undefined,
    });
  }

  return stops;
}

// ---------------------------------------------------------------------------
// ICS / iCalendar parser
// ---------------------------------------------------------------------------

// Module-scope helpers (shared by parseICSEvents and icsEventsToStops)
function extractDate(dtStr: string): string {
  // DTSTART;TZID=...:20240401T090000  or  20240401  or  20240401T090000Z
  return dtStr.replace(/^[^:]*:/, '').substring(0, 8);
}

function toIsoDate(yyyymmdd: string): string | undefined {
  if (!/^\d{8}$/.test(yyyymmdd)) return undefined;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function extractHHMM(dtStr: string): string | undefined {
  const clean = dtStr.replace(/^[^:]*:/, '');
  const m = clean.match(/T(\d{2})(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  return undefined;
}

function diffMinutes(start: string, end: string): number {
  const s = start.replace(/^[^:]*:/, '');
  const e = end.replace(/^[^:]*:/, '');
  const parseTs = (ts: string) => {
    const m = ts.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
  };
  const tStart = parseTs(s);
  const tEnd = parseTs(e);
  if (tStart === null || tEnd === null) return 90;
  return Math.max(5, Math.round((tEnd - tStart) / 60000));
}

function parseDuration(dur: string): number {
  // PT1H30M, PT90M, P1DT2H, etc.
  let mins = 0;
  const days = dur.match(/(\d+)D/);
  const hours = dur.match(/(\d+)H/);
  const minutes = dur.match(/(\d+)M/);
  if (days) mins += parseInt(days[1], 10) * 1440;
  if (hours) mins += parseInt(hours[1], 10) * 60;
  if (minutes) mins += parseInt(minutes[1], 10);
  return mins > 0 ? mins : 90;
}

/** Raw VEVENT data with extracted dateStr for external date-range filtering. */
export type ICSEvent = {
  summary: string;
  location: string;
  dtstart: string;
  dtend: string;
  duration: string;
  description: string;
  /** YYYYMMDD string extracted from DTSTART */
  dateStr: string;
};

/** Parse all VEVENTs from ICS text into raw events — no day-number mapping yet. */
export function parseICSEvents(text: string): ICSEvent[] {
  const veventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi;
  const events: ICSEvent[] = [];

  let match: RegExpExecArray | null;
  while ((match = veventRegex.exec(text)) !== null) {
    const block = match[1];
    const get = (key: string) => {
      const unfolded = block.replace(/\r?\n[ \t]/g, '');
      const m = unfolded.match(new RegExp(`^${key}[;:][^\r\n]*`, 'm'));
      if (!m) return '';
      return m[0].replace(/^[^:]+:/, '').trim();
    };
    const dtstart = get('DTSTART');
    events.push({
      summary: get('SUMMARY'),
      location: get('LOCATION'),
      dtstart,
      dtend: get('DTEND'),
      duration: get('DURATION'),
      description: get('DESCRIPTION'),
      dateStr: extractDate(dtstart),
    });
  }

  return events;
}

/**
 * Convert ICSEvent[] → StructuredStop[].
 * Optionally filter by [startDate, endDate] (YYYYMMDD strings, inclusive).
 * Day numbers are remapped from 1 based on remaining unique dates after filtering.
 */
export function icsEventsToStops(
  events: ICSEvent[],
  startDate?: string,
  endDate?: string,
): StructuredStop[] {
  let filtered = events.filter((e) => e.summary);
  if (startDate) filtered = filtered.filter((e) => e.dateStr >= startDate);
  if (endDate) filtered = filtered.filter((e) => e.dateStr <= endDate);
  if (filtered.length === 0) return [];

  const uniqueDates = [...new Set(filtered.map((e) => e.dateStr).filter(Boolean))].sort();
  const dateToDay = Object.fromEntries(uniqueDates.map((d, i) => [d, i + 1]));

  return filtered.map((e) => {
    const day = dateToDay[e.dateStr] ?? 1;
    let durationMin = 90;
    if (e.dtend) {
      durationMin = diffMinutes(e.dtstart, e.dtend);
    } else if (e.duration) {
      durationMin = parseDuration(e.duration);
    }
    return {
      id: makeId(),
      day,
      date: toIsoDate(e.dateStr),
      title: e.summary,
      location: e.location || e.summary,
      earliestStart: extractHHMM(e.dtstart),
      durationMin,
      category: toCategory(e.description),
      notes:
        e.description && !CATEGORY_MAP[e.description.trim().toLowerCase()]
          ? e.description
          : undefined,
    };
  });
}

/** Convenience: parse all events, convert to stops without date filtering. */
export function parseICS(text: string): StructuredStop[] {
  return icsEventsToStops(parseICSEvents(text));
}

// ---------------------------------------------------------------------------
// Detect file type and dispatch
// ---------------------------------------------------------------------------
export type ParseResult =
  | { ok: true; stops: StructuredStop[]; format: string; icsDates?: string[] }
  | { ok: false; error: string };

export function parseFileText(filename: string, text: string): ParseResult {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  try {
    let stops: StructuredStop[] = [];
    let format = '';

    if (ext === 'ics' || ext === 'ical') {
      const events = parseICSEvents(text);
      stops = icsEventsToStops(events);
      format = 'iCalendar (.ics)';
      if (stops.length === 0) {
        return { ok: false, error: '未识别到任何日历事件，请检查 .ics 文件格式。' };
      }
      const icsDates = [...new Set(events.map((e) => e.dateStr).filter(Boolean))].sort();
      return { ok: true, stops, format, icsDates };
    } else if (ext === 'md' || ext === 'markdown') {
      stops = parseMarkdown(text);
      format = 'Markdown 表格 (.md)';
    } else if (ext === 'csv') {
      stops = parseCSV(text);
      format =
        ext === 'csv'
          ? 'CSV (.csv)'
          : ext === 'tsv'
            ? 'TSV (.tsv)'
            : '文本 (.txt, 自动识别分隔符)';
    } else if (ext === 'tsv') {
      stops = parseDelimitedText(text, { delim: '\t' });
      format = 'TSV (.tsv)';
    } else if (ext === 'txt') {
      stops = parseDelimitedText(text);
      format = 'Text (.txt, auto-detect delimiter)';
    } else if (ext === 'xlsx' || ext === 'xls') {
      return {
        ok: false,
        error:
          'Excel 文件请先在表格软件中另存为 CSV（文件 → 另存为 → .csv），再上传 CSV 文件。',
      };
    } else {
      // Try CSV as fallback for unknown extensions
      stops = parseCSV(text);
      format = '自动识别 (CSV)';
    }

    if (stops.length === 0) {
      return { ok: false, error: '未识别到任何行程条目，请检查文件格式。' };
    }

    return { ok: true, stops, format };
  } catch (err) {
    return {
      ok: false,
      error: `解析失败：${err instanceof Error ? err.message : '未知错误'}`,
    };
  }
}
