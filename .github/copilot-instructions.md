# Trip Planner — Copilot Instructions

## Project Overview
Multi-day trip planning web tool. Users input natural language describing a trip; the app parses, optimizes, and outputs schedules + navigation links.

**Tech stack:** Next.js 15 App Router · TypeScript (strict) · Tailwind CSS · OpenAI SDK · Node 22

---

## File Map

| Path | Role |
|---|---|
| `app/trip/page.tsx` | Thin shell — UI state only, no business logic |
| `app/api/trip/parse/route.ts` | Route handler → `parseTripTextToDraft()` |
| `app/api/trip/optimize/route.ts` | Route handler → `optimizeTripServer()` |
| `app/api/trip/navigation-links/route.ts` | Route handler → `buildNavigationLinksServer()` |
| `lib/trip/types.ts` | All shared types (front + back) |
| `lib/trip/mock.ts` | SEED_STOPS, heuristic optimizer, schedule builder, mock nav links |
| `lib/trip/parse-openai.ts` | OpenAI Structured Outputs parser — called when OPENAI_API_KEY is set |
| `lib/trip/server.ts` | Server-side business logic for all three routes |
| `lib/trip/ui-mappers.ts` | Convert backend trip objects ↔ UI Stop arrays |
| `lib/trip/parse-client.ts` | Client fetch wrappers with mock fallback |

---

## Architecture Rules (non-negotiable)

1. **`page.tsx` stays thin** — no business logic, no map calls, no parse algorithms. Only state + API calls via `parse-client.ts`.
2. **No giant files** — keep each `lib/trip/*.ts` focused on one concern.
3. **Types stay in `types.ts`** — do not declare domain types inline in route handlers or page components.
4. **Mock fallback is permanent during development** — `parse-client.ts` catches API errors and falls back silently. Do not remove until both API + integration tests are verified.
5. **API routes are `route.ts`, not `routes.ts`** — Next.js App Router requires exactly `route.ts`.
6. **Provider abstraction** — `lib/trip/server.ts` and `lib/trip/types.ts` use `MapProvider` type. Never hard-wire provider-specific response shapes into the UI layer.

---

## Environment Variables

Copy `.env.example` → `.env.local` and fill in:

```
OPENAI_API_KEY=sk-...     # enables real structured parsing
AMAP_API_KEY=...          # enables real geocoding / routing (Phase 5)
```

When `OPENAI_API_KEY` is absent, the parse endpoint falls back to heuristic/sample data automatically. The page shows a warning banner.

---

## Build / Dev Commands

```bash
npm install          # install deps
npm run dev          # http://localhost:3000
npm run build        # production build
npx tsc --noEmit     # type-check only
```

---

## Key Data Flow

```
/trip page
  → parseViaRouteOrMock(text)            (parse-client.ts)
      → POST /api/trip/parse             (route.ts → server.ts)
          → parseTripWithOpenAI()        (parse-openai.ts, if key set)
          ↳ fallback: heuristic draft
  → optimizeViaRouteOrMock(stops, ...)   (parse-client.ts)  
      → POST /api/trip/optimize          (route.ts → server.ts)
          → nearest-neighbor per day     (mock.ts heuristics)
  → navigationViaRouteOrMock(trip, ...)  (parse-client.ts)
      → POST /api/trip/navigation-links  (route.ts → server.ts)
          → AMap URI builder             (server.ts)
```

---

## Current Implementation Status

| Feature | Status |
|---|---|
| Page shell + 3 API routes | ✅ working |
| Mock optimizer + schedule builder | ✅ working |
| OpenAI Structured Outputs parse | ✅ wired (needs `OPENAI_API_KEY`) |
| AMap geocoding / route matrix | ❌ Phase 5 — still mock |
| Real map component (AMap JS SDK) | ❌ Phase 4 map — still simplified display |
| Google Calendar / ICS import | ❌ Phase 5 |
| Conflict / infeasibility UI | ❌ planned |

---

## What NOT to Do

- ❌ Do **not** add business logic to `page.tsx`
- ❌ Do **not** rename `route.ts` to `routes.ts`
- ❌ Do **not** couple server logic directly to AMap response shapes; always go through the provider adapter pattern
- ❌ Do **not** remove mock fallback until real API paths are integration-tested
- ❌ Do **not** collapse multi-day structure back to single-day assumptions anywhere in the data model

---

## Next Priorities (ordered)

1. Add `.env.local` with real `OPENAI_API_KEY` and smoke-test `/api/trip/parse` end-to-end
2. Verify AMap navigation links work for real parsed locations
3. Phase 5: Add AMap geocoding adapter in `lib/trip/amap-provider.ts`
4. Replace coordinate guessing (`guessCoords`) with real geocoding results
5. Add location disambiguation UI for ambiguous place names
6. Add conflict display UI when optimizer finds infeasible constraints
7. Integrate AMap JS SDK map component into the page
