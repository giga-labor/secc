/**
 * chart-renderer.js  — SVG chart renderer per SECC
 * Nessuna dipendenza esterna. Legge out/charts-data.json e disegna:
 *   - Bar chart verticale  (hit distribution 0-6)
 *   - Bar chart orizzontale (number frequency 1-90)
 *   - Line chart (hit timeline per finestre da 100)
 *
 * API pubblica:
 *   ChartRenderer.renderHitDistribution(container, data)
 *   ChartRenderer.renderNumberFrequency(container, data)
 *   ChartRenderer.renderHitTimeline(container, data)
 *   ChartRenderer.loadAndRender(slug, rootPath, container)
 *
 * Il parametro `container` è un HTMLElement in cui l'SVG viene iniettato.
 */

(function (global) {
  'use strict';

  /* ── palette ─────────────────────────────────────────── */
  const C = {
    bg:       'transparent',
    grid:     'rgba(255,255,255,0.07)',
    axis:     'rgba(255,255,255,0.25)',
    label:    'rgba(255,255,255,0.55)',
    value:    'rgba(255,255,255,0.85)',
    bar:      '#3b7cf4',
    barHit:   '#f4923b',
    line:     '#3bf4a8',
    lineFill: 'rgba(59,244,168,0.12)',
    dot:      '#3bf4a8',
    font:     '"DM Mono", "Fira Mono", monospace',
    fontSize: 11,
  };

  /* ── SVG helpers ─────────────────────────────────────── */
  function _svg(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    return el;
  }

  function _text(x, y, content, extra) {
    const t = _svg('text', Object.assign({
      x, y,
      'font-family': C.font,
      'font-size': C.fontSize,
      fill: C.label,
      'text-anchor': 'middle',
      'dominant-baseline': 'auto',
    }, extra || {}));
    t.textContent = content;
    return t;
  }

  function _rect(x, y, w, h, fill, rx) {
    return _svg('rect', { x, y, width: w < 0 ? 0 : w, height: h < 0 ? 0 : h, fill, rx: rx || 3 });
  }

  function _line(x1, y1, x2, y2, stroke, sw) {
    return _svg('line', { x1, y1, x2, y2, stroke, 'stroke-width': sw || 1 });
  }

  function _makeSVG(w, h) {
    return _svg('svg', {
      viewBox: `0 0 ${w} ${h}`,
      width: '100%',
      style: 'display:block;max-width:100%;overflow:visible',
      role: 'img',
    });
  }

  function _empty(container, msg) {
    container.innerHTML = `<p style="color:rgba(255,255,255,0.35);font-size:12px;text-align:center;padding:16px 0;">${msg}</p>`;
  }

  /* ── abbrevia label ───────────────────────────────────── */
  function _fmt(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  /* ── 1. Hit Distribution (bar verticale) ─────────────── */
  function renderHitDistribution(container, data) {
    if (!data || !data.values) { _empty(container, 'Dati hit distribution non disponibili'); return; }
    const rawLabels = data.labels || ['0','1','2','3','4','5','6'];
    const rawValues = data.values;
    // Escludi colonna 0 (nessun punto, non significativa per il punteggio)
    const zeroIdx = rawLabels.indexOf('0');
    const labels = zeroIdx >= 0 ? rawLabels.filter((_, i) => i !== zeroIdx) : rawLabels;
    const values = zeroIdx >= 0 ? rawValues.filter((_, i) => i !== zeroIdx) : rawValues;
    const n = labels.length;
    const W = 420, H = 180;
    const PAD = { top: 20, right: 16, bottom: 36, left: 40 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const barW = Math.floor(chartW / n * 0.65);
    const gap  = chartW / n;
    const maxV = Math.max(...values, 1);

    const svg = _makeSVG(W, H);
    svg.setAttribute('aria-label', 'Distribuzione hit per sestina');

    // griglia
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const y = PAD.top + chartH - (i / ticks) * chartH;
      svg.appendChild(_line(PAD.left, y, PAD.left + chartW, y, C.grid));
      const v = Math.round(maxV * i / ticks);
      svg.appendChild(_text(PAD.left - 6, y, _fmt(v), { 'text-anchor': 'end', fill: C.label, 'dominant-baseline': 'middle' }));
    }

    // barre + label
    values.forEach((v, i) => {
      const barH = (v / maxV) * chartH;
      const x = PAD.left + i * gap + (gap - barW) / 2;
      const y = PAD.top + chartH - barH;
      // labels[0] = '1', labels[1] = '2', … → colore hit da indice 1 (hit ≥ 2)
      const fill = i >= 1 ? C.barHit : C.bar;
      svg.appendChild(_rect(x, y, barW, barH, fill));
      // valore sopra
      if (v > 0) {
        svg.appendChild(_text(x + barW / 2, y - 4, _fmt(v), { fill: C.value, 'font-size': 10 }));
      }
      // label sotto
      svg.appendChild(_text(x + barW / 2, PAD.top + chartH + 14, labels[i], { fill: C.label }));
    });

    // asse X
    svg.appendChild(_line(PAD.left, PAD.top + chartH, PAD.left + chartW, PAD.top + chartH, C.axis));
    // titolo asse
    svg.appendChild(_text(W / 2, H - 4, 'Numero di hit per sestina', { fill: C.label, 'font-size': 10 }));

    container.innerHTML = '';
    container.appendChild(svg);
  }

  /* ── 2. Number Frequency (bar orizzontale) ───────────── */
  function renderNumberFrequency(container, data) {
    if (!data || !data.values) { _empty(container, 'Dati frequenza numeri non disponibili'); return; }
    const values = data.values;  // 90 valori
    const n = values.length;
    const W = 700, H = 140;
    const PAD = { top: 16, right: 12, bottom: 28, left: 36 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const barW = Math.max(1, Math.floor(chartW / n * 0.8));
    const gap  = chartW / n;
    const maxV = Math.max(...values, 1);
    const avgV = values.reduce((a, b) => a + b, 0) / n;

    const svg = _makeSVG(W, H);
    svg.setAttribute('aria-label', 'Frequenza numeri 1-90 nelle proposte');

    // media reference line
    const avgY = PAD.top + chartH - (avgV / maxV) * chartH;
    svg.appendChild(_line(PAD.left, avgY, PAD.left + chartW, avgY,
      'rgba(255,200,80,0.4)', 1));

    // barre
    values.forEach((v, i) => {
      const barH = (v / maxV) * chartH;
      const x = PAD.left + i * gap + (gap - barW) / 2;
      const y = PAD.top + chartH - barH;
      const pct = v / maxV;
      // colore: dal blu base a arancio caldo per i numeri più frequenti
      const r = Math.round(59  + (245 - 59)  * pct);
      const g = Math.round(124 + (146 - 124) * pct);
      const b = Math.round(244 + (59  - 244) * pct);
      svg.appendChild(_rect(x, y, barW, barH, `rgb(${r},${g},${b})`));
    });

    // label numeri: ogni 10
    for (let i = 0; i < n; i += 10) {
      const x = PAD.left + i * gap + gap / 2;
      svg.appendChild(_text(x, PAD.top + chartH + 14, String(i + 1), { fill: C.label, 'font-size': 10 }));
    }
    // asse X
    svg.appendChild(_line(PAD.left, PAD.top + chartH, PAD.left + chartW, PAD.top + chartH, C.axis));

    // scala Y
    for (let i = 0; i <= 2; i++) {
      const y = PAD.top + chartH - (i / 2) * chartH;
      const v = Math.round(maxV * i / 2);
      svg.appendChild(_text(PAD.left - 4, y, _fmt(v), { 'text-anchor': 'end', fill: C.label, 'dominant-baseline': 'middle', 'font-size': 10 }));
    }

    svg.appendChild(_text(W / 2, H - 2, 'Numeri 1-90', { fill: C.label, 'font-size': 10 }));

    container.innerHTML = '';
    container.appendChild(svg);
  }

  /* ── 3. Hit Timeline (line chart) ────────────────────── */
  function renderHitTimeline(container, data) {
    if (!data || !data.windows || !data.windows.length) { _empty(container, 'Dati timeline non disponibili'); return; }
    const windows = data.windows;
    const n = windows.length;
    if (n < 2) { _empty(container, 'Dati insufficienti per la timeline'); return; }

    const W = 560, H = 160;
    const PAD = { top: 20, right: 16, bottom: 36, left: 44 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    const avgs = windows.map(w => w.avg_hits);
    const maxV = Math.max(...avgs, 0.5);
    const toX = i => PAD.left + (i / (n - 1)) * chartW;
    const toY = v => PAD.top + chartH - (v / maxV) * chartH;

    const svg = _makeSVG(W, H);
    svg.setAttribute('aria-label', 'Andamento media hit per finestre da 100 concorsi');

    // griglia
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const y = PAD.top + chartH - (i / ticks) * chartH;
      svg.appendChild(_line(PAD.left, y, PAD.left + chartW, y, C.grid));
      const v = (maxV * i / ticks).toFixed(2);
      svg.appendChild(_text(PAD.left - 4, y, v, { 'text-anchor': 'end', fill: C.label, 'dominant-baseline': 'middle', 'font-size': 10 }));
    }

    // area fill
    const pts = avgs.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
    const areaD = `M${toX(0)},${toY(avgs[0])} ` +
      avgs.map((v, i) => `L${toX(i)},${toY(v)}`).join(' ') +
      ` L${toX(n-1)},${PAD.top+chartH} L${toX(0)},${PAD.top+chartH} Z`;
    const area = _svg('path', { d: areaD, fill: C.lineFill });
    svg.appendChild(area);

    // linea
    const lineD = `M${toX(0)},${toY(avgs[0])} ` + avgs.map((v, i) => `L${toX(i)},${toY(v)}`).join(' ');
    const linePoly = _svg('path', { d: lineD, fill: 'none', stroke: C.line, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    svg.appendChild(linePoly);

    // dot ogni 5 finestre (o tutti se <=10)
    const step = n > 10 ? 5 : 1;
    avgs.forEach((v, i) => {
      if (i % step !== 0 && i !== n - 1) return;
      svg.appendChild(_svg('circle', { cx: toX(i), cy: toY(v), r: 3, fill: C.dot }));
    });

    // label X: prima, metà, ultima
    const labelIdx = [0, Math.floor(n / 2), n - 1];
    labelIdx.forEach(i => {
      const w = windows[i];
      svg.appendChild(_text(toX(i), PAD.top + chartH + 14, w.label, { fill: C.label, 'font-size': 9 }));
    });

    // asse X
    svg.appendChild(_line(PAD.left, PAD.top + chartH, PAD.left + chartW, PAD.top + chartH, C.axis));

    svg.appendChild(_text(W / 2, H - 2, 'Finestre da 100 concorsi · media hit/sestina', { fill: C.label, 'font-size': 10 }));

    container.innerHTML = '';
    container.appendChild(svg);
  }

  /* ── 4. Loader da charts-data.json ───────────────────── */
  /**
   * loadAndRender(slug, rootPath, containers)
   *
   * @param {string}  slug       - id algoritmo (es. "classic-frequency")
   * @param {string}  rootPath   - percorso relativo alla root della pagina
   *                               (es. "../../../../")
   * @param {object}  containers - { hitDist?, numFreq?, timeline? } HTMLElement
   */
  function loadAndRender(slug, rootPath, containers) {
    const url = `${rootPath}pages/algoritmi/algs/${slug}/out/charts-data.json`;
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (containers.hitDist)  renderHitDistribution(containers.hitDist, data.hit_distribution);
        if (containers.numFreq)  renderNumberFrequency(containers.numFreq, data.number_frequency);
        if (containers.timeline) renderHitTimeline(containers.timeline, data.hit_timeline);
      })
      .catch(err => {
        const msg = `<p style="color:rgba(255,255,255,0.3);font-size:11px;text-align:center;padding:8px 0">
          Grafici non disponibili (${err.message})</p>`;
        [containers.hitDist, containers.numFreq, containers.timeline]
          .filter(Boolean)
          .forEach(el => { el.innerHTML = msg; });
      });
  }

  /* ── export ──────────────────────────────────────────── */
  global.ChartRenderer = { renderHitDistribution, renderNumberFrequency, renderHitTimeline, loadAndRender };

})(window);
