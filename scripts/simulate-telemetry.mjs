import { chromium, devices } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'http://localhost:8000';
const STORAGE_KEY = 'cc_telemetry_events_v1';
const TOTAL_SESSIONS = 20;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readEvents = async (page) => {
  const events = await page.evaluate((key) => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, STORAGE_KEY);
  return Array.isArray(events) ? events : [];
};

const runSession = async (browser, index) => {
  const isMobile = index % 2 === 1;
  const context = await browser.newContext(
    isMobile
      ? {
          ...devices['iPhone 13'],
          locale: 'it-IT'
        }
      : {
          viewport: { width: 1366, height: 860 },
          locale: 'it-IT'
        }
  );

  const page = await context.newPage();
  await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await wait(500);
  await page.goto(`${BASE_URL}/pages/algoritmi/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-card-id]', { timeout: 12000 }).catch(() => {});
  await wait(1200);
  await page.locator('[data-card-type=\"paper\"]').first().click({ timeout: 7000 }).catch(() => {});
  await wait(1200);

  const url = page.url();
  if (url.includes('/pages/algoritmi/algs/')) {
    await page.mouse.wheel(0, 1200);
    await wait(350);
    await page.mouse.wheel(0, 1400);
    await wait(350);
    await page.mouse.wheel(0, 1600);
    await wait(350);
    await page.mouse.move(420, 420);
    await wait(350);
    await page.mouse.move(520, 520);
    await wait(16500);
    await wait(400);
    await page.locator('[data-related-paper-link]').first().click({ timeout: 3000 }).catch(() => {});
    await wait(700);
  }

  await page.goto(`${BASE_URL}/pages/analisi-statistiche/index.html`, { waitUntil: 'domcontentloaded' });
  await wait(900);
  await page.locator('[data-bridge-box] a').first().click({ timeout: 4000 }).catch(() => {});
  await wait(700);

  await page.goto(`${BASE_URL}/pages/storico-estrazioni/index.html`, { waitUntil: 'domcontentloaded' });
  await wait(900);
  await page.locator('[data-bridge-box] a').first().click({ timeout: 4000 }).catch(() => {});
  await wait(700);

  const events = await readEvents(page);
  await context.close();
  return events;
};

const summarize = (events) => {
  const byEvent = (name) => events.filter((e) => e.event === name);
  const uniqueSessions = new Set(events.map((e) => e.session_id)).size;

  const cardImpressions = byEvent('paper_card_impression').length;
  const cardClicks = byEvent('paper_card_click').length;
  const bridgeImpressions = byEvent('bridge_box_impression').length;
  const bridgeClicks = byEvent('bridge_box_click').length;
  const paperViews = byEvent('paper_view').length;
  const exits = byEvent('paper_exit');

  const ctrPaper = cardImpressions > 0 ? cardClicks / cardImpressions : 0;
  const bridgeCtr = bridgeImpressions > 0 ? bridgeClicks / bridgeImpressions : 0;

  const maxDepthBySession = new Map();
  for (const ev of exits) {
    const sid = ev.session_id || 'na';
    const prev = maxDepthBySession.get(sid) || 0;
    const next = Number(ev.max_depth_pct || 0);
    if (next > prev) maxDepthBySession.set(sid, next);
  }

  const engagedBySession = new Map();
  for (const ev of exits) {
    const sid = ev.session_id || 'na';
    const prev = engagedBySession.get(sid) || 0;
    const next = Number(ev.engaged_seconds || 0);
    if (next > prev) engagedBySession.set(sid, next);
  }

  const avgDepth = maxDepthBySession.size
    ? [...maxDepthBySession.values()].reduce((a, b) => a + b, 0) / maxDepthBySession.size
    : 0;

  const avgReadSec = engagedBySession.size
    ? [...engagedBySession.values()].reduce((a, b) => a + b, 0) / engagedBySession.size
    : 0;

  const bounceSessions = [...maxDepthBySession.entries()].filter(([sid, depth]) => {
    const sec = engagedBySession.get(sid) || 0;
    return depth < 25 && sec < 10;
  }).length;
  const bounceRate = maxDepthBySession.size ? bounceSessions / maxDepthBySession.size : 0;

  const dataToPaper = byEvent('bridge_box_click').length;
  const dataToPaperShare = paperViews > 0 ? dataToPaper / paperViews : 0;

  return {
    generated_at: new Date().toISOString(),
    sessions_observed: uniqueSessions,
    events_total: events.length,
    kpi: {
      paper_ctr: Number(ctrPaper.toFixed(4)),
      bridge_ctr: Number(bridgeCtr.toFixed(4)),
      avg_scroll_depth_pct: Number(avgDepth.toFixed(2)),
      avg_read_time_sec: Number(avgReadSec.toFixed(2)),
      bounce_paper_rate: Number(bounceRate.toFixed(4)),
      data_to_paper_share: Number(dataToPaperShare.toFixed(4))
    },
    counts: {
      paper_card_impression: cardImpressions,
      paper_card_click: cardClicks,
      bridge_box_impression: bridgeImpressions,
      bridge_box_click: bridgeClicks,
      paper_view: paperViews,
      paper_exit: exits.length,
      ads_slot_view: byEvent('ads_slot_view').length
    }
  };
};

const main = async () => {
  const browser = await chromium.launch({ headless: true });
  const allEvents = [];

  for (let i = 0; i < TOTAL_SESSIONS; i += 1) {
    const events = await runSession(browser, i);
    allEvents.push(...events);
  }

  await browser.close();

  const summary = summarize(allEvents);
  const outDir = path.join(process.cwd(), 'docs');
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'telemetry-sessions.json'), JSON.stringify(allEvents, null, 2), 'utf8');
  await fs.writeFile(path.join(outDir, 'telemetry-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log(JSON.stringify(summary, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
