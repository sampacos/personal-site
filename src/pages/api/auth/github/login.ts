import type { APIRoute } from 'astro';
import { getGitHubClientId, STATE_COOKIE_NAME } from '../../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const clientId = getGitHubClientId();

  if (!clientId) {
    return new Response('GitHub OAuth is not configured. Missing GITHUB_CLIENT_ID.', {
      status: 500,
    });
  }

  // Generate cryptographic state for CSRF protection
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  let state = '';
  for (let i = 0; i < array.length; i++) {
    state += array[i].toString(16).padStart(2, '0');
  }

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('scope', 'read:user');
  githubAuthUrl.searchParams.set('state', state);

  const isProduction = process.env.NODE_ENV === 'production';
  cookies.set(STATE_COOKIE_NAME, state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
    secure: isProduction,
  });

  return redirect(githubAuthUrl.toString(), 302);
};
