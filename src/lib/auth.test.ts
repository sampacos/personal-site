import { describe, expect, it } from 'vitest';
import { getAdminUsername, parseCookies, signSessionToken, verifySessionToken } from './auth';

describe('Auth & Session Management', () => {
  const mockUser = {
    id: 123456,
    username: 'sampacos',
    name: 'Sam Pacos',
    avatarUrl: 'https://avatars.githubusercontent.com/u/123456',
    isAdmin: true,
  };

  it('signs and verifies a valid session token', async () => {
    const token = await signSessionToken(mockUser, 'test_super_secret_32_characters_key_!');
    expect(token).toContain('.');

    const session = await verifySessionToken(token, 'test_super_secret_32_characters_key_!');
    expect(session).not.toBeNull();
    expect(session?.user.username).toBe('sampacos');
    expect(session?.user.isAdmin).toBe(true);
  });

  it('rejects tampered session token', async () => {
    const token = await signSessionToken(mockUser, 'test_super_secret_32_characters_key_!');
    const [payload, sig] = token.split('.');
    const tamperedToken = `${payload}X.${sig}`;

    const session = await verifySessionToken(
      tamperedToken,
      'test_super_secret_32_characters_key_!',
    );
    expect(session).toBeNull();
  });

  it('rejects token signed with different secret', async () => {
    const token = await signSessionToken(mockUser, 'secret_one_12345678901234567890');
    const session = await verifySessionToken(token, 'secret_two_12345678901234567890');
    expect(session).toBeNull();
  });

  it('rejects expired token', async () => {
    // expiresInSeconds: -10 (already expired)
    const token = await signSessionToken(mockUser, 'test_super_secret_32_characters_key_!', -10);
    const session = await verifySessionToken(token, 'test_super_secret_32_characters_key_!');
    expect(session).toBeNull();
  });

  it('parses cookies header correctly', () => {
    const cookies = parseCookies('pacos_session=abc123token; theme=dark; other=val%201');
    expect(cookies.pacos_session).toBe('abc123token');
    expect(cookies.theme).toBe('dark');
    expect(cookies.other).toBe('val 1');
  });

  it('returns admin username default or configured', () => {
    const admin = getAdminUsername();
    expect(typeof admin).toBe('string');
    expect(admin.length).toBeGreaterThan(0);
  });
});
