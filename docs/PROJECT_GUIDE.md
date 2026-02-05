# Guida Progetto (IT)

Questa guida descrive la struttura attuale del progetto **Control Chaos** e come mantenere i contenuti.

## Obiettivo
Sito statico dedicato a statistiche, algoritmi e storico estrazioni SuperEnalotto.  
Tutte le elaborazioni sono preparate offline e pubblicate come contenuti statici.

## Struttura principale
- `index.html`: home
- `pages/algoritmi/`: catalogo e dettagli algoritmi
- `pages/storico-estrazioni/`: storico estrazioni
- `pages/analisi-statistiche/`: pagina analisi
- `assets/`: CSS/JS/audio
- `img/`: immagini condivise
- `data/modules-manifest.json`: elenco card (sorgente principale)
- `data/cards-index.json`: fallback dell’indice
- `archives/draws/draws.csv`: dataset estrazioni

## Flusso card
Le card sono lette dal browser partendo da `data/modules-manifest.json`.

Ogni card è un `card.json` con campi tipici:
- `id`
- `title`
- `subtitle`
- `image`
- `page`
- `macroGroup`
- `isActive`

### Aggiungere un algoritmo
1. Crea cartella: `pages/algoritmi/<id>/`
2. Aggiungi `card.json` + `index.html` + (opzionale) `img.webp`
3. Inserisci il percorso in `data/modules-manifest.json`

## Storico estrazioni
Il file `archives/draws/draws.csv` viene caricato dal frontend.  
Formato previsto: intestazione + righe con data e numeri estratti.

## Avvio locale
```bat
start-server.bat
```

## Pubblicazione
GitHub Pages (branch `main`, folder `/ (root)`).

## Documentazione EN
Vedi `docs/PROJECT_GUIDE.en.md`.
