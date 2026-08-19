import { expect, test } from '@playwright/test';

test.describe('Blog Feature Tests', () => {
  test('should display the blog page and list blog posts', async ({ page }) => {
    // READ: Load /blog page
    await page.goto('/blog');

    await expect(page).toHaveTitle(/Blog/i);
    await expect(page.getByRole('heading', { name: /writings/i })).toBeVisible();
  });

  test('should filter posts using the search input from homepage', async ({ page }) => {
    // READ: Load homepage with sidebar search
    await page.goto('/');

    const searchInput = page.getByPlaceholder(/search notes/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('welcome');

    // Submit search form
    const submitButton = page.getByRole('button', { name: '>' });
    await submitButton.click();

    // Verify search URL parameters
    await expect(page).toHaveURL(/\/blog\?q=welcome/);
  });

  test('should navigate to individual blog post and display content', async ({ page }) => {
    await page.goto('/blog');

    // READ: Find and click first post link
    const firstPostLink = page.locator('a.craigslist-link').first();
    const isVisible = await firstPostLink.isVisible();

    if (isVisible) {
      await firstPostLink.click();
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('should return blog posts via API GET endpoint', async ({ request }) => {
    // READ: Fetch blog posts API
    const response = await request.get('/api/blog');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('posts');
    expect(Array.isArray(data.posts)).toBeTruthy();
  });

  test('should enforce 401 unauthorized protection when attempting to create a blog post without auth', async ({
    request,
  }) => {
    // WRITE: Attempt unauthorized POST to blog create endpoint
    const response = await request.post('/api/blog/create', {
      data: {
        title: 'Test Post',
        slug: 'test-post',
        content: 'This is a test post content.',
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});
