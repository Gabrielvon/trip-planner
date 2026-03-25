/**
 * OpenAI Structured Outputs parser for multi-day trip text.
 *
 * Uses JSON schema mode (response_format: { type: 'json_schema' }) so the model
 * is constrained to return a valid BackendMultiDayTrip on every call.
 *
 * Only called from server.ts when OPENAI_API_KEY is present.
 * Falls back to the heuristic placeholder when the key is absent or the call fails.
 */

import OpenAI from 'openai';
import { BackendMultiDayTrip, MapProvider } from './types';

// ---------------------------------------------------------------------------
// JSON Schema targeting BackendMultiDayTrip
// OpenAI Structured Outputs requires additionalProperties: false at every level.
// ---------------------------------------------------------------------------

// OpenAI Structured Outputs strict mode rule:
// Every key listed in `properties` MUST appear in `required`.
// Optional fields must use a union with `null` (e.g. ["string","null"]) and be marked required.
const TRIP_JSON_SCHEMA = {
  name: 'BackendMultiDayTrip',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      tripId: { type: 'string' },
      title: { type: 'string' },
      timezone: { type: 'string' },
      mapProvider: { type: 'string', enum: ['amap', 'google', 'mapbox'] },
      transportMode: { type: 'string', enum: ['driving', 'walking', 'cycling', 'transit'] },
      objective: { type: 'string', enum: ['fastest', 'shortest', 'balanced'] },
      preferences: {
        type: 'object',
        properties: {
          avoidBacktracking: { type: 'boolean' },
          preferAreaClustering: { type: 'boolean' },
        },
        additionalProperties: false,
        required: ['avoidBacktracking', 'preferAreaClustering'],
      },
      days: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            day: { type: 'integer' },
            date: { type: ['string', 'null'] },
            start: {
              anyOf: [
                {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    rawLocation: { type: ['string', 'null'] },
                    time: { type: ['string', 'null'] },
                  },
                  additionalProperties: false,
                  required: ['name', 'rawLocation', 'time'],
                },
                { type: 'null' },
              ],
            },
            end: {
              anyOf: [
                {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    rawLocation: { type: ['string', 'null'] },
                    time: { type: ['string', 'null'] },
                  },
                  additionalProperties: false,
                  required: ['name', 'rawLocation', 'time'],
                },
                { type: 'null' },
              ],
            },
            stops: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  title: { type: 'string' },
                  rawLocation: { type: 'string' },
                  durationMin: { type: 'integer' },
                  earliestStart: { type: ['string', 'null'] },
                  latestArrival: { type: ['string', 'null'] },
                  fixedOrder: { type: ['boolean', 'null'] },
                  priority: { type: ['integer', 'null'] },
                  category: {
                    type: ['string', 'null'],
                    enum: ['meeting', 'meal', 'sightseeing', 'hotel', 'transport', 'custom', null],
                  },
                  notes: { type: ['string', 'null'] },
                },
                additionalProperties: false,
                required: [
                  'id', 'title', 'rawLocation', 'durationMin',
                  'earliestStart', 'latestArrival', 'fixedOrder',
                  'priority', 'category', 'notes',
                ],
              },
            },
          },
          additionalProperties: false,
          required: ['day', 'date', 'start', 'end', 'stops'],
        },
      },
      hardConstraints: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string' },
            description: { type: 'string' },
          },
          additionalProperties: false,
          required: ['type', 'description'],
        },
      },
      warnings: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    additionalProperties: false,
    required: [
      'tripId',
      'title',
      'timezone',
      'mapProvider',
      'transportMode',
      'objective',
      'preferences',
      'days',
      'hardConstraints',
      'warnings',
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a structured trip planning assistant. Parse natural language trip descriptions into a strict JSON object.

Rules:
1. Extract every day (D1, D2, 第一天, 第二天, Day 1, etc.) as a separate entry in "days".
2. For each day, identify a start point (earliest mentioned location/departure) and end point (last mentioned location/return).
3. Everything between start and end goes in "stops". Assign unique IDs like "d1-s1", "d1-s2", "d2-s1", etc.
4. Estimate durationMin based on explicit durations in the text (e.g. "60 分钟" = 60). If not mentioned, guess based on activity type: meals ~60, sightseeing ~90, meetings ~60, transport ~15.
5. Set earliestStart / latestArrival ONLY when the text specifies a time constraint. Use HH:MM format.
6. Set fixedOrder: true only for stops that MUST happen in a specific order (typically start, end, and time-constrained events).
7. Set category from: meeting, meal, sightseeing, hotel, transport, custom.
8. If the input is ambiguous, incomplete, or missing information, emit a warning in the "warnings" array instead of guessing confidently.
9. Use "amap" as default mapProvider, "transit" as default transportMode, "balanced" as default objective.
10. For hardConstraints, extract explicit time windows, fixed appointments, or logistical anchors (flights, trains).
11. title should be a concise trip name derived from the input.
12. timezone: infer from location names if possible (e.g. Tokyo → Asia/Tokyo, Beijing → Asia/Shanghai). Default to "Asia/Shanghai".
13. All string fields that are unknown must be empty string "", never null or undefined.

Return ONLY valid JSON matching the schema. No explanations.`;

// ---------------------------------------------------------------------------
// Exported parse function
// ---------------------------------------------------------------------------

export async function parseTripWithOpenAI(
  text: string,
  timezone: string,
  mapProvider: MapProvider,
): Promise<{ trip: BackendMultiDayTrip; warnings: string[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    response_format: {
      type: 'json_schema',
      json_schema: TRIP_JSON_SCHEMA,
    },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Parse this trip description. Use timezone="${timezone}" and mapProvider="${mapProvider}".\n\n${text}`,
      },
    ],
    temperature: 0.1, // low temp for deterministic structured extraction
    max_tokens: 4096,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('OpenAI returned empty content');
  }

  // The model is schema-constrained, so parse is safe; still guard.
  const parsed = JSON.parse(raw) as BackendMultiDayTrip & { warnings?: string[] };

  // Pull warnings out of the trip object — they're in the schema for extraction
  // convenience but should be returned separately.
  const warnings: string[] = parsed.warnings ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (parsed as any).warnings;

  // Stamp IDs for any stops that came back without one (defensive)
  parsed.days?.forEach((day, di) => {
    day.stops?.forEach((stop, si) => {
      if (!stop.id) {
        stop.id = `d${di + 1}-s${si + 1}`;
      }
    });
  });

  return { trip: parsed, warnings };
}
