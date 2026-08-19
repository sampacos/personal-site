import type { APIRoute } from 'astro';
import { getNowPlaying } from '../../../lib/spotify';

export const prerender = false;

export const GET: APIRoute = async () => {
  const nowPlaying = await getNowPlaying();

  return new Response(JSON.stringify(nowPlaying), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
    },
  });
};
