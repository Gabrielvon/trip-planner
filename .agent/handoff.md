# Agent Handoff Document
Generated: 2026-03-24T03:41:00Z
From: GPT-5.4 Thinking / ChatGPT session

## 🎯 Original Mission
Build a web-based multi-day trip planner that can understand natural language or calendar input, optimize routes, and output schedules plus navigation.

## ✅ Completed
- feat: defined product scope, MVP boundary, architecture, and data model → documented in `PRD_trip_planner.md`
- feat: designed a thin-shell Next.js App Router architecture for the project → intended files under `app/trip/page.tsx`, `app/api/trip/*`, `lib/trip/*`
- feat: produced shared front/back-end TypeScript domain types → intended `lib/trip/types.ts`
- feat: produced mock data, heuristic multi-day optimizer, schedule builder, and navigation-link generator → intended `lib/trip/mock.ts`
- feat: produced UI/backend bridge mappers for converting between UI stop arrays and backend trip objects → intended `lib/trip/ui-mappers.ts`
- feat: produced client request wrappers with "real API first, mock fallback" behavior → intended `lib/trip/parse-client.ts`
- feat: produced a thin `/trip` page shell that should only manage UI state and invoke client wrappers → intended `app/trip/page.tsx`
- feat: produced minimal server-side trip parsing, optimization, and navigation-link generation services → intended `lib/trip/server.ts`
- feat: produced Next.js route handlers for parse/optimize/navigation-links → intended `app/api/trip/parse/route.ts`, `app/api/trip/optimize/route.ts`, `app/api/trip/navigation-links/route.ts`

## 🔄 Current State
- Currently in the middle of: transitioning from a ChatGPT/canvas prototype into a real multi-file Next.js project.
- Last action taken: wrote the complete PRD and generated the first and second batches of proposed project files/content for a modular App Router implementation.
- Known broken state (if any): the code has been designed and written in chat, but may not yet exist in the target repository as actual files unless the next agent creates/copies them there.
- Known incomplete state: `/api/trip/parse` is still a minimal placeholder/parser-by-heuristic; it does not yet use real OpenAI Structured Outputs.
- Known incomplete state: map routing/geocoding still uses mock logic; no real AMap SDK/API integration yet.
- Known incomplete state: calendar import/export UI exists only as a planned extension; no real Google Calendar or ICS integration yet.

## 🚧 Pending Decision / Blocker
- Question: what should be implemented first after the minimal full-stack scaffold is materialized in the repo?
- Options considered: A) integrate OpenAI Structured Outputs into `/api/trip/parse` first (pros: biggest improvement to product quality, replaces placeholder parsing; cons: requires API key/config/schema work), B) integrate real AMap geocoding/routing first (pros: makes routing more realistic; cons: parser quality remains weak, bad inputs produce bad routes)
- My recommendation: do A first, then AMap. If the input structure is unreliable, map accuracy will not rescue the overall result.

## 📂 Files Changed This Session
- `PRD_trip_planner.md` — created a complete product requirements document suitable for handoff to engineering agents
- `.agent/handoff.md` — created this concrete handoff file for the next coding agent
- `app/trip/page.tsx` — intended thin UI shell; should manage user state, call client wrappers, and remain intentionally light
- `lib/trip/types.ts` — intended shared domain model for UI/backend contracts
- `lib/trip/mock.ts` — intended local sample data, heuristic optimizer, schedule builder, and mock navigation generation
- `lib/trip/ui-mappers.ts` — intended conversion layer between backend trip objects and UI stop/timeline models
- `lib/trip/parse-client.ts` — intended request layer that prefers real `/api/trip/*` endpoints and falls back to mocks
- `lib/trip/server.ts` — intended server-side business logic for parse/optimize/navigation generation
- `app/api/trip/parse/route.ts` — intended Next.js Route Handler for parsing trip text into a draft trip
- `app/api/trip/optimize/route.ts` — intended Next.js Route Handler for optimizing a structured trip
- `app/api/trip/navigation-links/route.ts` — intended Next.js Route Handler for building day-level navigation links

## 📋 Next Steps (ordered)
1. Materialize the proposed files into the actual repository using the exact file tree described in the PRD and handoff.
2. Verify `/trip` renders and the page can call the three route handlers without TypeScript/import errors.
3. Replace the placeholder implementation in `lib/trip/server.ts::parseTripTextToDraft()` with a real OpenAI Structured Outputs call and a strict JSON schema targeting `BackendMultiDayTrip`.
4. Add environment/config handling for the OpenAI API key and fail gracefully when the key is absent.
5. Integrate real AMap geocoding and route matrix/path logic behind a provider adapter instead of using mock coordinate guesses.
6. Replace the simplified route graphic in the page with a real map component once AMap integration is stable.
7. Add location disambiguation UI for ambiguous places returned by geocoding.
8. Add conflict reporting UI for infeasible schedules and time-window violations.
9. Add Google Calendar and/or ICS import/export after parse + map integration are stable.
10. Add tests for parser response shaping, mapper correctness, and optimizer day-splitting behavior.

## ⚠️ Constraints & Decisions Already Made
- Decided to keep `app/trip/page.tsx` thin; do not move core business logic back into the page component.
- Decided to use a multi-file Next.js App Router structure; do not revert to a single giant canvas-style file.
- Decided that the app must be multi-day by design; do not collapse the model back to single-day assumptions.
- Decided that map providers must be abstracted; do not hard-wire the business layer directly to a single map vendor response shape.
- Decided to prioritize AMap as the default provider for China-mainland-friendly behavior, while keeping room for Google/Mapbox adapters later.
- Decided to keep "real API first, mock fallback" behavior during development so the UI remains usable while back-end integrations are incomplete.
- Decided that parse quality is the highest-priority upgrade after the scaffold exists; do not spend the next cycle polishing UI before fixing structured parsing.

## 🧠 Critical Context
```text
Target repository structure:

app/
  trip/
    page.tsx
  api/
    trip/
      parse/
        route.ts
      optimize/
        route.ts
      navigation-links/
        route.ts

lib/
  trip/
    types.ts
    mock.ts
    ui-mappers.ts
    parse-client.ts
    server.ts

Critical implementation rule:
- The page is only a shell.
- Types, mock logic, mapping logic, client request logic, and server logic must stay in separate files.
- Do not reintroduce the original problem of a giant single-file preview implementation.

Current reality of the parser:
- `/api/trip/parse` is NOT truly intelligent yet.
- It returns either a sample structured trip (for sample-like text) or a placeholder draft trip.
- The next serious implementation milestone is replacing this with OpenAI Structured Outputs.

Why Structured Outputs next:
- Bad structured input will poison every downstream stage.
- Real map integration is valuable, but parse correctness is the main leverage point.

What “done” should look like for the next agent:
- `/trip` works from actual repo files.
- The parse endpoint returns a real `BackendMultiDayTrip` from natural language.
- The optimize endpoint still works on that structure.
- The UI continues to support fallback if APIs are unavailable during development.
```
