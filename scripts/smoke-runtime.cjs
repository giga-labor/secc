const { chromium } = require('playwright');
(async () => {
  const pages = [
    'http://localhost:8000/index.html',
    'http://localhost:8000/pages/algoritmi/index.html',
    'http://localhost:8000/pages/storico-estrazioni/index.html',
    'http://localhost:8000/pages/analisi-statistiche/index.html'
  ];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const issues = [];
  for (const url of pages) {
    const page = await context.newPage();
    page.on('pageerror', (e) => issues.push({ url, type: 'pageerror', message: String(e) }));
    page.on('console', (m) => {
      if (m.type() === 'error') issues.push({ url, type: 'console', message: m.text() });
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    await page.close();
  }
  await browser.close();
  if (issues.length) {
    console.log(JSON.stringify({ ok: false, issues }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, checked: pages.length }, null, 2));
})();
