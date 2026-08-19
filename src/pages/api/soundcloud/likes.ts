import type { APIRoute } from 'astro';
import { getSoundCloudLikes } from '../../../lib/soundcloud';

export const prerender = false;

export const GET: APIRoute = async () => {
  const tracks = await getSoundCloudLikes('sam2445');

  return new Response(JSON.stringify(tracks), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
};
