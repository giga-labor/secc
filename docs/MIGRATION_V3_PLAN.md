# MIGRATION_V3_PLAN.md

Version: `3.0.0`  
Date: `2026-02-14`  
Scope: Frontend refactor strutturale + UX stabilization  
Baseline: architettura V2 (`director` / `architect` / `layout` / `runtime-bootstrap`)

## 0. Obiettivo V3

V3 non e un redesign.  
V3 porta a produzione una home piu leggibile, accessibile e stabile senza rompere V2.

In scope:
- Gerarchia visiva home.
- Riduzione duplicazioni contenuto.
- Hardening tabs/cards/ads su desktop e mobile.
- Accessibility + performance cleanup mirato.

Out of scope:
- Backend.
- Nuove librerie.
- Refactor architetturale del runtime V2.
- Modifica schema analytics.
- Modifica logica/script AdSense.
- Redesign delle card custom.

## 1. Vincoli non negoziabili

1. Runtime V2 invariato:
- `assets/js/runtime-bootstrap.js`
- `assets/js/core/page-orchestrator.js`
- contratti director/architect/layout invariati.

2. Analytics freeze:
- `assets/js/ga4.js`
- schema `docs/ANALYTICS_SCHEMA.md` (`event_version: 1.0.0`) invariato.

3. Ads invariati:
- `assets/js/ads.js`
- slot AdSense esistenti mantenuti.

4. Card design invariato:
- consentite solo correzioni container/layout/focus/leggibilita.

## 2. File reali coinvolti

Core:
- `index.html`
- `assets/css/header.css`
- `assets/css/main.css`
- `assets/css/ads.css`
- `assets/css/migration.css`
- `assets/js/header.js`
- `assets/js/architects/home.architect.js`

Guardrail (read-only salvo bug bloccanti):
- `assets/js/runtime-bootstrap.js`
- `assets/js/core/page-orchestrator.js`
- `assets/js/directors/home.director.js`
- `assets/js/ga4.js`
- `assets/js/ads.js`

## 3. Ownership

- `AI IDE`: implementa patch tecniche, QA smoke, report evidenze.
- `Operatore umano`: approva copy/UI finale, regressioni brand, validazione monetizzazione.

## 4. Baseline metrica e target

Stato baseline al `2026-02-14`:
- I file `docs/lighthouse-home.json` e `docs/lighthouse-paper.json` sono non validi come baseline metrica perche contengono `CHROME_INTERSTITIAL_ERROR`.
- Conseguenza: punteggi Lighthouse e metriche Core Web Vitals correnti non sono affidabili.

Azione obbligatoria pre `M1`:
- Rigenerare baseline valida su home (`index.html`) con run Lighthouse senza interstitial.

Metriche da registrare (baseline):
- `Performance` (mobile)
- `Accessibility`
- `CLS`
- `LCP`
- `unused-preload` warnings

Baseline valida registrata (`docs/lighthouse-home-v2-preM1.json`):
- `Performance (mobile)`: `32`
- `Accessibility`: `96`
- `CLS`: `0.2816`
- `LCP`: `17851 ms`

Snapshot post-M2 registrato (`docs/lighthouse-home-v3-m2.json`):
- `Performance (mobile)`: `41`
- `Accessibility`: `96`
- `CLS`: `0.2625`
- `LCP`: `17860 ms`

Snapshot post-M3 registrato (`docs/lighthouse-home-v3-m3.json`):
- `Performance (mobile)`: `40`
- `Accessibility`: `96`
- `CLS`: `0.2625`
- `LCP`: `19488 ms`

Snapshot post-M3 stabilization (`docs/lighthouse-home-v3-m3-postrevert.json`):
- `Performance (mobile)`: `43`
- `Accessibility`: `96`
- `CLS`: `0.2625`
- `LCP`: `19472 ms`

Snapshot post-paint optimization (`docs/lighthouse-home-v3-postpaint-opt.json`):
- `Performance (mobile)`: `57`
- `Accessibility`: `100`
- `CLS`: `0.0011`
- `LCP`: `20503 ms`

Snapshot LCP tuning (`docs/lighthouse-home-v3-lcp-tuned-r2.json`):
- `Performance (mobile)`: `57`
- `Accessibility`: `100`
- `CLS`: `0.0241`
- `LCP`: `16615 ms`

Target minimi V3 (gate `M3`):
- `CLS < 0.10` sulla home.
- `Accessibility >= 90`.
- Nessun warning `unused-preload` bloccante.
- `Performance` mobile migliorata rispetto baseline valida.

## 5. Task matrix operativa

Formato stato task: `TODO` -> `IN_PROGRESS` -> `DONE` -> `VERIFIED`.

### A. Header stabilization

`A1` Overlay/header layers normalization (`VERIFIED`)  
File:
- `assets/css/header.css`
- `assets/css/main.css`
Azioni:
- Uniformare overlay header/hero.
- Rimuovere layer duplicati non necessari.
- Definire scala z-index standard:
  - `--z-base: 0`
  - `--z-overlay: 40`
  - `--z-header: 50`
  - `--z-modal: 100`
- Vietato introdurre z-index arbitrari (es. `999`, `9999`) fuori scala.
Acceptance:
- Header blur presente.
- Nessuna sovrapposizione aggressiva su titolo/CTA.
- Riduzione z-index non giustificati.
Owner: `AI IDE`

`A2` Header height normalization (`VERIFIED`)  
File:
- `assets/css/header.css`
Azioni:
- Ridurre padding verticale e altezza percepita blocco header.
Acceptance:
- Above-the-fold visualizza `H1` + almeno `1 CTA` + inizio modulo successivo.
Owner: `AI IDE`

### B. Hero restructure (no runtime change)

`B1` Isolamento blocco hero semantico (`VERIFIED`)  
File:
- `index.html`
- `assets/css/header.css`
- `assets/css/main.css`
Azioni:
- Separare hero da tabs/modules in sezione dedicata (`.hero-section` o equivalente).
- Mantenere un solo `H1`.
Acceptance:
- Hero isolato semanticamente.
- Nessun errore JS legato ai mount runtime.
- Director/architect invariati.
Owner: `AI IDE`

### C. Modules normalization

`C1` Rimozione duplicazione laboratorio (`VERIFIED`)  
File:
- `index.html`
Azioni:
- Eliminare duplicati contenuto laboratorio tra tabs e griglia secondaria.
- Conservare pannello KPI/aside utile.
Acceptance:
- Nessun blocco testuale duplicato.
- Layout integro desktop/mobile.
Owner: `AI IDE`

`C2` Tabs accessibility hardening (`VERIFIED`)  
File:
- `assets/js/architects/home.architect.js`
- `assets/js/header.js`
Azioni:
- Mappatura accessibilita tabs:
  - `role="tablist"` sul contenitore tabs
  - `role="tab"` su ogni tab
  - `role="tabpanel"` sui pannelli
  - `aria-selected` + `aria-controls` coerenti
  - `tabindex="0"` solo sul tab attivo
  - `tabindex="-1"` su tab inattivi
- Navigazione tastiera frecce sx/dx + Enter/Space.
Acceptance:
- Tabs navigabili solo da tastiera.
- Focus visibile.
- Nessuna regressione click/touch.
Owner: `AI IDE`

### D. Cards grid hardening

`D1` Desktop no horizontal overflow (`VERIFIED`)  
File:
- `assets/css/main.css`
Azioni:
- Desktop/tablet: grid stabile.
- Mobile: scroll orizzontale consentito solo dove intenzionale.
Acceptance:
- Nessun overflow-x involontario su viewport `>= 768`.
- Card integre su viewport `375`.
Owner: `AI IDE`

### E. Ads isolation and CLS control

`E1` Ad wrapper stabilization (`VERIFIED`)  
File:
- `assets/css/ads.css`
Azioni:
- Definire `min-height`/spazi slot per ridurre shift.
- Placeholder neutro quando slot non valorizzato.
- Altezza container ads stabile fino al render dell'annuncio.
Acceptance:
- Nessun layout jump evidente in caricamento.
- Script/markup ads invariati.
- `CLS` home post-V3 `< 0.10`.
Owner: `AI IDE` + verifica finale `Operatore umano`

### F. Accessibility hardening

`F1` Global focus-visible (`VERIFIED`)  
File:
- `assets/css/main.css`
- `assets/css/header.css`
Azioni:
- Regola `:focus-visible` coerente su link/button/tab/card.
Acceptance:
- Focus sempre visibile con tastiera.
- Nessun conflitto con hover/active.
Owner: `AI IDE`

`F2` Alt text audit (`VERIFIED`)  
File:
- `index.html`
Azioni:
- Alt descrittivo per immagini funzionali.
- `alt=""` solo decorative.
Acceptance:
- Nessuna immagine funzionale senza `alt`.
Owner: `AI IDE` + review copy `Operatore umano`
Nota esecuzione:
- In `index.html` non sono presenti tag `<img>` funzionali; nessuna regressione alt in home.

### G. Performance cleanup

`G1` Preload minimization (`VERIFIED`)  
File:
- `index.html`
Azioni:
- Tenere preload solo asset above-the-fold essenziali.
- Rimuovere preload inutili o ridondanti.
Acceptance:
- Riduzione warning preload non usati.
- Nessuna regressione rendering hero.
Owner: `AI IDE`

`G2` Shadow/effects reduction (`VERIFIED`)  
File:
- `assets/css/header.css`
- `assets/css/main.css`
Azioni:
- Ridurre catene di shadow costose mantenendo identita visiva.
Acceptance:
- Migliore fluidita percepita su mobile.
- Estetica coerente con baseline.
Owner: `AI IDE` + review `Operatore umano`

## 6. Milestone

## M1 - Structural Stabilization

Task:
- `A1`, `A2`, `B1`, `C1`

Gate:
- Nessun contenuto duplicato.
- Hero leggibile e isolato.
- Nessuna rottura runtime.

## M2 - Interaction & Layout Hardening

Task:
- `C2`, `D1`, `E1`

Gate:
- Tabs accessibili da tastiera.
- Zero overflow desktop involontario.
- Ads stabili senza shift visibile.

## M3 - Accessibility & Performance Final

Task:
- `F1`, `F2`, `G1`, `G2`

Gate:
- Focus-visible completo.
- Audit alt completato.
- `Accessibility >= 90`.
- `CLS < 0.10`.
- Performance mobile migliorata rispetto baseline valida.

## 7. Regression protocol (obbligatorio pre-merge)

Smoke pages:
- `index.html`
- `pages/algoritmi/index.html`
- `pages/storico-estrazioni/index.html`
- `pages/analisi-statistiche/index.html`

Checklist:
1. Runtime:
- Nessun errore in console su bootstrap/orchestrator/director/architect.
2. Analytics:
- `ga4.js` caricato, eventi V2 ancora emessi, nessun rename schema.
3. Ads:
- Slot presenti, nessuna rimozione snippet.
4. Responsive:
- test viewport: `375`, `768`, `1024`, `1440`.
5. Accessibility:
- ordine tab corretto, focus visibile, heading coerenti.
6. Console:
- Nessun `error` o `Unhandled Promise Rejection`.

## 8. Definition of Done (V3 complete)

V3 e `DONE` quando:
1. Nessun contenuto duplicato nella home.
2. Nessun overflow orizzontale desktop involontario.
3. Hero comprensibile in pochi secondi (titolo + CTA chiara).
4. Tabs accessibili da tastiera con ARIA corretto.
5. Ads senza layout shift evidente e con monetizzazione invariata.
6. Focus-visible globale attivo.
7. Runtime V2 invariato nei contratti.
8. Nessuna regressione GA4/AdSense verificata.
9. Nessun warning console bloccante (`error` / promise rejection).
10. Nessun layout shift cumulativo oltre `0.10` (home).

## 9. Commit strategy consigliata

1. Commit `v3-m1-structural`
- include: `A1 A2 B1 C1`
2. Commit `v3-m2-interaction-layout`
- include: `C2 D1 E1`
3. Commit `v3-m3-a11y-performance`
- include: `F1 F2 G1 G2`

Regola:
- non mischiare patch UI e patch analytics nello stesso commit.
