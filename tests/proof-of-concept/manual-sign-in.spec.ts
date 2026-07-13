import { test, expect } from '@playwright/test';

test('continue after manual sign in', async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);

  await page.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('playwright-signin-message')) return;

      const banner = document.createElement('div');
      banner.id = 'playwright-signin-message';
      banner.textContent = 'Please sign in. The test will then continue automatically.';
      banner.style.position = 'fixed';
      banner.style.top = '0';
      banner.style.left = '0';
      banner.style.right = '0';
      banner.style.zIndex = '999999';
      banner.style.padding = '12px 16px';
      banner.style.background = '#fff3cd';
      banner.style.color = '#222';
      banner.style.font = '16px Arial, sans-serif';
      banner.style.borderBottom = '1px solid #d6b656';
      banner.style.textAlign = 'center';

      document.body.appendChild(banner);
  });
});

  await page.goto('https://fa-esew-dev28-saasfademo1.ds-fa.oraclepdemos.com/');

  //await  expect(page.locator('td').filter({ hasText: 'Navigator' }).first()).toBeVisible();
  await  expect(page.locator('td').filter({ hasText: 'Navigator' }).first()).toBeVisible({ timeout: 5 * 60 * 1000 });

  await page.locator('#playwright-signin-message').evaluate(el => el.remove()).catch(() => {});

  await page.getByRole('link', { name: 'Navigator' }).click();
  await page.getByTitle('Payables', { exact: true }).click();
  //await page.getByRole('link', { name: 'Invoices' }).click();

});