import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { execFileSync } from 'child_process';

test('show Python message in banner', async ({ page }) => {
  const data = JSON.parse(
    fs.readFileSync('./output/python-output.json', 'utf-8')
  );

  const pythonMessage = data.message;

  await page.addInitScript((messageFromPython) => {
    window.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('playwright-signin-message')) return;

      const banner = document.createElement('div');
      banner.id = 'playwright-signin-message';
      banner.textContent = messageFromPython;
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
  }, pythonMessage);

  await page.goto('https://fa-esew-dev28-saasfademo1.ds-fa.oraclepdemos.com/fscmUI/faces/FuseWelcome?fndThemeName=Vision_Default');

  //await expect(page.locator('#playwright-signin-message')).toHaveText(pythonMessage);
  await page.pause();

  const output = execFileSync('python', ['tests/proof-of-concept/second-py.py'], {
  encoding: 'utf-8',
});
  console.log(output);
});
