import { parseTripTextToDraft } from '@/lib/trip/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await parseTripTextToDraft(body);
    return Response.json(result, { status: 200 });
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to parse trip input',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}