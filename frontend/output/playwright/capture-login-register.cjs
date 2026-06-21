const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:4324/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'output/playwright/login-before-register-toggle.png', fullPage: true });
  await page.getByRole('button', { name: '注册', exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'output/playwright/login-register-transition.png', fullPage: true });
  await browser.close();
})();
