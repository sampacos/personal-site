import type { APIRoute } from 'astro';
import { getSession } from '../../../lib/auth';
import { addRecommendation } from '../../../lib/sheets';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // 1. Authorization check
  const session = await getSession(request);
  if (!session?.user.isAdmin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Validate input
  try {
    const body = await request.json();
    const { category, title, artist, url } = body;

    if (!title || !category || !url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: title, category, url' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (!['songs', 'albums', 'podcasts'].includes(category)) {
      return new Response(
        JSON.stringify({ error: 'Invalid category. Must be songs, albums, or podcasts' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const newItem = await addRecommendation({
      category,
      title: title.trim(),
      artist: (artist || '').trim(),
      url: url.trim(),
    });

    return new Response(JSON.stringify({ success: true, item: newItem }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error adding recommendation:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
};
