(function () {
document.addEventListener('DOMContentLoaded', () => {
      const RANKING_PAYOUTS = {
        0: 1.53,
        1: 3.36,
        2: 21.51,
        3: 326.72,
        4: 11906.95,
        5: 1235346.49,
        6: 622614630.0
      };
      const roots = Array.from(document.querySelectorAll('[data-tabs-root]'));
      roots.forEach((root) => {
        const buttons = Array.from(root.querySelectorAll('[data-tab-target]'));
        const panels = Array.from(root.querySelectorAll('[data-tab-panel]'));
        const shell = root.classList.contains('tabs-shell') ? root : root.closest('.tabs-shell');
        const sheet = shell ? shell.querySelector('.tabs-sheet') : null;
        const tabRow = shell ? shell.querySelector('.folder-tabs') : null;
        if (!shell || !sheet || !tabRow) return;
        const showPanelLabel = root.dataset.tabPanelLabel !== 'off';
        const getLabelByTarget = (target) => {
          const button = buttons.find((btn) => btn.dataset.tabTarget === target);
          return button ? button.textContent.trim() : '';
        };
        const ensurePanelLabels = () => {
          if (!showPanelLabel) {
            panels.forEach((panel) => {
              panel.querySelectorAll(':scope > [data-tab-active-label]').forEach((label) => label.remove());
            });
            return;
          }
          panels.forEach((panel) => {
            let label = panel.querySelector(':scope > [data-tab-active-label]');
            if (!label) {
              label = document.createElement('p');
              label.className = 'tab-active-label';
              label.dataset.tabActiveLabel = '';
              label.setAttribute('aria-live', 'polite');
              panel.prepend(label);
            }
            label.textContent = getLabelByTarget(panel.dataset.tabPanel);
          });
        };
        const updateNotch = () => {
          const activeBtn = buttons.find((btn) => btn.classList.contains('is-active')) || buttons[0];
          if (!activeBtn) return;
          const rowRect = tabRow.getBoundingClientRect();
          const btnRect = activeBtn.getBoundingClientRect();
          const firstBtnRect = buttons[0]?.getBoundingClientRect();
          const left = Math.max(0, btnRect.left - rowRect.left);
          const width = Math.max(0, btnRect.width);
          const isWrapped = Boolean(firstBtnRect) && rowRect.height > (firstBtnRect.height + 6);
          const isOverflowing = tabRow.scrollWidth > (tabRow.clientWidth + 4);
          shell.classList.toggle('is-compact-tabs', isWrapped || isOverflowing);
          shell.style.setProperty('--active-notch-left', `${left.toFixed(2)}px`);
          shell.style.setProperty('--active-notch-width', `${width.toFixed(2)}px`);
        };
        const activate = (target) => {
          buttons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tabTarget === target));
          panels.forEach((panel) => panel.classList.toggle('is-active', panel.dataset.tabPanel === target));
          updateNotch();
        };
        const refreshTabsLayout = () => window.requestAnimationFrame(updateNotch);
        buttons.forEach((btn) => {
          btn.addEventListener('click', () => activate(btn.dataset.tabTarget));
        });
        window.addEventListener('resize', refreshTabsLayout, { passive: true });
        window.addEventListener('orientationchange', refreshTabsLayout, { passive: true });
        window.addEventListener('pageshow', refreshTabsLayout, { passive: true });
        document.addEventListener('visibilitychange', refreshTabsLayout, { passive: true });
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', refreshTabsLayout, { passive: true });
        }
        if ('ResizeObserver' in window) {
          const observer = new ResizeObserver(() => refreshTabsLayout());
          observer.observe(shell);
          observer.observe(tabRow);
          root._tabsResizeObserver = observer;
        }
        ensurePanelLabels();
        refreshTabsLayout();
        window.setTimeout(refreshTabsLayout, 80);
        window.setTimeout(refreshTabsLayout, 220);
      });

      const historicalBody = document.querySelector('[data-historical-body]');
      const historicalPrev = document.querySelector('[data-historical-prev]');
      const historicalNext = document.querySelector('[data-historical-next]');
      const historicalPage = document.querySelector('[data-historical-page]');
      if (!historicalBody) return;

      const historicalState = {
        rows: [],
        page: 1,
        pageSize: 100
      };
      let latestMetricsRows = null;

      const updateHistoricalPager = () => {
        const totalPages = Math.max(1, Math.ceil(historicalState.rows.length / historicalState.pageSize));
        if (historicalPage) historicalPage.textContent = `Pagina ${historicalState.page} / ${totalPages}`;
        if (historicalPrev) historicalPrev.disabled = historicalState.page <= 1;
        if (historicalNext) historicalNext.disabled = historicalState.page >= totalPages;
      };

      const renderHistoricalRows = () => {
        const rows = historicalState.rows;
        if (!Array.isArray(rows) || rows.length === 0) {
          historicalBody.innerHTML = '<tr><td class="px-4 py-3 text-ash" colspan="2">Nessun dato storico disponibile.</td></tr>';
          updateHistoricalPager();
          return;
        }
        const start = (historicalState.page - 1) * historicalState.pageSize;
        const end = start + historicalState.pageSize;
        const pageRows = rows.slice(start, end);
        historicalBody.innerHTML = pageRows.map(({ draw, picks }) => {
          const picksHtml = picks.map((pick) => {
            const cls = pick.hit ? 'historical-pick is-hit' : 'historical-pick';
            return `<span class="${cls}">${pick.value}</span>`;
          }).join('');
          return `
            <tr>
              <td class="w-[1%] whitespace-nowrap px-2 py-3 pr-1 text-ash">#${draw}</td>
              <td class="px-2 py-3 pl-1">
                <div class="flex flex-wrap gap-2">${picksHtml}</div>
              </td>
            </tr>
          `;
        }).join('');
        updateHistoricalPager();
      };

      const parsePickTokens = (tokens) => {
        return tokens
          .filter(Boolean)
          .slice(0, 6)
          .map((token) => {
          const hit = token.startsWith('[') && token.endsWith(']');
          const numeric = token.replace(/[\[\]]/g, '');
          const value = /^\d+$/.test(numeric) ? numeric.padStart(2, '0') : numeric;
          return { value, hit };
        });
      };

      const parseArchive = (raw) => {
        const lines = String(raw || '')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith('#'));
        if (!lines.length) return [];

        const sample = lines[0];
        const semicolons = (sample.match(/;/g) || []).length;
        const commas = (sample.match(/,/g) || []).length;
        const delimiter = semicolons > commas ? ';' : ',';

        const rows = lines.map((line) => {
          const cells = line.split(delimiter).map((cell) => String(cell || '').trim());
          if (!cells.length) return null;

          const draw = cells[0];
          let picks = [];

          // draws.csv-like: NR. SEQUENZIALE,DATA,N1..N6
          if (cells.length >= 8) {
            picks = parsePickTokens(cells.slice(2, 8));
          } else if (cells.length >= 2) {
            // fallback legacy: concorso;sestina
            picks = parsePickTokens(cells[1].split(/\s+/).map((x) => x.trim()));
          }

          return { draw, picks };
        }).filter((row) => row && row.draw && row.picks.length > 0);

        // Skip header if present.
        return rows.filter((row) => !String(row.draw).toLowerCase().includes('nr. sequenziale') && String(row.draw).toLowerCase() !== 'concorso');
      };

      fetch('out/historical-db.csv', { cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error(`status ${res.status}`);
          return res.text();
        })
        .then((text) => {
          const orderedRows = parseArchive(text).sort((a, b) => {
            const aNum = Number.parseInt(String(a.draw), 10);
            const bNum = Number.parseInt(String(b.draw), 10);
            if (Number.isFinite(aNum) && Number.isFinite(bNum)) return bNum - aNum;
            return String(b.draw).localeCompare(String(a.draw));
          });
          historicalState.rows = orderedRows;
          historicalState.page = 1;
          renderHistoricalRows();
          if (Array.isArray(latestMetricsRows)) {
            applyMetricsSheet(latestMetricsRows);
          }
        })
        .catch(() => {
          historicalBody.innerHTML = '<tr><td class="px-4 py-3 text-ash" colspan="2">Archivio non disponibile o formato non valido.</td></tr>';
          updateHistoricalPager();
        });

      if (historicalPrev) {
        historicalPrev.addEventListener('click', () => {
          if (historicalState.page <= 1) return;
          historicalState.page -= 1;
          renderHistoricalRows();
        });
      }
      if (historicalNext) {
        historicalNext.addEventListener('click', () => {
          const totalPages = Math.max(1, Math.ceil(historicalState.rows.length / historicalState.pageSize));
          if (historicalState.page >= totalPages) return;
          historicalState.page += 1;
          renderHistoricalRows();
        });
      }

      const parseCsvRows = (raw) => {
        const cleanCell = (value) => {
          const v = String(value || '').trim();
          if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
            return v.slice(1, -1).replace(/""/g, '"').trim();
          }
          return v;
        };
        const lines = String(raw || '')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith('#'));
        if (!lines.length) return { headers: [], rows: [] };
        const header = lines[0].split(',').map((x) => cleanCell(x));
        const rows = lines.slice(1).map((line) => {
          const cells = line.split(',').map((x) => cleanCell(x));
          if (cells.length <= header.length) return cells;
          const merged = cells.slice(0, header.length - 1);
          merged.push(cleanCell(cells.slice(header.length - 1).join(',').trim()));
          return merged;
        });
        return { headers: header, rows };
      };

      const asList = (value) => String(value || '')
        .split('|')
        .map((x) => x.trim())
        .filter(Boolean);

      const formatRanking = (value) => {
        if (!Number.isFinite(value)) return 'N/D';
        return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
      };

      const exactHitsFromHistorical = () => {
        const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, total: 0 };
        (historicalState.rows || []).forEach((row) => {
          let hit = 0;
          (row.picks || []).forEach((pick) => {
            if (pick && pick.hit) hit += 1;
          });
          if (hit >= 0 && hit <= 6) {
            counts[hit] += 1;
            counts.total += 1;
          }
        });
        return counts;
      };

      const exactHitsFromMetrics = (rows) => {
        const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, total: 0 };
        let hasAny = false;
        rows.forEach((r) => {
          const metric = String(r[0] || '').trim().toLowerCase();
          const v = Number.parseInt(String(r[1] || '').replace(/[^\d-]/g, ''), 10);
          if (!Number.isFinite(v)) return;
          const m = metric.match(/^con\s+([0-6])\s+hit$/);
          if (!m) return;
          const k = Number.parseInt(m[1], 10);
          counts[k] = Math.max(0, v);
          hasAny = true;
        });
        if (!hasAny) return null;
        counts.total = counts[0] + counts[1] + counts[2] + counts[3] + counts[4] + counts[5] + counts[6];
        return counts;
      };

      const computeRanking = (rows) => {
        const fromMetrics = exactHitsFromMetrics(rows || []);
        const fromHistorical = exactHitsFromHistorical();
        if (!fromMetrics && (!fromHistorical || fromHistorical.total <= 0)) {
          return NaN;
        }
        const exact = fromMetrics || fromHistorical;
        let score = 0;
        for (let k = 0; k <= 6; k += 1) {
          score += (exact[k] || 0) * (RANKING_PAYOUTS[k] || 0);
        }
        return score;
      };

      const applyAlgorithmSheet = (rows) => {
        const map = new Map(rows.map((r) => [String(r[0] || '').trim().toUpperCase(), String(r[1] || '').trim()]));
        const introEl = document.querySelector('[data-algo-intro]');
        const scopeEl = document.querySelector('[data-algo-scope]');
        const outputEl = document.querySelector('[data-algo-output]');
        const inputEl = document.querySelector('[data-algo-input]');
        const methodEl = document.querySelector('[data-algo-method]');
        const limitsEl = document.querySelector('[data-algo-limits]');

        if (introEl) introEl.textContent = map.get('INTRO') || 'N/D';
        if (scopeEl) scopeEl.textContent = map.get('SCOPO') || 'N/D';
        if (outputEl) outputEl.textContent = map.get('OUTPUT') || 'N/D';

        const fillList = (el, values) => {
          if (!el) return;
          const list = asList(values);
          if (!list.length) {
            el.innerHTML = '<li>N/D</li>';
            return;
          }
          el.innerHTML = list.map((item) => `<li>${item}</li>`).join('');
        };

        fillList(inputEl, map.get('INPUT'));
        fillList(methodEl, map.get('METODO'));
        fillList(limitsEl, map.get('LIMITI'));
      };

      const applyMetricsSheet = (rows) => {
        const tbody = document.querySelector('[data-metrics-body]');
        if (!tbody) return;
        if (!rows.length) {
          tbody.innerHTML = '<tr><td class="px-4 py-3 text-ash" colspan="3">Nessuna metrica disponibile.</td></tr>';
          return;
        }

        const cards = new Map();
        document.querySelectorAll('[data-metric-card]').forEach((el) => {
          cards.set(String(el.getAttribute('data-metric-card') || '').trim().toLowerCase(), el);
        });
        const lastTrainedEl = document.querySelector('[data-last-trained]');
        const nextPickEl = document.querySelector('[data-next-pick]');

        let html = rows.map((r) => {
          const metric = String(r[0] || '').trim();
          const value = String(r[1] || '').trim();
          const note = String(r[2] || '').trim();
          const key = metric.toLowerCase();
          const cardEl = cards.get(key);
          if (cardEl) cardEl.textContent = value || 'N/D';
          if (key === 'ultimo concorso calcolato' && lastTrainedEl) {
            lastTrainedEl.textContent = value || 'N/D';
          }
          if (key === 'sestina proposta (prossimo concorso)' && nextPickEl) {
            nextPickEl.textContent = value || 'N/D';
          }
          return `<tr><td class="px-4 py-3 text-ash">${metric}</td><td class="px-4 py-3 text-white">${value || 'N/D'}</td><td class="px-4 py-3 text-ash">${note || '-'}</td></tr>`;
        }).join('');

        const hasRankingRow = rows.some((r) => String(r[0] || '').trim().toLowerCase() === 'ranking');
        if (!hasRankingRow) {
          const rankingValue = computeRanking(rows || []);
          html += `<tr><td class="px-4 py-3 text-ash">Ranking</td><td class="px-4 py-3 text-white">${formatRanking(rankingValue)}</td><td class="px-4 py-3 text-ash">Punteggio cumulato con tabella premi da hit esatti (0..6)</td></tr>`;
        }
        tbody.innerHTML = html;
      };

      const applyAnalysisText = (rawText) => {
        const textEl = document.querySelector('[data-analysis-text]');
        if (!textEl) return;
        const text = String(rawText || '').trim();
        if (!text) {
          textEl.textContent = 'Nessuna analisi disponibile.';
          return;
        }
        textEl.textContent = text;
      };

      fetch('out/algorithm-sheet.csv', { cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error(`status ${res.status}`);
          return res.text();
        })
        .then((text) => {
          const parsed = parseCsvRows(text);
          applyAlgorithmSheet(parsed.rows);
        })
        .catch(() => {
          const introEl = document.querySelector('[data-algo-intro]');
          if (introEl) introEl.textContent = 'Scheda algoritmo non disponibile.';
        });

      fetch('out/metrics-db.csv', { cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error(`status ${res.status}`);
          return res.text();
        })
        .then((text) => {
          const parsed = parseCsvRows(text);
          latestMetricsRows = parsed.rows;
          applyMetricsSheet(parsed.rows);
        })
        .catch(() => {
          const tbody = document.querySelector('[data-metrics-body]');
          if (tbody) {
            tbody.innerHTML = '<tr><td class="px-4 py-3 text-ash" colspan="3">Metriche non disponibili.</td></tr>';
          }
        });

      fetch('out/analysis.txt', { cache: 'no-store' })
        .then((res) => {
          if (!res.ok) throw new Error(`status ${res.status}`);
          return res.text();
        })
        .then((text) => {
          applyAnalysisText(text);
        })
        .catch(() => {
          const textEl = document.querySelector('[data-analysis-text]');
          if (textEl) {
            textEl.textContent = 'Analisi non disponibile.';
          }
        });
    });
})();

