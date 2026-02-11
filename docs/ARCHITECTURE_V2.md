# ARCHITECTURE_V2.md

## Layers

- `Builder Layer`: `CC_COMPONENTS`
- `Data Layer`: `CC_DATA_REPOSITORY`
- `Cache Layer`: `CC_CACHE_ENGINE`
- `Control Layer`: `CC_PAGE_ORCHESTRATOR`
- `Page Layer`: director + architect + layout

## Contracts

### Director contract

```js
{
  architect: 'home' | 'patch' | ...,
  layoutPath: 'layouts/*.layout.json'
}
```

### Architect contract

```js
{
  async collectData(layout) => dataSnapshot,
  async run(layout, dataSnapshot, state)
}
```

### State contract passed to architect

```js
{
  mode: 'rebuild' | 'patch',
  previous: { ...signature } | null,
  signature: { layout_hash, data_hash, combined_hash }
}
```

## Component strategy

- `card`: unico costruttore per card kpi/news/algoritmo/action.
- `sheet`: blocchi informativi/testuali.
- `collector`: contenitori modulari di elementi.

## Anti-coupling rules

- Niente fetch diretto in director.
- Niente decisioni di orchestrazione in architect.
- Niente creazione card manuale quando il builder è disponibile.
- Niente conoscenza del DOM globale fuori dalle `zone.mount` di layout.
