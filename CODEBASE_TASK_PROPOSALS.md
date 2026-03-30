# Codebase issue scan: prioritized task proposals

This document proposes **four implementation tasks** based on current code behavior.
Each task includes: issue evidence, concrete scope, and definition of done.

---

## Task 1 — Typo / wording fix (low risk)

### Problem
File type labeling is misleading for non-CSV text files.

### Evidence
In `parseFileText`, `.csv`, `.tsv`, and `.txt` are all assigned `format = 'CSV (.csv)'`.

### Scope
- Update format labels so they match the uploaded extension and parser behavior.
- Keep parsing logic unchanged (this task is wording/UX only).

### Definition of done
- `.csv` shows `CSV (.csv)`.
- `.tsv` shows `TSV (.tsv)` (or explicit `CSV/TSV`).
- `.txt` shows `Text (.txt, auto-detect delimiter)`.
- File importer status text continues to render correctly.

### Files
- `lib/trip/parse-file.ts`
- `components/trip/file-importer.tsx` (only if display copy needs alignment)

---

## Task 2 — Bug fix: hardcoded parse context (high impact)

### Problem
The parse request always sends `timezone: 'Asia/Tokyo'` and `mapProvider: 'amap'`, even when user selections differ.

### Impact
- Incorrect timezone inference in parsed schedules.
- Inconsistent behavior between UI-selected provider and backend parse context.

### Scope
- Pass runtime-selected `timezone` and `mapProvider` into `parseViaRouteOrMock`.
- Thread those values from caller state to request payload.
- Preserve fallback-to-mock behavior on API failure.

### Definition of done
- Request payload no longer contains hardcoded timezone/provider.
- Changing provider in UI changes parse payload provider.
- Existing parse/optimize/navigation flows still complete in both API and mock modes.

### Files
- `lib/trip/parse-client.ts`
- `app/trip/page.tsx`
- (optional) shared type signatures in `lib/trip/types.ts` if function args are expanded

---

## Task 3 — Documentation discrepancy fix: prompt vs schema nullability (medium impact)

### Problem
OpenAI prompt rule says unknown string fields must be empty string and never null, but schema allows null for multiple string fields.

### Impact
Conflicting instructions can reduce extraction consistency and increase post-parse normalization complexity.

### Scope
- Align prompt wording with schema intent.
- Keep schema as source of truth.
- Clarify how unknown values should be represented for nullable vs non-nullable fields.

### Definition of done
- No contradiction remains between prompt text and JSON schema.
- Prompt explicitly distinguishes nullable fields from required non-null strings.
- Existing parse flow remains backward-compatible.

### Files
- `lib/trip/parse-openai.ts`

---

## Task 4 — Test improvement: parser regression coverage (high leverage)

### Problem
There is currently no project test script, and parser logic has several edge-sensitive branches.

### Scope
- Add a test runner (prefer Vitest for TS ergonomics in this repo).
- Add `npm test` script.
- Add focused tests for `lib/trip/parse-file.ts`.

### Minimum test cases
1. CSV header auto-detection.
2. TSV delimiter parsing.
3. CSV quoted-comma field handling (e.g., `"Tokyo, Station"`).
4. ICS duration derivation from `DTEND` and fallback when unavailable.
5. Date-range filtering behavior in `icsEventsToStops`.

### Definition of done
- `npm test` runs in CI/local.
- New tests fail before parser regressions and pass on current intended behavior.
- At least one malformed input case is covered with explicit expected output.

### Files
- `package.json`
- `lib/trip/parse-file.ts`
- `lib/trip/parse-file.test.ts` (new)

---

## Suggested execution order
1. **Task 2 (bug fix)** — correctness first.
2. **Task 4 (tests)** — lock behavior with regression coverage.
3. **Task 3 (doc alignment)** — reduce model ambiguity.
4. **Task 1 (wording/typo)** — quick UX cleanup.
