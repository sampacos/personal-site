import { expect, test } from '@playwright/test';

test.describe('Bread Calculator Feature Tests', () => {
  test('renders the calculator with the spreadsheet default values', async ({ page }) => {
    // READ: Load /bread/calculator
    await page.goto('/bread/calculator');

    await expect(page).toHaveTitle(/Bread Calculator/i);
    await expect(page.getByRole('heading', { name: /bread calculator/i })).toBeVisible();

    // Defaults from the "Dough Builder" sheet: 355 g × 4 units, 2% waste → 1448.4 g
    await expect(page.locator('text=1448.4').first()).toBeVisible();

    // All four input groups are present
    await expect(page.getByText('Maintenance Starter Inputs')).toBeVisible();
    await expect(page.getByText('Dough Starter Inputs')).toBeVisible();
    await expect(page.getByText(/Total Dough Ingredient Values/)).toBeVisible();

    // Build tables and metrics render
    await expect(page.getByText('Maintenance Starter Build')).toBeVisible();
    await expect(page.getByText('Dough Starter Build')).toBeVisible();
    await expect(page.getByText('Final Dough', { exact: true })).toBeVisible();
    await expect(page.getByText('Estimated Fermentation Times')).toBeVisible();
  });

  test('updates computed grams live when an input changes', async ({ page }) => {
    await page.goto('/bread/calculator');

    // Wait for React hydration — input events fired against the server-
    // rendered markup before hydration are silently dropped.
    await page.locator('[data-hydrated="true"]').waitFor();

    // Default water in the final dough is 556.1 g (80% of 695.4 g flour)
    const waterField = page.getByLabel('Water (%)');
    await expect(waterField).toHaveValue('80');

    // Changing hydration to 100% recomputes the final dough water grams
    await waterField.fill('100');
    const waterRow = page
      .locator('tr', { has: page.getByRole('rowheader', { name: 'Water' }) })
      .filter({ hasText: 'Water' })
      .last();
    await expect(waterRow).toContainText('644.4');

    // Restoring the default brings the original value back
    await waterField.fill('80');
    await expect(waterField).toHaveValue('80');
  });

  test('number fields select their whole value on focus and trim leading zeros on blur', async ({
    page,
  }) => {
    await page.goto('/bread/calculator');
    await page.locator('[data-hydrated="true"]').waitFor();

    const waterField = page.getByLabel('Water (%)');
    await waterField.focus();

    // Focusing selects everything, so typing replaces the value instead of
    // appending at the cursor (the mobile pain point).
    const selection = await waterField.evaluate((el: HTMLInputElement) => ({
      start: el.selectionStart,
      end: el.selectionEnd,
      length: el.value.length,
    }));
    expect(selection.start).toBe(0);
    expect(selection.end).toBe(selection.length);

    // While still editing, the raw text (including leading zeros) is shown...
    await waterField.fill('080');
    await expect(waterField).toHaveValue('080');

    // ...and once editing stops it is normalized to the canonical number.
    await waterField.blur();
    await expect(waterField).toHaveValue('80');
  });

  test('hides admin-only save section from unauthenticated visitors', async ({ page }) => {
    await page.goto('/bread/calculator');

    await expect(page.getByText('Save this formula as a bake')).toBeHidden();
    await expect(page.getByText('Bakes', { exact: true })).toBeHidden();
  });

  test('rejects unauthenticated bake creation at the API level', async ({ request }) => {
    // WRITE/PROTECTION: POST /api/bakes without a session must be refused
    const response = await request.post('/api/bakes', {
      data: {
        date: '2026-02-01',
        description: 'sneaky bake',
        formula: {
          batch: { unitWeight: 355, quantityOfUnits: 4, wasteFactor: 2 },
          maintenanceStarter: { starterHydration: 80, multiplicativeFactor: 1 },
          doughStarter: {
            sugar: 0,
            starterHydration: 75,
            multiplicativeFactor: 2,
            preFermentedFlour: 13.5,
          },
          dough: {
            water: 80,
            milk: 0,
            heavyCream: 0,
            egg: 0,
            eggYolk: 0,
            butter: 0,
            sugar: 0,
            honey: 0,
            salt: 2,
          },
        },
      },
    });
    expect(response.status()).toBe(401);
  });

  test('rejects unauthenticated photo uploads at the API level', async ({ request }) => {
    const response = await request.post('/api/bakes/upload', {
      multipart: {
        file: {
          name: 'crumb.png',
          mimeType: 'image/png',
          buffer: Buffer.from('not really a png'),
        },
      },
    });
    expect(response.status()).toBe(401);
  });

  test('rejects unauthenticated bake edits at the API level', async ({ request }) => {
    const response = await request.post('/api/bakes/update', {
      data: { id: 'any-bake', description: 'hacked' },
    });
    expect(response.status()).toBe(401);
  });

  test('rejects unauthenticated bake deletion at the API level', async ({ request }) => {
    const response = await request.post('/api/bakes/delete', {
      data: { id: 'any-bake' },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('Bakes Log Feature Tests', () => {
  test('displays the public bakes index', async ({ page }) => {
    await page.goto('/bread/bakes');

    await expect(page).toHaveTitle(/Bakes/i);
    await expect(page.getByRole('heading', { name: /bakes/i })).toBeVisible();
    // Either the table or the empty-state message must be present
    const table = page.getByRole('table');
    const emptyState = page.getByText(/No bakes logged yet/i);
    const tableVisible = await table.isVisible().catch(() => false);
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    expect(tableVisible || emptyVisible).toBe(true);
  });

  test('navigates to a bake detail page showing the full formula', async ({ page }) => {
    await page.goto('/bread/bakes');

    const firstBakeLink = page.locator('a.craigslist-link').first();
    const isVisible = await firstBakeLink.isVisible().catch(() => false);

    if (isVisible) {
      await firstBakeLink.click();
      await expect(page).toHaveURL(/\/bread\/bakes\//);
      await expect(page.getByRole('heading', { name: /formula/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /builds/i })).toBeVisible();
      await expect(page.getByText(/Estimated Fermentation Times/)).toBeVisible();
    }
  });

  test('returns 404 for unknown bake ids', async ({ page }) => {
    const response = await page.goto('/bread/bakes/does-not-exist');
    expect(response?.status()).toBe(404);
  });

  test('hides the manage section from unauthenticated visitors', async ({ page }) => {
    await page.goto('/bread/bakes');
    const firstBakeLink = page.locator('a.craigslist-link').first();
    const isVisible = await firstBakeLink.isVisible().catch(() => false);

    if (isVisible) {
      await firstBakeLink.click();
      await expect(page.getByRole('region', { name: /manage this bake/i })).toBeHidden();
    }
  });

  test('returns bakes via the public API GET endpoint', async ({ request }) => {
    const response = await request.get('/api/bakes');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('bakes');
    expect(Array.isArray(data.bakes)).toBeTruthy();

    if (data.bakes.length > 0) {
      const first = data.bakes[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('date');
      expect(first).toHaveProperty('formula');
      // Newest first ordering
      const dates = data.bakes.map((bake: { date: string }) => bake.date);
      const sorted = [...dates].sort().reverse();
      expect(dates).toEqual(sorted);
    }
  });
});
