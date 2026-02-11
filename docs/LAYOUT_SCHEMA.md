# LAYOUT_SCHEMA.md

## Schema minimo

```json
{
  "page_id": "home",
  "version": "2.0.0",
  "data_sources": {
    "modules_manifest": "data/modules-manifest.json"
  },
  "zones": [
    {
      "id": "zone-id",
      "type": "kpi_cards | news_cards | text_patch | cards_from_manifest",
      "mount": "css-selector"
    }
  ]
}
```

## Zone types supportate (attuali)

- `kpi_cards`
- `news_cards`
- `text_patch`
- `cards_from_manifest`

## Versioning

- Incrementare `version` su ogni modifica strutturale layout.
- La cache usa firma layout+dati e invalida automaticamente al cambio.

## Best practice

1. Evitare HTML hardcoded in pagina per componenti dinamiche.
2. Usare selettori mount stabili (`data-*`).
3. Rendere i testi patchabili via layout quando non strutturali.
