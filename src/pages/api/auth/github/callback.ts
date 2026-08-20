import type { APIRoute } from 'astro';
import {
  getAdminUsername,
  getGitHubClientId,
  getGitHubClientSecret,
  SESSION_COOKIE_NAME,
  STATE_COOKIE_NAME,
  signSessionToken,
} from '../../../../lib/auth';

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const savedState = cookies.get(STATE_COOKIE_NAME)?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return redirect('/login?error=invalid_state', 302);
  }

  const clientId = getGitHubClientId();
  const clientSecret = getGitHubClientSecret();

  if (!clientId || !clientSecret) {
    return new Response('GitHub OAuth credentials not configured.', {
      status: 500,
    });
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      return redirect(
        `/login?error=${encodeURIComponent(
          tokenData.error_description || 'token_exchange_failed',
        )}`,
        302,
      );
    }

    // 2. Fetch authenticated GitHub user profile
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'pacos-nyc-personal-site',
      },
    });

    if (!userResponse.ok) {
      return redirect('/login?error=user_fetch_failed', 302);
    }

    const githubUser = await userResponse.json();
    const username = (githubUser.login || '').toLowerCase();
    const adminUsername = getAdminUsername();

    // 3. Authorization Check: Must match configured Admin GitHub username
    if (username !== adminUsername) {
      return redirect(
        `/login?error=unauthorized_user_${encodeURIComponent(githubUser.login)}`,
        302,
      );
    }

    // 4. Create signed session token
    const sessionToken = await signSessionToken({
      id: githubUser.id,
      username: githubUser.login,
      name: githubUser.name || githubUser.login,
      avatarUrl: githubUser.avatar_url || '',
      isAdmin: true,
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 60 * 60 * 24 * 14; // 14 days

    cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge,
      secure: isProduction,
    });

    cookies.delete(STATE_COOKIE_NAME, {
      path: '/',
    });

    return redirect('/admin', 302);
  } catch (_error) {
    return redirect('/login?error=server_error', 302);
  }
};
