import { readParseRequest, RouteContractError } from '@/lib/trip/contracts';
import {
  assertLiveParseRateLimit,
  readJsonRequestBody,
} from '@/lib/trip/live-parse-guard';
import { parseTripTextToDraft } from '@/lib/trip/server';

export async function POST(request: Request) {
  try {
    assertLiveParseRateLimit(request);
    const body = readParseRequest(await readJsonRequestBody(request));
    const result = await parseTripTextToDraft(body, request);
    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof RouteContractError) {
      return Response.json(
        {
          error: 'Invalid parse request',
          detail: error.message,
        },
        { status: error.status },
      );
    }

    return Response.json(
      {
        error: 'Failed to parse trip input',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
