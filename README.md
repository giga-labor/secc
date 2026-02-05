# Control Chaos

Static website for SuperEnalotto analysis, algorithms, and historical draws.  
No backend: everything is client-side and served as static files.

## What’s Inside
- Home page with featured modules and updates.
- Algorithms catalog with grouped cards.
- Historical draws page (`draws.csv`).
- Visual ads rails and ticker (placeholder content, not ad-network).
- Optional audio playlist (currently disabled by flag).

## Project Structure
- `index.html` home page
- `pages/algoritmi/` algorithms catalog and detail pages
- `pages/storico-estrazioni/` historical draws page
- `pages/analisi-statistiche/` stats landing page
- `assets/` CSS/JS/audio
- `img/` shared images
- `data/modules-manifest.json` list of all cards (source of truth)
- `data/cards-index.json` optional fallback index
- `archives/draws/draws.csv` historical draws dataset
- `scripts/` local utilities (optional)

## Cards & Manifest
Cards are defined by `card.json` files under `pages/algoritmi/*/` and a few static pages.

To add a new algorithm card:
1. Create a folder: `pages/algoritmi/<id>/`
2. Add `card.json` and `index.html` (and optional `img.webp`)
3. Add the card path to `data/modules-manifest.json`

The site builds the cards index **at runtime** in the browser using the manifest.  
`data/cards-index.json` is used only as a fallback.

## Local Development
Use the provided script:
```bat
start-server.bat
```
Then open:
- `http://localhost:8000/`

## GitHub Pages Deploy
This is a static site. Push to GitHub and enable Pages:
1. Repo → Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main`, Folder: `/ (root)`

Site URL:
```
https://<username>.github.io/ControlChaos/
```

## Notes
- Audio autoplay is restricted by browsers. Audio toggle is disabled by default.
- No backend is required or used.
- Ads are placeholders; no ad-network integration is included.

## Italian Documentation
See `README.it.md` for the Italian version.
