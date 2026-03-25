'use client';

import { useMemo, useRef, useState } from 'react';
import {
  ICSEvent,
  ParseResult,
  icsEventsToStops,
  parseFileText,
  parseICSEvents,
} from '@/lib/trip/parse-file';
import { StructuredStop } from '@/lib/trip/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ACCEPT = '.csv,.tsv,.md,.markdown,.ics,.ical,.txt';

const FORMAT_HINTS = [
  {
    title: 'CSV / TSV',
    ext: '.csv',
    desc: '列顺序：天, 名称, 地址, 到达时间, 时长(分), 类型, 备注',
    example: '1,浅草寺,东京浅草,09:00,90,观光,',
  },
  {
    title: 'Markdown 表格',
    ext: '.md',
    desc: '标准 GFM 管道表格，首列为天数',
    example: '| 1 | 浅草寺 | 东京浅草 | 09:00 | 90 | 观光 | |',
  },
  {
    title: 'iCalendar',
    ext: '.ics',
    desc: '苹果日历 / Nextcloud 日历导出文件，每个 VEVENT 为一个地点',
    example: '支持筛选日期范围；LOCATION 作为地址，DTEND-DTSTART 计算时长',
  },
  {
    title: 'Excel (.xlsx)',
    ext: '',
    desc: '请在 Excel 中另存为 CSV 后上传',
    example: '文件 → 另存为 → CSV UTF-8 (.csv)',
  },
];

type Props = {
  /** Called when user confirms import; parent should switch to structured-form tab. */
  onToForm: (stops: StructuredStop[]) => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDate(d: string): string {
  if (d.length !== 8) return d;
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
}

// ---------------------------------------------------------------------------
// Calendar export instructions
// ---------------------------------------------------------------------------
const CAL_INSTRUCTIONS = [
  {
    name: '苹果日历 (macOS)',
    steps: [
      '打开"日历"应用',
      '选中目标日历或若干事件',
      '菜单：文件 → 导出 → 导出…',
      '保存为 .ics 文件后上传',
    ],
  },
  {
    name: 'Nextcloud 日历',
    steps: [
      '打开 Nextcloud → 日历',
      '点击日历名称旁的"⋯"菜单',
      '选择"导出"',
      '下载 .ics 文件后上传',
    ],
  },
  {
    name: '苹果日历 (iPhone / iPad)',
    steps: [
      '系统日历不支持直接导出',
      '推荐：在 Mac 上导出，或使用第三方 App（如 iExplorer）',
    ],
  },
];

export default function FileImporter({ onToForm }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [showCalInstructions, setShowCalInstructions] = useState(false);

  // Non-ICS parse result
  const [directStops, setDirectStops] = useState<StructuredStop[] | null>(null);

  // ICS-specific state
  const [rawICSEvents, setRawICSEvents] = useState<ICSEvent[] | null>(null);
  const [icsDates, setIcsDates] = useState<string[] | null>(null);
  const [icsStartDate, setIcsStartDate] = useState('');
  const [icsEndDate, setIcsEndDate] = useState('');

  // Derived preview — automatically reflects ICS date-filter changes
  const preview: StructuredStop[] | null = useMemo(() => {
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
      if (events.filter((e) => e.summary).length === 0) {
        setStatus({ text: '未识别到任何日历事件，请检查 .ics 文件格式。', ok: false });
        return;
      }
      const dates = [...new Set(events.map((e) => e.dateStr).filter(Boolean))].sort();
      setRawICSEvents(events);
      setIcsDates(dates);
      setIcsStartDate(dates[0] ?? '');
      setIcsEndDate(dates[dates.length - 1] ?? '');
      setStatus({
        text: `已读取 ${events.filter((e) => e.summary).length} 个事件，日期范围 ${fmtDate(dates[0])} ～ ${fmtDate(dates[dates.length - 1])}`,
        ok: true,
      });
      return;
    }
    const result: ParseResult = parseFileText(filename, text);
    if (result.ok) {
      setDirectStops(result.stops);
      setStatus({ text: `已识别 ${result.stops.length} 个地点（格式：${result.format}）`, ok: true });
    } else {
      setStatus({ text: result.error, ok: false });
    }
  }

  function readFile(file: File) {
    resetState();
    const reader = new FileReader();
    reader.onload = (ev) => handleParsed(file.name, ev.target?.result as string);
    reader.onerror = () => setStatus({ text: '文件读取失败', ok: false });
    reader.readAsText(file, 'utf-8');
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) readFile(file);
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center hover:border-slate-400 hover:bg-slate-50 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={onFileChange}
        />
        <div className="text-slate-400 text-sm">
          点击或拖拽文件到此处
        </div>
        <div className="text-slate-400 text-xs mt-1">
          支持 .csv · .md · .ics（日历）
        </div>
      </div>

      {/* Status */}
      {status && (
        <div
          className={`rounded-xl border px-3 py-2 text-xs ${
            status.ok
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {status.text}
        </div>
      )}

      {/* ICS date-range filter */}
      {icsDates && icsDates.length > 1 && (
        <div className="rounded-xl border bg-blue-50 border-blue-200 p-3 space-y-2">
          <div className="text-xs font-medium text-blue-800">筛选日期范围</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-blue-600 mb-1">开始日期</div>
              <select
                className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs"
                value={icsStartDate}
                onChange={(e) => setIcsStartDate(e.target.value)}
              >
                {icsDates.map((d) => (
                  <option key={d} value={d}>{fmtDate(d)}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="text-xs text-blue-600 mb-1">结束日期</div>
              <select
                className="w-full rounded-lg border border-blue-200 bg-white px-2 py-1.5 text-xs"
                value={icsEndDate}
                onChange={(e) => setIcsEndDate(e.target.value)}
              >
                {icsDates.map((d) => (
                  <option key={d} value={d}>{fmtDate(d)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-xs text-blue-600">筛选后：{preview?.length ?? 0} 个事件</div>
        </div>
      )}

      {/* Preview table */}
      {preview !== null && preview.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-500">预览（前 10 条）</div>
          <div className="overflow-x-auto rounded-xl border text-xs">
            <table className="w-full">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  {['天', '名称', '地址', '时间', '时长', '类型'].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-2 py-1 text-slate-500">D{s.day}</td>
                    <td className="px-2 py-1 font-medium">{s.title}</td>
                    <td className="px-2 py-1 text-slate-500 max-w-[120px] truncate">{s.location}</td>
                    <td className="px-2 py-1 text-slate-500">{s.earliestStart ?? '—'}</td>
                    <td className="px-2 py-1 text-slate-500">{s.durationMin}m</td>
                    <td className="px-2 py-1 text-slate-500">{s.category}</td>
                  </tr>
                ))}
                {preview.length > 10 && (
                  <tr className="border-t">
                    <td colSpan={6} className="px-2 py-1 text-center text-slate-400">
                      …还有 {preview.length - 10} 条
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => onToForm(preview)}
            className="w-full rounded-xl bg-slate-900 py-2 text-xs text-white"
          >
            导入 {preview.length} 个地点并在表单中编辑 →
          </button>
        </div>
      )}

      {/* Calendar export instructions */}
      <div className="border-t pt-2 space-y-1">
        <button
          type="button"
          onClick={() => setShowCalInstructions((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <span>{showCalInstructions ? '▾' : '▸'}</span>
          如何从苹果日历 / Nextcloud 导出 .ics？
        </button>

        {showCalInstructions && (
          <div className="space-y-3 pt-1">
            {CAL_INSTRUCTIONS.map((cal) => (
              <div key={cal.name} className="rounded-xl border p-2.5 text-xs space-y-1">
                <div className="font-medium text-slate-700">{cal.name}</div>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-500">
                  {cal.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Format reference */}
      <div className="border-t pt-2 space-y-1">
        <button
          type="button"
          onClick={() => setShowHints((v) => !v)}
          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <span>{showHints ? '▾' : '▸'}</span>
          支持的文件格式说明
        </button>

        {showHints && (
          <div className="space-y-2 pt-1">
            {FORMAT_HINTS.map((h) => (
              <div key={h.title} className="rounded-xl border p-2.5 text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">{h.title}</span>
                  {h.ext && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500 font-mono">
                      {h.ext}
                    </span>
                  )}
                </div>
                <div className="text-slate-500">{h.desc}</div>
                <div className="font-mono text-slate-400 bg-slate-50 rounded p-1 break-all">
                  {h.example}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
