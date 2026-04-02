import { readOptimizeRequest, RouteContractError } from '@/lib/trip/contracts';
import { optimizeTripServer } from '@/lib/trip/server';

export async function POST(request: Request) {
  try {
    const body = readOptimizeRequest(await request.json());
    const result = await optimizeTripServer(body);
    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof RouteContractError) {
      return Response.json(
        {
          error: 'Invalid optimize request',
          detail: error.message,
        },
        { status: error.status },
      );
    }

    return Response.json(
      {
        error: 'Failed to optimize trip',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
