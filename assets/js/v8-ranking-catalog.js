(function () {
  'use strict';

  var booted = false;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatScore(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return '--';
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);
  }

  function buildFetchCandidates(path) {
    var value = String(path || '').trim();
    if (!value) return [];
    if (/^(https?:|file:|#)/i.test(value)) return [value];
    var trimmed = value.replace(/^\/+/, '').replace(/^\.\//, '');
    var out = [];
    if (window.CC_BASE && window.CC_BASE.url) {
      try { out.push(new URL(trimmed, window.CC_BASE.url).toString()); } catch (_) {}
    }
    out.push('/' + trimmed, '../../' + trimmed, trimmed);
    return Array.from(new Set(out));
  }

  async function fetchJson(path) {
    var candidates = buildFetchCandidates(path);
    for (var i = 0; i < candidates.length; i += 1) {
      try {
        var res = await fetch(candidates[i], { cache: 'no-store' });
        if (res.ok) return await res.json();
      } catch (_) {}
    }
    return null;
  }

  function normalizePageKey(value) {
    return String(value || '')
      .trim()
      .replace(/^\/+/, '')
      .replace(/index\.html?$/i, '')
      .replace(/\/?$/, '/')
      .toLowerCase();
  }

  function titleFromSlug(value) {
    return String(value || 'Algoritmo')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b([a-z])/g, function (m) { return m.toUpperCase(); });
  }

  function cleanTitle(rowTitle, card) {
    var cardTitle = String(card && card.title || '').trim();
    var rowRaw = String(rowTitle || '').trim();
    var chosen = cardTitle || rowRaw || 'Algoritmo';
    if (/[-_]/.test(chosen) && chosen.toLowerCase() === rowRaw.toLowerCase()) {
      return titleFromSlug(chosen);
    }
    return chosen;
  }

  function familyLabel(value) {
    var raw = String(value || '').toLowerCase();
    if (raw.indexOf('neur') === 0) return 'Neurale';
    if (raw.indexOf('ibr') === 0) return 'Ibrido';
    if (raw.indexOf('stor') === 0) return 'Storico';
    if (raw.indexOf('gen') === 0) return 'Generativo';
    return 'Statistico';
  }

  function normalizeHits(srcHits) {
    var hits = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    if (!srcHits || typeof srcHits !== 'object') return hits;
    for (var i = 0; i <= 6; i += 1) {
      var raw = srcHits[i];
      if (raw == null) raw = srcHits[String(i)];
      var val = parseInt(String(raw == null ? 0 : raw), 10);
      hits[i] = Number.isFinite(val) ? Math.max(0, val) : 0;
    }
    return hits;
  }

  function cardHtml(row, position, podium) {
    var title = escapeHtml(row.title || 'Algoritmo');
    var subtitle = escapeHtml(row.subtitle || '');
    var href = '/' + String(row.page || '').replace(/^\/+/, '');
    var fam = String(row.family || '').toLowerCase();
    var topHit = Math.max(row.hits[1] || 0, row.hits[2] || 0, row.hits[3] || 0, row.hits[4] || 0, 1);
    var bars = [1, 2, 3, 4].map(function (hit) {
      var v = row.hits[hit] || 0;
      var h = Math.max(4, Math.round(v / topHit * 34));
      return '<span class="v8rank-bar" title="' + hit + '+ hit: ' + v + '"><i style="height:' + h + 'px"></i><b>' + hit + '+</b></span>';
    }).join('');
    var podiumClass = podium ? (' is-podium is-podium-' + position) : '';
    var hit3p = (row.hits[3] || 0) + (row.hits[4] || 0) + (row.hits[5] || 0) + (row.hits[6] || 0);

    return ''
      + '<a href="' + escapeHtml(href) + '" class="v8rank-card' + podiumClass + '" aria-label="Apri ' + title + '" data-rank-family="' + escapeHtml(fam) + '">'
      + '<span class="v8rank-pos">#' + String(position).padStart(2, '0') + '</span>'
      + '<span class="v8rank-family">' + escapeHtml(familyLabel(fam)) + '</span>'
      + '<div class="v8rank-title">' + title + '</div>'
      + (subtitle ? '<p class="v8rank-subtitle">' + subtitle + '</p>' : '')
      + '<div class="v8rank-score"><b>' + escapeHtml(formatScore(row.ranking)) + '</b><span>Punteggio storico</span></div>'
      + '<span class="v8rank-go">Apri scheda &rarr;</span>'
      + '</a>';
  }

  async function buildRows() {
    var precomputed = await fetchJson('/data/precomputed/ranking.json');
    var cardIndex = await fetchJson('/data/cards-index.json');
    var cardsByPage = {};

    if (Array.isArray(cardIndex)) {
      cardIndex.forEach(function (card) {
        var key = normalizePageKey(card && card.page);
        if (key) cardsByPage[key] = card;
      });
    }

    if (precomputed && precomputed.generated_at) {
      var tsEl = document.getElementById('ranking-timestamp');
      var tsVal = document.getElementById('ranking-ts-value');
      if (tsEl && tsVal) {
        var rawTs = String(precomputed.generated_at || '');
        var m = rawTs.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})/);
        tsVal.textContent = m ? (m[3] + '/' + m[2] + '/' + m[1] + ' alle ' + m[4] + ':' + m[5]) : rawTs;
        tsEl.style.display = '';
      }
    }

    if (!precomputed || !Array.isArray(precomputed.rows)) return [];
    return precomputed.rows.map(function (row) {
      var card = cardsByPage[normalizePageKey(row && row.page)] || null;
      return {
        title: cleanTitle(row && row.title, card),
        subtitle: String(card && card.subtitle || ''),
        page: String(row && row.page || '').replace(/^\/+/, ''),
        family: String(row && (row.family || (card && card.macroGroup)) || ''),
        ranking: Number.isFinite(Number(row && row.ranking)) ? Number(row.ranking) : 0,
        hits: normalizeHits(row && row.hits)
      };
    }).sort(function (a, b) { return b.ranking - a.ranking; });
  }

  function wireFilters(host) {
    document.addEventListener('click', function (event) {
      var btn = event.target && event.target.closest('.cc-rank-filter');
      if (!btn) return;
      var active = String(btn.getAttribute('data-family') || '').toLowerCase();
      document.querySelectorAll('.cc-rank-filter').forEach(function (item) {
        var isActive = String(item.getAttribute('data-family') || '').toLowerCase() === active;
        item.classList.toggle('is-active', isActive);
        item.classList.toggle('border-neon/60', isActive);
        item.classList.toggle('bg-neon/10', isActive);
        item.classList.toggle('text-neon', isActive);
        item.classList.toggle('border-white/15', !isActive);
        item.classList.toggle('bg-white/5', !isActive);
        item.classList.toggle('text-ash', !isActive);
      });
      host.querySelectorAll('[data-rank-family]').forEach(function (card) {
        var fam = String(card.getAttribute('data-rank-family') || '').toLowerCase();
        var visible = !active || fam === active;
        card.style.display = visible ? '' : 'none';
        var slot = card.closest('.cc-ranking-podium__slot');
        if (slot) slot.style.display = visible ? '' : 'none';
      });
      ['.v8rank-podium-wrap', '.v8rank-list-wrap'].forEach(function (selector) {
        var wrap = host.querySelector(selector);
        if (!wrap) return;
        var hasVisible = Array.from(wrap.querySelectorAll('.v8rank-card')).some(function (card) {
          return card.style.display !== 'none';
        });
        wrap.style.display = hasVisible ? '' : 'none';
      });
    });
  }

  function injectMiniCharts(host) {
    if (!window.ChartRenderer || typeof window.ChartRenderer.renderHitDistribution !== 'function') return;
    host.querySelectorAll('.v8rank-card:not([data-chart-injected])').forEach(function (card) {
      card.dataset.chartInjected = '1';
      var href = card.getAttribute('href') || '';
      var match = href.match(/\/algs\/([^/]+)\//);
      if (!match) return;
      var slug = match[1];
      var wrap = document.createElement('div');
      wrap.style.cssText = 'padding:4px 8px 6px;border-top:1px solid rgba(255,255,255,0.07)';
      wrap.innerHTML = '<div id="mini-' + escapeHtml(slug) + '" style="min-height:40px"></div>';
      card.appendChild(wrap);
      fetchJson('/pages/algoritmi/algs/' + slug + '/out/charts-data.json').then(function (data) {
        var el = document.getElementById('mini-' + slug);
        if (!el || !data || !data.hit_distribution) return;
        window.ChartRenderer.renderHitDistribution(el, data.hit_distribution);
        var svg = el.querySelector('svg');
        if (svg) svg.setAttribute('viewBox', '0 0 420 130');
      });
    });
  }

  async function render() {
    var host = document.querySelector('[data-ranking-cards]');
    if (!host || host.querySelector('.v8rank-card')) return;
    var rows = await buildRows();
    if (!rows.length) {
      host.innerHTML = '<div class="cc-home-empty">Nessun algoritmo attivo con ranking disponibile.</div>';
      return;
    }
    var podium = rows.slice(0, 3).map(function (row, idx) {
      var pos = idx + 1;
      var slot = pos === 1 ? 'cc-ranking-podium__slot cc-ranking-podium__slot--first' : (pos === 2 ? 'cc-ranking-podium__slot cc-ranking-podium__slot--second' : 'cc-ranking-podium__slot cc-ranking-podium__slot--third');
      return '<article class="' + slot + '">' + cardHtml(row, pos, true) + '</article>';
    }).join('');
    var others = rows.slice(3).map(function (row, idx) {
      return cardHtml(row, idx + 4, false);
    }).join('');

    host.classList.remove('cc-ranking-cards-grid');
    host.classList.add('cc-ranking-cards-host');
    host.innerHTML = ''
      + '<div class="cc-ranking-layout">'
      + '<section class="v8rank-podium-wrap"><h3 class="v8rank-section-title">Podio algoritmi</h3><div class="v8rank-podium">' + podium + '</div></section>'
      + '<section class="v8rank-list-wrap"><h3 class="v8rank-section-title">Tutti gli altri algoritmi</h3><div class="v8rank-grid">' + others + '</div></section>'
      + '</div>';
    wireFilters(host);
    injectMiniCharts(host);
    if (window.CARDS && typeof window.CARDS.enableDepth === 'function') window.CARDS.enableDepth(host);
  }

  function boot() {
    if (booted) return;
    booted = true;
    render().catch(function () {
      var host = document.querySelector('[data-ranking-cards]');
      if (host) host.innerHTML = '<div class="cc-home-empty">Impossibile caricare il ranking algoritmi.</div>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
  window.addEventListener('pageshow', boot, { passive: true });
  window.CC_V8_RANKING_CATALOG = { render: render };
})();
