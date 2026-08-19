import type { APIRoute } from 'astro';
import { getSpotifyCredentials } from '../../../lib/spotify';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(
      `<html><body style="font-family: monospace; padding: 2rem;"><h2>Spotify Authorization Error</h2><p>${error}</p></body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    );
  }

  if (!code) {
    return new Response(
      '<html><body style="font-family: monospace; padding: 2rem;"><h2>Missing authorization code</h2></body></html>',
      { status: 400, headers: { 'Content-Type': 'text/html' } },
    );
  }

  const { clientId, clientSecret } = getSpotifyCredentials();
  const redirectUri = `${url.origin}/api/spotify/callback`;

  if (!clientId || !clientSecret) {
    return new Response(
      '<html><body style="font-family: monospace; padding: 2rem;"><h2>Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env</h2></body></html>',
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    );
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await tokenRes.json();

    if (!data.refresh_token) {
      return new Response(
        `<html><body style="font-family: monospace; padding: 2rem;"><h2>Failed to get refresh token</h2><pre>${JSON.stringify(
          data,
          null,
          2,
        )}</pre></body></html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } },
      );
    }

    return new Response(
      `<!DOCTYPE html>
<html>
<head>
  <title>Spotify Connection Success</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: monospace; padding: 2rem; max-width: 650px; margin: 0 auto; line-height: 1.5; color: #111; }
    pre { background: #f4f4f4; padding: 1rem; border: 1px solid #ccc; border-radius: 4px; overflow-x: auto; }
    .success { color: #15803d; font-size: 1.25rem; font-weight: bold; }
  </style>
</head>
<body>
  <div class="success">&#10004; Spotify Connected Successfully!</div>
  <p>Copy your <strong>SPOTIFY_REFRESH_TOKEN</strong> below and add it to your <code>.env</code> file or deployment environment variables:</p>
  
  <pre id="token-box">SPOTIFY_REFRESH_TOKEN=${data.refresh_token}</pre>
  
  <p style="color: #666; font-size: 12px;">Once added to your environment, your <code>/music</code> page will automatically reflect your live playback!</p>
</body>
</html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } },
    );
  } catch (err) {
    return new Response(
      `<html><body style="font-family: monospace; padding: 2rem;"><h2>Server Error</h2><pre>${String(
        err,
      )}</pre></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    );
  }
};
