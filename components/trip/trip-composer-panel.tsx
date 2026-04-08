'use client';

import FileImporter from '@/components/trip/file-importer';
import LLMConfigPanel from '@/components/trip/llm-config-panel';
import StructuredForm from '@/components/trip/structured-form';
import { SAMPLE_PRESETS } from '@/lib/trip/mock';
import type { RuntimeMode } from '@/lib/trip/trip-flow-state';
import type { DraftStop, StructuredDraftStop } from '@/lib/trip/types';
import type { TripInputMode } from '@/lib/trip/use-trip-workspace';

type ParsedDayMap = Record<number, DraftStop[]>;

type TripComposerPanelProps = {
  inputMode: TripInputMode;
  onInputModeChange: (mode: TripInputMode) => void;
  tripText: string;
  onTripTextChange: (value: string) => void;
  samplePresetId: string;
  onSamplePresetChange: (value: string) => void;
  onLoadSampleText: () => void;
  onLoadSampleDraft: () => void;
  parseLoading: boolean;
  onParseLive: () => void;
  onParseDemo: () => void;
  formRevision: number;
  formImportedStops: StructuredDraftStop[];
  onApplyStructuredDraft: (rows: StructuredDraftStop[]) => void;
  onFileImported: (rows: StructuredDraftStop[]) => void;
  optimizeLoading: boolean;
  navLoading: boolean;
  optimizeSlow: boolean;
  navSlow: boolean;
  runtimeMode: RuntimeMode;
  useDemoNavigationLabel: boolean;
  canOptimize: boolean;
  canNavigate: boolean;
  onRunOptimize: () => void;
  onRunNavigation: () => void;
  parsedDayMap: ParsedDayMap;
  draftStopCount: number;
  hasUserLLMConfig: boolean;
};

export default function TripComposerPanel({
  inputMode,
  onInputModeChange,
  tripText,
  onTripTextChange,
  samplePresetId,
  onSamplePresetChange,
  onLoadSampleText,
  onLoadSampleDraft,
  parseLoading,
  onParseLive,
  onParseDemo,
  formRevision,
  formImportedStops,
  onApplyStructuredDraft,
  onFileImported,
  optimizeLoading,
  navLoading,
  optimizeSlow,
  navSlow,
  runtimeMode,
  useDemoNavigationLabel,
  canOptimize,
  canNavigate,
  onRunOptimize,
  onRunNavigation,
  parsedDayMap,
  draftStopCount,
  hasUserLLMConfig,
}: TripComposerPanelProps) {
  return (
    <div className="space-y-4">
      {hasUserLLMConfig && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Using custom LLM configuration</span>
        </div>
      )}
      <div className="space-y-3 rounded-2xl border p-4">
        <div className="flex overflow-hidden rounded-xl border">
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              inputMode === 'text' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
            onClick={() => onInputModeChange('text')}
          >
            Text Input
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              inputMode === 'structured'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
            onClick={() => onInputModeChange('structured')}
          >
            Structured Draft
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              inputMode === 'file' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'
            }`}
            onClick={() => onInputModeChange('file')}
          >
            Import File
          </button>
        </div>

        {inputMode === 'text' ? (
          <>
            <textarea
              className="min-h-[220px] w-full rounded-xl border p-3"
              placeholder="Paste itinerary notes, meeting lists, or a multi-day plan..."
              value={tripText}
              onChange={(event) => onTripTextChange(event.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="rounded-xl border p-2"
                value={samplePresetId}
                onChange={(event) => onSamplePresetChange(event.target.value)}
              >
                {SAMPLE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <button className="rounded-xl border px-4 py-2" onClick={onLoadSampleText}>
                Load sample text
              </button>
              <button
                className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                disabled={parseLoading || !tripText.trim()}
                onClick={onParseLive}
              >
                {parseLoading ? 'Parsing...' : 'Run live parse'}
              </button>
              <button
                className="rounded-xl border px-4 py-2 disabled:opacity-50"
                disabled={parseLoading || !tripText.trim()}
                onClick={onParseDemo}
              >
                Run demo parse
              </button>
            </div>
          </>
        ) : inputMode === 'structured' ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="rounded-xl border p-2"
                value={samplePresetId}
                onChange={(event) => onSamplePresetChange(event.target.value)}
              >
                {SAMPLE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <button className="rounded-xl border px-4 py-2" onClick={onLoadSampleDraft}>
                Load sample draft
              </button>
            </div>
            <StructuredForm
              key={formRevision}
              stops={formImportedStops.length > 0 ? formImportedStops : undefined}
              onApply={onApplyStructuredDraft}
            />
          </>
        ) : (
          <FileImporter onToForm={onFileImported} />
        )}
      </div>

      <LLMConfigPanel />

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
          disabled={optimizeLoading || !canOptimize}
          onClick={onRunOptimize}
        >
          {optimizeLoading
            ? 'Optimizing...'
            : runtimeMode === 'demo'
              ? 'Run demo optimization'
              : 'Run live optimization'}
        </button>
        <button
          className="rounded-xl border px-4 py-2 disabled:opacity-50"
          disabled={navLoading || optimizeLoading || !canNavigate}
          onClick={onRunNavigation}
        >
          {navLoading
            ? 'Building links...'
            : useDemoNavigationLabel || runtimeMode === 'demo'
              ? 'Generate demo navigation'
              : 'Generate live navigation'}
        </button>
      </div>

      {(optimizeLoading || navLoading) && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
          <span>
            {optimizeLoading
              ? optimizeSlow
                ? 'Optimization is taking longer than usual. The app is still waiting for a result.'
                : 'Optimizing the route...'
              : navSlow
                ? 'Navigation links are taking longer than usual. The app is still waiting for a result.'
                : 'Generating navigation links...'}
          </span>
        </div>
      )}

      {draftStopCount > 0 && (
        <div className="space-y-3 rounded-2xl border p-4">
          <div className="font-medium">Parsed Draft</div>
          {Object.keys(parsedDayMap).map((dayKey) => {
            const day = Number(dayKey);
            const items = parsedDayMap[day];
            const dayDate = items.find((stop) => stop.date)?.date;

            return (
              <div key={day} className="space-y-2">
                <div className="text-sm font-medium">
                  Day {day}
                  {dayDate ? ` (${dayDate})` : ''}
                </div>
                {items.map((stop) => (
                  <div key={stop.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="font-medium">{stop.title}</div>
                    <div className="text-slate-500">{stop.location}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
