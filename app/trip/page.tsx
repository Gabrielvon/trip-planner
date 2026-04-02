'use client';

import TripMap from '@/components/trip/trip-map';
import FileImporter from '@/components/trip/file-importer';
import StructuredForm from '@/components/trip/structured-form';
import { getSourceLabel } from '@/lib/trip/parse-client';
import { SAMPLE_PRESETS } from '@/lib/trip/mock';
import { MapProvider, Objective, TravelMode } from '@/lib/trip/types';
import { useTripWorkspace } from '@/lib/trip/use-trip-workspace';

export default function TripPage() {
  const {
    tripText,
    setTripText,
    travelMode,
    setTravelMode,
    objective,
    setObjective,
    mapProvider,
    setMapProvider,
    inputMode,
    setInputMode,
    samplePresetId,
    setSamplePresetId,
    formImportedStops,
    formRevision,
    flowState,
    workspaceState,
    optimization,
    parsedDayMap,
    currentTimezone,
    modeMeta,
    parseLoading,
    optimizeLoading,
    navLoading,
    optimizeSlow,
    navSlow,
    hasStarted,
    loadSamplePreset,
    applyStructuredDraft,
    handleFileImported,
    handleParseLive,
    handleParseDemo,
    runOptimize,
    runNavigation,
    handleRecoveryAction,
    toggleSelectedStop,
  } = useTripWorkspace();

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Trip Itinerary Compiler</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Turn messy notes, spreadsheets, and calendar exports into a reviewed multi-day
          itinerary, then generate a route you can actually execute.
        </p>
        <div className={`rounded-2xl border px-4 py-3 text-sm ${modeMeta.className}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold">Mode: {modeMeta.label}</span>
            <span>Source: {getSourceLabel(flowState.runtimeSource)}</span>
            <span>Timezone: {currentTimezone}</span>
          </div>
          <div className="mt-1 text-xs opacity-90">{modeMeta.description}</div>
          {flowState.lastAction ? (
            <div className="mt-2 text-xs opacity-90">Last action: {flowState.lastAction}</div>
          ) : null}
        </div>
      </div>

      {flowState.errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="font-medium">Live action failed</div>
          <div className="mt-1">{flowState.errorMessage}</div>
          {flowState.failedAction ? (
            <button
              className="mt-3 rounded-xl bg-rose-700 px-4 py-2 text-white"
              onClick={handleRecoveryAction}
            >
              Switch to demo for {flowState.failedAction}
            </button>
          ) : null}
        </div>
      ) : null}

      {flowState.warningMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="font-medium">Note</div>
          <div className="mt-1">{flowState.warningMessage}</div>
        </div>
      ) : null}

      <div
        className={`grid gap-6 ${
          hasStarted ? 'lg:grid-cols-[minmax(500px,560px)_minmax(0,1fr)]' : 'lg:grid-cols-1'
        }`}
      >
        <div className="space-y-4">
          <div className="space-y-3 rounded-2xl border p-4">
            <div className="flex overflow-hidden rounded-xl border">
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  inputMode === 'text'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                onClick={() => setInputMode('text')}
              >
                Text Input
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  inputMode === 'structured'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                onClick={() => setInputMode('structured')}
              >
                Structured Draft
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  inputMode === 'file'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
                onClick={() => setInputMode('file')}
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
                  onChange={(event) => setTripText(event.target.value)}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    className="rounded-xl border p-2"
                    value={samplePresetId}
                    onChange={(event) => setSamplePresetId(event.target.value)}
                  >
                    {SAMPLE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-xl border px-4 py-2"
                    onClick={() => loadSamplePreset('text')}
                  >
                    Load sample text
                  </button>
                  <button
                    className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                    disabled={parseLoading || !tripText.trim()}
                    onClick={() => void handleParseLive()}
                  >
                    {parseLoading ? 'Parsing...' : 'Run live parse'}
                  </button>
                  <button
                    className="rounded-xl border px-4 py-2 disabled:opacity-50"
                    disabled={parseLoading || !tripText.trim()}
                    onClick={() => void handleParseDemo()}
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
                    onChange={(event) => setSamplePresetId(event.target.value)}
                  >
                    {SAMPLE_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rounded-xl border px-4 py-2"
                    onClick={() => loadSamplePreset('structured')}
                  >
                    Load sample draft
                  </button>
                </div>
                <StructuredForm
                  key={formRevision}
                  stops={formImportedStops.length > 0 ? formImportedStops : undefined}
                  onApply={applyStructuredDraft}
                />
              </>
            ) : (
              <FileImporter onToForm={handleFileImported} />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
              disabled={optimizeLoading || workspaceState.draftStops.length === 0}
              onClick={runOptimize}
            >
              {optimizeLoading
                ? 'Optimizing...'
                : flowState.runtimeMode === 'demo'
                  ? 'Run demo optimization'
                  : 'Run live optimization'}
            </button>
            <button
              className="rounded-xl border px-4 py-2 disabled:opacity-50"
              disabled={navLoading || optimizeLoading || optimization.optimizedStops.length === 0}
              onClick={runNavigation}
            >
              {navLoading
                ? 'Building links...'
                : flowState.runtimeMode === 'demo' || !optimization.optimizedTrip
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

          {workspaceState.draftStops.length > 0 && (
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

        {hasStarted && (
          <div className="space-y-6">
            <div className="space-y-3 rounded-2xl border p-4">
              <div className="font-medium">Planning Settings</div>

              <div>
                <div className="mb-1 text-sm text-slate-600">Travel mode</div>
                <select
                  className="w-full rounded-xl border p-2"
                  value={travelMode}
                  onChange={(event) => setTravelMode(event.target.value as TravelMode)}
                >
                  <option value="driving">Driving</option>
                  <option value="walking">Walking</option>
                  <option value="cycling">Cycling</option>
                  <option value="transit">Transit</option>
                </select>
              </div>

              <div>
                <div className="mb-1 text-sm text-slate-600">Optimization goal</div>
                <select
                  className="w-full rounded-xl border p-2"
                  value={objective}
                  onChange={(event) => setObjective(event.target.value as Objective)}
                >
                  <option value="fastest">Fastest</option>
                  <option value="shortest">Shortest</option>
                  <option value="balanced">Balanced</option>
                </select>
              </div>

              <div>
                <div className="mb-1 text-sm text-slate-600">Map provider</div>
                <select
                  className="w-full rounded-xl border p-2"
                  value={mapProvider}
                  onChange={(event) => setMapProvider(event.target.value as MapProvider)}
                >
                  <option value="amap">AMap</option>
                  <option value="google">Google Maps</option>
                  <option value="mapbox">Mapbox</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-3 font-medium">Optimized Timeline</div>
              <div className="space-y-4">
                {optimization.schedule.days.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    No optimized result yet. Confirm a draft and run optimization first.
                  </div>
                ) : (
                  optimization.schedule.days.map((daySchedule) => (
                    <div key={daySchedule.day} className="space-y-2">
                      <div className="font-medium">
                        Day {daySchedule.day}
                        {daySchedule.timeline.find((stop) => stop.date)?.date
                          ? ` (${daySchedule.timeline.find((stop) => stop.date)?.date})`
                          : ''}
                      </div>
                      {daySchedule.timeline.map((item) => (
                        <div
                          key={item.id}
                          className={`cursor-pointer rounded-xl p-3 text-sm transition-colors ${
                            workspaceState.selectedStopId === item.id
                              ? 'bg-slate-200 ring-2 ring-slate-400'
                              : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                          onClick={() => toggleSelectedStop(item.id)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>{item.title}</div>
                            <div className="text-slate-500">
                              {item.arrival} - {item.departure}
                            </div>
                          </div>
                          <div className="text-slate-500">{item.location}</div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="mb-3 font-medium">Navigation Links</div>
              <div className="space-y-3">
                {workspaceState.navigationLinks.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    No navigation links yet. Generate them from the optimized trip.
                  </div>
                ) : (
                  workspaceState.navigationLinks.map((item) => (
                    <div key={item.day} className="rounded-xl bg-slate-50 p-3 text-sm">
                      <div className="font-medium">Day {item.day}</div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-slate-600 underline"
                      >
                        {item.url}
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

            <TripMap
              stops={optimization.optimizedStops}
              mapProvider={mapProvider}
              selectedStopId={workspaceState.selectedStopId}
              onStopSelect={toggleSelectedStop}
            />
          </div>
        )}
      </div>
    </div>
  );
}
