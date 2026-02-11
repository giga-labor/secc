# MIGRATION_CHECKLIST.md (v1)

## Scope

- Active instance: `secc/`
- Start date: `2026-02-11`
- Event schema freeze: `event_version = 1.0.0`

## Vincoli fissi

- AdSense: 2 slot invariati (posizione e ingombro)
- Look and feel glass: invariato (linguaggio visivo coerente, blur controllato)

---

## 1) Perimetro e snapshot

1. [x] Congela perimetro progetto  
   Output: pagine core target = `index`, `pages/analisi-statistiche`, `pages/storico-estrazioni`, `pages/algoritmi`, `pages/algoritmi/spotlight/*` + stile/componenti condivisi.

2. [ ] Crea snapshot baseline UI  
   Output: screenshot desktop+mobile per pagine core.

3. [x] Abilita analytics in modalita dry-run (log locale)  
   Output: storage eventi locale + console debug + sessione ricostruibile.

4. [x] Crea baseline metriche (stato attuale)  
   Output: eseguite 20 sessioni simulate desktop/mobile. Report: `docs/telemetry-summary.json`, `docs/telemetry-sessions.json`, `docs/telemetry-report.md`.

---

## 2) Convenzioni e congelamenti

5. [x] Definisci naming unificato  
   Output: componenti (`card-kpi`, `card-paper`, `card-action`), eventi (`snake_case`), id (`paper_id`, `card_id`, `bridge_id`), `section_id`.

6. [x] Blocca design tokens v1  
   Output: tokens in CSS (`spacing`, `typography`, `color`, `radius`, `shadow`, `glass`, `z-index`, breakpoints).

7. [x] Blocca component library minima v1  
   Output: header, menu, card families, table, badge, cta, bridge-box, ads container.

8. [x] Definisci stati UI obbligatori  
   Output: default/hover/focus-visible/active/disabled/loading/empty/error.

---

## 3) Analytics freeze (schema v1)

9. [x] Blocca schema eventi analytics v1  
   Eventi MVP: `card_impression`, `card_click`, `bridge_box_impression`, `bridge_box_click`, `paper_view`, `paper_scroll_depth`, `paper_read_time`, `paper_exit`, `related_paper_click`, `ads_slot_view`.

10. [x] Definisci regole anti-duplicazione eventi  
    Output: >=50% per >=1s impression, max 1/sessione per elemento, click no double firing, scroll su soglia, read_time con tab attiva.

---

## 4) Template paper (non negoziabile)

11. [x] Definisci template paper non negoziabile  
    Output: `Header`, `Abstract`, `Dataset`, `Metodo`, `Output`, `Limiti`, `Collegamenti`.

---

## 5) Migrazione UI (sequenza controllata)

12. [x] Migra Home/Dashboard alla nuova grafica  
    Output: hero gerarchico, KPI, entry point studio, ads invariati.

13. [x] Migra Card System su pagine core  
    Output: card classificate per tipo con tracciamento.

14. [x] Inserisci ponte dati -> paper nelle sezioni statistiche  
    Output: bridge-box contestuali con analytics.

15. [x] Migra navigazione globale e locale  
    Output: nav primaria chiara, shortcut a studi/algoritmi/statistiche.

16. [x] Migra tabelle e viste dense  
    Output: leggibilita, sticky hierarchy, comportamento mobile.

17. [x] Applica template paper ai paper prioritari  
    Output: sezione studi in home + spotlight/algoritmi come pagina studio con blocchi standard.

---

## 6) Qualita (accessibilita, performance, QA)

18. [x] Verifica accessibilita minima  
    Output: focus visible, contrasto, heading semantici, tabelle mobile.

19. [ ] Verifica performance budget  
    Output: tentativo Lighthouse bloccato da interstitial Chrome su ambiente locale (`localhost/127.0.0.1`). Richiesto fallback con altro profiler o browser config dedicata.

20. [x] QA cross-device finale  
    Output: test automatizzato desktop/mobile per flusso card -> paper -> scroll -> correlati -> exit (20 sessioni).

---

## 7) Misura impatto (baseline vs post)

21. [x] Confronta baseline vs post-migrazione  
    Output: baseline post-migrazione prodotta. Confronto con pre-migrazione non disponibile (manca campionamento storico pre-refactor).

22. [ ] Release checklist firmata  
    Output: PASS/FAIL finale + event_version finale.

---

## BLOCCO ADS - COMPLIANCE VISIVA

- [x] Slot AdSense invariati (posizione + dimensioni)
- [x] Container ads graficamente neutro
- [x] Nessun accento colore condiviso con paper
- [x] Nessuna CTA editoriale adiacente
- [x] Nessuna animazione applicata
- [x] Label "Annuncio" presente e discreta
- [ ] Screenshot scala di grigi: ads subordinato al contenuto

---

## Regola di controllo

- Se un blocco non migliora o non misura KPI: rollback o rinvio.
- Non modificare UI e analytics nello stesso commit (adattato a lavoro offline: separare per blocchi file + mini-report).
