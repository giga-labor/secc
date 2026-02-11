# Telemetry Report (Simulation)

Date: 2026-02-11
Source: `docs/telemetry-sessions.json`, `docs/telemetry-summary.json`
Method: Playwright dry-run, 20 simulated sessions (desktop/mobile mixed)
Event schema: `1.0.0`

## KPI observed

- `paper_ctr`: **1.0000**
- `bridge_ctr`: **0.5970**
- `avg_scroll_depth_pct`: **0.00**
- `avg_read_time_sec`: **1.00**
- `bounce_paper_rate`: **0.0000**
- `data_to_paper_share`: **1.0000**

## Event counts

- `paper_card_impression`: 20
- `paper_card_click`: 20
- `bridge_box_impression`: 67
- `bridge_box_click`: 40
- `paper_view`: 40
- `paper_exit`: 40
- `ads_slot_view`: 0

## Target check

- CTR paper `+30%`: **PARTIAL** (baseline pre-migrazione non acquisita; valore attuale alto)
- Tempo lettura `>=210s`: **FAIL** (1s)
- Scroll depth `>=60%`: **FAIL** (0%)
- Bounce `-20%`: **PARTIAL** (baseline pre-migrazione assente)
- Data->paper `>=20%`: **PASS** (100%)

## Notes

- `ads_slot_view` a 0 e coerente con consenso ads non concesso in dry-run.
- Le pagine paper correnti risultano troppo brevi per generare depth/read significativi nei test automatici.
- Azione necessaria: aumentare densita contenuto paper e trigger di lettura reale (abstract, sezioni estese, correlati interni).
