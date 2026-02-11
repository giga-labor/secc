# Control Chaos

Static website for SuperEnalotto analysis, algorithms, and historical draws.  
No backend: everything is client-side static delivery.

## Repository
- GitHub: `https://github.com/giga-labor/secc`
- Default branch: `main`
- Deploy target: GitHub Pages (`/` root)

## Current Scope
- Home with featured cards and project updates
- Algorithms catalog with dedicated detail pages
- Historical draws page backed by `archives/draws/draws.csv`
- Statistics and legal pages
- Runtime ad layout rails (`assets/js/ads.js`) for project UI slots

## Project Structure
- `index.html`: home
- `pages/algoritmi/`: algorithms catalog + detail pages
- `pages/storico-estrazioni/`: draws archive
- `pages/analisi-statistiche/`: statistics page
- `pages/privacy-policy/`, `pages/cookie-policy/`, `pages/contatti-chi-siamo/`: legal pages
- `assets/js/cards.js`: card builder/source of truth for card sizing and card rendering behavior
- `assets/js/cards-index.js`: manifest/card loader
- `assets/js/site.js`: home cards render flow
- `assets/js/algorithms.js`: algorithms + spotlight render flow
- `assets/js/ga4.js`: GA4 bootstrap
- `assets/js/ads.js`: ad slot layout host logic
- `data/modules-manifest.json`: main cards manifest
- `data/algorithms-spotlight/modules-manifest.json`: spotlight cards manifest
- `ads.txt`, `robots.txt`, `sitemap.xml`: crawl/ads technical files

## GitHub Workflow
1. Create/update page folder with `index.html` + `card.json` (+ media assets).
2. Register `card.json` path in the correct manifest.
3. Keep `assets/js/version.js` updated per release batch.
4. Commit to `main` and publish through GitHub Pages settings.

## Cards Flow
- Cards are loaded from manifests, then normalized in `assets/js/cards-index.js`.
- Cards are built by `window.CARDS.buildAlgorithmCard(...)` in `assets/js/cards.js`.
- `no_data_show` is supported per card (`card.json`) and defaults to `true` when missing.

## AdSense & Ads Documentation
Current status:
- `ads.txt` is present as template and must be replaced with your real `pub-...`.
- GA4 is centralized in `assets/js/ga4.js` and included by all `index.html`.
- Ad UI slots are project-managed by `assets/js/ads.js` (`window.CC_RENDER_AD_SLOT` hook).
- AdSense loader (`adsbygoogle.js`) is injected at runtime by `assets/js/ads.js`.
- Funding Choices TCF loader is injected at runtime for certified CMP flow where available.

Go-live checklist:
1. Set real publisher line in `ads.txt`.
2. Add official AdSense script/policy-compliant units.
3. Validate policy pages (`privacy`, `cookie`, `contacts`) and consent handling.
4. Re-check `robots.txt` + `sitemap.xml` reachability in production.
5. Verify monetized pages are approved and crawlable on GitHub Pages domain.

## Local Development
```bat
start-server.bat
```
Open `http://localhost:8000/`.

## Deployment (GitHub Pages)
1. Repo -> Settings -> Pages
2. Source: Deploy from a branch
3. Branch: `main`
4. Folder: `/ (root)`

Expected URL:
- `https://giga-labor.github.io/secc/`

## Notes
- Audio autoplay is browser-restricted; audio toggle is disabled by default.
- No backend required.

## Italian Documentation
See `README.it.md`.
