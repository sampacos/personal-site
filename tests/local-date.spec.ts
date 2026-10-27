import { expect, test } from '@playwright/test';

// The header date stays hidden until an inline script fills it with the
// visitor's local date, so it never flashes the server's (UTC) date. The browser
// clock is pinned to an instant whose UTC date differs from the local date in
// the configured timezone to prove the local value is used.
test.describe('Header local date', () => {
  test.use({ timezoneId: 'Pacific/Kiritimati' }); // UTC+14

  test('displays the date in the visitor local timezone', async ({ page }) => {
    await page.clock.install();
    // 2026-01-01T23:30:00Z is 2026-01-02 13:30 in UTC+14.
    await page.clock.setFixedTime(new Date('2026-01-01T23:30:00Z'));

    await page.goto('/');

    const date = page.locator('#local-date');
    await expect(date).toBeVisible();
    await expect(date).toHaveText('Fri, Jan 2, 2026');
  });
});
