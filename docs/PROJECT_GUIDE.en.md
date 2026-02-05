# Project Guide (EN)

This guide documents the current structure of **Control Chaos** and how to maintain content.

## Goal
Static website for SuperEnalotto statistics, algorithms, and historical draws.  
All calculations are prepared offline and published as static content.

## Main Structure
- `index.html`: home
- `pages/algoritmi/`: algorithms catalog and details
- `pages/storico-estrazioni/`: historical draws
- `pages/analisi-statistiche/`: statistics page
- `assets/`: CSS/JS/audio
- `img/`: shared images
- `data/modules-manifest.json`: card list (source of truth)
- `data/cards-index.json`: fallback index
- `archives/draws/draws.csv`: draws dataset

## Card Flow
Cards are built in the browser from `data/modules-manifest.json`.

Each card is a `card.json` with typical fields:
- `id`
- `title`
- `subtitle`
- `image`
- `page`
- `macroGroup`
- `isActive`

### Add a new algorithm
1. Create folder: `pages/algoritmi/<id>/`
2. Add `card.json` + `index.html` + (optional) `img.webp`
3. Add the card path to `data/modules-manifest.json`

## Historical Draws
`archives/draws/draws.csv` is loaded by the frontend.  
Expected format: header row + draw rows with date and numbers.

## Local Run
```bat
start-server.bat
```

## Deployment
GitHub Pages (branch `main`, folder `/ (root)`).

## Italian Docs
See `docs/PROJECT_GUIDE.md`.
