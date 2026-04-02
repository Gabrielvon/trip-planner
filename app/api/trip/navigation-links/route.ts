import { readNavigationRequest, RouteContractError } from '@/lib/trip/contracts';
import { buildNavigationLinksServer } from '@/lib/trip/server';

export async function POST(request: Request) {
  try {
    const body = readNavigationRequest(await request.json());
    const result = await buildNavigationLinksServer(body);
    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof RouteContractError) {
      return Response.json(
        {
          error: 'Invalid navigation request',
          detail: error.message,
        },
        { status: error.status },
      );
    }

    return Response.json(
      {
        error: 'Failed to generate navigation links',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
