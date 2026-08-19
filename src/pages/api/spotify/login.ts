import type { APIRoute } from 'astro';
import { getSpotifyCredentials } from '../../../lib/spotify';

export const prerender = false;

export const GET: APIRoute = async ({ url, redirect }) => {
  const { clientId } = getSpotifyCredentials();

  if (!clientId) {
    return new Response(
      `<html>
<head><title>Spotify Config Error</title></head>
<body style="font-family: monospace; padding: 2rem; max-width: 600px; margin: 0 auto; line-height: 1.6;">
  <h2 style="color: #b91c1c;">Missing SPOTIFY_CLIENT_ID</h2>
  <p>Your <code>SPOTIFY_CLIENT_ID</code> was not found in the server environment.</p>
  <p><strong>To resolve:</strong></p>
  <ol>
    <li>Check that your <code>.env</code> file is in the root project folder (next to <code>package.json</code>).</li>
    <li>Ensure the file contains: <code>SPOTIFY_CLIENT_ID=your_id_here</code> (with no spaces around the <code>=</code>).</li>
    <li>Restart the dev server (<code>Ctrl+C</code> and then <code>npm run dev</code>) so Astro loads the new <code>.env</code> values.</li>
  </ol>
</body>
</html>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    );
  }

  const redirectUri = `${url.origin}/api/spotify/callback`;
  const scopes = [
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-read-recently-played',
  ].join('%20');

  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri,
  )}&scope=${scopes}`;

  return redirect(authUrl, 302);
};
