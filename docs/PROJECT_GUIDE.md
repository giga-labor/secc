# Guida Progetto (IT)

Questa guida riassume lo stato operativo aggiornato di **Control Chaos** per gestione GitHub e readiness AdSense.

## Obiettivo
Portale statico SuperEnalotto con:
- archivio estrazioni
- catalogo algoritmi
- pagine statistiche e legali

## Repository
- URL: `https://github.com/giga-labor/secc`
- Branch principale: `main`
- Deploy: GitHub Pages

## Struttura Chiave
- `data/modules-manifest.json`: manifest card principale
- `data/algorithms-spotlight/modules-manifest.json`: manifest spotlight
- `assets/js/cards-index.js`: loader e normalizzazione card
- `assets/js/cards.js`: costruttore card (sorgente unica per sizing e varianti card)
- `assets/js/site.js`: rendering card home
- `assets/js/algorithms.js`: rendering catalogo algoritmi/spotlight
- `assets/js/ga4.js`: bootstrap analytics GA4
- `assets/js/ads.js`: host layout slot ads runtime

## Workflow GitHub (Operativo)
1. Crea cartella modulo/pagina con `index.html` e `card.json`.
2. Inserisci il path del `card.json` nel manifest corretto.
3. Verifica che il path sia coperto dai manifest runtime.
4. Incrementa `assets/js/version.js` per il rilascio.
5. Commit/push su `main`.

## Flusso Card
1. I manifest elencano i `card.json`.
2. `cards-index.js` carica e normalizza i dati.
3. `cards.js` costruisce il markup card (`buildAlgorithmCard`).
4. Il flag `no_data_show` è gestito per-card e defaulta a `true` se mancante.

## AdSense / Ads: Stato e Checklist
Stato attuale:
- `ads.txt` presente come template.
- GA4 presente e centralizzato (`assets/js/ga4.js`).
- Layout slot ads gestito dal progetto (`assets/js/ads.js`, hook `window.CC_RENDER_AD_SLOT`).
- Loader AdSense (`adsbygoogle.js`) iniettato a runtime da `assets/js/ads.js`.
- Loader Funding Choices TCF iniettato a runtime per flusso CMP certificato dove disponibile.

Checklist go-live AdSense:
1. Sostituisci placeholder in `ads.txt` con publisher reale (`pub-...`).
2. Inserisci script ufficiale AdSense e unità ads conformi.
3. Verifica pagine legali e gestione consenso cookie.
4. Verifica crawlability: `robots.txt`, `sitemap.xml`, URL pubblici.
5. Controlla rendering ads su mobile/desktop senza CLS critico.

## File Root Tecnici
- `ads.txt`
- `robots.txt`
- `sitemap.xml`

## Avvio Locale
```bat
start-server.bat
```
URL: `http://localhost:8000/`

## Deploy GitHub Pages
1. Settings -> Pages
2. Source: Deploy from a branch
3. Branch: `main`
4. Folder: `/ (root)`

URL atteso: `https://giga-labor.github.io/secc/`
