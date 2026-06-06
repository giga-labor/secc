(() => {
  if (window.V8_BRIDGE) return;

  let _bundle = null;

  function detectDelimiter(line) {
    const semi = (line.match(/;/g) || []).length;
    const comma = (line.match(/,/g) || []).length;
    if (semi === 0 && comma === 0) return ',';
    return semi >= comma ? ';' : ',';
  }

  function parseCsv(raw) {
    const lines = String(raw || '')
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0 && !line.startsWith('#'));

    if (!lines.length) return [];

    const delimiter = detectDelimiter(lines[0]);
    const body = lines.slice(1);
    const out = [];

    for (const line of body) {
      const cells = line.split(delimiter).map((cell) => cell.trim());
      if (cells.length < 8) continue;

      const id = Number.parseInt(cells[0], 10);
      const date = cells[1];
      const nums = cells.slice(2, 8).map((n) => Number.parseInt(n, 10));

      if (!Number.isFinite(id) || nums.some((n) => !Number.isFinite(n))) continue;

      out.push({ id, date, nums });
    }

    return out;
  }

  function computeHot(draws, n = 30) {
    const list = Array.isArray(draws) ? draws : [];
    if (!list.length) return [];

    const recent = list.slice(Math.max(0, list.length - n));
    const freq = new Array(91).fill(0);

    for (const row of recent) {
      const nums = Array.isArray(row?.nums) ? row.nums : [];
      for (const num of nums) {
        if (Number.isInteger(num) && num >= 1 && num <= 90) freq[num] += 1;
      }
    }

    return Array.from({ length: 90 }, (_, i) => i + 1)
      .sort((a, b) => (freq[b] - freq[a]) || (a - b))
      .slice(0, 8);
  }

  function computeCold(draws, n = 50) {
    const list = Array.isArray(draws) ? draws : [];
    if (!list.length) return [];

    const recent = list.slice(Math.max(0, list.length - n));
    const recentSet = new Set();

    for (const row of recent) {
      const nums = Array.isArray(row?.nums) ? row.nums : [];
      for (const num of nums) {
        if (Number.isInteger(num) && num >= 1 && num <= 90) recentSet.add(num);
      }
    }

    const allNums = Array.from({ length: 90 }, (_, i) => i + 1);
    const absent = allNums.filter((num) => !recentSet.has(num));
    const lastSeen = new Array(91).fill(-1);
    const freqRecent = new Array(91).fill(0);

    for (let i = 0; i < list.length; i += 1) {
      const nums = Array.isArray(list[i]?.nums) ? list[i].nums : [];
      for (const num of nums) {
        if (Number.isInteger(num) && num >= 1 && num <= 90) lastSeen[num] = i;
      }
    }

    for (const row of recent) {
      const nums = Array.isArray(row?.nums) ? row.nums : [];
      for (const num of nums) {
        if (Number.isInteger(num) && num >= 1 && num <= 90) freqRecent[num] += 1;
      }
    }

    const cold = absent
      .slice()
      .sort((a, b) => {
        const la = lastSeen[a];
        const lb = lastSeen[b];
        return (la - lb) || (a - b);
      });

    if (cold.length >= 8) return cold.slice(0, 8);

    const needed = 8 - cold.length;
    const extras = allNums
      .filter((num) => !cold.includes(num))
      .sort((a, b) => (freqRecent[a] - freqRecent[b]) || (a - b))
      .slice(0, needed);

    return cold.concat(extras);
  }

  function normalizePrecomputedStats(stats) {
    const src = stats && typeof stats === 'object' ? stats : {};
    const out = {};
    for (const [key, value] of Object.entries(src)) {
      const s = value && typeof value === 'object' ? value : {};
      out[key] = {
        delay: s.delay,
        f90: s.f90,
        f180: s.f180,
        fFull: s.fFull ?? s.f_full,
        lastDate: s.lastDate ?? s.last_date,
        lastId: s.lastId ?? s.last_seq,
        avgEvery: s.avgEvery ?? s.avg_every,
      };
    }
    return out;
  }

  async function load() {
    if (_bundle) return _bundle;

    const repo = window.CC_DATA_REPOSITORY;
    if (!repo || typeof repo.resolveWithBase !== 'function' || typeof repo.loadCardsByManifest !== 'function') {
      _bundle = {
        lastDraw: null,
        hotNums: [],
        coldNums: [],
        draws: [],
        cards: []
      };
      return _bundle;
    }

    const manifestPath = 'data/modules-manifest.json';
    const manifestUrl = repo.resolveWithBase(manifestPath);

    // ── FAST PATH: numeri-stats.json + home-summary.json in parallelo ──
    // Evita di scaricare e parsare il CSV completo (4000+ righe)
    const statsUrl = repo.resolveWithBase('data/numeri-stats.json');
    const summaryUrl = repo.resolveWithBase('data/precomputed/home-summary.json');

    const [preStatsRaw, homeSummaryRaw] = await Promise.allSettled([
      fetch(statsUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch(summaryUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    const preStats = (preStatsRaw.status === 'fulfilled' &&
      preStatsRaw.value?.stats &&
      Number.isFinite(preStatsRaw.value?.total_draws) &&
      preStatsRaw.value.total_draws > 0)
      ? preStatsRaw.value
      : null;

    const homeSummary = (homeSummaryRaw.status === 'fulfilled' &&
      homeSummaryRaw.value &&
      typeof homeSummaryRaw.value === 'object')
      ? homeSummaryRaw.value
      : null;

    // Cards sempre necessarie per il panel algoritmi
    const cardsResult = await repo.loadCardsByManifest(manifestUrl)
      .then((cards) => ({ ok: true, value: Array.isArray(cards) ? cards : [] }))
      .catch(() => ({ ok: false, value: [] }));

    const cards = cardsResult.ok
      ? cardsResult.value.filter((card) => card && card.isActive === true)
      : [];

    if (preStats) {
      // Usa i dati pre-calcolati — nessun CSV scaricato
      const ld = preStats.last_draw || null;
      _bundle = {
        lastDraw: ld ? { id: ld.seq, date: ld.date, nums: ld.nums, jolly: null } : null,
        hotNums: preStats.hot_nums || [],
        coldNums: preStats.cold_nums || [],
        draws: [],          // non necessario: stats già pre-calcolate
        cards,
        numStats: normalizePrecomputedStats(preStats.stats),       // per tooltip bolle
        totalDraws: preStats.total_draws || 0,
        statsUpdatedAt: preStats.updated_at || '',
        homeSummary,        // consensus_top, ranking_top, oracle
      };
      return _bundle;
    }

    // ── FALLBACK: CSV completo (se numeri-stats.json non ancora disponibile) ──
    const csvUrl = repo.resolveWithBase('archives/draws/draws.csv');
    const csvResult = await fetch(csvUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`csv_fetch_failed:${res.status}`);
        return res.text();
      })
      .then((raw) => ({ ok: true, value: parseCsv(raw) }))
      .catch(() => ({ ok: false, value: [] }));

    const draws = csvResult.ok ? csvResult.value : [];
    const lastRow = draws.length ? draws[draws.length - 1] : null;

    _bundle = {
      lastDraw: lastRow
        ? { id: lastRow.id, date: lastRow.date, nums: lastRow.nums, jolly: null }
        : null,
      hotNums: computeHot(draws),
      coldNums: computeCold(draws),
      draws,
      cards,
      numStats: {},
      totalDraws: draws.length,
      statsUpdatedAt: '',
      homeSummary,          // consensus_top, ranking_top, oracle
    };

    return _bundle;
  }

  async function loadSestine(cards) {
    const list = Array.isArray(cards) ? cards : [];
    if (!list.length || !window.CC_DATA_REPOSITORY) return [];

    const results = await Promise.all(
      list.map(async (card) => {
        // Costruisce il base path assicurandosi che sia una directory (trailing slash)
        // e che punti a una pagina algoritmo (contiene 'algs/')
        let base = card.page || (`pages/algoritmi/algs/${card.id}/`);
        // Se page punta a un file .html, risali alla directory
        base = base.replace(/[^/]+\.html?$/i, '');
        if (!base.endsWith('/')) base += '/';
        // Salta card non-algoritmo (non hanno out/historical-db.csv)
        if (!base.includes('algs/') && !base.includes('algoritmi/algs')) return null;
        const url = window.CC_DATA_REPOSITORY.resolveWithBase(`${base}out/historical-db.csv`);
        try {
          const res = await fetch(url);
          if (!res.ok) return null;
          const raw = await res.text();
          const lines = raw.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
          if (lines.length < 2) return null;
          const last = lines[lines.length - 1].split(',');
          if (last.length < 8) return null;
          const nums = last.slice(2, 8)
            .map((n) => Number.parseInt(n.replace(/[\[\]]/g, ''), 10))
            .filter((n) => n >= 1 && n <= 90);
          if (nums.length !== 6) return null;
          const date = last[1] ? last[1].trim() : '--';
          return { id: card.id, title: card.title || card.id, group: card.macroGroup || '', nums, date };
        } catch (_) {
          return null;
        }
      })
    );
    return results.filter(Boolean);
  }

  window.V8_BRIDGE = { load, computeHot, computeCold, loadSestine };
})();
