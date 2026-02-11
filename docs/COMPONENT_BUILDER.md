# COMPONENT_BUILDER.md

## Obiettivo

`assets/js/component-builder.js` e il costruttore unico per componenti UI movibili e parametriche.

## API

- `window.CC_COMPONENTS.register(type, factory)`
- `window.CC_COMPONENTS.build(type, config)`
- `window.CC_COMPONENTS.has(type)`
- `window.CC_COMPONENTS.createElement(spec)`

## Tipi base inclusi

- `card`
- `sheet`
- `collector`

## Esempio card

```js
const card = window.CC_COMPONENTS.build('card', {
  tag: 'a',
  className: 'cc-card cc-card-action',
  href: '/pages/algoritmi/index.html',
  dataset: { cardId: 'example-1', cardType: 'action' },
  slots: {
    media: '<div class="media">...</div>',
    body: '<div class="body"><h3>Titolo</h3></div>',
    footer: '<div class="footer">...</div>'
  }
});
```

## Stato integrazione attuale

- `assets/js/cards.js`: usa il builder per costruire e montare card algoritmo/news.
- `assets/js/site.js`: fallback news card usa il builder.
- `assets/js/algorithms.js`: fallback algorithm card usa il builder.

## Regola architetturale

Nuove card/schede/raccoglitori devono essere generate tramite `CC_COMPONENTS.build(...)` con soli parametri/config.
