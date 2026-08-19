import type { APIRoute } from 'astro';
import { getPhotoFolderUrl } from '../../lib/photos';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const targetUrl = getPhotoFolderUrl(params.slug);

  if (!targetUrl) {
    return new Response('Folder not found', {
      status: 404,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: targetUrl,
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
};
