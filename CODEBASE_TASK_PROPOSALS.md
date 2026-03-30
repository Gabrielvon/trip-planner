# Codebase issue scan: proposed tasks

## 1) Typo / wording task
**Task:** Fix the file format label shown for `.tsv` uploads so it does not claim `CSV (.csv)`.

- **Why:** In `parseFileText`, `.csv`, `.tsv`, and `.txt` all map to `format = 'CSV (.csv)'`, which is misleading for `.tsv` and can confuse users/support debugging logs.
- **Where:** `lib/trip/parse-file.ts`.
- **Suggested acceptance criteria:**
  - `.tsv` is displayed as `TSV (.tsv)` (or a combined, explicit label like `CSV/TSV`).
  - `.csv` remains clearly labeled as CSV.
  - `.txt` fallback label is explicit about delimiter auto-detection.

## 2) Bug-fix task
**Task:** Remove hardcoded parse request context (`timezone: 'Asia/Tokyo'`, `mapProvider: 'amap'`) and pass runtime-selected values.

- **Why:** The parse API call currently ignores user/provider context, which can produce wrong timezone inference and provider defaults.
- **Where:** `parseViaRouteOrMock` in `lib/trip/parse-client.ts`.
- **Suggested acceptance criteria:**
  - Parse request receives timezone/provider from UI state (or a shared config), not constants.
  - Existing fallback-to-mock behavior remains unchanged when API fails.
  - Manual check: selecting Google mode no longer sends `amap` in parse payload.

## 3) Code comment / documentation discrepancy task
**Task:** Align the OpenAI system prompt rule with the JSON schema on nullable string fields.

- **Why:** The prompt says unknown string fields must be empty string (`""`) and never null, but the schema explicitly allows `null` for multiple string fields (for example `date`, `rawLocation`, `earliestStart`, `latestArrival`). This mismatch can reduce model consistency.
- **Where:** `lib/trip/parse-openai.ts`.
- **Suggested acceptance criteria:**
  - Prompt wording matches schema intent (`null` allowed where schema allows it).
  - No contradiction remains between prompt and schema comments.

## 4) Test-improvement task
**Task:** Add parsing unit tests for CSV/TSV edge cases and parser behavior.

- **Why:** The project currently has no test script, and parsing behavior includes fragile areas (delimiter detection, header skipping, quoted values with commas).
- **Where:** start with `lib/trip/parse-file.ts` tests and add a test script in `package.json`.
- **Suggested acceptance criteria:**
  - Add a test runner setup (e.g., Vitest/Jest) and `npm test` script.
  - Include cases for:
    - `.tsv` delimiter handling.
    - Header row auto-detection.
    - CSV quoted comma fields (e.g., `"Tokyo, Station"`).
    - ICS event duration fallback behavior.
