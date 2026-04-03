# Trip Itinerary Compiler Test Plan

Date: 2026-03-30
Source plan: `docs/designs/trip-itinerary-compiler-refactor.md`

## Goal

Protect the real user path:

`input -> draft review -> optimization -> execution`

The current repo only tests file parsing. This plan expands coverage to the actual refactor hot path.

## Test Diagram

| Flow / codepath | Current coverage | Required coverage | Test type | Phase |
|-----------------|------------------|-------------------|-----------|-------|
| Text intake, live parse success | none | required | browser integration + route contract | 5 |
| Text intake, live parse failure | none | required | browser integration | 5 |
| Text intake, demo parse | none | required | component or browser integration | 5 |
| Structured draft apply | none | required | component integration | 5 |
| File import CSV | partial via parser only | required | parser unit + component integration | 5 |
| File import TSV | partial via parser only | required | parser unit + component integration | 5 |
| File import Markdown | parser only | required | parser unit + component integration | 5 |
| File import ICS | parser only | required | parser unit + component integration | 5 |
| ICS date-range filter | none | required | component integration | 5 |
| Manual draft edit invalidates optimize result | none | required | flow-state unit + browser integration | 5 |
| Travel mode change invalidates optimize result | none | required | flow-state unit | 5 |
| Map provider change invalidates execute result | none | required | flow-state unit | 5 |
| Live optimize success | none | required | route contract + browser integration | 5 |
| Live optimize failure | none | required | browser integration | 5 |
| Demo optimize | none | required | unit + component integration | 5 |
| Live navigation success | none | required | route contract + browser integration | 5 |
| Live navigation failure | none | required | browser integration | 5 |
| Demo navigation | none | required | unit | 5 |
| AMap JS key mismatch | none | required | component integration | 5 |
| Google preview fallback | none | required | component integration | 5 |
| Unsupported provider hidden or degraded | none | required | component integration | 5 |
| UI-to-backend draft mapping | none | required | mapper round-trip unit | 1 |
| Backend optimized trip to UI mapping | none | required | mapper round-trip unit | 1 |
| Anchor preservation through mapping | none | required | mapper round-trip unit | 1 |
| Route body validation, parse | none | required | route contract | 0B |
| Route body validation, optimize | none | required | route contract | 0B |
| Route body validation, navigation | none | required | route contract | 0B |
| OpenAI parse adapter success contract | none | required | adapter unit | 2 |
| OpenAI parse adapter failure contract | none | required | adapter unit | 2 |
| AMap geocode adapter success contract | none | required | adapter unit | 2 |
| AMap geocode adapter timeout / failure | none | required | adapter unit | 2 |
| Demo parser preset selection | none | required | unit | 2 |
| Demo optimizer schedule building | none | required | unit | 2 |

## Required Suites

### Phase 0B

1. Route contract tests for all three POST endpoints.
2. Invalid body tests for missing or malformed payloads.
3. Error serialization tests to ensure users receive truthful failure messages.

### Phase 1

1. Mapper round-trip tests:
   `TripDraft -> UI draft -> TripDraft`
2. Anchor preservation tests:
   start and end must never collapse into anonymous normal stops in business logic.
3. Flow-state invalidation tests:
   editing a reviewed draft must stale out optimize and execute artifacts.

### Phase 2

1. Parse use-case tests with real, placeholder, and explicit failure outcomes.
2. Optimize use-case tests with unresolved places, fixed-order stops, and empty-day rejection.
3. Navigation use-case tests with missing provider data and per-day URL generation.
4. Adapter contract tests for OpenAI and AMap.

### Phase 3

1. Step component integration tests for Intake, Review, Optimize, Execute.
2. State display tests for live, demo, error, stale, and partial-success states.
3. Responsive behavior tests for the Review and Execute layouts.

### Phase 5

1. Browser happy path:
   text input -> live or demo parse -> review -> optimize -> navigation
2. Browser failure rescue path:
   live parse failure -> explicit switch to demo -> continue
3. File import happy path:
   ICS import -> date filter -> structured review -> optimize

## Minimal Ship Gate for the Refactor

Do not call the refactor phase complete unless these are green:

1. Route contract tests for parse, optimize, navigation
2. Mapper round-trip tests including anchors
3. One optimize invalidation test
4. One browser happy path
5. One browser live-failure rescue path

## Residual Risk If Skipped

If this test plan is not landed, the repo can still "pass tests" while breaking:

1. truthful mode reporting
2. anchor semantics
3. stale-result invalidation
4. route boundary safety
5. actual user execution flow
