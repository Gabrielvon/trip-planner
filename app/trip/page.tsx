'use client';

import TripComposerPanel from '@/components/trip/trip-composer-panel';
import TripReviewPanel from '@/components/trip/trip-review-panel';
import TripRuntimeStatus from '@/components/trip/trip-runtime-status';
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
    navigationLinks,
    parsedDayMap,
    currentTimezone,
    modeMeta,
    parseLoading,
    optimizeLoading,
    navLoading,
    optimizeSlow,
    navSlow,
    hasStarted,
    useDemoOptimization,
    useDemoNavigation,
    hasUserLLMConfig,
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
      </div>

      <TripRuntimeStatus
        flowState={flowState}
        modeMeta={modeMeta}
        currentTimezone={currentTimezone}
        onRecoveryAction={handleRecoveryAction}
      />

      <div
        className={`grid gap-6 ${
          hasStarted ? 'lg:grid-cols-[minmax(500px,560px)_minmax(0,1fr)]' : 'lg:grid-cols-1'
        }`}
      >
        <TripComposerPanel
          inputMode={inputMode}
          onInputModeChange={setInputMode}
          tripText={tripText}
          onTripTextChange={setTripText}
          samplePresetId={samplePresetId}
          onSamplePresetChange={setSamplePresetId}
          onLoadSampleText={() => loadSamplePreset('text')}
          onLoadSampleDraft={() => loadSamplePreset('structured')}
          parseLoading={parseLoading}
          onParseLive={() => void handleParseLive()}
          onParseDemo={() => void handleParseDemo()}
          formRevision={formRevision}
          formImportedStops={formImportedStops}
          onApplyStructuredDraft={applyStructuredDraft}
          onFileImported={handleFileImported}
          optimizeLoading={optimizeLoading}
          navLoading={navLoading}
          optimizeSlow={optimizeSlow}
          navSlow={navSlow}
          runtimeMode={useDemoOptimization ? 'demo' : flowState.runtimeMode}
          useDemoNavigationLabel={useDemoNavigation}
          canOptimize={workspaceState.draftStops.length > 0}
          canNavigate={optimization.optimizedStops.length > 0}
          onRunOptimize={runOptimize}
          onRunNavigation={runNavigation}
          parsedDayMap={parsedDayMap}
          draftStopCount={workspaceState.draftStops.length}
          hasUserLLMConfig={hasUserLLMConfig}
        />

        {hasStarted && (
          <TripReviewPanel
            travelMode={travelMode}
            onTravelModeChange={setTravelMode}
            objective={objective}
            onObjectiveChange={setObjective}
            mapProvider={mapProvider}
            onMapProviderChange={setMapProvider}
            schedule={optimization.schedule}
            navigationLinks={navigationLinks}
            optimizedStops={optimization.optimizedStops}
            selectedStopId={workspaceState.selectedStopId}
            onStopSelect={toggleSelectedStop}
          />
        )}
      </div>
    </div>
  );
}
