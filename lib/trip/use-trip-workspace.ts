'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  navigationViaDemo,
  navigationViaRoute,
  optimizeViaDemo,
  optimizeViaRoute,
  parseViaDemo,
  parseViaRoute,
  TripClientError,
} from '@/lib/trip/parse-client';
import {
  MapProvider,
  Objective,
  StructuredDraftStop,
  TravelMode,
} from '@/lib/trip/types';
import { SAMPLE_PRESETS, groupByDay, parseTripTextMock } from '@/lib/trip/mock';
import {
  getModeMeta,
  initialTripFlowState,
  isActionActive,
  isActionSlow,
  tripFlowReducer,
} from '@/lib/trip/trip-flow-state';
import {
  initialTripWorkspaceState,
  selectOptimization,
  tripWorkspaceReducer,
} from '@/lib/trip/trip-workspace-state';
import {
  getVisibleNavigationLinks,
  getVisibleOptimizationState,
  getRecoveryActionTarget,
  hasWorkspaceStarted,
  shouldUseDemoNavigation,
  shouldUseDemoOptimization,
} from '@/lib/trip/trip-workspace-helpers';
import { structuredStopsToUiStops, uiStopsToStructuredStops } from '@/lib/trip/ui-mappers';

export type TripInputMode = 'text' | 'structured' | 'file';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof TripClientError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function useTripWorkspace() {
  const [tripText, setTripText] = useState('');
  const [travelMode, setTravelMode] = useState<TravelMode>('transit');
  const [objective, setObjective] = useState<Objective>('fastest');
  const [mapProvider, setMapProvider] = useState<MapProvider>('amap');
  const [inputMode, setInputMode] = useState<TripInputMode>('text');
  const [samplePresetId, setSamplePresetId] = useState(SAMPLE_PRESETS[0].id);
  const [formImportedStops, setFormImportedStops] = useState<StructuredDraftStop[]>([]);
  const [formRevision, setFormRevision] = useState(0);

  const [flowState, dispatchFlow] = useReducer(tripFlowReducer, initialTripFlowState);
  const [workspaceState, dispatchWorkspace] = useReducer(
    tripWorkspaceReducer,
    initialTripWorkspaceState,
  );

  const optimization = selectOptimization(workspaceState);
  const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';
  const planningSettings = {
    travelMode,
    objective,
    mapProvider,
    timezone: currentTimezone,
  };
  const visibleOptimization = getVisibleOptimizationState(optimization, planningSettings);
  const visibleNavigationLinks = getVisibleNavigationLinks(
    workspaceState.navigationLinks,
    optimization,
    planningSettings,
  );
  const parsedDayMap = useMemo(() => groupByDay(workspaceState.draftStops), [workspaceState.draftStops]);
  const modeMeta = getModeMeta(flowState.runtimeMode);
  const parseLoading = isActionActive(flowState, 'parse');
  const optimizeLoading = isActionActive(flowState, 'optimize');
  const navLoading = isActionActive(flowState, 'navigation');
  const optimizeSlow = isActionSlow(flowState, 'optimize');
  const navSlow = isActionSlow(flowState, 'navigation');
  const hasStarted = hasWorkspaceStarted({
    tripText,
    formImportedStopsCount: formImportedStops.length,
    draftStopCount: workspaceState.draftStops.length,
    optimizedStopCount: visibleOptimization.optimizedStops.length,
    navigationLinkCount: visibleNavigationLinks.length,
  });
  const useDemoOptimization = shouldUseDemoOptimization(flowState.runtimeMode);
  const useDemoNavigation = shouldUseDemoNavigation(
    flowState.runtimeMode,
    visibleOptimization.optimizedTrip,
  );

  function clearStatus() {
    dispatchFlow({ type: 'clearStatus' });
  }

  function setManualIdleContext(lastAction: string, warningMessage = '') {
    dispatchFlow({
      type: 'setIdleContext',
      source: 'manual',
      lastAction,
      warningMessage,
    });
  }

  function loadSamplePreset(targetInput: Exclude<TripInputMode, 'file'>) {
    const preset =
      SAMPLE_PRESETS.find((item) => item.id === samplePresetId) || SAMPLE_PRESETS[0];

    setMapProvider(preset.provider);
    clearStatus();
    dispatchWorkspace({ type: 'resetAll' });
    setManualIdleContext('');

    if (targetInput === 'text') {
      setTripText(preset.text);
      setManualIdleContext(
        `Loaded sample text: ${preset.label}`,
        'Sample preset loaded. Run it in live mode or demo mode explicitly.',
      );
      return;
    }

    const stops = parseTripTextMock(preset.text);
    const rows = uiStopsToStructuredStops(stops);
    setFormImportedStops(rows);
    setFormRevision((value) => value + 1);
    setManualIdleContext(
      `Loaded sample structured draft: ${preset.label}`,
      'Sample preset loaded into the structured editor.',
    );
  }

  function applyStructuredDraft(rows: StructuredDraftStop[]) {
    const stops = structuredStopsToUiStops(rows);

    clearStatus();
    dispatchWorkspace({ type: 'setDraft', draftStops: stops });
    setManualIdleContext(
      `Updated manual draft with ${stops.length} stops.`,
      'Manual draft is ready. Run optimization in live mode or demo mode explicitly.',
    );
  }

  function handleFileImported(rows: StructuredDraftStop[]) {
    setFormImportedStops(rows);
    setFormRevision((value) => value + 1);
    setInputMode('structured');
    clearStatus();
    dispatchWorkspace({ type: 'resetAll' });
    setManualIdleContext(
      `Imported ${rows.length} rows from file into the structured editor.`,
      'File import filled the structured editor. Review the draft and apply it before optimization.',
    );
  }

  function toggleSelectedStop(stopId: string) {
    dispatchWorkspace({ type: 'toggleSelectedStop', stopId });
  }

  useEffect(() => {
    if (!optimizeLoading) {
      return;
    }

    const timer = setTimeout(() => dispatchFlow({ type: 'markSlow', action: 'optimize' }), 1200);
    return () => clearTimeout(timer);
  }, [optimizeLoading]);

  useEffect(() => {
    if (!navLoading) {
      return;
    }

    const timer = setTimeout(() => dispatchFlow({ type: 'markSlow', action: 'navigation' }), 1200);
    return () => clearTimeout(timer);
  }, [navLoading]);

  async function handleParseLive() {
    dispatchFlow({ type: 'start', action: 'parse', lastAction: 'Running live parse...' });
    dispatchWorkspace({ type: 'resetAll' });

    try {
      const result = await parseViaRoute(tripText, {
        timezone: currentTimezone,
        mapProvider,
      });
      dispatchWorkspace({ type: 'setDraft', draftStops: result.stops });
      dispatchFlow({
        type: 'succeed',
        action: 'parse',
        mode: 'live',
        source: result.source,
        lastAction: 'Live parse completed.',
        warningMessage: result.warning,
      });
    } catch (error) {
      dispatchFlow({
        type: 'fail',
        action: 'parse',
        errorMessage: getErrorMessage(error, 'Live parse failed.'),
        lastAction: 'Live parse failed.',
      });
    }
  }

  async function handleParseDemo() {
    dispatchFlow({ type: 'start', action: 'parse', lastAction: 'Running demo parse...' });
    dispatchWorkspace({ type: 'resetAll' });

    const result = await parseViaDemo(tripText);
    dispatchWorkspace({ type: 'setDraft', draftStops: result.stops });
    dispatchFlow({
      type: 'succeed',
      action: 'parse',
      mode: 'demo',
      source: result.source,
      lastAction: 'Demo parse completed.',
      warningMessage: result.warning,
    });
  }

  async function handleOptimizeLive() {
    dispatchFlow({
      type: 'start',
      action: 'optimize',
      lastAction: 'Running live optimization...',
    });

    try {
      const result = await optimizeViaRoute(
        workspaceState.draftStops,
        travelMode,
        objective,
        mapProvider,
        currentTimezone,
      );

      dispatchWorkspace({
        type: 'setOptimization',
        optimizedStops: result.optimizedStops,
        schedule: result.schedule,
        optimizedTrip: result.optimizedTrip ?? null,
      });
      dispatchFlow({
        type: 'succeed',
        action: 'optimize',
        mode: 'live',
        source: result.source,
        lastAction: 'Live optimization completed.',
        warningMessage: result.warning,
      });
    } catch (error) {
      dispatchFlow({
        type: 'fail',
        action: 'optimize',
        errorMessage: getErrorMessage(error, 'Live optimization failed.'),
        lastAction: 'Live optimization failed.',
      });
    }
  }

  async function handleOptimizeDemo() {
    dispatchFlow({
      type: 'start',
      action: 'optimize',
      lastAction: 'Running demo optimization...',
    });

    const result = await optimizeViaDemo(
      workspaceState.draftStops,
      travelMode,
      objective,
      mapProvider,
      currentTimezone,
    );

    dispatchWorkspace({
      type: 'setOptimization',
      optimizedStops: result.optimizedStops,
      schedule: result.schedule,
      optimizedTrip: result.optimizedTrip ?? null,
    });
    dispatchFlow({
      type: 'succeed',
      action: 'optimize',
      mode: 'demo',
      source: result.source,
      lastAction: 'Demo optimization completed.',
      warningMessage: result.warning,
    });
  }

  async function handleNavigationLive() {
    dispatchFlow({
      type: 'start',
      action: 'navigation',
      lastAction: 'Generating live navigation links...',
    });

    try {
      const result = await navigationViaRoute(visibleOptimization.optimizedTrip);
      dispatchWorkspace({ type: 'setNavigationLinks', navigationLinks: result.links });
      dispatchFlow({
        type: 'succeed',
        action: 'navigation',
        mode: 'live',
        source: result.source,
        lastAction: 'Live navigation links generated.',
        warningMessage: result.warning,
      });
    } catch (error) {
      dispatchFlow({
        type: 'fail',
        action: 'navigation',
        errorMessage: getErrorMessage(error, 'Live navigation failed.'),
        lastAction: 'Live navigation failed.',
      });
    }
  }

  async function handleNavigationDemo() {
    dispatchFlow({
      type: 'start',
      action: 'navigation',
      lastAction: 'Generating demo navigation links...',
    });

    const result = await navigationViaDemo(optimization.optimizedStops, travelMode, mapProvider);
    dispatchWorkspace({ type: 'setNavigationLinks', navigationLinks: result.links });
    dispatchFlow({
      type: 'succeed',
      action: 'navigation',
      mode: 'demo',
      source: result.source,
      lastAction: 'Demo navigation links generated.',
      warningMessage: result.warning,
    });
  }

  function handleRecoveryAction() {
    const action = getRecoveryActionTarget(flowState.failedAction);

    if (action === 'parse') {
      void handleParseDemo();
      return;
    }

    if (action === 'optimize') {
      void handleOptimizeDemo();
      return;
    }

    if (action === 'navigation') {
      void handleNavigationDemo();
    }
  }

  function runOptimize() {
    if (useDemoOptimization) {
      void handleOptimizeDemo();
      return;
    }

    void handleOptimizeLive();
  }

  function runNavigation() {
    if (useDemoNavigation) {
      void handleNavigationDemo();
      return;
    }

    void handleNavigationLive();
  }

  return {
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
    optimization: visibleOptimization,
    navigationLinks: visibleNavigationLinks,
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
    loadSamplePreset,
    applyStructuredDraft,
    handleFileImported,
    handleParseLive,
    handleParseDemo,
    runOptimize,
    runNavigation,
    handleRecoveryAction,
    toggleSelectedStop,
  };
}
