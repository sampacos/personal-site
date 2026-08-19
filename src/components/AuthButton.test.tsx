import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthButton from './AuthButton';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('AuthButton Component', () => {
  it('renders login link when unauthenticated', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: false, user: null }),
    } as Response);

    render(<AuthButton />);

    await waitFor(() => {
      const loginLink = screen.getByRole('link', { name: /login/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  it('renders admin link when authenticated', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        authenticated: true,
        user: { username: 'sampacos', isAdmin: true },
      }),
    } as Response);

    render(<AuthButton />);

    await waitFor(() => {
      const adminLink = screen.getByRole('link', { name: /admin/i });
      expect(adminLink).toBeInTheDocument();
      expect(adminLink).toHaveAttribute('href', '/admin');
    });
  });
});
