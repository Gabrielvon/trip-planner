'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ICSEvent,
  FileParseResult,
  icsEventsToStops,
  parseFileText,
  parseICSEvents,
} from '@/lib/trip/parse-file';
import { StructuredDraftStop } from '@/lib/trip/types';

const ACCEPT = '.csv,.tsv,.md,.markdown,.ics,.ical,.txt';

const FORMAT_HINTS = [
  {
    title: 'CSV / TSV',
    ext: '.csv',
    desc: 'Expected columns: day, title, location, start time, duration (minutes), category, notes.',
    example: '1,Senso-ji,Asakusa Tokyo,09:00,90,sightseeing,',
  },
  {
    title: 'Markdown Table',
    ext: '.md',
    desc: 'Use a standard GitHub-flavored markdown table. The first column should be the day number.',
    example: '| 1 | Senso-ji | Asakusa Tokyo | 09:00 | 90 | sightseeing | |',
  },
  {
    title: 'iCalendar',
    ext: '.ics',
    desc: 'Calendar exports become draft rows. Each VEVENT becomes one draft stop.',
    example: 'LOCATION is used as the location field. DTEND-DTSTART becomes duration.',
  },
  {
    title: 'Excel (.xlsx)',
    ext: '',
    desc: 'Save the sheet as UTF-8 CSV before importing it here.',
    example: 'File -> Save As -> CSV UTF-8 (.csv)',
  },
];

const CAL_INSTRUCTIONS = [
  {
    name: 'Apple Calendar (macOS)',
    steps: [
      'Open Calendar.',
      'Select the calendar or events you want to export.',
      'Use File -> Export -> Export.',
      'Save the .ics file, then import it here.',
    ],
  },
  {
    name: 'Nextcloud Calendar',
    steps: [
      'Open Nextcloud Calendar.',
      'Open the menu next to the calendar name.',
      'Choose Export.',
      'Download the .ics file, then import it here.',
    ],
  },
  {
    name: 'iPhone / iPad',
    steps: [
      'The system Calendar app does not export .ics files directly.',
      'Use macOS Calendar, or export with a third-party tool first.',
    ],
  },
];

type Props = {
  onToForm: (stops: StructuredDraftStop[]) => void;
};

function fmtDate(d: string): string {
  if (d.length !== 8) return d;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

export default function FileImporter({ onToForm }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [showCalInstructions, setShowCalInstructions] = useState(false);
  const [directStops, setDirectStops] = useState<StructuredDraftStop[] | null>(null);
  const [rawICSEvents, setRawICSEvents] = useState<ICSEvent[] | null>(null);
  const [icsDates, setIcsDates] = useState<string[] | null>(null);
  const [icsStartDate, setIcsStartDate] = useState('');
  const [icsEndDate, setIcsEndDate] = useState('');

  const preview: StructuredDraftStop[] | null = useMemo(() => {
    if (rawICSEvents !== null && icsDates !== null) {
      return icsEventsToStops(rawICSEvents, icsStartDate || undefined, icsEndDate || undefined);
    }
    return directStops;
  }, [rawICSEvents, icsDates, icsStartDate, icsEndDate, directStops]);

  function resetState() {
    setStatus(null);
    setDirectStops(null);
    setRawICSEvents(null);
    setIcsDates(null);
    setIcsStartDate('');
    setIcsEndDate('');
  }

  function handleParsed(filename: string, text: string) {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'ics' || ext === 'ical') {
      const events = parseICSEvents(text);
      const eventCount = events.filter((event) => event.summary).length;
      if (eventCount === 0) {
        setStatus({
          text: 'No calendar events were detected in this file. Check that the .ics export is valid.',
          ok: false,
        });
        return;
      }

      const dates = [...new Set(events.map((event) => event.dateStr).filter(Boolean))].sort();
      setRawICSEvents(events);
      setIcsDates(dates);
      setIcsStartDate(dates[0] ?? '');
      setIcsEndDate(dates[dates.length - 1] ?? '');
      setStatus({
        text: `Draft import ready. Loaded ${eventCount} calendar events across ${fmtDate(dates[0])} to ${fmtDate(dates[dates.length - 1])}.`,
        ok: true,
      });
      return;
    }

    const result: FileParseResult = parseFileText(filename, text);
    if (result.ok) {
      setDirectStops(result.stops);
      setStatus({
        text: `Draft import ready. Parsed ${result.stops.length} draft rows from ${result.format}.`,
        ok: true,
      });
      return;
    }

    setStatus({ text: result.error, ok: false });
  }

  function readFile(file: File) {
    resetState();
    const reader = new FileReader();
    reader.onload = (event) => handleParsed(file.name, event.target?.result as string);
    reader.onerror = () => setStatus({ text: 'The file could not be read.', ok: false });
    reader.readAsText(file, 'utf-8');
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) readFile(file);
    event.target.value = '';
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={onDrop}
        onDragOver={(event) => event.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition-colors hover:border-slate-400 hover:bg-slate-50"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={onFileChange}
        />
        <div className="text-sm text-slate-500">Drop a file here, or click to import a draft.</div>
        <div className="mt-1 text-xs text-slate-400">
          Supported: `.csv`, `.tsv`, `.txt`, `.md`, `.ics`
        </div>
        <div className="mt-3 text-xs text-slate-500">
          File import only creates the draft. Optimization and navigation happen later.
        </div>
      </div>

      {status ? (
        <div
          className={`rounded-xl border px-3 py-2 text-xs ${
            status.ok
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {status.text}
        </div>
      ) : null}

      {icsDates && icsDates.length > 1 ? (
        <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="text-xs font-medium text-blue-800">Filter calendar dates before creating the draft</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 text-xs text-blue-600">Start date</div>
              <select
                className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs"
                value={icsStartDate}
                onChange={(event) => setIcsStartDate(event.target.value)}
              >
                {icsDates.map((date) => (
                  <option key={date} value={date}>
                    {fmtDate(date)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div className="mb-1 text-xs text-blue-600">End date</div>
              <select
                className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs"
                value={icsEndDate}
                onChange={(event) => setIcsEndDate(event.target.value)}
              >
                {icsDates.map((date) => (
                  <option key={date} value={date}>
                    {fmtDate(date)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-xs text-blue-600">
            Draft rows after filter: {preview?.length ?? 0}
          </div>
        </div>
      ) : null}

      {preview !== null && preview.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-500">Draft preview (first 10 rows)</div>
          <div className="overflow-x-auto rounded-xl border text-xs">
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['Day', 'Draft stop', 'Location', 'Start', 'Duration', 'Category'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-2 py-1.5 text-left font-medium">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((stop) => (
                  <tr key={stop.id} className="border-t">
                    <td className="px-2 py-1 text-slate-500">D{stop.day}</td>
                    <td className="px-2 py-1 font-medium">{stop.title}</td>
                    <td className="max-w-[140px] truncate px-2 py-1 text-slate-500">{stop.location}</td>
                    <td className="px-2 py-1 text-slate-500">{stop.earliestStart ?? 'Unset'}</td>
                    <td className="px-2 py-1 text-slate-500">{stop.durationMin} min</td>
                    <td className="px-2 py-1 text-slate-500">{stop.category}</td>
                  </tr>
                ))}
                {preview.length > 10 ? (
                  <tr className="border-t">
                    <td colSpan={6} className="px-2 py-1 text-center text-slate-400">
                      {preview.length - 10} more rows not shown
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => onToForm(preview)}
            className="w-full rounded-xl bg-slate-900 py-2 text-xs text-white"
          >
            Send {preview.length} draft rows to the Draft editor
          </button>
        </div>
      ) : null}

      <div className="space-y-1 border-t pt-2">
        <button
          type="button"
          onClick={() => setShowCalInstructions((value) => !value)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <span>{showCalInstructions ? '-' : '+'}</span>
          How to export `.ics` from Calendar or Nextcloud
        </button>

        {showCalInstructions ? (
          <div className="space-y-3 pt-1">
            {CAL_INSTRUCTIONS.map((calendar) => (
              <div key={calendar.name} className="space-y-1 rounded-xl border p-2.5 text-xs">
                <div className="font-medium text-slate-700">{calendar.name}</div>
                <ol className="list-inside list-decimal space-y-0.5 text-slate-500">
                  {calendar.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-1 border-t pt-2">
        <button
          type="button"
          onClick={() => setShowHints((value) => !value)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
        >
          <span>{showHints ? '-' : '+'}</span>
          Supported file formats
        </button>

        {showHints ? (
          <div className="space-y-2 pt-1">
            {FORMAT_HINTS.map((hint) => (
              <div key={hint.title} className="space-y-1 rounded-xl border p-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{hint.title}</span>
                  {hint.ext ? (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-500">
                      {hint.ext}
                    </span>
                  ) : null}
                </div>
                <div className="text-slate-500">{hint.desc}</div>
                <div className="break-all rounded bg-slate-50 p-1 font-mono text-slate-400">
                  {hint.example}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
