/**
 * Spotify Authorization Code Exchanger (Interactive & Direct)
 *
 * Usage:
 *   npm run spotify:auth
 */

import { existsSync, readFileSync } from 'node:fs';
import readline from 'node:readline';

const DEFAULT_REDIRECT_URI = 'https://pacos.nyc/api/spotify/callback';

// Load .env manually if present
if (existsSync('.env')) {
  const envContent = readFileSync('.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[key] = val.trim();
    }
  }
}

const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

if (!clientId || !clientSecret) {
  console.error('\x1b[31mError: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env\x1b[0m');
  process.exit(1);
}

const redirectUri = DEFAULT_REDIRECT_URI;
const scopes = [
  'user-read-currently-playing',
  'user-read-playback-state',
  'user-read-recently-played',
].join('%20');

const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
  redirectUri,
)}&scope=${scopes}`;

async function exchangeCode(rawInput) {
  let cleanInput = rawInput.trim();
  if (cleanInput.startsWith('"') && cleanInput.endsWith('"')) cleanInput = cleanInput.slice(1, -1);
  if (cleanInput.startsWith("'") && cleanInput.endsWith("'")) cleanInput = cleanInput.slice(1, -1);

  let code = cleanInput;
  if (cleanInput.includes('code=')) {
    try {
      const parsed = new URL(cleanInput);
      code = parsed.searchParams.get('code') || cleanInput;
    } catch {
      const match = cleanInput.match(/[?&]code=([^&]+)/);
      if (match) code = decodeURIComponent(match[1]);
    }
  }

  code = decodeURIComponent(code.trim());

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  console.log(`\nExchanging code with Spotify (redirect_uri: ${redirectUri})...`);

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await res.json();

    if (data.refresh_token) {
      console.log(`
\x1b[32m=====================================================\x1b[0m
\x1b[32mSuccessfully generated your SPOTIFY_REFRESH_TOKEN!\x1b[0m
\x1b[32m=====================================================\x1b[0m

Add this line to your \x1b[33m.env\x1b[0m file:

\x1b[32mSPOTIFY_REFRESH_TOKEN=${data.refresh_token}\x1b[0m
`);
      process.exit(0);
    } else {
      console.error('\n\x1b[31mFailed to retrieve refresh token:\x1b[0m', data);
      console.log(`
\x1b[33mWhy this happens:\x1b[0m
1. Spotify authorization codes are single-use and expire within ~3 minutes.
2. If you clicked the link earlier, please click the link below to get a fresh code.
3. Make sure https://pacos.nyc/api/spotify/callback is exact in Spotify Dashboard.
`);
      process.exit(1);
    }
  } catch (err) {
    console.error('\n\x1b[31mNetwork Error:\x1b[0m', err);
    process.exit(1);
  }
}

// Check if passed via command line argument
const cliArg = process.argv[2];
if (cliArg) {
  exchangeCode(cliArg);
} else {
  console.log(`
\x1b[32m=== Spotify HTTPS Token Generator ===\x1b[0m

1. Verify that your Spotify Dashboard has this Redirect URI:
   \x1b[36m${redirectUri}\x1b[0m

2. Open this URL in your browser:
   \x1b[36m${authUrl}\x1b[0m

3. Click "Agree". Your browser will navigate to:
   ${redirectUri}?code=AQD...

4. Copy that URL from your browser address bar and paste it below:
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Paste the redirected URL (or code) here: ', (answer) => {
    rl.close();
    if (!answer || !answer.trim()) {
      console.error('\x1b[31mNo input provided.\x1b[0m');
      process.exit(1);
    }
    exchangeCode(answer);
  });
}
