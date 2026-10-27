import type { APIRoute } from 'astro';
import { getSession } from '../../../lib/auth';
import { addBake, getBakes, isValidBakeDate, validateCalculatorState } from '../../../lib/bakes';

export const prerender = false;

const MAX_DESCRIPTION_LENGTH = 200;
const MAX_NOTES_LENGTH = 5000;

export const GET: APIRoute = async () => {
  try {
    const bakes = await getBakes();
    return new Response(JSON.stringify({ bakes }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch bakes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user.isAdmin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: unknown = await request.json();
    if (typeof body !== 'object' || body === null) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { date, description, notes, formula, photos } = body as Record<string, unknown>;

    if (!isValidBakeDate(date)) {
      return new Response(JSON.stringify({ error: 'A valid bake date (YYYY-MM-DD) is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const validatedFormula = validateCalculatorState(formula);
    if (!validatedFormula) {
      return new Response(JSON.stringify({ error: 'Invalid calculator formula' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (typeof description !== 'undefined' && typeof description !== 'string') {
      return new Response(JSON.stringify({ error: 'Description must be a string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (typeof notes !== 'undefined' && typeof notes !== 'string') {
      return new Response(JSON.stringify({ error: 'Notes must be a string' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (
      typeof photos !== 'undefined' &&
      (!Array.isArray(photos) || photos.some((p) => typeof p !== 'string'))
    ) {
      return new Response(JSON.stringify({ error: 'Photos must be an array of file IDs' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const bake = await addBake({
      date,
      description: (description || '').slice(0, MAX_DESCRIPTION_LENGTH),
      notes: (notes || '').slice(0, MAX_NOTES_LENGTH),
      photos: Array.isArray(photos) ? (photos as string[]) : [],
      formula: validatedFormula,
    });

    return new Response(JSON.stringify({ success: true, bake }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating bake:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
