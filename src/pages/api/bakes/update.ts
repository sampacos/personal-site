import type { APIRoute } from 'astro';
import { getSession } from '../../../lib/auth';
import { updateBake } from '../../../lib/bakes';

export const prerender = false;

const MAX_DESCRIPTION_LENGTH = 200;
const MAX_NOTES_LENGTH = 5000;

/**
 * Admin-only bake editing. Only description, notes, and photos are editable;
 * the date, formula, id, and createdAt are immutable.
 */
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

    const { id, description, notes, photos } = body as Record<string, unknown>;

    if (typeof id !== 'string' || !id.trim()) {
      return new Response(JSON.stringify({ error: 'A bake id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (
      typeof description !== 'undefined' &&
      (typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH)
    ) {
      return new Response(JSON.stringify({ error: 'Invalid description' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (
      typeof notes !== 'undefined' &&
      (typeof notes !== 'string' || notes.length > MAX_NOTES_LENGTH)
    ) {
      return new Response(JSON.stringify({ error: 'Invalid notes' }), {
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

    const bake = await updateBake(id, {
      description:
        typeof description === 'string' ? description.slice(0, MAX_DESCRIPTION_LENGTH) : undefined,
      notes: typeof notes === 'string' ? notes.slice(0, MAX_NOTES_LENGTH) : undefined,
      photos: Array.isArray(photos) ? (photos as string[]) : undefined,
    });

    if (!bake) {
      return new Response(JSON.stringify({ error: 'Bake not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, bake }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating bake:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
