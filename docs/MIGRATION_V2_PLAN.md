# MIGRATION_V2_PLAN.md

## Obiettivo

Rendere il frontend completamente gerarchico e modulare con:
- un solo costruttore (`CC_COMPONENTS.build`),
- un architetto per pagina,
- un direttore per pagina,
- layout JSON versionato,
- cache con firma layout+dati.

## Ruoli

1. Direttore pagina: definisce il layout e la strategia della pagina.
2. Architetto pagina: interpreta il layout, raccoglie i dati e decide build/patch.
3. Costruttore unico: genera componenti UI tramite configurazione.
4. Orchestratore: coordina direttore + architetto + cache.

## Stato implementazione

- Core runtime creato:
  - `assets/js/core/cache-engine.js`
  - `assets/js/core/data-repository.js`
  - `assets/js/core/page-orchestrator.js`
- Architetti:
  - `assets/js/architects/base.architect.js`
  - `assets/js/architects/home.architect.js`
  - `assets/js/architects/patch.architect.js`
- Direttori:
  - `assets/js/directors/home.director.js`
  - `assets/js/directors/algoritmi.director.js`
  - `assets/js/directors/storico.director.js`
  - `assets/js/directors/analisi.director.js`
- Layout JSON:
  - `layouts/home.layout.json`
  - `layouts/algoritmi.layout.json`
  - `layouts/storico.layout.json`
  - `layouts/analisi.layout.json`

## Sequenza tecnica runtime

1. Legge `data-page-id` dal `body`.
2. Carica il direttore registrato.
3. Il direttore punta a `architect` + `layoutPath`.
4. L'architetto raccoglie dati da repository.
5. Cache engine genera `layout_hash`, `data_hash`, `combined_hash`.
6. Orchestratore decide `mode` (`rebuild`/`patch`).
7. L'architetto esegue rendering tramite builder unico.
8. Salva firma in cache locale.

## Regole obbligatorie

- Nessuna card nuova fuori da `CC_COMPONENTS.build('card', ...)`.
- Nuove pagine devono avere sempre:
  - `data-page-id`,
  - un direttore,
  - un layout JSON.
- Le modifiche struttura devono passare da layout, non da HTML hardcoded.
- Gli script pagina devono diventare "orchestrator-first".

## Prossimi passi tecnici

1. Migrare `algorithms.js` in architetto dedicato (tabs/gruppi da layout).
2. Migrare `draws.js` in componente tabella builder-driven.
3. Eliminare fallback legacy ridondanti dopo migrazione completa.
4. Aggiungere patch diff per nodi contenuto (invece del rerender zona).
