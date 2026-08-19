import { expect, test } from '@playwright/test';

test.describe('Login & Auth Feature Tests', () => {
  test('should display sign in page with GitHub login button', async ({ page }) => {
    // READ: Load /login page
    await page.goto('/login');

    await expect(page).toHaveTitle(/Sign In/i);
    await expect(page.getByRole('heading', { name: /admin sign in/i })).toBeVisible();

    // Verify Continue with GitHub button
    const githubBtn = page.getByRole('link', { name: /continue with github/i });
    await expect(githubBtn).toBeVisible();
    await expect(githubBtn).toHaveAttribute('href', '/api/auth/github/login');
  });

  test('should display authentication error banner when error param is present', async ({
    page,
  }) => {
    // READ: Load /login with error param
    await page.goto('/login?error=unauthorized_user');

    const errorBanner = page.locator('text=This GitHub account is not authorized as an admin.');
    await expect(errorBanner).toBeVisible();
  });

  test('should redirect unauthenticated users away from /admin to /login', async ({ page }) => {
    // READ/PROTECTION: Attempt to access protected admin page
    await page.goto('/admin');

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /admin sign in/i })).toBeVisible();
  });

  test('should check unauthenticated session state via /api/auth/me', async ({ request }) => {
    // READ: Check session API
    const response = await request.get('/api/auth/me');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.authenticated).toBe(false);
    expect(data.user).toBeNull();
  });

  test('should clear session and redirect to /login on logout request', async ({ page }) => {
    // WRITE/INTERACTION: Trigger logout endpoint via GET/POST
    await page.goto('/api/auth/logout');
    // Verify response redirects to /login
    await expect(page).toHaveURL(/\/login/);
  });
});
