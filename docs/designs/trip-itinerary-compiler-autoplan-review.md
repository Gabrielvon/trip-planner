# Trip Itinerary Compiler Autoplan Review

Date: 2026-03-30
Branch: `codex/fix-typo-in-codebase-x6d2zk`
Source plan: `docs/designs/trip-itinerary-compiler-refactor.md`
Status: Reviewed, expanded, pending acceptance

## 1. Executive Read

The existing refactor plan is directionally right. The wedge is correct: shrink from
`trip planner` to `itinerary compiler`, keep China-first, and ban user-facing fake
success.

The plan is still too abstract in three places:

1. It does not enumerate the real nodes already shipping in the codebase.
2. It does not fully account for the remaining truth gap inside the server parse path.
3. It does not lock the migration order tightly enough around current blockers and
   contract seams.

The highest-confidence recommendation is:

1. Add a pre-phase called `P0A: Restore baseline stability`.
2. Treat `parse honesty`, `provider capability truth`, and `anchor preservation` as the
   three non-negotiable architectural locks.
3. Do not start the step-workspace UI split until route contracts, parse outcome
   taxonomy, and canonical draft models are locked.

## 2. What Already Exists

| Sub-problem | Current implementation | Notes |
|---|---|---|
| Text intake | `app/trip/page.tsx` | Text area, sample preset load, live parse CTA, demo parse CTA |
| Structured manual draft | `app/trip/page.tsx` + `components/trip/structured-form.tsx` | Component is currently missing from the worktree, which makes this path a blocker |
| File import intake | `components/trip/file-importer.tsx` | Supports CSV, TSV, Markdown, ICS, preview, ICS date filtering, import-to-form |
| File parsing | `lib/trip/parse-file.ts` | Pure client-side parsing for CSV, TSV, Markdown, ICS |
| Live parse route | `app/api/trip/parse/route.ts` -> `lib/trip/server.ts` | Thin route, no runtime validation, server still decides between OpenAI, sample trip, or placeholder |
| Demo parse | `lib/trip/parse-client.ts` -> `lib/trip/mock.ts` | Explicit demo path on client |
| Live parse model extraction | `lib/trip/parse-openai.ts` | Structured-output schema pinned to backend-shaped trip DTO |
| Place resolution | `lib/trip/amap-provider.ts` | Geocode and POI search, batched through `resolveAllStops()` |
| Live optimize route | `app/api/trip/optimize/route.ts` -> `lib/trip/server.ts` | No request schema validation, uses backend DTO generated from UI stops |
| Demo optimize | `lib/trip/parse-client.ts` -> `lib/trip/mock.ts` | Heuristic nearest-neighbor optimizer |
| Live navigation route | `app/api/trip/navigation-links/route.ts` -> `lib/trip/server.ts` | Builds per-day AMap or Google links from optimized backend trip |
| Demo navigation | `lib/trip/parse-client.ts` -> `lib/trip/mock.ts` | Local URI builders |
| UI-to-backend mapping | `lib/trip/ui-mappers.ts` | Still collapses day data into stop arrays in several places |
| Run-state honesty on client | `app/trip/page.tsx` + `lib/trip/parse-client.ts` | Explicit `Live`, `Demo`, `Error`; no silent client fallback |
| Map rendering | `components/trip/trip-map.tsx` + `lib/trip/amap-js.ts` | AMap JS, Google iframe, Mapbox placeholder only |
| Test coverage | `tests/parse-file.test.mjs` | Parser-only coverage, no route/use-case/workflow tests |

## 3. Current Node Inventory

### User-visible nodes

| Area | Current nodes |
|---|---|
| Global shell | Title, intro copy, run-state banner, warning banner, error banner, recovery CTA |
| Intake navigation | `Text`, `Structured`, `File Import` tabs |
| Text intake | Textarea, sample selector, sample loader, `Parse live`, `Run demo parse` |
| Structured intake | Sample selector, sample loader, missing structured form editor, apply-to-draft behavior |
| File intake | Dropzone, status banner, ICS date filter, preview table, import button, export instructions, format help |
| Parsed review | Parsed draft grouped by day |
| Route settings | Travel mode, optimization goal, map provider |
| Optimize state | Optimize CTA, slow-state banner |
| Execute state | Navigation CTA, slow-state banner, optimized timeline, navigation links, map |

### API and orchestration nodes

| Layer | Nodes |
|---|---|
| Routes | `POST /api/trip/parse`, `POST /api/trip/optimize`, `POST /api/trip/navigation-links` |
| Client actions | `parseViaRoute`, `parseViaDemo`, `optimizeViaRoute`, `optimizeViaDemo`, `navigationViaRoute`, `navigationViaDemo` |
| Server actions | `parseTripTextToDraft`, `optimizeTripServer`, `buildNavigationLinksServer` |
| Infrastructure | `parseTripWithOpenAI`, `resolveLocation`, `resolveAllStops`, `loadAmapJs` |
| Heuristic/demo | `parseTripTextMock`, `optimizeMultiDay`, `buildMultiDaySchedule`, `buildMockNavigationLinks` |

### Data-model nodes

| Model family | Current types |
|---|---|
| Manual input | `StructuredStop` |
| UI trip | `Stop`, `TimelineStop`, `ScheduleResult` |
| Backend trip | `BackendMultiDayTrip`, `BackendTripDay`, `BackendTaskStop`, `BackendOptimizedTrip` |
| Client result envelopes | `ParseResult`, `OptimizeResult`, `NavigationResult` |
| API envelopes | `ParseRouteResponse`, `OptimizeRouteResponse`, `NavigationLinksRouteResponse` |

## 4. NOT In Scope

These items should stay out of the refactor until the compiler path is trustworthy:

1. OTA integrations.
2. Discovery-first POI browsing.
3. Calendar sync back to source systems.
4. Multi-route comparison.
5. Equal-first support for AMap, Google Maps, and Mapbox.
6. Real-time traffic optimization.
7. Multi-user collaboration.
8. Loyalty, booking, or payments.

## 5. Product Review

### Findings

1. The product promise and the current runtime behavior still disagree. The plan says
   "no fake success," but `parseTripTextToDraft()` in [server.ts](/E:/Repos/NRI/repos-vibe/trip-planner/lib/trip/server.ts#L370)
   still returns sample trips or placeholder drafts as successful live responses when
   OpenAI is absent or fails.
2. The primary user is defined as a high-density business traveler, but the current
   sample set and heuristics are still leisure-heavy in [mock.ts](/E:/Repos/NRI/repos-vibe/trip-planner/lib/trip/mock.ts#L16)
   and sample detection still keys off city-trip narratives more than meeting-heavy
   business inputs.
3. The plan names `Review` as the trust checkpoint, but it does not yet specify how
   unresolved places, guessed coordinates, or missing anchors become first-class review
   items. That is a real user job, not an engineering footnote.

### Missing plan nodes

1. Parse outcome taxonomy is underspecified. The plan needs explicit states for:
   `live parsed`, `demo parsed`, `placeholder draft`, `manual draft`, `partially resolved`.
2. Draft provenance is underspecified. The user needs to know whether a stop came from
   text parsing, file parsing, manual edits, or demo data.

### Product locks to make now

1. A live parse request may return only a live parse result, a partial live result with
   explicit warnings, or an error. It may not return sample/demo/placeholder data under
   a normal success label.
2. `Review` must explicitly own unresolved anchors and unresolved places.
3. `Mapbox` must be removed from the main choice set until it has real route or preview
   behavior.

## 6. Design Review

### Findings

1. The current page still behaves like a control surface, not a stepped compiler
   workspace. Once the user starts, intake, settings, parsed review, optimize output,
   navigation output, and map all coexist in [page.tsx](/E:/Repos/NRI/repos-vibe/trip-planner/app/trip/page.tsx#L402).
2. Trust and rescue states are global, not local. The run-state banner is global in
   [page.tsx](/E:/Repos/NRI/repos-vibe/trip-planner/app/trip/page.tsx#L369), but there
   is no step-local stale marker inside review, optimize, or execute panels.
3. The design-system requirement in the plan has not started. [globals.css](/E:/Repos/NRI/repos-vibe/trip-planner/app/globals.css#L1)
   contains only Tailwind directives, so tokens, spacing scales, and motion rules do not
   exist yet.
4. The structured draft editor is not merely rough, it is absent from the worktree.
   Since [page.tsx](/E:/Repos/NRI/repos-vibe/trip-planner/app/trip/page.tsx#L6) imports
   it directly, this is a P0 blocker for the review experience itself.
5. `File Import` is really a mini-subflow with its own parse status, ICS date filtering,
   preview, and import handoff in [file-importer.tsx](/E:/Repos/NRI/repos-vibe/trip-planner/components/trip/file-importer.tsx#L89).
   The source plan needs to treat it as a named node, not just "file import."

### Missing plan nodes

1. Step-local stale states:
   `draft edited after optimize`, `optimized result stale`, `navigation stale`.
2. Provider-specific empty and degraded states:
   `AMap unavailable`, `Google preview only`, `Mapbox unsupported`.
3. Mobile review editing strategy for anchors and stop rows.

### Design locks to make now

1. The four-step workspace should be implemented as one active primary step plus a
   compact progress rail, not as four simultaneously expanded panels.
2. `Review` must get its own dedicated editor surface with:
   anchors, stop rows, unresolved place queue, provenance badge, and `Confirm draft` CTA.
3. The map belongs only to `Execute`, except for a lightweight resolved-location check
   inside `Review`.

## 7. Engineering Review

### Findings

1. The plan is correct that the codebase is model-fragmented, but it still understates
   the hot spots. [types.ts](/E:/Repos/NRI/repos-vibe/trip-planner/lib/trip/types.ts#L7)
   currently mixes manual-input models, UI models, backend request models, and optimized
   route models in one file.
2. The biggest migration risk is still [server.ts](/E:/Repos/NRI/repos-vibe/trip-planner/lib/trip/server.ts#L61),
   which owns sample-trip construction, placeholder construction, OpenAI orchestration,
   geocoding, optimization, UI conversion, and navigation-link building in one module.
3. Route handlers are thin, but too thin. The three `app/api/trip/*/route.ts` files do
   no runtime schema validation before calling the monolith server functions.
4. Anchor preservation is still not real. `uiStopsToBackendTrip()` in
   [ui-mappers.ts](/E:/Repos/NRI/repos-vibe/trip-planner/lib/trip/ui-mappers.ts#L133)
   serializes days as generic stop arrays and does not preserve first-class start/end
   anchor semantics from the new plan.
5. The request contract already exposes dead parameters. `calendarBlocks` is sent by
   [parse-client.ts](/E:/Repos/NRI/repos-vibe/trip-planner/lib/trip/parse-client.ts#L140)
   and typed in [server.ts](/E:/Repos/NRI/repos-vibe/trip-planner/lib/trip/server.ts#L23),
   but is not consumed in the parse flow.
6. Coverage is dangerously shallow. The only automated tests are parser-focused in
   [parse-file.test.mjs](/E:/Repos/NRI/repos-vibe/trip-planner/tests/parse-file.test.mjs#L13).

### Missing plan nodes

1. Canonical contract definitions for:
   parse outcome, place resolution outcome, optimize outcome, navigation outcome.
2. Runtime validation layer for all three route handlers.
3. Capability matrix for providers and environment keys:
   `OPENAI_API_KEY`, `AMAP_API_KEY`, `NEXT_PUBLIC_AMAP_JS_KEY`.
4. Baseline recovery work for the missing structured form component.

### Architecture locks to make now

1. Introduce canonical `TripDraft`, `ResolvedTrip`, `OptimizedTrip`, and
   `NavigationPlan` types in a new domain module before further UI decomposition.
2. Split `server.ts` by use case before splitting the page shell:
   `parse-trip`, `resolve-trip-places`, `optimize-trip`, `build-navigation-plan`.
3. Freeze route input and output shapes with runtime validators before phase-3 UI work.
4. Treat `MapProvider` as a capability contract, not just a string union.

## 8. Cross-Phase Themes

These are the concerns that appeared independently across product, design, and
engineering review:

1. Honesty is still incomplete because the server parse path can silently downgrade to
   sample or placeholder results.
2. The current page structure still exposes an implementation pipeline more than a user
   workflow.
3. Anchor semantics and place-resolution semantics are not yet first-class.
4. The refactor plan needs a more explicit inventory of current nodes and failure paths,
   not just high-level architecture targets.

## 9. Error & Rescue Registry

| Trigger | Current behavior | User impact | Required rescue path | Target phase |
|---|---|---|---|---|
| `OPENAI_API_KEY` missing | Server returns placeholder or sample draft from parse route | Live parse can look successful while being synthetic | Return explicit parse error or explicit non-live outcome type | P0B |
| OpenAI parse fails | Server logs and falls back to heuristic sample/placeholder | Trust violation | Same as above, plus retry and switch-to-demo choice | P0B |
| `AMAP_API_KEY` missing | Parse/optimize continue without resolution | Guessed coords can look authoritative | Show unresolved-place queue and resolution warning | P1 |
| `NEXT_PUBLIC_AMAP_JS_KEY` missing or mismatched | Map shows SDK error in map panel | Execute stage looks broken without context | Provider capability warning and fallback copy | P0B |
| Review edits after optimize | Outputs are cleared, but stale semantics are not explicit in UI | Users can lose confidence in what changed | Show stale badges and rerun CTA near optimize/execute | P1 |
| `backendOptimizedTrip` absent for live navigation | Client throws explicit error | Honest, but not yet step-local | Keep honest error and add per-step rescue CTA | P0B |
| Invalid file import | File importer shows status only | Acceptable but isolated | Keep, then integrate into intake state model | P1 |
| `Mapbox` selected | Placeholder preview only | Capability lies by omission | Hide or disable until supported | P0B |
| Structured editor missing from worktree | Build path and review step are blocked | Core draft-review flow broken | Restore component before refactor work continues | P0A |

## 10. Failure Modes Registry

| Failure mode | Where it lives now | Consequence | Current coverage | Planned action |
|---|---|---|---|---|
| Fake live parse success | `lib/trip/server.ts` parse fallback | User trusts synthetic output | None | Remove heuristic success from live route |
| Anchor loss during conversion | `lib/trip/ui-mappers.ts` | Start/end semantics collapse into generic stops | None | Add canonical anchor-aware models and round-trip tests |
| Provider mismatch in UI | `app/trip/page.tsx`, `components/trip/trip-map.tsx` | Users can choose unsupported providers | None | Add provider capability matrix and gate UI choices |
| No runtime DTO validation | `app/api/trip/*/route.ts` | Undefined behavior, brittle errors | None | Add validators at all route boundaries |
| Stale-result ambiguity | `app/trip/page.tsx` | Users cannot tell if optimize/execute outputs are outdated | None | Centralize flow-state machine and stale markers |
| Parse contract drift | `parse-openai.ts`, `types.ts`, `server.ts` | Backend schema and UI assumptions diverge silently | None | Introduce domain contract module and adapter DTOs |
| Parser-only test suite | `tests/parse-file.test.mjs` | Core path can regress without signal | Low | Add route/use-case/workflow tests |
| Missing review editor component | `components/trip/structured-form.tsx` | Core flow unavailable | None | Restore immediately in P0A |

## 11. Revised Phase Plan

### P0A: Restore baseline stability

Definition of done:

1. `components/trip/structured-form.tsx` exists again and the current worktree typechecks.
2. The app can complete text intake, file intake, manual draft review, optimize, and
   execute in at least one honest mode.
3. No refactor starts on top of a broken baseline.

### P0B: Finish honesty and capability truth

Definition of done:

1. Live parse no longer returns sample or placeholder drafts as normal success.
2. Provider capability is explicit in the UI and contract layer.
3. Parse outcomes are typed as:
   `live`, `demo`, `manual`, `placeholder`, `partial-resolution`, `error`.

### P1: Canonical models and flow-state machine

Definition of done:

1. New domain types live outside `lib/trip/types.ts`.
2. Anchors are first-class.
3. Stale-result rules are centralized and consumed by the page.
4. A place-resolution state is explicit in the review model.

### P2: Route contracts and use-case extraction

Definition of done:

1. Each route has runtime validation.
2. `server.ts` has been split into use-case modules.
3. Provider adapters are capability-scoped.
4. Placeholder/demo behaviors live behind explicit adapter names.

### P3: Review-first UI decomposition

Definition of done:

1. `/trip` is a thin shell.
2. `Intake`, `Review`, `Optimize`, and `Execute` each own their panel tree.
3. `Review` has the resolved-place queue, anchor editor, and draft provenance.

### P4: Legacy deletion

Definition of done:

1. Old mapper bridge is isolated or deleted.
2. UI no longer depends on legacy backend DTOs as its internal state model.

### P5: Coverage and hardening

Definition of done:

1. Canonical path is covered at parser, route, use-case, and happy-path integration levels.
2. Error paths are covered for missing keys, unresolved places, provider mismatch, and
   stale results.

## 12. Sequencing Corrections

These order changes should be treated as locked:

1. `P0A` must happen before anything else. The missing structured editor is a baseline
   blocker, not a later polish item.
2. `P0B` must finish before `P3`. Otherwise the step-workspace refactor will preserve
   dishonest parse semantics behind a prettier shell.
3. Route DTO validation must land before aggressive UI decomposition. If the contract is
   still moving, the page split just spreads churn across more files.
4. Provider capability gating must land before the design pass exposes step-local map
   choices. Do not build more UI around unsupported providers.

## 13. Detailed Test Matrix

| Codepath / node | Current coverage | Needed tests |
|---|---|---|
| CSV parse | Yes | Keep |
| TSV parse | Yes | Keep |
| Markdown parse | No | Add parser tests |
| ICS parse + date filter | Partial | Add parser edge tests for multi-day and empty filter results |
| Text parse live success | No | Add route and use-case tests |
| Text parse live failure | No | Add route tests for explicit error outcome |
| Demo parse | No | Add client/use-case test |
| Manual structured draft apply | No | Add component or adapter tests |
| UI stop -> canonical draft mapping | No | Add round-trip conversion tests |
| Anchor preservation | No | Add round-trip conversion tests |
| Place resolution partial success | No | Add adapter/use-case tests |
| Optimize live | No | Add route and use-case tests |
| Optimize demo | No | Add use-case tests |
| Navigation live | No | Add route and use-case tests |
| Navigation demo | No | Add use-case tests |
| Stale downstream invalidation | No | Add state-machine tests |
| Provider capability gating | No | Add view-model tests |
| Missing env key behavior | No | Add route/use-case tests |
| Main happy path | No | Add minimal integration test |

## 14. Implementation Checklist

### Immediate blockers

1. Restore `components/trip/structured-form.tsx`.
2. Remove live parse heuristic success in `lib/trip/server.ts`.
3. Decide whether `calendarBlocks` is real scope or dead API.
4. Remove or disable `mapbox` from user-facing choices.

### First contract work

1. Create `lib/trip/domain/models.ts`.
2. Create `lib/trip/domain/errors.ts`.
3. Create route validators for parse, optimize, and navigation.
4. Define parse outcome/result taxonomy.

### First UI work after contracts

1. Extract intake step shell.
2. Rebuild review editor around canonical draft.
3. Add stale-result markers and step-local rescue CTAs.
4. Move map and navigation fully under execute.

## 15. Decision Audit Trail

| # | Phase | Decision | Classification | Rationale |
|---|---|---|---|---|
| 1 | Product | Keep `itinerary compiler` wedge | lock | Current code proves compilation, not broad trip-planner value |
| 2 | Product | China-first, AMap-first for this refactor | lock | Current provider and sample coverage are China-heavy |
| 3 | Product | Ban live-route heuristic success | lock | Honesty is the core product promise |
| 4 | Design | One active primary step, not all-panels-open | lock | Current page still behaves like a control console |
| 5 | Design | Review owns unresolved places and anchors | lock | That is where users repair trust gaps |
| 6 | Engineering | Add `P0A` before all other phases | lock | Missing structured editor blocks baseline stability |
| 7 | Engineering | Split use cases before large UI split | lock | Current monolith churn would otherwise spread through the tree |
| 8 | Engineering | Add runtime DTO validation at all routes | lock | Thin routes without validation are brittle and hard to reason about |

## 16. Recommended Next Step

The next correct move is not another abstract review pass.

It is:

1. Accept this review as the companion plan.
2. Execute `P0A` and `P0B`.
3. Only then reopen the domain-model and step-workspace split.
