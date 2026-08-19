import { expect, test } from '@playwright/test';

test.describe('Music Feature Tests', () => {
  test('should display the music page and SoundCloud/Spotify listening sections', async ({
    page,
  }) => {
    // READ: Load /music page
    await page.goto('/music');

    // Verify main page title
    await expect(page).toHaveTitle(/Music/i);

    // Verify breadcrumbs contains music text
    const headerElement = page.locator('header').first();
    await expect(headerElement).toContainText('music');

    // Verify SoundCloud section is present
    const soundcloudHeading = page.getByRole('heading', { name: /soundcloud/i });
    await expect(soundcloudHeading).toBeVisible();

    // Verify music toggle button exists in header
    const musicToggleBtn = page.getByRole('button', { name: /background music/i });
    await expect(musicToggleBtn).toBeVisible();
  });

  test('should interact with the music toggle control', async ({ page }) => {
    await page.goto('/music');

    const musicToggleBtn = page.getByRole('button', { name: /background music/i });
    await expect(musicToggleBtn).toBeVisible();

    // WRITE/INTERACTION: Click music toggle button to flex state change
    await musicToggleBtn.click();

    // Toggle aria-label changes between Play / Mute
    const toggledBtn = page.getByRole('button', { name: /background music/i });
    await expect(toggledBtn).toBeVisible();
  });

  test('should display recommended listening page and recommendations API data', async ({
    page,
    request,
  }) => {
    // READ: Load /music/recommended page
    await page.goto('/music/recommended');

    await expect(page).toHaveTitle(/Recommended Listening/i);
    await expect(page.getByRole('heading', { name: /recommended listening/i })).toBeVisible();

    // Verify recommendation categories are rendered
    await expect(page.getByRole('heading', { name: /songs/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /albums & mixes/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /podcasts/i })).toBeVisible();

    // READ: Test API GET endpoint for recommendations
    const apiResponse = await request.get('/api/recommendations');
    expect(apiResponse.ok()).toBeTruthy();
    const data = await apiResponse.json();
    expect(data).toHaveProperty('items');
    expect(Array.isArray(data.items)).toBeTruthy();
  });

  test('should enforce 401 unauthorized protection when writing new recommendation without auth', async ({
    request,
  }) => {
    // WRITE: Attempt unauthorized POST to recommendations add endpoint
    const response = await request.post('/api/recommendations/add', {
      data: {
        category: 'songs',
        title: 'Test Song',
        artist: 'Test Artist',
        url: 'https://example.com/test-song',
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });
});
