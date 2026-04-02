/**
 * Client-side file parsers: CSV, Markdown table, ICS (iCalendar).
 * All functions are pure: no network calls and no server dependencies.
 *
 * Supported column order for CSV / Markdown:
 *   Day | Draft stop | Location | Start time | Duration (minutes) | Category | Notes
 *
 * ICS: each VEVENT maps to one draft stop. Day index is inferred from DTSTART.
 */

import { StructuredDraftStop } from './types';

const CATEGORY_MAP: Record<string, StructuredDraftStop['category']> = {
  sightseeing: 'sightseeing',
  meal: 'meal',
  meeting: 'meeting',
  hotel: 'hotel',
  transport: 'transport',
  custom: 'custom',
};

function makeId() {
  return `fi-${Math.random().toString(36).slice(2, 8)}`;
}

function toCategory(raw: string): StructuredDraftStop['category'] {
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
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return undefined;
}

function parseDelimitedLine(line: string, delim: ',' | '\t'): string[] {
  const out: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
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

export function parseCSV(text: string): StructuredDraftStop[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const delim = lines[0].includes('\t') ? '\t' : ',';
  const firstCell = parseDelimitedLine(lines[0], delim)[0]?.trim() ?? '';
  const startIndex = /^\d+$/.test(firstCell) ? 0 : 1;

  const stops: StructuredDraftStop[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseDelimitedLine(lines[i], delim);
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

export function parseMarkdown(text: string): StructuredDraftStop[] {
  const stops: StructuredDraftStop[] = [];

  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'));

  for (const row of rows) {
    const cols = row
      .slice(1, -1)
      .split('|')
      .map((cell) => cell.trim());

    if (cols.every((cell) => !cell || /^[-:]+$/.test(cell))) continue;
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

function extractDate(dtStr: string): string {
  return dtStr.replace(/^[^:]*:/, '').substring(0, 8);
}

function toIsoDate(yyyymmdd: string): string | undefined {
  if (!/^\d{8}$/.test(yyyymmdd)) return undefined;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function extractHHMM(dtStr: string): string | undefined {
  const clean = dtStr.replace(/^[^:]*:/, '');
  const match = clean.match(/T(\d{2})(\d{2})/);
  if (match) return `${match[1]}:${match[2]}`;
  return undefined;
}

function diffMinutes(start: string, end: string): number {
  const s = start.replace(/^[^:]*:/, '');
  const e = end.replace(/^[^:]*:/, '');
  const parseTs = (ts: string) => {
    const match = ts.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
    if (!match) return null;
    return new Date(
      +match[1],
      +match[2] - 1,
      +match[3],
      +match[4],
      +match[5],
      +match[6],
    ).getTime();
  };
  const tStart = parseTs(s);
  const tEnd = parseTs(e);
  if (tStart === null || tEnd === null) return 90;
  return Math.max(5, Math.round((tEnd - tStart) / 60000));
}

function parseDuration(dur: string): number {
  let mins = 0;
  const days = dur.match(/(\d+)D/);
  const hours = dur.match(/(\d+)H/);
  const minutes = dur.match(/(\d+)M/);
  if (days) mins += parseInt(days[1], 10) * 1440;
  if (hours) mins += parseInt(hours[1], 10) * 60;
  if (minutes) mins += parseInt(minutes[1], 10);
  return mins > 0 ? mins : 90;
}

export type ICSEvent = {
  summary: string;
  location: string;
  dtstart: string;
  dtend: string;
  duration: string;
  description: string;
  dateStr: string;
};

export function parseICSEvents(text: string): ICSEvent[] {
  const veventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/gi;
  const events: ICSEvent[] = [];

  let match: RegExpExecArray | null;
  while ((match = veventRegex.exec(text)) !== null) {
    const block = match[1];
    const get = (key: string) => {
      const unfolded = block.replace(/\r?\n[ \t]/g, '');
      const keyMatch = unfolded.match(new RegExp(`^${key}[;:][^\r\n]*`, 'm'));
      if (!keyMatch) return '';
      return keyMatch[0].replace(/^[^:]+:/, '').trim();
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

export function icsEventsToStops(
  events: ICSEvent[],
  startDate?: string,
  endDate?: string,
): StructuredDraftStop[] {
  let filtered = events.filter((event) => event.summary);
  if (startDate) filtered = filtered.filter((event) => event.dateStr >= startDate);
  if (endDate) filtered = filtered.filter((event) => event.dateStr <= endDate);
  if (filtered.length === 0) return [];

  const uniqueDates = [...new Set(filtered.map((event) => event.dateStr).filter(Boolean))].sort();
  const dateToDay = Object.fromEntries(uniqueDates.map((date, index) => [date, index + 1]));

  return filtered.map((event) => {
    const day = dateToDay[event.dateStr] ?? 1;
    let durationMin = 90;
    if (event.dtend) {
      durationMin = diffMinutes(event.dtstart, event.dtend);
    } else if (event.duration) {
      durationMin = parseDuration(event.duration);
    }
    return {
      id: makeId(),
      day,
      date: toIsoDate(event.dateStr),
      title: event.summary,
      location: event.location || event.summary,
      earliestStart: extractHHMM(event.dtstart),
      durationMin,
      category: toCategory(event.description),
      notes:
        event.description && !CATEGORY_MAP[event.description.trim().toLowerCase()]
          ? event.description
          : undefined,
    };
  });
}

export function parseICS(text: string): StructuredDraftStop[] {
  return icsEventsToStops(parseICSEvents(text));
}

export type FileParseResult =
  | { ok: true; stops: StructuredDraftStop[]; format: string; icsDates?: string[] }
  | { ok: false; error: string };

export function parseFileText(filename: string, text: string): FileParseResult {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  try {
    let stops: StructuredDraftStop[] = [];
    let format = '';

    if (ext === 'ics' || ext === 'ical') {
      const events = parseICSEvents(text);
      stops = icsEventsToStops(events);
      format = 'iCalendar (.ics)';
      if (stops.length === 0) {
        return {
          ok: false,
          error: 'No calendar events were detected. Check that the .ics export is valid.',
        };
      }
      const icsDates = [...new Set(events.map((event) => event.dateStr).filter(Boolean))].sort();
      return { ok: true, stops, format, icsDates };
    } else if (ext === 'md' || ext === 'markdown') {
      stops = parseMarkdown(text);
      format = 'Markdown table (.md)';
    } else if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
      stops = parseCSV(text);
      format =
        ext === 'csv'
          ? 'CSV (.csv)'
          : ext === 'tsv'
            ? 'TSV (.tsv)'
            : 'Plain text table (.txt)';
    } else if (ext === 'xlsx' || ext === 'xls') {
      return {
        ok: false,
        error:
          'Excel files are not imported directly. Save the sheet as CSV UTF-8, then import the CSV file.',
      };
    } else {
      stops = parseCSV(text);
      format = 'Detected CSV-style text';
    }

    if (stops.length === 0) {
      return {
        ok: false,
        error: 'No draft rows were detected. Check the file format and column order.',
      };
    }

    return { ok: true, stops, format };
  } catch (err) {
    return {
      ok: false,
      error: `Import failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}
