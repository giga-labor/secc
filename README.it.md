# Control Chaos

Sito statico per analisi, algoritmi e storico estrazioni SuperEnalotto.  
Nessun backend: tutto gira lato client e viene servito come file statici.

## Contenuti
- Home con moduli in evidenza
- Catalogo algoritmi con card raggruppate
- Pagina storico estrazioni (`draws.csv`)
- Banner laterali e ticker (placeholder, non rete pubblicitaria)
- Audio playlist opzionale (disabilitata di default)

## Struttura
- `index.html` home
- `pages/algoritmi/` catalogo e pagine algoritmo
- `pages/storico-estrazioni/` storico estrazioni
- `pages/analisi-statistiche/` pagina analisi
- `assets/` CSS/JS/audio
- `img/` immagini condivise
- `data/modules-manifest.json` lista di tutte le card (sorgente principale)
- `data/cards-index.json` fallback opzionale
- `archives/draws/draws.csv` dataset estrazioni
- `scripts/` utility locali (opzionali)

## Card & Manifest
Le card sono definite da `card.json` in `pages/algoritmi/*/` e da alcune pagine statiche.

Per aggiungere un nuovo algoritmo:
1. Crea la cartella: `pages/algoritmi/<id>/`
2. Aggiungi `card.json` e `index.html` (eventuale `img.webp`)
3. Inserisci il path della card in `data/modules-manifest.json`

L’indice delle card viene generato **al volo** nel browser usando il manifest.  
`data/cards-index.json` è solo un fallback.

## Avvio in locale
Usa lo script:
```bat
start-server.bat
```
Poi apri:
- `http://localhost:8000/`

## Pubblicazione su GitHub Pages
Sito statico: basta fare push e abilitare Pages:
1. Repo → Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main`, Folder: `/ (root)`

URL del sito:
```
https://<username>.github.io/ControlChaos/
```

## Note
- L’autoplay audio è limitato dai browser. Il toggle audio è disattivato di default.
- Non è presente backend.
- I banner sono placeholder, non integrati con AdSense o simili.
