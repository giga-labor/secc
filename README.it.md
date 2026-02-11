# Control Chaos

Sito statico per analisi, algoritmi e storico estrazioni SuperEnalotto.  
Nessun backend: tutto è client-side statico.

## Repository
- GitHub: `https://github.com/giga-labor/secc`
- Branch principale: `main`
- Deploy target: GitHub Pages (root `/`)

## Scope Attuale
- Home con card in evidenza e aggiornamenti progetto
- Catalogo algoritmi con pagine dettaglio dedicate
- Pagina storico estrazioni su `archives/draws/draws.csv`
- Pagine statistiche e legali
- Layout ads runtime (`assets/js/ads.js`) come host slot UI del progetto

## Struttura Progetto
- `index.html`: home
- `pages/algoritmi/`: catalogo + pagine dettaglio algoritmi
- `pages/storico-estrazioni/`: archivio estrazioni
- `pages/analisi-statistiche/`: pagina statistiche
- `pages/privacy-policy/`, `pages/cookie-policy/`, `pages/contatti-chi-siamo/`: pagine legali
- `assets/js/cards.js`: costruttore card e sorgente unica sizing/comportamenti card
- `assets/js/cards-index.js`: loader manifest/card
- `assets/js/site.js`: rendering card home
- `assets/js/algorithms.js`: rendering catalogo algoritmi + spotlight
- `assets/js/ga4.js`: bootstrap GA4
- `assets/js/ads.js`: logica host slot ads
- `data/modules-manifest.json`: manifest card principale
- `data/algorithms-spotlight/modules-manifest.json`: manifest card spotlight
- `ads.txt`, `robots.txt`, `sitemap.xml`: file tecnici crawl/ads

## Workflow GitHub
1. Crea/aggiorna cartella pagina con `index.html` + `card.json` (+ media).
2. Registra il path del `card.json` nel manifest corretto.
3. Aggiorna `assets/js/version.js` a ogni batch release.
4. Commit su `main` e pubblicazione via GitHub Pages.

## Flusso Card
- Le card sono caricate dai manifest e normalizzate in `assets/js/cards-index.js`.
- Le card sono costruite da `window.CARDS.buildAlgorithmCard(...)` in `assets/js/cards.js`.
- `no_data_show` è gestito per-card in `card.json`; default `true` quando assente.

## Documentazione AdSense e Ads
Stato attuale:
- `ads.txt` presente come template e da sostituire con il tuo `pub-...` reale.
- GA4 centralizzato in `assets/js/ga4.js`, incluso in tutti gli `index.html`.
- Slot ads UI gestiti da `assets/js/ads.js` (hook `window.CC_RENDER_AD_SLOT`).
- Loader AdSense (`adsbygoogle.js`) iniettato a runtime da `assets/js/ads.js`.
- Loader Funding Choices TCF iniettato a runtime per flusso CMP certificato dove disponibile.

Checklist go-live monetizzazione:
1. Inserisci la riga publisher reale in `ads.txt`.
2. Integra script ufficiale AdSense e unità conformi alle policy.
3. Verifica pagine policy (`privacy`, `cookie`, `contatti`) e consenso cookie.
4. Ricontrolla raggiungibilità `robots.txt` + `sitemap.xml` in produzione.
5. Verifica approvazione e crawlabilità delle pagine monetizzate su dominio GitHub Pages.

## Avvio Locale
```bat
start-server.bat
```
Apri `http://localhost:8000/`.

## Deploy (GitHub Pages)
1. Repo -> Settings -> Pages
2. Source: Deploy from a branch
3. Branch: `main`
4. Folder: `/ (root)`

URL atteso:
- `https://giga-labor.github.io/secc/`

## Note
- L'autoplay audio è limitato dai browser; toggle audio disabilitato di default.
- Nessun backend richiesto.

## Documentation EN
Vedi `README.md`.
