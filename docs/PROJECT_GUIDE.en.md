# Project Guide (EN)

This guide summarizes the current **Control Chaos** operational status for GitHub management and AdSense readiness.

## Goal
Static SuperEnalotto portal with:
- historical draws archive
- algorithms catalog
- statistics and legal pages

## Repository
- URL: `https://github.com/giga-labor/secc`
- Default branch: `main`
- Deploy target: GitHub Pages

## Key Structure
- `data/modules-manifest.json`: main cards manifest
- `data/algorithms-spotlight/modules-manifest.json`: spotlight manifest
- `assets/js/cards-index.js`: cards loading/normalization
- `assets/js/cards.js`: card builder (single source for card sizing/variants)
- `assets/js/site.js`: home cards rendering
- `assets/js/algorithms.js`: algorithms/spotlight rendering
- `assets/js/ga4.js`: GA4 bootstrap
- `assets/js/ads.js`: runtime ad-slot layout host

## GitHub Workflow (Operational)
1. Create/update page module with `index.html` and `card.json`.
2. Register `card.json` path in the correct manifest.
3. Verify all `card.json` files are covered by manifests.
4. Bump `assets/js/version.js` for release.
5. Commit/push to `main`.

## Cards Flow
1. Manifests list `card.json` files.
2. `cards-index.js` loads and normalizes card data.
3. `cards.js` builds card markup (`buildAlgorithmCard`).
4. `no_data_show` is per-card and defaults to `true` if missing.

## AdSense / Ads: Status and Checklist
Current status:
- `ads.txt` exists as template.
- GA4 is centralized (`assets/js/ga4.js`).
- Ad-slot UI host is project-managed (`assets/js/ads.js`, `window.CC_RENDER_AD_SLOT` hook).
- AdSense loader (`adsbygoogle.js`) is injected at runtime by `assets/js/ads.js`.
- Funding Choices TCF loader is injected at runtime for certified CMP flow where available.

AdSense go-live checklist:
1. Replace `ads.txt` placeholder with real publisher (`pub-...`).
2. Add official AdSense script and policy-compliant ad units.
3. Verify legal pages and cookie consent flow.
4. Verify crawlability: `robots.txt`, `sitemap.xml`, public URLs.
5. Validate mobile/desktop ad rendering without critical CLS regressions.

## Technical Root Files
- `ads.txt`
- `robots.txt`
- `sitemap.xml`

## Local Run
```bat
start-server.bat
```
URL: `http://localhost:8000/`

## GitHub Pages Deploy
1. Settings -> Pages
2. Source: Deploy from a branch
3. Branch: `main`
4. Folder: `/ (root)`

Expected URL: `https://giga-labor.github.io/secc/`
