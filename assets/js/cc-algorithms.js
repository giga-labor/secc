(function () {
  'use strict';

  var PAGE_VERSION = '02.00.012';

  var body = document.body;
  if (!body) return;
  var pageId = String(body.dataset.pageId || '').toLowerCase();
  if (pageId !== 'algoritmi' && pageId !== 'algsheet') return;

  document.documentElement.classList.add('cc-algorithm-migrated');

  var icons = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8v10h-6v-6H9v6H3Z"/></svg>',
    dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="1.5"/><circle cx="12" cy="6" r="1.5"/><circle cx="18" cy="6" r="1.5"/><circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/><circle cx="6" cy="18" r="1.5"/><circle cx="12" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></svg>',
    flask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M8 15h8"/></svg>',
    oracle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m8 9 4-2 4 2-4 2Zm0 0v5l4 2 4-2V9"/></svg>',
    privacy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.7 2.8 8.3 7 10 4.2-1.7 7-5.3 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/></svg>'
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  function normalizedFamily(value) {
    var family = String(value || 'statistica').toLowerCase();
    if (family.indexOf('oracle') >= 0) return 'oracolo';
    if (family.indexOf('neur') >= 0) return 'neurale';
    if (family.indexOf('ibrid') >= 0 || family.indexOf('genet') >= 0) return 'ibrido';
    if (family.indexOf('gener') >= 0) return 'generativi';
    return 'statistica';
  }

  function displayTitle(card) {
    var title = String(card.title || card.id || 'Algoritmo').replace(/-/g, ' ');
    return title.replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
  }

  function trendBadges(card) {
    var score = Number(card && card.rankingScoreDeltaPct);
    var position = Number(card && card.rankingPositionDelta);
    if (!Number.isFinite(score) || !Number.isFinite(position)) return '';
    function tone(value) { return value > 0.049 ? 'is-up' : value < -0.049 ? 'is-down' : 'is-flat'; }
    function signed(value, decimals) { return (value >= 0 ? '+' : '') + value.toLocaleString('it-IT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); }
    return '<span class="cc-trend-badges"><span class="cc-trend-badge ' + tone(score) + '" title="Variazione del punteggio rispetto al concorso precedente">' + signed(score, 1) + '%</span><span class="cc-trend-badge ' + tone(position) + '" title="Posti guadagnati o persi rispetto al concorso precedente">' + signed(position, 0) + ' ' + (Math.abs(Math.round(position)) === 1 ? 'posto' : 'posti') + '</span></span>';
  }

  function topbar(title, detail) {
    return '<header class="cca-topbar">' +
      '<a class="cca-icon-btn" href="' + (detail ? '../../' : '/') + '" aria-label="Indietro">' + icons.back + '</a>' +
      '<div class="cca-titlebar">' + escapeHtml(title) + '</div>' +
      '<div class="cca-topbar-actions">' +
        (detail ? '<button class="cca-icon-btn is-favorite" type="button" data-cca-favorite aria-label="Preferito">' + icons.star + '</button>' : '') +
        '<button class="cca-icon-btn is-theme-disabled" type="button" data-cca-theme disabled aria-label="Cambio tema (temporaneamente disabilitato)">' + icons.sun + '</button>' +
      '</div>' +
    '</header>';
  }

  function bottomNav(active) {
    var items = [
      ['Home', '/#/home', icons.home, 'home'],
      ['Algoritmi', '/pages/algoritmi/', icons.dots, 'algoritmi'],
      ['Laboratorio', '/#/laboratorio', icons.flask, 'laboratorio'],
      ['Oracolo', '/pages/oracle/', icons.oracle, 'oracle'],
      ['Privacy', '/pages/privacy-policy/', icons.privacy, 'privacy']
    ];
    return '<nav class="cca-bottom-nav" aria-label="Navigazione principale">' + items.map(function (item) {
      return '<a class="cca-nav-item' + (item[3] === active ? ' is-active' : '') + '" href="' + item[1] + '">' + item[2] + '<span>' + item[0] + '</span></a>';
    }).join('') + '</nav>';
  }

  function bindTheme() {
    var button = document.querySelector('[data-cca-theme]');
    if (!button) return;
    button.addEventListener('click', function () {
      var next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('cc-app-theme', next); localStorage.setItem('cc-theme', next); } catch (_) {}
    });
  }

  function applyStoredTheme() {
    var selected = '';
    try { selected = localStorage.getItem('cc-app-theme') || localStorage.getItem('cc-theme') || ''; } catch (_) {}
    if (!selected) selected = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    // Tema chiaro temporaneamente disabilitato: logica lasciata intatta, forzato "dark".
    document.documentElement.dataset.theme = 'dark';
  }

  function buildCatalog() {
    body.innerHTML = '<div class="cca-app">' + topbar('Algoritmi', false) +
      '<main class="cca-page">' +
        '<section class="cca-card cca-catalog-hero"><div><h1><strong><span data-cca-count>--</span> algoritmi</strong><br>di calcolo</h1><p>Diverse intelligenze, un solo obiettivo: trovare ordine nel caos dei numeri.</p></div><div class="cca-cube" data-cca-cube aria-hidden="true">--</div></section>' +
        '<div class="cca-filters" role="group" aria-label="Filtra algoritmi">' +
          '<button class="cca-filter is-active" data-cca-filter="all">Tutti</button><button class="cca-filter" data-cca-filter="statistica">Statistici</button><button class="cca-filter" data-cca-filter="neurale">AI & ML</button><button class="cca-filter" data-cca-filter="ibrido">Ibridi</button><button class="cca-filter" data-cca-filter="generativi">Generativi</button>' +
        '</div><section class="cca-list" data-cca-list><div class="cca-loading">Caricamento algoritmi...</div></section>' +
      '</main>' + bottomNav('algoritmi') + '</div>';
    bindTheme();
    document.documentElement.classList.add('cc-ui-ready');

    fetch('../../data/cards-index.json', { cache: 'no-store' }).then(function (response) {
      if (!response.ok) throw new Error('cards-index');
      return response.json();
    }).then(function (cards) {
      cards = (Array.isArray(cards) ? cards : []).filter(function (card) {
        return card && card.isActive !== false && card.view !== false && String(card.page || '').indexOf('pages/algoritmi/algs/') >= 0;
      }).sort(function (a, b) { return Number(b.rankingValue || 0) - Number(a.rankingValue || 0); });
      var list = document.querySelector('[data-cca-list]');
      document.querySelector('[data-cca-count]').textContent = cards.length;
      document.querySelector('[data-cca-cube]').textContent = cards.length;
      list.innerHTML = cards.map(function (card, index) {
        var family = normalizedFamily(card.macroGroup);
        var score = Number(card.rankingValue || 0);
        var href = String(card.page || '').replace(/^\/?/, '/');
        href += (href.indexOf('?') === -1 ? '?' : '&') + 'v=' + encodeURIComponent(PAGE_VERSION);
        var base = String(card.cardBase || card.page || '').replace(/^\/?/, '/');
        var image = base + (base.slice(-1) === '/' ? '' : '/') + (card.image || 'img.webp');
        return '<a class="cca-algorithm-row" data-family="' + family + '" href="' + escapeHtml(href) + '">' +
          '<img class="cca-algorithm-thumb" src="' + escapeHtml(image) + '" alt="" loading="lazy">' +
          '<div><h2 class="cca-row-title"><b>' + String(index + 1).padStart(2, '0') + '.</b>' + escapeHtml(displayTitle(card)) + '</h2><p class="cca-row-copy">' + escapeHtml(card.subtitle || card.narrativeSummary || '') + '</p>' + trendBadges(card) + '</div>' +
          '<div class="cca-row-score"><small>Convergenza</small>' + score.toLocaleString('it-IT', { maximumFractionDigits: 1 }) + '%<div class="cca-score-line"><i style="--score:' + Math.max(0, Math.min(100, score)) + '%"></i></div></div>' +
        '</a>';
      }).join('') || '<div class="cca-loading">Nessun algoritmo disponibile.</div>';

      document.querySelectorAll('[data-cca-filter]').forEach(function (button) {
        button.addEventListener('click', function () {
          document.querySelectorAll('[data-cca-filter]').forEach(function (item) { item.classList.remove('is-active'); });
          button.classList.add('is-active');
          var filter = button.dataset.ccaFilter;
          document.querySelectorAll('.cca-algorithm-row').forEach(function (row) {
            row.hidden = filter !== 'all' && row.dataset.family !== filter;
          });
        });
      });
      var requestedFamily = new URLSearchParams(window.location.search).get('family');
      var requestedButton = requestedFamily && document.querySelector('[data-cca-filter="' + CSS.escape(requestedFamily) + '"]');
      if (requestedButton) requestedButton.click();
    }).catch(function () {
      document.querySelector('[data-cca-list]').innerHTML = '<div class="cca-loading">Catalogo temporaneamente non disponibile.</div>';
    });
  }

  function renderBalls(values) {
    if (!Array.isArray(values) || !values.length) return '<span class="cca-proposal-empty">Proposta in aggiornamento</span>';
    return values.slice(0, 6).map(function (value) { return '<span class="cca-ball">' + escapeHtml(value) + '</span>'; }).join('');
  }

  function detailMarkup(card, snapshot) {
    var title = displayTitle(card);
    var family = normalizedFamily(card.macroGroup);
    var score = Number(card.rankingValue || 0);
    var metrics = snapshot && snapshot.metrics ? snapshot.metrics : {};
    var reliability = score >= 40 ? 4 : score >= 25 ? 3 : 2;
    var stars = '<span class="cca-stars-full">' + new Array(reliability + 1).join('★') + '</span>' +
      '<span class="cca-stars-empty">' + new Array(6 - reliability).join('☆') + '</span>';
    return '<div class="cca-app">' + topbar('Dettaglio algoritmo', true) +
      '<main class="cca-page">' +
        '<section class="cca-card cca-detail-hero"><div><div class="cca-detail-identity"><img src="img.webp" alt=""><div><h1>' + escapeHtml(title) + '</h1><span class="cca-family">' + escapeHtml(family) + '</span>' + trendBadges(card) + '</div></div><p class="cca-detail-copy">' + escapeHtml(card.narrativeSummary || card.subtitle || '') + '</p></div><div class="cca-detail-visual" aria-hidden="true"><span class="cca-beacon"></span></div></section>' +
        '<section class="cca-card cca-pad"><h2 class="cca-section-label">Performance</h2><div class="cca-metrics">' +
          '<div class="cca-metric"><small>Convergenza</small><strong data-ranking-kpi-value>' + (score ? score.toLocaleString('it-IT', { maximumFractionDigits: 1 }) + '%' : '--') + '</strong></div>' +
          '<div class="cca-metric"><small>Media hit</small><strong data-metric-card="media hit/sestina">' + (metrics.avg_hits == null ? '--' : escapeHtml(metrics.avg_hits)) + '</strong></div>' +
          '<div class="cca-metric"><small>Affidabilità</small><strong class="cca-stars" aria-label="' + reliability + ' stelle su 5">' + stars + '</strong></div>' +
        '</div></section>' +
        '<section class="cca-card cca-pad"><h2 class="cca-section-label">Sestina consigliata</h2><div class="cca-proposal" data-algo-sestina-balls>' + renderBalls(snapshot && snapshot.proposal) + '</div></section>' +
        '<div class="cca-tabs" role="tablist"><button class="cca-tab is-active" data-cca-tab="algoritmo">Algoritmo</button><button class="cca-tab" data-cca-tab="storica">Storica</button><button class="cca-tab" data-cca-tab="metriche">Metriche</button><button class="cca-tab" data-cca-tab="analisi">Analisi</button><button class="cca-tab" data-cca-tab="grafici">Grafici</button></div>' +
        '<section class="cca-card cca-pad cca-panel is-active" data-tab-panel="algoritmo"><div data-method-sheet><div class="cca-loading">Caricamento metodo...</div></div></section>' +
        '<section class="cca-card cca-pad cca-panel" data-tab-panel="storica"><div class="cca-history-table-wrap"><table class="cca-history-table"><thead><tr><th>Concorso</th><th>Sestina proposta</th><th class="cca-history-hit-heading">Hit</th></tr></thead><tbody data-historical-body><tr><td colspan="3">Caricamento...</td></tr></tbody></table></div><div class="cca-history-pagination"><button data-historical-prev type="button">Più recenti</button><span data-historical-page>Pagina 1 / 1</span><button data-historical-next type="button">Più vecchie</button></div></section>' +
        '<section class="cca-card cca-pad cca-panel" data-tab-panel="metriche"><p class="cca-panel-copy" data-metrics-intro>Metriche di efficacia sullo storico validato.</p><div class="cca-metrics"><div class="cca-metric"><small>Concorsi</small><strong data-metric-card="concorsi analizzati">' + escapeHtml(metrics.draws_covered == null ? '--' : metrics.draws_covered) + '</strong></div><div class="cca-metric"><small>Hit rate >= 2</small><strong data-metric-card="hit rate >= 2">' + escapeHtml(metrics.hit_rate_gte_2 == null ? '--' : metrics.hit_rate_gte_2 + '%') + '</strong></div><div class="cca-metric"><small>Best streak</small><strong data-metric-card="best streak">' + escapeHtml(metrics.best_streak == null ? '--' : metrics.best_streak) + '</strong></div></div><div style="overflow-x:auto"><table><thead><tr><th>Metrica</th><th>Valore</th><th>Nota</th></tr></thead><tbody data-metrics-body><tr><td colspan="3">Caricamento...</td></tr></tbody></table></div></section>' +
        '<section class="cca-card cca-pad cca-panel" data-tab-panel="analisi"><p class="cca-panel-copy" data-analysis-intro>Analisi - La parola all’esperto</p><p class="cca-panel-copy" data-analysis-text>Caricamento analisi...</p></section>' +
        '<section class="cca-card cca-pad cca-panel" data-tab-panel="grafici"><div class="cca-charts-intro"><span class="cca-eyebrow">Dati storici reali</span><h2>Cosa mostrano questi grafici</h2><p>Leggi separatamente risultati, scelte dell’algoritmo e stabilità nel tempo. Le frequenze descrivono il comportamento del modello, non la probabilità futura di uscita.</p></div><div class="cca-chart cca-chart--hits"><div class="cca-chart-head"><span class="cca-chart-badge"><b>0–6</b> Esiti</span><span class="cca-chart-signal" data-chart-signal="hits">Analisi in corso</span></div><h3>Quanti numeri ha indovinato</h3><p class="cca-chart-help">Distribuisce tutti i concorsi in base agli hit ottenuti dalla sestina proposta: da 0 a 6 numeri indovinati.</p><div id="chart-hit-dist" class="cca-chart-plot">Caricamento...</div><p class="cca-chart-reading" data-chart-reading="hits"></p></div><div class="cca-chart cca-chart--frequency"><div class="cca-chart-head"><span class="cca-chart-badge"><b>90</b> Scelte</span><span class="cca-chart-signal" data-chart-signal="frequency">Analisi in corso</span></div><h3>Quali numeri propone più spesso</h3><p class="cca-chart-help">Confronta quante volte ogni numero è entrato nelle proposte storiche. Evidenzia preferenze e concentrazioni del modello, non i numeri più probabili da estrarre.</p><div id="chart-num-freq" class="cca-chart-plot">Caricamento...</div><p class="cca-chart-reading" data-chart-reading="frequency"></p></div><div class="cca-chart cca-chart--timeline"><div class="cca-chart-head"><span class="cca-chart-badge"><b>100</b> Concorsi</span><span class="cca-chart-signal" data-chart-signal="timeline">Analisi in corso</span></div><h3>Come cambiano gli hit nel tempo</h3><p class="cca-chart-help">Ogni punto è la media degli hit in una finestra di 100 concorsi. La linea permette di riconoscere stabilità, crescita o calo recente.</p><div id="chart-timeline" class="cca-chart-plot">Caricamento...</div><p class="cca-chart-reading" data-chart-reading="timeline"></p></div></section>' +
      '</main>' + bottomNav('algoritmi') + '</div>';
  }

  function parseCsv(text) {
    var source = String(text || '').replace(/^\uFEFF/, '');
    if (!source.trim()) return [];
    var records = [], cells = [], value = '', quoted = false;
    for (var i = 0; i < source.length; i += 1) {
      var char = source[i];
      if (char === '"' && quoted && source[i + 1] === '"') { value += '"'; i += 1; }
      else if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) { cells.push(value); value = ''; }
      else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && source[i + 1] === '\n') i += 1;
        cells.push(value); value = '';
        if (cells.some(function (cell) { return cell !== ''; })) records.push(cells);
        cells = [];
      } else value += char;
    }
    cells.push(value);
    if (cells.some(function (cell) { return cell !== ''; })) records.push(cells);
    if (!records.length) return [];
    var headers = records.shift().map(function (item) { return item.trim(); });
    return records.map(function (values) {
      var row = {};
      headers.forEach(function (header, index) { row[header] = values[index] == null ? '' : values[index]; });
      return row;
    });
  }

  function firstValue(row, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      if (row && row[keys[i]] != null && row[keys[i]] !== '') return row[keys[i]];
    }
    return '';
  }

  function technicalList(value, fallback) {
    var items = String(value || fallback || '').split(/\s*\|\s*/).map(function (item) { return item.trim(); }).filter(Boolean);
    return '<ul>' + items.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul>';
  }

  function renderMethodSheet(text, card, scoringProfile) {
    var host = document.querySelector('[data-method-sheet]');
    if (!host) return;
    var facts = {};
    parseCsv(text).forEach(function (row) {
      var key = String(firstValue(row, ['CHIAVE', 'chiave', 'KEY', 'key']) || '').trim().toUpperCase();
      if (key) facts[key] = firstValue(row, ['VALORE', 'valore', 'VALUE', 'value']);
    });
    var rawFamily = String(card.macroGroup || 'statistica').toLowerCase();
    var familyLabel = rawFamily.indexOf('oracle') >= 0 ? 'Oracolo' : rawFamily.indexOf('neur') >= 0 ? 'Rete neurale' : rawFamily.indexOf('genet') >= 0 ? 'Evolutivo' : rawFamily.indexOf('ibrid') >= 0 ? 'Ibrido' : rawFamily.indexOf('gener') >= 0 ? 'Generativo' : 'Statistico';
    var profile = scoringProfile || {};
    var summary = Array.isArray(profile.summary) ? profile.summary : [profile.summary || facts.INTRO || card.narrativeSummary || card.subtitle || 'L algoritmo assegna un punteggio a ogni numero e ordina la classifica dal valore piu alto al piu basso.'];
    var factors = Array.isArray(profile.factors) && profile.factors.length ? profile.factors : String(facts.METODO || 'Indicatori storici normalizzati e combinati in un unico punteggio.').split(/\s*\|\s*/);
    var calculation = Array.isArray(profile.calculation) ? profile.calculation : [profile.calculation || 'I segnali vengono portati su una scala confrontabile e combinati. Un segnale favorevole aumenta il punteggio; una penalita lo riduce.'];
    var formulas = Array.isArray(profile.formulas) ? profile.formulas : [];
    var formulaHelp = profile.formulaHelp || 'n indica il numero che stiamo valutando. score significa semplicemente punteggio.';
    var example = profile.example || '';
    var selection = profile.selection || 'I 90 numeri vengono ordinati per punteggio. I primi sei formano la proposta, salvo eventuali regole di equilibrio proprie del modello.';
    var note = profile.note || 'Il punteggio e una preferenza interna del modello: serve a confrontare i numeri tra loro, non cambia la probabilita fisica dell estrazione.';
    host.innerHTML = '<div class="cca-method-hero"><div><span class="cca-method-type">' + escapeHtml(familyLabel) + '</span><h2>Come lavora</h2></div></div>' +
      '<div class="cca-method-intro">' + summary.filter(Boolean).map(function (paragraph) { return '<p>' + escapeHtml(paragraph) + '</p>'; }).join('') + '</div>' +
      '<section class="cca-scoring-factors"><h3>Cosa fa salire o scendere un numero</h3><ul>' + factors.filter(Boolean).map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul></section>' +
      '<section class="cca-scoring-calculation"><h3>Il calcolo, spiegato in modo semplice</h3>' + calculation.filter(Boolean).map(function (paragraph) { return '<p>' + escapeHtml(paragraph) + '</p>'; }).join('') + '</section>' +
      (example ? '<section class="cca-scoring-example"><span>Esempio</span><p>' + escapeHtml(example) + '</p></section>' : '') +
      (formulas.length ? '<section class="cca-method-parameters"><h3>La formula in breve</h3><div>' + formulas.map(function (formula) { return '<code>' + escapeHtml(formula) + '</code>'; }).join('') + '</div><p class="cca-formula-note">' + escapeHtml(formulaHelp) + '</p></section>' : '') +
      '<section class="cca-scoring-selection"><h3>Come sceglie i sei numeri</h3><p>' + escapeHtml(selection) + '</p></section>' +
      '<section class="cca-method-limits"><span>Come leggere il risultato</span><p>' + escapeHtml(note) + '</p></section>';
  }

  function renderHistory(text) {
    var host = document.querySelector('[data-historical-body]');
    if (!host) return;
    var pageLabel = document.querySelector('[data-historical-page]');
    var previousButton = document.querySelector('[data-historical-prev]');
    var nextButton = document.querySelector('[data-historical-next]');
    var rows = parseCsv(text).reverse();
    var pageSize = 12;
    var pageIndex = 0;

    function historyBall(rawValue) {
      var raw = String(rawValue == null ? '' : rawValue).trim();
      var match = raw.match(/^\[(.*)\]$/);
      var value = match ? match[1].trim() : raw;
      var display = /^\d+$/.test(value) ? String(Number(value)) : value;
      return {
        hit: Boolean(match),
        html: '<span class="cca-history-ball' + (match ? ' is-hit' : '') + '"' +
          (match ? ' aria-label="Numero ' + escapeHtml(display) + ', indovinato" title="Numero indovinato"' : '') + '>' +
          escapeHtml(display || '--') + '</span>'
      };
    }

    function rowNumbers(row) {
      var numberedKeys = Object.keys(row).filter(function (key) { return /^n\d+$/i.test(key); }).sort(function (a, b) {
        return Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, ''));
      });
      if (numberedKeys.length) return numberedKeys.slice(0, 6).map(function (key) { return row[key]; });
      var proposal = firstValue(row, ['proposal', 'proposta', 'sestina', 'numbers', 'numeri']);
      return String(proposal || '').split(/[\s,;|]+/).filter(Boolean).slice(0, 6);
    }

    function renderPage() {
      var totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
      pageIndex = Math.max(0, Math.min(pageIndex, totalPages - 1));
      var visibleRows = rows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
      host.innerHTML = visibleRows.map(function (row) {
        var sequence = firstValue(row, ['NR. SEQUENZIALE', 'nr. sequenziale', 'concorso', 'seq', 'target']);
        var date = firstValue(row, ['DATA', 'data', 'date', 'target_date']);
        var balls = rowNumbers(row).map(historyBall);
        var hits = balls.filter(function (ball) { return ball.hit; }).length;
        return '<tr>' +
          '<td class="cca-history-target"><strong>#' + escapeHtml(sequence || '--') + '</strong><small>' + escapeHtml(date || '') + '</small></td>' +
          '<td><div class="cca-history-balls">' + balls.map(function (ball) { return ball.html; }).join('') + '</div></td>' +
          '<td class="cca-history-hit-cell">' + (hits >= 2 ? '<span class="cca-history-hit" aria-label="' + hits + ' numeri indovinati">' + hits + '</span>' : '') + '</td>' +
        '</tr>';
      }).join('') || '<tr><td colspan="3">Storico non disponibile.</td></tr>';
      if (pageLabel) pageLabel.textContent = 'Pagina ' + (pageIndex + 1) + ' / ' + totalPages;
      if (previousButton) previousButton.disabled = pageIndex === 0;
      if (nextButton) nextButton.disabled = pageIndex >= totalPages - 1;
    }

    if (previousButton) previousButton.addEventListener('click', function () {
      if (pageIndex > 0) { pageIndex -= 1; renderPage(); }
    });
    if (nextButton) nextButton.addEventListener('click', function () {
      if ((pageIndex + 1) * pageSize < rows.length) { pageIndex += 1; renderPage(); }
    });
    renderPage();
  }

  function renderMetrics(text) {
    var host = document.querySelector('[data-metrics-body]');
    if (!host) return;
    var rows = parseCsv(text);
    host.innerHTML = rows.slice(0, 16).map(function (row) {
      var values = Object.keys(row).map(function (key) { return row[key]; }).filter(function (value) { return value !== ''; });
      return '<tr><td>' + escapeHtml(values[0] || '--') + '</td><td>' + escapeHtml(values[1] || '--') + '</td><td>' + escapeHtml(values.slice(2).join(' · ') || '') + '</td></tr>';
    }).join('') || '<tr><td colspan="3">Metriche dettagliate non disponibili.</td></tr>';
  }

  function setChartCopy(type, signal, reading, tone) {
    var signalHost = document.querySelector('[data-chart-signal="' + type + '"]');
    var readingHost = document.querySelector('[data-chart-reading="' + type + '"]');
    if (signalHost) {
      signalHost.textContent = signal;
      signalHost.dataset.tone = tone || 'neutral';
    }
    if (readingHost) readingHost.textContent = reading;
  }

  function renderHitChart(data) {
    var host = document.getElementById('chart-hit-dist');
    var labels = data && Array.isArray(data.labels) ? data.labels : [];
    var values = data && Array.isArray(data.values) ? data.values.map(Number) : [];
    if (!host || !values.length) return;
    var total = Number(data.total) || values.reduce(function (sum, value) { return sum + value; }, 0) || 1;
    var max = Math.max.apply(null, values.concat([1]));
    var hitsAtLeastTwo = values.reduce(function (sum, value, index) { return sum + (Number(labels[index]) >= 2 ? value : 0); }, 0);
    var rate = hitsAtLeastTwo / total * 100;
    host.innerHTML = '<div class="cca-hit-bars" role="img" aria-label="Distribuzione degli hit su ' + total + ' concorsi">' + values.map(function (value, index) {
      var percent = value / total * 100;
      var height = Math.max(4, Math.round(value / max * 86));
      return '<div class="cca-hit-bar"><span>' + percent.toLocaleString('it-IT', { maximumFractionDigits: 1 }) + '%</span><i style="height:' + height + 'px"></i><b>' + escapeHtml(labels[index] || index) + '<small> hit</small></b></div>';
    }).join('') + '</div>';
    setChartCopy('hits', rate.toLocaleString('it-IT', { maximumFractionDigits: 1 }) + '% con 2+ hit', 'Su ' + total.toLocaleString('it-IT') + ' concorsi, ' + hitsAtLeastTwo.toLocaleString('it-IT') + ' proposte hanno ottenuto almeno 2 hit.', rate >= 6 ? 'positive' : rate >= 4 ? 'neutral' : 'warning');
  }

  function renderFrequencyChart(data) {
    var host = document.getElementById('chart-num-freq');
    var labels = data && Array.isArray(data.labels) ? data.labels : [];
    var values = data && Array.isArray(data.values) ? data.values.map(Number) : [];
    if (!host || !values.length) return;
    var ranked = labels.map(function (label, index) { return { label: label, value: values[index] || 0 }; }).sort(function (a, b) { return b.value - a.value; });
    var top = ranked.slice(0, 8);
    var max = Math.max.apply(null, top.map(function (item) { return item.value; }).concat([1]));
    var average = values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
    var spread = average ? (ranked[0].value - ranked[ranked.length - 1].value) / average * 100 : 0;
    var profile = spread < 45 ? 'Selezione uniforme' : spread < 120 ? 'Preferenze moderate' : 'Selezione concentrata';
    host.innerHTML = '<div class="cca-frequency-list" role="img" aria-label="Otto numeri più usati nelle proposte">' + top.map(function (item, index) {
      return '<div class="cca-frequency-row"><span class="cca-frequency-rank">' + (index + 1) + '</span><span class="cca-frequency-ball">' + escapeHtml(item.label) + '</span><span class="cca-frequency-track"><i style="width:' + Math.max(5, item.value / max * 100) + '%"></i></span><strong>' + item.value.toLocaleString('it-IT') + '</strong></div>';
    }).join('') + '</div>';
    setChartCopy('frequency', profile, 'Il numero più usato è il ' + escapeHtml(top[0].label) + ' con ' + top[0].value.toLocaleString('it-IT') + ' presenze nelle proposte. Il grafico mostra le 8 scelte più ricorrenti.', spread < 45 ? 'positive' : spread < 120 ? 'neutral' : 'warning');
  }

  function renderTimelineChart(data) {
    var host = document.getElementById('chart-timeline');
    var windows = data && Array.isArray(data.windows) ? data.windows : [];
    if (!host || !windows.length) return;
    var values = windows.map(function (item) { return Number(item.avg_hits) || 0; });
    var max = Math.max.apply(null, values.concat([1]));
    var width = 320, height = 104, padding = 8;
    var points = values.map(function (value, index) {
      var x = padding + (values.length === 1 ? 0 : index / (values.length - 1) * (width - padding * 2));
      var y = height - padding - value / max * (height - padding * 2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    var area = padding + ',' + (height - padding) + ' ' + points.join(' ') + ' ' + (width - padding) + ',' + (height - padding);
    var recent = values.slice(-5);
    var previous = values.slice(-10, -5);
    var recentAverage = recent.reduce(function (sum, value) { return sum + value; }, 0) / recent.length;
    var previousAverage = previous.length ? previous.reduce(function (sum, value) { return sum + value; }, 0) / previous.length : recentAverage;
    var delta = recentAverage - previousAverage;
    var trend = delta > .03 ? 'Crescita recente' : delta < -.03 ? 'Calo recente' : 'Andamento stabile';
    var tone = delta > .03 ? 'positive' : delta < -.03 ? 'warning' : 'neutral';
    host.innerHTML = '<div class="cca-timeline-chart"><div class="cca-timeline-scale"><span>' + max.toLocaleString('it-IT', { maximumFractionDigits: 2 }) + '</span><span>0</span></div><svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" role="img" aria-label="Media hit per finestre di ' + escapeHtml(data.window_size || 100) + ' concorsi"><path class="cca-timeline-grid" d="M8 30H312 M8 56H312 M8 82H312"/><polygon points="' + area + '"/><polyline points="' + points.join(' ') + '"/><circle cx="' + points[points.length - 1].split(',')[0] + '" cy="' + points[points.length - 1].split(',')[1] + '" r="4"/></svg><div class="cca-timeline-labels"><span>' + escapeHtml(windows[0].label) + '</span><span>' + escapeHtml(windows[windows.length - 1].label) + '</span></div></div>';
    setChartCopy('timeline', trend, 'Media delle ultime 5 finestre: ' + recentAverage.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' hit per proposta, ' + (Math.abs(delta) < .005 ? 'in linea con' : delta > 0 ? 'sopra di' : 'sotto di') + ' ' + Math.abs(delta).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' rispetto alle 5 precedenti.', tone);
  }

  function loadDetailData(card) {
    Promise.all([
      fetch('out/algorithm-sheet.csv', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; }),
      fetch('../../../../data/algorithm-scoring-explanations.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
    ]).then(function (data) { renderMethodSheet(data[0], card, data[1] && data[1][card.id]); });
    fetch('out/analysis.txt', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (text) {
      var host = document.querySelector('[data-analysis-text]');
      if (host) host.textContent = text.trim() || 'Analisi non disponibile.';
    }).catch(function () {});
    fetch('out/historical-db.csv', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(renderHistory).catch(function () {});
    fetch('out/metrics-db.csv', { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(renderMetrics).catch(function () {});
    fetch('out/charts-data.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (charts) {
      renderHitChart(charts.hit_distribution || {});
      renderFrequencyChart(charts.number_frequency || {});
      renderTimelineChart(charts.hit_timeline || {});
    }).catch(function () {});
  }

  function buildDetail() {
    Promise.all([
      fetch('card.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
      fetch('out/snapshot.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
      fetch('../../../../data/cards-index.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
    ]).then(function (data) {
      var card = data[0] || {};
      var indexed = (Array.isArray(data[2]) ? data[2] : []).find(function (item) { return item && item.id === card.id; });
      if (indexed) card = Object.assign({}, card, indexed);
      body.innerHTML = detailMarkup(card, data[1] || {});
      bindTheme();
      loadDetailData(card);
      document.documentElement.classList.add('cc-ui-ready');
      document.querySelectorAll('[data-cca-tab]').forEach(function (button) {
        button.addEventListener('click', function () {
          document.querySelectorAll('[data-cca-tab]').forEach(function (item) { item.classList.toggle('is-active', item === button); });
          document.querySelectorAll('[data-tab-panel]').forEach(function (panel) { panel.classList.toggle('is-active', panel.dataset.tabPanel === button.dataset.ccaTab); });
        });
      });
    });
  }

  applyStoredTheme();
  if (pageId === 'algoritmi') buildCatalog();
  else buildDetail();
})();
