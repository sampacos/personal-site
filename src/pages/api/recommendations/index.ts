import type { APIRoute } from 'astro';
import { getRecommendations } from '../../../lib/sheets';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const items = await getRecommendations();
    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch recommendations' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
