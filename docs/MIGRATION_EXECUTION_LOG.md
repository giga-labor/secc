# MIGRATION_EXECUTION_LOG.md

## Context

- Project: `secc`
- Mode: full migration, sequential blocks with fixed constraints
- Event schema: `1.0.0` (frozen)

## Progress board

- [x] Documentation baseline created
- [x] Analytics dry-run core added
- [x] Card system telemetry hooks added
- [x] Bridge telemetry hooks added
- [x] Ads telemetry hooks added
- [x] Visual migration stylesheet attached globally
- [x] Home and core pages aligned to migration layout classes
- [x] Baseline KPI simulation run completed
- [x] Cross-device QA automation completed (desktop/mobile)
- [ ] Performance budget measured (blocked by Lighthouse interstitial in local env)

## Open checkpoints

1. Capture screenshots desktop/mobile + grayscale ads compliance.
2. Validate LCP/CLS/INP with lighthouse or equivalent.
3. Improve paper pages depth/readability and rerun telemetry KPI cycle.

## Latest outputs

- `docs/telemetry-sessions.json`
- `docs/telemetry-summary.json`
- `docs/telemetry-report.md`
- Lighthouse status: blocked (`Chrome interstitial` on local host)

## V2 modular migration (new)

- [x] Gerarchia `director -> architect -> builder` avviata in codice
- [x] Core runtime introdotto (`cache-engine`, `data-repository`, `page-orchestrator`)
- [x] Layout JSON versionati introdotti per pagine core
- [x] Home migrata a runtime V2 (KPI + news da layout)
- [x] Direttori attivi per `home`, `algoritmi`, `storico`, `analisi`
- [x] Smoke test runtime su 4 pagine (`ok`)
- [x] Migrazione controllata di `algorithms.js` in architect dedicato (mount orchestrato)
- [x] Migrazione controllata di `draws.js` in architect dedicato (mount orchestrato)
- [x] Migrazione controllata di `analisi` in architect dedicato (inline script rimosso, mount orchestrato)
