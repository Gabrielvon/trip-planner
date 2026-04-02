import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { loadTsModule } from './load-ts-module.mjs';

const {
  draftTripToStops,
  stopsToDraftTrip,
  optimizedTripToClientModel,
  optimizedRouteToClientModel,
  scheduleToOptimizedTrip,
} = loadTsModule('lib/trip/canonical-trip.ts');

const {
  readParseRequest,
  readOptimizeRequest,
  readNavigationRequest,
  RouteContractError,
} = loadTsModule('lib/trip/contracts.ts');

const { parseTripTextToDraft } = loadTsModule('lib/trip/server.ts');

const {
  initialTripFlowState,
  tripFlowReducer,
  getModeMeta,
  isActionActive,
  isActionSlow,
} = loadTsModule('lib/trip/trip-flow-state.ts');

const {
  EMPTY_OPTIMIZATION,
  EMPTY_SCHEDULE,
  initialTripWorkspaceState,
  tripWorkspaceReducer,
  selectOptimization,
} = loadTsModule('lib/trip/trip-workspace-state.ts');
const {
  getRecoveryActionTarget,
  getVisibleNavigationLinks,
  getVisibleOptimizationState,
  hasWorkspaceStarted,
  isOptimizationCompatible,
  shouldUseDemoNavigation,
  shouldUseDemoOptimization,
} = loadTsModule('lib/trip/trip-workspace-helpers.ts');

const { default: TripRuntimeStatus } = loadTsModule(
  'components/trip/trip-runtime-status.tsx',
);
const { default: TripComposerPanel } = loadTsModule(
  'components/trip/trip-composer-panel.tsx',
);
const { default: TripReviewPanel } = loadTsModule(
  'components/trip/trip-review-panel.tsx',
);

function makeDraftTrip() {
  return {
    timezone: 'Asia/Shanghai',
    mapProvider: 'amap',
    transportMode: 'driving',
    objective: 'balanced',
    days: [
      {
        day: 2,
        date: '2026-06-01',
        start: {
          name: 'Hotel Start',
          rawLocation: 'Hotel Start',
          resolvedPlace: {
            provider: 'amap',
            name: 'Hotel Start',
            lat: 31.2,
            lng: 121.5,
          },
          time: '08:30',
        },
        stops: [
          {
            id: 'stop-1',
            title: 'Breakfast',
            rawLocation: 'Breakfast Cafe',
            resolvedPlace: {
              provider: 'amap',
              name: 'Breakfast Cafe',
              lat: 31.21,
              lng: 121.51,
            },
            durationMin: 45,
            earliestStart: '09:00',
            latestArrival: '10:00',
            fixedOrder: false,
          },
        ],
        end: {
          name: 'Airport End',
          rawLocation: 'Airport End',
          resolvedPlace: {
            provider: 'amap',
            name: 'Airport End',
            lat: 31.3,
            lng: 121.6,
          },
        },
      },
    ],
    hardConstraints: [],
    source: { fromText: true },
  };
}

function makeSchedule() {
  return {
    days: [
      {
        day: 2,
        totalMinutes: 115,
        legs: [
          {
            day: 2,
            from: 'Hotel Start',
            to: 'Breakfast',
            minutes: 15,
          },
          {
            day: 2,
            from: 'Breakfast',
            to: 'Airport End',
            minutes: 35,
          },
        ],
        timeline: [
          {
            id: 'day-2-start',
            day: 2,
            date: '2026-06-01',
            title: 'Hotel Start',
            location: 'Hotel Start',
            lat: 31.2,
            lng: 121.5,
            durationMin: 10,
            earliest: '08:30',
            fixedOrder: true,
            arrival: '08:30',
            departure: '08:40',
            travelFromPrev: 0,
          },
          {
            id: 'stop-1',
            day: 2,
            date: '2026-06-01',
            title: 'Breakfast',
            location: 'Breakfast Cafe',
            lat: 31.21,
            lng: 121.51,
            durationMin: 45,
            earliest: '09:00',
            latest: '10:00',
            fixedOrder: false,
            arrival: '09:00',
            departure: '09:45',
            travelFromPrev: 15,
          },
          {
            id: 'day-2-end',
            day: 2,
            date: '2026-06-01',
            title: 'Airport End',
            location: 'Airport End',
            lat: 31.3,
            lng: 121.6,
            durationMin: 10,
            fixedOrder: true,
            arrival: '10:20',
            departure: '10:30',
            travelFromPrev: 35,
          },
        ],
      },
    ],
    totalMinutes: 115,
    totalTravel: 50,
    totalStay: 65,
  };
}

function render(element) {
  return renderToStaticMarkup(element);
}

test('canonical-trip preserves dates, locations, and summary fields across transforms', () => {
  const draftTrip = makeDraftTrip();
  const draftStops = draftTripToStops(draftTrip);

  assert.equal(draftStops.length, 3);
  assert.equal(draftStops[0].id, 'day-2-start');
  assert.equal(draftStops[0].date, '2026-06-01');
  assert.equal(draftStops[0].earliest, '08:30');
  assert.equal(draftStops[1].location, 'Breakfast Cafe');
  assert.equal(draftStops[1].latest, '10:00');
  assert.equal(draftStops[2].id, 'day-2-end');
  assert.equal(draftStops[2].fixedOrder, true);

  const roundTrip = stopsToDraftTrip(
    draftStops,
    'walking',
    'fastest',
    'google',
    'Asia/Shanghai',
  );

  assert.equal(roundTrip.title, 'Frontend trip draft');
  assert.equal(roundTrip.transportMode, 'walking');
  assert.equal(roundTrip.objective, 'fastest');
  assert.equal(roundTrip.mapProvider, 'google');
  assert.equal(roundTrip.days.length, 1);
  assert.equal(roundTrip.days[0].date, '2026-06-01');
  assert.equal(roundTrip.days[0].stops.length, 3);
  assert.equal(roundTrip.days[0].stops[0].resolvedPlace.provider, 'google');
  assert.equal(roundTrip.source.fromManualEdit, true);

  const schedule = makeSchedule();
  const optimizedTrip = scheduleToOptimizedTrip(roundTrip, draftStops, schedule);

  assert.equal(optimizedTrip.summary.totalDays, 1);
  assert.equal(optimizedTrip.summary.totalMinutes, 115);
  assert.equal(optimizedTrip.summary.totalTravelMinutes, 50);
  assert.equal(optimizedTrip.summary.totalStopMinutes, 65);
  assert.equal(optimizedTrip.optimizedDays[0].orderedStops[1].arrival, '09:00');
  assert.equal(optimizedTrip.optimizedDays[0].orderedStops[2].travelFromPrevMin, 35);

  const clientModel = optimizedTripToClientModel(optimizedTrip);
  assert.equal(clientModel.optimizedStops.length, 3);
  assert.equal(clientModel.optimizedStops[1].date, '2026-06-01');
  assert.equal(clientModel.schedule.days[0].timeline[2].date, '2026-06-01');
  assert.strictEqual(clientModel.optimizedTrip, optimizedTrip);

  const routeModel = optimizedRouteToClientModel({
    optimizedTrip,
    explanations: [],
    conflicts: [],
  });
  assert.deepEqual(routeModel.optimizedStops, clientModel.optimizedStops);
  assert.deepEqual(routeModel.schedule, clientModel.schedule);
});

test('route contracts validate shape and apply parse defaults', () => {
  const parseRequest = readParseRequest({
    text: 'plan a trip',
    mapProvider: 'google',
    calendarBlocks: [{}],
  });

  assert.equal(parseRequest.text, 'plan a trip');
  assert.equal(parseRequest.mapProvider, 'google');
  assert.equal(parseRequest.timezone, undefined);
  assert.deepEqual(parseRequest.calendarBlocks, [{}]);

  const defaultParseRequest = readParseRequest({ text: 'x' });
  assert.equal(defaultParseRequest.mapProvider, 'amap');
  assert.deepEqual(defaultParseRequest.calendarBlocks, []);

  assert.throws(() => readParseRequest(null), RouteContractError);
  assert.throws(() => readParseRequest({ text: 123 }), /text must be a string/);
  assert.throws(
    () => readParseRequest({ mapProvider: 'bing' }),
    /mapProvider must be one of/,
  );
  assert.throws(
    () => readParseRequest({ calendarBlocks: ['bad'] }),
    /calendarBlocks items must be objects/,
  );

  const optimizeRequest = readOptimizeRequest({
    trip: {
      timezone: 'Asia/Shanghai',
      mapProvider: 'amap',
      transportMode: 'driving',
      objective: 'balanced',
      days: [],
      hardConstraints: [],
    },
  });
  assert.equal(optimizeRequest.trip.timezone, 'Asia/Shanghai');
  assert.throws(() => readOptimizeRequest({}), /trip is required/);

  const navigationRequest = readNavigationRequest({
    trip: {
      timezone: 'Asia/Shanghai',
      mapProvider: 'amap',
      transportMode: 'driving',
      objective: 'balanced',
      days: [],
      hardConstraints: [],
      optimizedDays: [],
      summary: {
        totalDays: 0,
        totalMinutes: 0,
        totalTravelMinutes: 0,
        totalStopMinutes: 0,
      },
    },
  });
  assert.equal(navigationRequest.trip.optimizedDays.length, 0);
  assert.throws(() => readNavigationRequest({}), /trip is required/);
});

test('parseTripTextToDraft rejects blank input as a contract error', async () => {
  await assert.rejects(
    () => parseTripTextToDraft({ text: '   ', mapProvider: 'amap' }),
    (error) => error instanceof RouteContractError && error.message === 'text is required',
  );
});

test('trip-flow-state reducer handles start, slow, success, failure, and idle recovery', () => {
  let state = initialTripFlowState;

  state = tripFlowReducer(state, {
    type: 'start',
    action: 'parse',
    lastAction: 'parse:live',
  });
  assert.equal(state.operationStatus.parse, 'running');
  assert.equal(isActionActive(state, 'parse'), true);
  assert.equal(isActionSlow(state, 'parse'), false);

  state = tripFlowReducer(state, { type: 'markSlow', action: 'parse' });
  assert.equal(state.operationStatus.parse, 'slow');
  assert.equal(isActionSlow(state, 'parse'), true);

  state = tripFlowReducer(state, {
    type: 'succeed',
    action: 'parse',
    mode: 'live',
    source: 'api',
    lastAction: 'parse:live:done',
    warningMessage: 'review unresolved places',
  });
  assert.equal(state.runtimeMode, 'live');
  assert.equal(state.runtimeSource, 'api');
  assert.equal(state.warningMessage, 'review unresolved places');
  assert.equal(state.errorMessage, '');
  assert.equal(state.failedAction, null);
  assert.equal(state.operationStatus.parse, 'idle');

  state = tripFlowReducer(state, {
    type: 'fail',
    action: 'optimize',
    errorMessage: 'optimize failed',
    lastAction: 'optimize:live',
    source: 'mock',
  });
  assert.equal(state.runtimeMode, 'error');
  assert.equal(state.runtimeSource, 'mock');
  assert.equal(state.failedAction, 'optimize');
  assert.equal(state.errorMessage, 'optimize failed');

  state = tripFlowReducer(state, {
    type: 'setIdleContext',
    lastAction: 'switch-to-demo',
    source: 'manual',
    warningMessage: 'demo restored',
  });
  assert.equal(state.runtimeMode, 'idle');
  assert.equal(state.runtimeSource, 'manual');
  assert.equal(state.warningMessage, 'demo restored');
  assert.equal(state.failedAction, null);

  state = tripFlowReducer(state, { type: 'clearStatus' });
  assert.equal(state.warningMessage, '');
  assert.equal(state.errorMessage, '');
  assert.equal(state.failedAction, null);

  const meta = getModeMeta('demo');
  assert.equal(meta.label, 'Demo');
  assert.equal(meta.description, 'Results came from local demo logic.');
});

test('trip-workspace-state reducer and selector clear dependent state and expose fallback optimization', () => {
  const draftStops = [
    {
      id: 'stop-1',
      day: 1,
      title: 'Museum',
      location: 'Museum',
      lat: 31.1,
      lng: 121.2,
      durationMin: 60,
    },
  ];

  let state = tripWorkspaceReducer(initialTripWorkspaceState, {
    type: 'setDraft',
    draftStops,
  });
  assert.deepEqual(state.draftStops, draftStops);
  assert.equal(state.optimization, null);
  assert.deepEqual(state.navigationLinks, []);
  assert.equal(state.selectedStopId, undefined);

  state = tripWorkspaceReducer(state, {
    type: 'setOptimization',
    optimizedStops: draftStops,
    schedule: EMPTY_SCHEDULE,
    optimizedTrip: null,
  });
  assert.deepEqual(state.optimization.optimizedStops, draftStops);

  state = tripWorkspaceReducer(state, {
    type: 'setNavigationLinks',
    navigationLinks: [{ day: 1, url: 'https://example.com/route' }],
  });
  assert.equal(state.navigationLinks[0].url, 'https://example.com/route');

  state = tripWorkspaceReducer(state, {
    type: 'toggleSelectedStop',
    stopId: 'stop-1',
  });
  assert.equal(state.selectedStopId, 'stop-1');

  state = tripWorkspaceReducer(state, {
    type: 'clearOptimization',
  });
  assert.equal(state.optimization, null);
  assert.deepEqual(state.navigationLinks, []);
  assert.equal(state.selectedStopId, undefined);

  state = tripWorkspaceReducer(state, {
    type: 'toggleSelectedStop',
    stopId: 'stop-1',
  });
  assert.equal(state.selectedStopId, 'stop-1');

  state = tripWorkspaceReducer(state, {
    type: 'toggleSelectedStop',
    stopId: 'stop-1',
  });
  assert.equal(state.selectedStopId, undefined);

  const fallback = selectOptimization(initialTripWorkspaceState);
  assert.deepEqual(fallback.optimizedStops, []);
  assert.deepEqual(fallback.schedule, EMPTY_SCHEDULE);
  assert.equal(fallback.optimizedTrip, null);
});

test('trip-workspace-helpers keep demo and recovery behavior aligned with runtime state', () => {
  assert.equal(
    hasWorkspaceStarted({
      tripText: '   ',
      formImportedStopsCount: 0,
      draftStopCount: 0,
      optimizedStopCount: 0,
      navigationLinkCount: 0,
    }),
    false,
  );

  assert.equal(
    hasWorkspaceStarted({
      tripText: '',
      formImportedStopsCount: 0,
      draftStopCount: 1,
      optimizedStopCount: 0,
      navigationLinkCount: 0,
    }),
    true,
  );

  assert.equal(shouldUseDemoOptimization('demo'), true);
  assert.equal(shouldUseDemoOptimization('live'), false);

  assert.equal(shouldUseDemoNavigation('demo', { id: 'trip' }), true);
  assert.equal(shouldUseDemoNavigation('live', null), true);
  assert.equal(shouldUseDemoNavigation('live', { id: 'trip' }), false);

  assert.equal(getRecoveryActionTarget('parse'), 'parse');
  assert.equal(getRecoveryActionTarget('optimize'), 'optimize');
  assert.equal(getRecoveryActionTarget('navigation'), 'navigation');
  assert.equal(getRecoveryActionTarget(null), null);
});

test('trip-workspace-helpers hide stale optimization output when planning settings drift', () => {
  const draftTrip = makeDraftTrip();
  const draftStops = draftTripToStops(draftTrip);
  const optimizedTrip = scheduleToOptimizedTrip(draftTrip, draftStops, makeSchedule());
  const optimization = {
    optimizedStops: draftStops,
    schedule: makeSchedule(),
    optimizedTrip,
  };
  const navigationLinks = [{ day: 2, url: 'https://maps.example/day-2' }];
  const matchingSettings = {
    travelMode: 'driving',
    objective: 'balanced',
    mapProvider: 'amap',
    timezone: 'Asia/Shanghai',
  };

  assert.equal(isOptimizationCompatible(optimizedTrip, matchingSettings), true);
  assert.deepEqual(
    getVisibleOptimizationState(optimization, matchingSettings),
    optimization,
  );
  assert.deepEqual(
    getVisibleNavigationLinks(navigationLinks, optimization, matchingSettings),
    navigationLinks,
  );

  const mismatchedSettings = {
    ...matchingSettings,
    mapProvider: 'google',
  };

  assert.equal(isOptimizationCompatible(optimizedTrip, mismatchedSettings), false);
  assert.deepEqual(
    getVisibleOptimizationState(optimization, mismatchedSettings),
    EMPTY_OPTIMIZATION,
  );
  assert.deepEqual(
    getVisibleNavigationLinks(navigationLinks, optimization, mismatchedSettings),
    [],
  );
});

test('trip-runtime-status renders mode metadata, status details, and recovery CTA', () => {
  const markup = render(
    React.createElement(TripRuntimeStatus, {
      flowState: {
        runtimeMode: 'error',
        runtimeSource: 'api',
        warningMessage: 'Fallback is available.',
        errorMessage: 'Live optimization failed.',
        failedAction: 'optimize',
        lastAction: 'Live optimization failed.',
        operationStatus: {
          parse: 'idle',
          optimize: 'idle',
          navigation: 'idle',
        },
      },
      modeMeta: {
        label: 'Error',
        className: 'border-rose-200 bg-rose-50 text-rose-800',
        description: 'The last live action failed and needs recovery.',
      },
      currentTimezone: 'Asia/Shanghai',
      onRecoveryAction: () => undefined,
    }),
  );

  assert.match(markup, /Mode: Error/);
  assert.match(markup, /Source: Live service/);
  assert.match(markup, /Timezone: Asia\/Shanghai/);
  assert.match(markup, /Live optimization failed\./);
  assert.match(markup, /Switch to demo for optimize/);
  assert.match(markup, /Fallback is available\./);
});

test('trip-composer-panel renders parsed draft preview and navigation mode labels', () => {
  const parsedDayMap = {
    2: [
      {
        id: 'stop-1',
        day: 2,
        date: '2026-06-01',
        title: 'Breakfast',
        location: 'Breakfast Cafe',
        lat: 31.21,
        lng: 121.51,
        durationMin: 45,
      },
    ],
  };

  const liveMarkup = render(
    React.createElement(TripComposerPanel, {
      inputMode: 'text',
      onInputModeChange: () => undefined,
      tripText: 'Breakfast at 9',
      onTripTextChange: () => undefined,
      samplePresetId: 'shanghai-amap',
      onSamplePresetChange: () => undefined,
      onLoadSampleText: () => undefined,
      onLoadSampleDraft: () => undefined,
      parseLoading: false,
      onParseLive: () => undefined,
      onParseDemo: () => undefined,
      formRevision: 0,
      formImportedStops: [],
      onApplyStructuredDraft: () => undefined,
      onFileImported: () => undefined,
      optimizeLoading: false,
      navLoading: false,
      optimizeSlow: false,
      navSlow: false,
      runtimeMode: 'live',
      useDemoNavigationLabel: false,
      canOptimize: true,
      canNavigate: true,
      onRunOptimize: () => undefined,
      onRunNavigation: () => undefined,
      parsedDayMap,
      draftStopCount: 1,
    }),
  );

  assert.match(liveMarkup, /Run live parse/);
  assert.match(liveMarkup, /Generate live navigation/);
  assert.match(liveMarkup, /Parsed Draft/);
  assert.match(liveMarkup, /Day 2 \(2026-06-01\)/);
  assert.match(liveMarkup, /Breakfast Cafe/);

  const demoMarkup = render(
    React.createElement(TripComposerPanel, {
      inputMode: 'text',
      onInputModeChange: () => undefined,
      tripText: 'Breakfast at 9',
      onTripTextChange: () => undefined,
      samplePresetId: 'shanghai-amap',
      onSamplePresetChange: () => undefined,
      onLoadSampleText: () => undefined,
      onLoadSampleDraft: () => undefined,
      parseLoading: false,
      onParseLive: () => undefined,
      onParseDemo: () => undefined,
      formRevision: 0,
      formImportedStops: [],
      onApplyStructuredDraft: () => undefined,
      onFileImported: () => undefined,
      optimizeLoading: false,
      navLoading: false,
      optimizeSlow: false,
      navSlow: false,
      runtimeMode: 'live',
      useDemoNavigationLabel: true,
      canOptimize: true,
      canNavigate: true,
      onRunOptimize: () => undefined,
      onRunNavigation: () => undefined,
      parsedDayMap: {},
      draftStopCount: 0,
    }),
  );

  assert.match(demoMarkup, /Generate demo navigation/);
  assert.doesNotMatch(demoMarkup, /Parsed Draft/);
});

test('trip-review-panel renders empty states and populated itinerary details', () => {
  const emptyMarkup = render(
    React.createElement(TripReviewPanel, {
      travelMode: 'transit',
      onTravelModeChange: () => undefined,
      objective: 'balanced',
      onObjectiveChange: () => undefined,
      mapProvider: 'amap',
      onMapProviderChange: () => undefined,
      schedule: EMPTY_SCHEDULE,
      navigationLinks: [],
      optimizedStops: [],
      selectedStopId: undefined,
      onStopSelect: () => undefined,
    }),
  );

  assert.match(emptyMarkup, /Planning Settings/);
  assert.match(emptyMarkup, /No optimized result yet\./);
  assert.match(emptyMarkup, /No navigation links yet\./);

  const populatedMarkup = render(
    React.createElement(TripReviewPanel, {
      travelMode: 'walking',
      onTravelModeChange: () => undefined,
      objective: 'fastest',
      onObjectiveChange: () => undefined,
      mapProvider: 'google',
      onMapProviderChange: () => undefined,
      schedule: makeSchedule(),
      navigationLinks: [{ day: 2, url: 'https://maps.example/day-2' }],
      optimizedStops: [
        {
          id: 'stop-1',
          day: 2,
          date: '2026-06-01',
          title: 'Breakfast',
          location: 'Breakfast Cafe',
          lat: 31.21,
          lng: 121.51,
          durationMin: 45,
        },
      ],
      selectedStopId: 'stop-1',
      onStopSelect: () => undefined,
    }),
  );

  assert.match(populatedMarkup, /Day 2 \(2026-06-01\)/);
  assert.match(populatedMarkup, /08:30 - 08:40/);
  assert.match(populatedMarkup, /https:\/\/maps\.example\/day-2/);
  assert.match(populatedMarkup, /Map preview/);
});
