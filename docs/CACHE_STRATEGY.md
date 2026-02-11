# CACHE_STRATEGY.md

## Scope

Cache locale per firma render pagina V2:
- `layout_hash`
- `data_hash`
- `combined_hash`

Key: `cc_v2_cache:{page_id}`

## Decisione render

- Se firma assente o diversa: `rebuild`
- Se firma uguale: `patch`

## Obiettivo

Ridurre rebuild inutili e limitare aggiornamenti ai soli contenuti quando possibile.

## Evoluzione prevista

- Introdurre diff nodo-per-nodo per zone `cards` e `table`.
- Aggiungere TTL differenziato per sorgenti lente/veloci.
- Introdurre `etag`/`last-modified` quando disponibile.
