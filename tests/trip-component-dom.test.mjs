import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { JSDOM } from 'jsdom';
import { createRoot } from 'react-dom/client';

import { loadTsModule } from './load-ts-module.mjs';

const { default: TripRuntimeStatus } = loadTsModule(
  'components/trip/trip-runtime-status.tsx',
);
const { default: TripComposerPanel } = loadTsModule(
  'components/trip/trip-composer-panel.tsx',
);
const { default: TripReviewPanel } = loadTsModule(
  'components/trip/trip-review-panel.tsx',
);
const { EMPTY_SCHEDULE } = loadTsModule('lib/trip/trip-workspace-state.ts');
const { useTripWorkspace } = loadTsModule('lib/trip/use-trip-workspace.ts');

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    HTMLElement: globalThis.HTMLElement,
    HTMLInputElement: globalThis.HTMLInputElement,
    HTMLSelectElement: globalThis.HTMLSelectElement,
    HTMLTextAreaElement: globalThis.HTMLTextAreaElement,
    Event: globalThis.Event,
    MouseEvent: globalThis.MouseEvent,
    Node: globalThis.Node,
    getComputedStyle: globalThis.getComputedStyle,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    IS_REACT_ACT_ENVIRONMENT: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.HTMLElement = dom.window.HTMLElement;
  globalThis.HTMLInputElement = dom.window.HTMLInputElement;
  globalThis.HTMLSelectElement = dom.window.HTMLSelectElement;
  globalThis.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
  globalThis.Event = dom.window.Event;
  globalThis.MouseEvent = dom.window.MouseEvent;
  globalThis.Node = dom.window.Node;
  globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    writable: true,
    value: dom.window.navigator,
  });

  return () => {
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.HTMLElement = previous.HTMLElement;
    globalThis.HTMLInputElement = previous.HTMLInputElement;
    globalThis.HTMLSelectElement = previous.HTMLSelectElement;
    globalThis.HTMLTextAreaElement = previous.HTMLTextAreaElement;
    globalThis.Event = previous.Event;
    globalThis.MouseEvent = previous.MouseEvent;
    globalThis.Node = previous.Node;
    globalThis.getComputedStyle = previous.getComputedStyle;
    globalThis.requestAnimationFrame = previous.requestAnimationFrame;
    globalThis.cancelAnimationFrame = previous.cancelAnimationFrame;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.IS_REACT_ACT_ENVIRONMENT;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: previous.navigator,
    });
    dom.window.close();
  };
}

async function renderIntoDom(element) {
  const teardownDom = installDom();
  const container = document.getElementById('root');
  const root = createRoot(container);

  await act(async () => {
    root.render(element);
  });

  return {
    container,
    cleanup: async () => {
      await act(async () => {
        root.unmount();
      });
      teardownDom();
    },
  };
}

function click(node) {
  node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

function changeField(node, value) {
  const prototype = Object.getPrototypeOf(node);
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (descriptor?.set) {
    descriptor.set.call(node, value);
  } else {
    node.value = value;
  }
  node.dispatchEvent(new window.Event('input', { bubbles: true }));
  node.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function findButton(container, label) {
  return Array.from(container.querySelectorAll('button')).find(
    (node) => node.textContent?.trim() === label,
  );
}

function findByTestId(container, value) {
  return container.querySelector(`[data-testid="${value}"]`);
}

test('trip-runtime-status recovery CTA is clickable in the DOM', async () => {
  let recoveryClicks = 0;
  const view = await renderIntoDom(
    React.createElement(TripRuntimeStatus, {
      flowState: {
        runtimeMode: 'error',
        runtimeSource: 'api',
        warningMessage: '',
        errorMessage: 'Live navigation failed.',
        failedAction: 'navigation',
        lastAction: 'Live navigation failed.',
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
      onRecoveryAction: () => {
        recoveryClicks += 1;
      },
    }),
  );

  const button = findButton(view.container, 'Switch to demo for navigation');
  assert.ok(button);

  click(button);
  assert.equal(recoveryClicks, 1);

  await view.cleanup();
});

test('trip-composer-panel wires DOM interactions to callbacks', async () => {
  const calls = {
    inputModes: [],
    samplePresetIds: [],
    loadSampleText: 0,
    parseLive: 0,
    parseDemo: 0,
    runOptimize: 0,
    runNavigation: 0,
  };

  const view = await renderIntoDom(
    React.createElement(TripComposerPanel, {
      inputMode: 'text',
      onInputModeChange: (mode) => calls.inputModes.push(mode),
      tripText: 'Breakfast at 9',
      onTripTextChange: () => undefined,
      samplePresetId: 'shanghai-amap',
      onSamplePresetChange: (value) => calls.samplePresetIds.push(value),
      onLoadSampleText: () => {
        calls.loadSampleText += 1;
      },
      onLoadSampleDraft: () => undefined,
      parseLoading: false,
      onParseLive: () => {
        calls.parseLive += 1;
      },
      onParseDemo: () => {
        calls.parseDemo += 1;
      },
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
      onRunOptimize: () => {
        calls.runOptimize += 1;
      },
      onRunNavigation: () => {
        calls.runNavigation += 1;
      },
      parsedDayMap: {
        1: [
          {
            id: 'stop-1',
            day: 1,
            date: '2026-06-01',
            title: 'Breakfast',
            location: 'Breakfast Cafe',
            lat: 31.21,
            lng: 121.51,
            durationMin: 45,
          },
        ],
      },
      draftStopCount: 1,
    }),
  );

  const presetSelect = view.container.querySelector('select');
  assert.ok(presetSelect);
  changeField(presetSelect, 'japan-google');

  click(findButton(view.container, 'Structured Draft'));
  click(findButton(view.container, 'Load sample text'));
  click(findButton(view.container, 'Run live parse'));
  click(findButton(view.container, 'Run demo parse'));
  click(findButton(view.container, 'Run live optimization'));
  click(findButton(view.container, 'Generate live navigation'));

  assert.deepEqual(calls.inputModes, ['structured']);
  assert.deepEqual(calls.samplePresetIds, ['japan-google']);
  assert.equal(calls.loadSampleText, 1);
  assert.equal(calls.parseLive, 1);
  assert.equal(calls.parseDemo, 1);
  assert.equal(calls.runOptimize, 1);
  assert.equal(calls.runNavigation, 1);
  assert.match(view.container.textContent, /Parsed Draft/);
  assert.match(view.container.textContent, /Breakfast Cafe/);

  await view.cleanup();
});

test('trip-review-panel forwards select changes and stop clicks in the DOM', async () => {
  const calls = {
    travelMode: [],
    objective: [],
    mapProvider: [],
    selectedStops: [],
  };

  const view = await renderIntoDom(
    React.createElement(TripReviewPanel, {
      travelMode: 'transit',
      onTravelModeChange: (value) => calls.travelMode.push(value),
      objective: 'balanced',
      onObjectiveChange: (value) => calls.objective.push(value),
      mapProvider: 'amap',
      onMapProviderChange: (value) => calls.mapProvider.push(value),
      schedule: {
        days: [
          {
            day: 2,
            totalMinutes: 115,
            legs: [],
            timeline: [
              {
                id: 'stop-1',
                day: 2,
                date: '2026-06-01',
                title: 'Breakfast',
                location: 'Breakfast Cafe',
                lat: 31.21,
                lng: 121.51,
                durationMin: 45,
                arrival: '09:00',
                departure: '09:45',
                travelFromPrev: 15,
              },
            ],
          },
        ],
        totalMinutes: 115,
        totalTravel: 50,
        totalStay: 65,
      },
      navigationLinks: [{ day: 2, url: 'https://maps.example/day-2' }],
      optimizedStops: [],
      selectedStopId: undefined,
      onStopSelect: (stopId) => calls.selectedStops.push(stopId),
    }),
  );

  const selects = Array.from(view.container.querySelectorAll('select'));
  assert.equal(selects.length, 3);

  changeField(selects[0], 'walking');
  changeField(selects[1], 'fastest');
  changeField(selects[2], 'google');

  const stopCard = Array.from(view.container.querySelectorAll('div')).find(
    (node) =>
      node.textContent?.includes('Breakfast Cafe') &&
      node.className.includes('cursor-pointer'),
  );
  assert.ok(stopCard);

  click(stopCard);

  assert.deepEqual(calls.travelMode, ['walking']);
  assert.deepEqual(calls.objective, ['fastest']);
  assert.deepEqual(calls.mapProvider, ['google']);
  assert.deepEqual(calls.selectedStops, ['stop-1']);

  await view.cleanup();
});

test('trip-review-panel still renders empty states in the DOM', async () => {
  const view = await renderIntoDom(
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

  assert.match(
    view.container.textContent,
    /No optimized result yet\. Confirm a draft and run optimization first\./,
  );
  assert.match(
    view.container.textContent,
    /No navigation links yet\. Generate them from the optimized trip\./,
  );

  await view.cleanup();
});

test('useTripWorkspace keeps demo optimization visible after running the demo flow', async () => {
  function WorkspaceHarness() {
    const workspace = useTripWorkspace();

    return React.createElement(
      'div',
      {},
      React.createElement(
        'button',
        {
          onClick: () => workspace.loadSamplePreset('text'),
        },
        'Load sample',
      ),
      React.createElement(
        'button',
        {
          onClick: () => {
            void workspace.handleParseDemo();
          },
        },
        'Parse demo',
      ),
      React.createElement(
        'button',
        {
          onClick: () => {
            workspace.runOptimize();
          },
        },
        'Run optimize',
      ),
      React.createElement(
        'div',
        { 'data-testid': 'optimized-stop-count' },
        String(workspace.optimization.optimizedStops.length),
      ),
      React.createElement(
        'div',
        { 'data-testid': 'navigation-label' },
        workspace.useDemoNavigation ? 'demo' : 'live',
      ),
      React.createElement(
        'div',
        { 'data-testid': 'last-action' },
        workspace.flowState.lastAction,
      ),
    );
  }

  const view = await renderIntoDom(React.createElement(WorkspaceHarness));

  await act(async () => {
    click(findButton(view.container, 'Load sample'));
  });

  await act(async () => {
    click(findButton(view.container, 'Parse demo'));
    await new Promise((resolve) => setTimeout(resolve, 650));
  });

  await act(async () => {
    click(findButton(view.container, 'Run optimize'));
    await new Promise((resolve) => setTimeout(resolve, 750));
  });

  assert.equal(
    Number(findByTestId(view.container, 'optimized-stop-count').textContent) > 0,
    true,
  );
  assert.equal(findByTestId(view.container, 'navigation-label').textContent, 'demo');
  assert.match(findByTestId(view.container, 'last-action').textContent, /Demo optimization completed\./);

  await view.cleanup();
});
