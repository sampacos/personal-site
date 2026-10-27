import type { APIRoute } from 'astro';
import { getSession } from '../../../lib/auth';
import { uploadBakePhoto } from '../../../lib/bakes';

export const prerender = false;

/**
 * Admin-only photo upload. The ONLY code path that can write to the blob
 * store: validates the admin session server-side, then validates file type
 * and size before anything reaches the API.
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
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'A "file" field is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = await uploadBakePhoto({
      type: file.type,
      size: file.size,
      arrayBuffer: () => file.arrayBuffer(),
    });

    return new Response(JSON.stringify({ success: true, url }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading bake photo:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.startsWith('Unsupported file') ? 400 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
