import { optimizeTripServer } from '@/lib/trip/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.trip) {
      return Response.json({ error: 'trip is required' }, { status: 400 });
    }

    const result = await optimizeTripServer(body);
    return Response.json(result, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to optimize trip',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}