/**
 * Proxy endpoint for parsing with user-provided LLM config.
 *
 * This endpoint is used when frontend direct calls fail due to CORS.
 * It accepts the user's LLM config and forwards the request to their API.
 */

import { parseTripWithCustomLLM } from '@/lib/trip/parse-openai';
import {
  assertLiveParseRateLimit,
  readJsonRequestBody,
} from '@/lib/trip/live-parse-guard';
import type { LLMConfig, MapProvider } from '@/lib/trip/types';

type CustomParseRequest = {
  text: string;
  timezone: string;
  mapProvider: MapProvider;
  llmConfig: LLMConfig;
};

function validateCustomParseRequest(body: unknown): body is CustomParseRequest {
  if (typeof body !== 'object' || body === null) return false;

  const b = body as Record<string, unknown>;

  if (typeof b.text !== 'string' || !b.text.trim()) return false;
  if (typeof b.timezone !== 'string') return false;
  if (typeof b.mapProvider !== 'string') return false;

  if (typeof b.llmConfig !== 'object' || b.llmConfig === null) return false;
  const llm = b.llmConfig as Record<string, unknown>;
  
  if (typeof llm.apiKey !== 'string' || !llm.apiKey.trim()) return false;
  if (typeof llm.baseUrl !== 'string') return false;
  if (typeof llm.modelName !== 'string' || !llm.modelName.trim()) return false;

  return true;
}

export async function POST(request: Request) {
  try {
    assertLiveParseRateLimit(request);

    const rawBody = await readJsonRequestBody(request);
    
    if (!validateCustomParseRequest(rawBody)) {
      return Response.json(
        { error: 'Invalid request body', detail: 'Missing or invalid fields' },
        { status: 400 },
      );
    }

    const { text, timezone, mapProvider, llmConfig } = rawBody;

    const result = await parseTripWithCustomLLM(
      text,
      llmConfig,
      timezone,
      mapProvider,
    );

    return Response.json(result, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Detect common error types for better UX
    if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      return Response.json(
        { error: 'Invalid API Key', detail: 'The provided API key was rejected by the API server.' },
        { status: 401 },
      );
    }

    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return Response.json(
        { error: 'Model not found', detail: 'The specified model was not found. Check the model name and base URL.' },
        { status: 404 },
      );
    }

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
      return Response.json(
        { error: 'Connection failed', detail: 'Could not connect to the API server. Check the base URL.' },
        { status: 503 },
      );
    }

    if (errorMessage.includes('timeout')) {
      return Response.json(
        { error: 'Request timeout', detail: 'The API server took too long to respond.' },
        { status: 504 },
      );
    }

    return Response.json(
      { error: 'Failed to parse with custom LLM', detail: errorMessage },
      { status: 500 },
    );
  }
}
