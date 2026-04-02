import { readParseRequest, RouteContractError } from '@/lib/trip/contracts';
import { parseTripTextToDraft } from '@/lib/trip/server';

export async function POST(request: Request) {
  try {
    const body = readParseRequest(await request.json());
    const result = await parseTripTextToDraft(body);
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
