import type { APIRoute } from 'astro';
import { getSession } from '../../../lib/auth';
import { deleteBake } from '../../../lib/bakes';

export const prerender = false;

/** Admin-only bake deletion. */
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
    const { id } = (typeof body === 'object' && body !== null ? body : {}) as Record<
      string,
      unknown
    >;

    if (typeof id !== 'string' || !id.trim()) {
      return new Response(JSON.stringify({ error: 'A bake id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const deleted = await deleteBake(id);
    if (!deleted) {
      return new Response(JSON.stringify({ error: 'Bake not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting bake:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
