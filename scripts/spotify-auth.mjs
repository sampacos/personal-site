/**
 * Spotify One-Time Refresh Token Generator
 *
 * Usage:
 * 1. Create an app at https://developer.spotify.com/dashboard
 * 2. Set Redirect URI in Spotify Dashboard to: http://localhost:8888/callback
 * 3. Run: node scripts/spotify-auth.mjs <CLIENT_ID> <CLIENT_SECRET>
 */

import http from 'node:http';
import { URL } from 'node:url';

const clientId = process.argv[2] || process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.argv[3] || process.env.SPOTIFY_CLIENT_SECRET;
const port = 8888;
const redirectUri = `http://localhost:${port}/callback`;

if (!clientId || !clientSecret) {
  console.log(`
\x1b[33m[Spotify Auth Setup]\x1b[0m
Please provide your Spotify Client ID and Client Secret:
  node scripts/spotify-auth.mjs <CLIENT_ID> <CLIENT_SECRET>

1. Go to: https://developer.spotify.com/dashboard
2. Create an App (or select existing)
3. In App Settings, add Redirect URI: \x1b[36mhttp://localhost:8888/callback\x1b[0m
4. Copy Client ID and Client Secret, then run this script again.
`);
  process.exit(1);
}

const scopes = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-read-recently-played',
].join('%20');

const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
  redirectUri
)}&scope=${scopes}`;

console.log(`
\x1b[32m[Spotify OAuth Setup]\x1b[0m
1. Open this authorization URL in your browser:

\x1b[36m${authUrl}\x1b[0m

2. Log in and click "Agree".
Waiting for authorization callback on ${redirectUri}...
`);

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://localhost:${port}`);

  if (reqUrl.pathname === '/callback') {
    const code = reqUrl.searchParams.get('code');

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Authorization code missing.');
      return;
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

      if (data.refresh_token) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <h2 style="font-family: monospace; color: green;">Success!</h2>
          <p style="font-family: monospace;">Your SPOTIFY_REFRESH_TOKEN is printed in your terminal. You can close this window.</p>
        `);

        console.log(`
\x1b[32m=====================================================\x1b[0m
\x1b[32mSuccessfully retrieved your Spotify Refresh Token!\x1b[0m
\x1b[32m=====================================================\x1b[0m

Add these 3 variables to your \x1b[33m.env\x1b[0m file:

SPOTIFY_CLIENT_ID=${clientId}
SPOTIFY_CLIENT_SECRET=${clientSecret}
SPOTIFY_REFRESH_TOKEN=${data.refresh_token}

\x1b[32mDone!\x1b[0m
`);
        server.close();
        process.exit(0);
      } else {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end(`Failed to get refresh token: ${JSON.stringify(data)}`);
        console.error('Error fetching token:', data);
        server.close();
        process.exit(1);
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Error: ${err.message}`);
      console.error(err);
      server.close();
      process.exit(1);
    }
  }
});

server.listen(port);
