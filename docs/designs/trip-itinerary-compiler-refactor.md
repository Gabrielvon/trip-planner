# Trip Itinerary Compiler Refactor

Status: Autoplan reviewed
Date: 2026-03-30
Branch: `codex/fix-typo-in-codebase-x6d2zk`
Review mode: `autoplan`
Independent review voices:
- Product: Poincare
- Design: Ampere / Dalton
- Engineering: Turing

## 1. Executive Summary

This refactor is still the right move, but the implementation order in the original draft was too optimistic.

The biggest correction is simple:

`do not split the UI first`

The current blockers are truthfulness, unstable baseline, missing I/O contracts, and a lossy legacy seam between UI stops and backend trip shapes.

The revised path is:

`restore baseline -> make live/demo truthful -> freeze contracts -> converge model -> extract use cases/adapters -> split the UI flow`

## 2. Decisions Locked Now

1. Product identity remains `itinerary compiler`, not `full trip planner`.
2. Scope remains `scope reduction now, selective expansion later`.
3. China-first remains the active wedge for this phase.
4. `Live` endpoints may not emit sample, placeholder, or heuristic fallback content and still be labeled as live.
5. AMap is the only first-class resolved-place provider in this phase.
6. `Review` is a first-class workflow step, not a side effect of intake.
7. The page shell may not remain the workflow engine after Phase 1A.
8. Exactly one legacy adapter boundary owns old/new model conversion.

## 3. Critical Findings

### Cross-phase themes

1. Truthfulness is still broken on the server. `parse` can silently degrade to sample or placeholder output in the live route path.
2. The current branch is not a stable refactor baseline because `components/trip/structured-form.tsx` was missing during review and had to be restored.
3. The UI still behaves like a collection of tools plus output panes, not a step-owned workflow.
4. The canonical model is not real yet because anchors, dates, and provenance still collapse through the current mapper seam.
5. Test coverage is concentrated on file parsing and misses the actual workflow risks.

### What this means

If we start with page decomposition, we will only distribute the current coupling across more files.

If we keep the current live parse fallback, the product will continue lying at the trust boundary, even if the UI copy looks cleaner.

## 4. Current-State Inventory

### What already exists

| Problem area | What exists today | Main files |
|---|---|---|
| Page shell and workflow orchestration | One large client page owns input mode, parse, optimize, navigation, runtime state, recovery, sample loading, and result invalidation | `app/trip/page.tsx` |
| Manual draft editing | Structured row editor with per-day endpoints and direct `StructuredStop[]` output | `components/trip/structured-form.tsx` |
| File import | CSV, TSV, Markdown, ICS parsing, ICS date-range filtering, preview table, import handoff | `components/trip/file-importer.tsx`, `lib/trip/parse-file.ts` |
| Map preview | AMap JS rendering, Google iframe fallback, marker selection, SDK/runtime error handling | `components/trip/trip-map.tsx`, `lib/trip/amap-js.ts` |
| Client actions | Honest client-side live vs demo switching, but only at the client layer | `lib/trip/parse-client.ts` |
| Server parse/opt/nav | Three thin routes backed by one monolithic server module | `app/api/trip/*/route.ts`, `lib/trip/server.ts` |
| LLM parse | OpenAI structured parse for trip drafts | `lib/trip/parse-openai.ts` |
| Place resolution | AMap geocoding and POI lookup | `lib/trip/amap-provider.ts` |
| Mock/demo path | Sample presets, seed stops, heuristic optimizer, heuristic schedule builder, mock nav links | `lib/trip/mock.ts` |
| Legacy mapping seam | UI stop <-> backend trip conversions plus guessed coordinates | `lib/trip/ui-mappers.ts` |
| Tests | File parsing only | `tests/parse-file.test.mjs` |

### What is still missing

1. Runtime DTO validation at every route boundary.
2. A single shared flow reducer or state machine.
3. A canonical model path that preserves anchors and unresolved state end-to-end.
4. Per-step provenance instead of one flattened page-level runtime badge.
5. Workflow integration tests.

## 5. Product Definition

### Core job

Help a user turn fragmented itinerary information from multiple sources into a reviewed, optimized, executable route.

### Primary user in this phase

High-density business travelers importing fragmented meetings, calendar blocks, hotels, and transport anchors across one to three days.

### Success criterion

`A high-density business traveler can import 1-3 days of fragmented itinerary inputs, repair the draft, and get a trustworthy executable route within 10 minutes.`

### Explicitly not this phase

1. OTA booking.
2. Discovery-first travel planning.
3. Full autonomous itinerary design.
4. Equal-first global provider support.
5. Bi-directional calendar sync.
6. User-visible fake success.

## 6. Scope

### In scope

1. Text intake.
2. Structured manual intake.
3. File import for CSV, TSV, Markdown, and ICS.
4. Draft review and manual correction.
5. Anchor editing.
6. Constraint-aware route optimization.
7. Navigation link generation.
8. Honest provenance and recovery messaging.

### NOT in scope

1. Hotel discovery.
2. Restaurant discovery.
3. OTA integrations.
4. Mapbox as a first-class resolved-place provider.
5. Global preset parity.
6. Calendar write-back or sync.

## 7. Workflow Definition

The target UX is still a four-step compiler workspace, but the nodes inside each step are now explicitly named.

### Step 1: Intake

Owned nodes:

1. Text input.
2. Structured input launcher.
3. File import.
4. File-import provenance.
5. ICS date-range filter.
6. File preview and import handoff.
7. Sample preset loader.

Output:

`TripDraft`

### Step 2: Review

Owned nodes:

1. Draft editor.
2. Per-day start anchor editor.
3. Per-day end anchor editor.
4. Unresolved-place list.
5. Required-field validation.
6. Source provenance panel.
7. Diff-from-source panel.
8. Stale downstream badges.
9. Confirm draft CTA.

Output:

`ResolvedTrip`

### Step 3: Optimize

Owned nodes:

1. Objective selector.
2. Travel mode selector.
3. Provider selector, constrained by phase scope.
4. Conflict list.
5. Explanation list.
6. Retry and demo fallback CTA.
7. Result provenance badge.

Output:

`OptimizedTrip`

### Step 4: Execute

Owned nodes:

1. Day timeline.
2. Map panel.
3. Navigation links panel.
4. Provider degradation card.
5. Empty/loading/unavailable map states.
6. Reopen review CTA when results are stale.

Output:

`NavigationPlan`

## 8. Truth and Provenance Model

The old page-level `runtimeMode` is not enough.

We need provenance per artifact:

```ts
type ArtifactProvenance = 'live' | 'demo' | 'manual' | 'placeholder' | 'error';

type FlowArtifacts = {
  draft: ArtifactProvenance;
  optimizedTrip?: ArtifactProvenance;
  navigationPlan?: ArtifactProvenance;
};
```

Rules:

1. A live parse route may only return `live` or `error`.
2. A placeholder draft is not `live`.
3. Mixed provenance must be visible.
4. Recovery actions must be attached to the failing step, not only the page header.

## 9. Canonical Domain Model

The direction from the original draft remains correct:

`TripDraft -> ResolvedTrip -> OptimizedTrip -> NavigationPlan`

Additional locks from review:

1. Anchors remain first-class. They are not flattened into generic stops.
2. Unresolved places remain explicit state.
3. Provenance is attached to artifacts, not inferred from route name.
4. The canonical model cannot be introduced before route DTOs are frozen.

## 10. Architecture

### Required layers

```text
app/
  trip/
    page.tsx
  api/
    trip/
      parse/route.ts
      optimize/route.ts
      navigation-links/route.ts

components/
  trip/
    flow/
      intake-step.tsx
      review-step.tsx
      optimize-step.tsx
      execute-step.tsx
    panels/
      import-review-panel.tsx
      draft-review-panel.tsx
      conflict-panel.tsx
      explanation-panel.tsx
      timeline-panel.tsx
      map-panel.tsx
      navigation-panel.tsx

lib/
  trip/
    contracts/
      parse-contract.ts
      optimize-contract.ts
      navigation-contract.ts
    domain/
      models.ts
      validation.ts
      errors.ts
    application/
      trip-flow-state.ts
      normalize-imported-trip.ts
      confirm-draft.ts
      invalidate-downstream.ts
      resolve-draft-places.ts
      optimize-resolved-trip.ts
      build-navigation-plan.ts
    infrastructure/
      openai-trip-parser.ts
      amap-resolver.ts
      mock-trip-parser.ts
      mock-optimizer.ts
      mock-navigation-builder.ts
    legacy/
      legacy-trip-adapter.ts
```

### Architecture rules

1. `app/trip/page.tsx` becomes presentation shell plus step router only.
2. `trip-flow-state.ts` becomes the first decomposition artifact, before UI splitting.
3. Route handlers validate request and response bodies using concrete schemas.
4. Exactly one file owns legacy UI/backend translation.
5. New domain/application code may not import legacy mapper files directly.
6. AMap is the only first-class resolved-place adapter in this phase.
7. Google and Mapbox remain rendering or navigation adapters only.

## 11. Error and Rescue Registry

| Failure | Where it happens now | User-visible rescue |
|---|---|---|
| Live parse cannot reach OpenAI | `lib/trip/server.ts` | Show parse error, offer explicit switch to demo |
| Route body malformed | `app/api/trip/*/route.ts` | Return typed validation error, keep draft untouched |
| AMap JS key mismatch | `components/trip/trip-map.tsx` | Show provider-unavailable panel with setup guidance |
| Browser lacks WebGL | `components/trip/trip-map.tsx` | Show map-unavailable panel, keep timeline usable |
| Geocoding fails | `lib/trip/amap-provider.ts` | Keep draft unresolved, push user to Review instead of silently guessing success |
| Review edits after optimize | `app/trip/page.tsx` today | Mark optimize and navigation stale, require re-run |
| Navigation generation fails | `app/trip/page.tsx`, `lib/trip/parse-client.ts` | Keep optimized trip, show execute-step recovery CTA |

## 12. Failure Modes Registry

| Failure mode | Severity | Why it matters | Required prevention |
|---|---|---|---|
| Live route emits sample content | Critical | Destroys trust | Separate live, demo, placeholder outcomes |
| UI split happens before contracts freeze | Critical | Multiplies legacy drift | Freeze DTOs and legacy seam first |
| Anchors collapse into generic stops | High | Breaks business meaning | Keep anchors in canonical model and legacy seam |
| Mixed provenance flattens to one badge | High | User cannot judge trust | Track provenance per artifact |
| File import is treated as generic intake only | High | Real import states get lost | Add import-review node and rules |
| Map blank state remains implicit | Medium | Execute step feels broken | Add empty/loading/unavailable map panels |
| Tests stay parser-only | High | Refactor can regress main flow unnoticed | Add route, flow, adapter, invalidation coverage |

## 13. Revised Phased Plan

### Phase 0A: Restore stable baseline

Goals:

1. Keep the worktree buildable.
2. Restore missing review-path components.
3. Remove accidental local breakage before further refactor work.

Definition of done:

1. `structured-form` exists and renders.
2. The branch is safe to typecheck before deeper changes.

### Phase 0B: Truthfulness hardening

Goals:

1. Remove server-side live-path heuristic fallback.
2. Surface parse outcomes as `live | demo | placeholder | error`.
3. Keep demo explicit.

Definition of done:

1. Live parse returns only live output or error.
2. Placeholder output, if kept at all, is not labeled live.
3. Per-step recovery CTAs exist.

### Phase 1A: Contracts and flow reducer

Goals:

1. Add request/response schema modules.
2. Extract shared flow reducer/view-model from the page.
3. Lock stale-result invalidation rules in one place.

Definition of done:

1. Every route validates input and output.
2. Flow transitions do not live only in `page.tsx`.

### Phase 1B: Canonical model convergence

Goals:

1. Introduce canonical draft/resolved/optimized/navigation models.
2. Preserve anchors and unresolved places.
3. Freeze one legacy seam.

Definition of done:

1. One adapter boundary owns old/new conversion.
2. Canonical models are used by new application code.

### Phase 2: Application use cases and adapters

Goals:

1. Split the monolithic server module.
2. Introduce explicit parser/resolver/navigation contracts.
3. Isolate mock adapters.

Definition of done:

1. Route handlers are thin.
2. Use cases are testable without React.

### Phase 3: UI flow split

Goals:

1. Move from tool-panels to step-owned workflow.
2. Give each step its own trust badge, CTA, blockers, and recovery.
3. Add import-review and execute-state nodes.

Definition of done:

1. `/trip` is step-driven.
2. Step boundaries match owned state.

### Phase 4: Legacy path deletion

Goals:

1. Remove old crossover logic from new paths.
2. Shrink legacy seam to one boundary file.

### Phase 5: Coverage expansion

Goals:

1. Add contract tests.
2. Add flow reducer tests.
3. Add invalidation tests.
4. Add one main-flow integration test.

## 14. Revised Parallelization

Do not run the original B/C/A order yet.

Use this order instead:

| Lane | Scope | Starts when |
|---|---|---|
| 0 | Contracts + flow reducer + canonical domain boundary | immediately |
| 1 | Server use cases + adapters | after Lane 0 shapes are stable |
| 2 | UI step split and panels | after Lanes 0 and 1 merge |

Shared hot files:

1. `lib/trip/types.ts`
2. `lib/trip/ui-mappers.ts`
3. `lib/trip/server.ts`
4. `app/trip/page.tsx`

## 15. Test Strategy

The parser-only suite is not enough.

Required test diagram:

1. Text intake -> live parse -> review confirm -> optimize -> navigation.
2. Structured intake -> review edit -> optimize invalidated -> rerun -> navigation.
3. File import -> ICS date filter -> preview -> import handoff -> review confirm.
4. Live parse failure -> explicit demo switch.
5. AMap resolution failure -> unresolved review state.
6. Map provider unavailable -> execute step remains usable.

Required suites:

1. Contract tests for parse, optimize, and navigation routes.
2. Flow reducer tests for all state transitions and stale-result invalidation.
3. Canonical model round-trip tests.
4. Legacy seam tests for anchor preservation.
5. Adapter tests for OpenAI parse and AMap resolution behavior.
6. One `/trip` happy-path integration test.

## 16. Dream-State Delta

This plan intentionally stops short of the 12-month dream.

What it gets us:

1. A trustworthy compiler for fragmented itinerary input.
2. Honest provenance.
3. A refactorable architecture.

What it does not get us yet:

1. Full global provider support.
2. Discovery-first planning.
3. Booking integrations.
4. Sync loops with external calendars.

## 17. Deferred to Later

1. Google/Mapbox parity.
2. OTA integrations.
3. Restaurant and hotel discovery.
4. Calendar sync.
5. Leisure-planning expansion after business-travel path is stable.

## 18. Immediate Next Actions

1. Finish Phase 0A and keep the branch typecheck-safe.
2. Rewrite the live parse route so it cannot emit demo/sample content as live.
3. Create route schema modules and a shared flow reducer.
4. Freeze the single legacy adapter boundary.
5. Only then begin the step-owned UI split.

## 19. Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|---|---|---|---|---|---|
| 1 | Cross-phase | Add Phase 0A baseline restore before truthfulness work | auto-decided | baseline first | broken branches are bad refactor inputs | refactor forward from broken worktree |
| 2 | Cross-phase | Ban live parse heuristic fallback | auto-decided | truthfulness | live may not silently emit synthetic drafts | keep heuristic fallback behind live label |
| 3 | Cross-phase | Move contracts ahead of model split | auto-decided | boundary first | model convergence without DTO locks leaks legacy assumptions | model split first |
| 4 | Design | Treat file import review as a first-class node | auto-decided | existing behavior deserves explicit ownership | ICS filter/preview/handoff already exist in code | leave import review implicit |
| 5 | Product | Hide non-AMap providers and non-China presets from main flow | taste decision | wedge discipline | current wedge is China-first | keep equal-facing provider UI |
| 6 | Engineering | Extract flow reducer before UI decomposition | auto-decided | state before layout | otherwise orchestration tangle just moves files | split panels first |
