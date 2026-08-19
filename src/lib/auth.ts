import {
  ADMIN_GITHUB_USERNAME,
  AUTH_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
} from 'astro:env/server';

export interface SessionUser {
  id: number;
  username: string;
  name: string;
  avatarUrl: string;
  isAdmin: boolean;
}

export interface SessionData {
  user: SessionUser;
  exp: number;
}

export const SESSION_COOKIE_NAME = 'pacos_session';
export const STATE_COOKIE_NAME = 'pacos_oauth_state';
const DEFAULT_SESSION_DURATION = 60 * 60 * 24 * 14; // 14 days

function getSecretKey(secret?: string): string {
  const s = secret || AUTH_SECRET || process.env.AUTH_SECRET;
  if (!s) {
    // Fallback for development if AUTH_SECRET is not yet set in .env
    return 'pacos_dev_default_auth_secret_must_be_overridden_in_prod';
  }
  return s;
}

export function getAdminUsername(): string {
  return (ADMIN_GITHUB_USERNAME || process.env.ADMIN_GITHUB_USERNAME || 'sampacos').toLowerCase();
}

/**
 * Base64URL encode/decode helpers
 */
function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/**
 * Signs a session payload with HMAC-SHA256
 */
export async function signSessionToken(
  user: SessionUser,
  secret?: string,
  expiresInSeconds = DEFAULT_SESSION_DURATION,
): Promise<string> {
  const key = await getCryptoKey(getSecretKey(secret));
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload: SessionData = { user, exp };

  const payloadEncoded = base64UrlEncode(JSON.stringify(payload));
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadEncoded),
  );

  const signatureBytes = new Uint8Array(signatureBuffer);
  let signatureBinary = '';
  for (let i = 0; i < signatureBytes.byteLength; i++) {
    signatureBinary += String.fromCharCode(signatureBytes[i]);
  }
  const signatureEncoded = btoa(signatureBinary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${payloadEncoded}.${signatureEncoded}`;
}

/**
 * Verifies a signed session token
 */
export async function verifySessionToken(
  token: string | undefined,
  secret?: string,
): Promise<SessionData | null> {
  if (!token?.includes('.')) return null;

  const [payloadEncoded, signatureEncoded] = token.split('.');
  if (!payloadEncoded || !signatureEncoded) return null;

  try {
    const key = await getCryptoKey(getSecretKey(secret));

    // Decode signature
    let base64Sig = signatureEncoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64Sig.length % 4) {
      base64Sig += '=';
    }
    const sigBinary = atob(base64Sig);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(payloadEncoded),
    );

    if (!isValid) return null;

    const payloadJson = base64UrlDecode(payloadEncoded);
    const data = JSON.parse(payloadJson) as SessionData;

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (data.exp < nowSeconds) {
      return null; // Expired
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies session from Request cookies
 */
export async function getSession(request: Request): Promise<SessionData | null> {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];
  return verifySessionToken(token);
}

/**
 * Helper to parse cookie string
 */
export function parseCookies(cookieHeader: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  for (const pair of cookieHeader.split(';')) {
    const [rawKey, ...rawValue] = pair.split('=');
    const key = rawKey?.trim();
    if (key) {
      list[key] = decodeURIComponent(rawValue.join('=').trim());
    }
  }
  return list;
}

export function getGitHubClientId(): string | undefined {
  return GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID;
}

export function getGitHubClientSecret(): string | undefined {
  return GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET;
}
