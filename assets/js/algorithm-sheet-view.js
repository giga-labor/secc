(function () {
document.addEventListener('DOMContentLoaded', () => {
      const LAB_TECH_URL = '../../../laboratorio-tecnico/';
      if (document.body) document.body.dataset.pageKicker = 'off';
      const main = document.querySelector('main');
      if (main) main.dataset.pageKicker = 'off';
      document.querySelectorAll('header[data-page-kicker-wrap]').forEach((el) => el.remove());
      const GROUP_META = {
        statistici: {
          label: 'Statistici',
          href: '../../#group-statistici',
          toneClass: 'cc-card-tone-alg-stat',
          borderClass: 'border-[#8fceec]/60',
          titleClass: 'text-[#bfe8ff]',
          ctaClass: 'text-[#8fceec]',
          image: '../../spotlight/statistici/img.webp'
        },
        neurali: {
          label: 'Neurali',
          href: '../../#group-neurali',
          toneClass: 'cc-card-tone-alg-neural',
          borderClass: 'border-[#b7a2f4]/60',
          titleClass: 'text-[#ddd1ff]',
          ctaClass: 'text-[#b7a2f4]',
          image: '../../spotlight/neurali/img.webp'
        },
        ibridi: {
          label: 'Ibridi',
          href: '../../#group-ibridi',
          toneClass: 'cc-card-tone-alg-hybrid',
          borderClass: 'border-[#7ecba5]/60',
          titleClass: 'text-[#c9f2de]',
          ctaClass: 'text-[#7ecba5]',
          image: '../../spotlight/ibridi/img.webp'
        }
      };
      const resolveGroupKey = (raw) => {
        const key = String(raw || '').trim().toLowerCase();
        if (!key) return 'statistici';
        if (key.includes('neur')) return 'neurali';
        if (key.includes('ibrid') || key.includes('hybrid') || key.includes('custom')) return 'ibridi';
        return 'statistici';
      };
      const injectSheetNavCards = (groupKey) => {
        if (document.querySelector('[data-sheet-nav-cards="1"]')) return;
        const meta = GROUP_META[groupKey] || GROUP_META.statistici;
        const host = document.createElement('div');
        host.dataset.sheetNavCards = '1';
        host.className = 'ml-auto flex flex-nowrap items-start justify-end gap-2';
        host.style.position = 'fixed';
        host.style.top = 'calc(var(--fixed-header-offset, 88px) + 42px)';
        host.style.right = 'calc(var(--ad-reserve-right, 0px) + 8px)';
        host.style.zIndex = '2147481000';
        host.style.display = 'flex';
        host.style.flexWrap = 'nowrap';
        host.style.gap = '8px';
        host.style.pointerEvents = 'none';
        host.innerHTML = `
          <a class="cc-card cc-card3d card-3d cc-card-action cc-card-tone-menu group relative flex flex-col overflow-hidden rounded-2xl border border-white/15 transition hover:-translate-y-0.5 shrink-0" style="min-height:72px;width:114px;" href="../../" onclick="if (window.history.length > 1) { window.history.back(); return false; } return true;" aria-label="Torna indietro">
            <div class="cc-card-media cc-card-media-frame relative overflow-hidden" style="width:100%;aspect-ratio:15/8;min-height:0;max-height:none;">
              <img src="/img/algoritm.webp" alt="Navigazione algoritmi" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <div class="cc-card-body flex flex-1 flex-col items-center justify-center px-2 py-1.5 text-center">
              <span class="text-[10px] uppercase tracking-[0.16em] text-ash/90">Navigazione</span>
              <span class="mt-0.5 text-[10px] font-semibold text-white group-hover:text-neon">Torna indietro</span>
            </div>
          </a>
          <a class="cc-card cc-card3d card-3d cc-card-action ${meta.toneClass} group relative flex flex-col overflow-hidden rounded-2xl border ${meta.borderClass} transition hover:-translate-y-0.5 shrink-0" style="min-height:72px;width:114px;" href="${meta.href}" aria-label="Vai al gruppo ${meta.label.toLowerCase()}">
            <div class="cc-card-media cc-card-media-frame relative overflow-hidden" style="width:100%;aspect-ratio:15/8;min-height:0;max-height:none;">
              <img src="${meta.image}" alt="Algoritmi ${meta.label.toLowerCase()}" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:cover;">
            </div>
            <div class="cc-card-body flex flex-1 flex-col items-center justify-center px-2 py-1.5 text-center">
              <span class="text-[10px] uppercase tracking-[0.16em] ${meta.titleClass}">${meta.label}</span>
              <span class="mt-0.5 text-[10px] font-semibold ${meta.ctaClass}">Vai al gruppo</span>
            </div>
          </a>
        `;
        document.body.appendChild(host);
        if (window.CARDS && typeof window.CARDS.enableDepth === 'function') {
          window.CARDS.enableDepth(host);
        }
      };
      const ensureFixedSheetTitle = () => {
        const fixed = document.querySelector('[data-sheet-fixed-title="1"]');
        if (fixed) fixed.remove();
        if (document.body) document.body.removeAttribute('data-sheet-fixed-title-ready');
      };
      fetch('card.json', { cache: 'no-store' })
        .then((res) => (res.ok ? res.json() : null))
        .then((card) => {
          injectSheetNavCards(resolveGroupKey(card?.macroGroup));
          ensureFixedSheetTitle();
        })
        .catch(() => {
          injectSheetNavCards('statistici');
          ensureFixedSheetTitle();
        });

      if (!document.getElementById('cc-proposal-style')) {
        const proposalStyle = document.createElement('style');
        proposalStyle.id = 'cc-proposal-style';
        proposalStyle.textContent = `
          .historical-pick.is-proposal {
            border-color: rgba(123, 211, 255, 0.9);
            background:
              radial-gradient(circle at 28% 24%, rgba(255, 255, 255, 0.92) 0 20%, rgba(255, 255, 255, 0.14) 38%, rgba(255, 255, 255, 0) 54%),
              radial-gradient(circle at 52% 68%, rgba(165, 230, 255, 0.5) 0 34%, rgba(56, 189, 248, 0.34) 56%, rgba(9, 25, 45, 0.98) 100%);
            color: #eaf8ff;
            text-shadow: 0 0 6px rgba(125, 211, 252, 0.6);
            box-shadow:
              inset 0 2px 2px rgba(255, 255, 255, 0.62),
              inset 0 -8px 14px rgba(8, 12, 22, 0.62),
              0 3px 8px rgba(4, 8, 18, 0.58),
              0 0 12px rgba(56, 189, 248, 0.65);
            min-width: 2.18rem;
            height: 2.18rem;
            font-size: 0.9rem;
            transform: translateY(-1px) scale(1.06);
          }
        `;
        document.head.appendChild(proposalStyle);
      }
      if (!document.getElementById('cc-sheet-nav-style')) {
        const navStyle = document.createElement('style');
        navStyle.id = 'cc-sheet-nav-style';
        navStyle.textContent = `
          [data-sheet-nav-cards="1"] {
            position: fixed;
            top: calc(var(--fixed-header-offset, 88px) + 42px);
            right: calc(var(--ad-reserve-right, 0px) + 8px);
            z-index: 2147481000;
            display: flex;
            flex-wrap: nowrap;
            gap: 8px;
            pointer-events: none;
          }
          [data-sheet-nav-cards="1"] > a {
            pointer-events: auto;
          }
          @media (max-width: 1023px) {
            [data-sheet-nav-cards="1"] {
              right: 8px;
              top: calc(var(--fixed-header-offset, 84px) + 34px);
            }
          }
        `;
        document.head.appendChild(navStyle);
      }
      if (!document.getElementById('cc-sheet-title-pin-style')) {
        const titleStyle = document.createElement('style');
        titleStyle.id = 'cc-sheet-title-pin-style';
        titleStyle.textContent = `
          [data-tab-panel="algoritmo"] > section[data-adsense-quality] > :is(h1,h2,h3) {
            display: none !important;
          }
          [data-tab-panel="algoritmo"] > :is(h1,h2,h3) {
            display: none !important;
          }
          [data-tab-panel="algoritmo"] section > :is(h1,h2,h3) {
            display: none !important;
          }
          [data-tab-panel="algoritmo"] :is(h1,h2,h3) {
            display: none !important;
          }
          [data-tab-panel="algoritmo"] > section[data-adsense-quality] {
            padding-top: 4.4rem;
          }
          [data-sheet-fixed-title="1"] {
            position: fixed;
            top: calc(var(--fixed-header-offset, 88px) + 42px);
            left: 10px;
            z-index: 2147480900;
            display: inline-block !important;
            max-width: min(74vw, 960px);
            margin: 0;
            padding: 0;
            border: none;
            border-radius: 0;
            background: transparent;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            box-shadow: none;
            pointer-events: none;
            font-size: clamp(2rem, 3.3vw, 2.9rem) !important;
            line-height: 1.05 !important;
          }
          [data-sheet-fixed-title="1"]::after {
            content: none;
          }
        `;
        document.head.appendChild(titleStyle);
      }
      const RANKING_PAYOUTS = {
        0: 1.53,
        1: 3.36,
        2: 21.51,
        3: 326.72,
        4: 11906.95,
        5: 1235346.49,
        6: 622614630.0
      };

      const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      const roots = Array.from(document.querySelectorAll('[data-tabs-root]'));
      roots.forEach((root) => {
        const shell = root.classList.contains('tabs-shell') ? root : root.closest('.tabs-shell');
        const sheet = shell ? shell.querySelector('.tabs-sheet') : null;
        const tabRow = shell ? shell.querySelector('.folder-tabs') : null;
        const editorialSection = shell ? shell.querySelector(':scope > section[data-adsense-quality]') : null;
        if (!shell || !sheet || !tabRow) return;

        // Standard globale richiesto: Storica prima, Algoritmo+Analisi ultima.
        if (root.dataset.mergedAlgoAnalysis !== '1') {
          const algoritmoBtn = root.querySelector('[data-tab-target="algoritmo"]');
          const analisiBtn = root.querySelector('[data-tab-target="analisi"]');
          const storicaBtn = root.querySelector('[data-tab-target="storica"]');
          const metricheBtn = root.querySelector('[data-tab-target="metriche"]');
          const algoritmoPanel = root.querySelector('[data-tab-panel="algoritmo"]');
          const analisiPanel = root.querySelector('[data-tab-panel="analisi"]');
          const storicaPanel = root.querySelector('[data-tab-panel="storica"]');
          const metrichePanel = root.querySelector('[data-tab-panel="metriche"]');

          if (algoritmoBtn && analisiBtn && algoritmoPanel && analisiPanel) {
            const analysisIntro = analisiPanel.querySelector('[data-analysis-intro]');
            const analysisBox = analisiPanel.querySelector('.rounded-2xl');
            if (analysisIntro || analysisBox) {
              const mergeHost = document.createElement('section');
              mergeHost.className = 'mt-6 rounded-2xl border border-white/10 bg-midnight/50 px-4 py-3';
              mergeHost.innerHTML = '<h4 class="text-sm font-semibold text-white">Analisi sintetica</h4>';
              if (analysisIntro) {
                analysisIntro.classList.add('mt-2');
                mergeHost.appendChild(analysisIntro);
              }
              if (analysisBox) {
                analysisBox.classList.add('mt-3');
                mergeHost.appendChild(analysisBox);
              }
              algoritmoPanel.appendChild(mergeHost);
            }

            algoritmoBtn.textContent = 'Algoritmo + Analisi';
            analisiBtn.remove();
            analisiPanel.remove();
          }

          // Ordine finale tabs: Storica, Metriche, Algoritmo+Analisi
          [storicaBtn, metricheBtn, algoritmoBtn].forEach((btn) => {
            if (btn && btn.parentElement === tabRow) tabRow.appendChild(btn);
          });
          [storicaPanel, metrichePanel, algoritmoPanel].forEach((panel) => {
            if (panel && panel.parentElement === sheet) sheet.appendChild(panel);
          });
          root.dataset.mergedAlgoAnalysis = '1';
        }

        let buttons = Array.from(root.querySelectorAll('[data-tab-target]'));
        let panels = Array.from(root.querySelectorAll('[data-tab-panel]'));
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
          if (editorialSection) {
            const showEditorial = target === 'algoritmo';
            editorialSection.hidden = !showEditorial;
            editorialSection.classList.toggle('hidden', !showEditorial);
          }
          updateNotch();
          ensureFixedSheetTitle();
        };
        const tabsRuntimeId = root.dataset.tabsRuntimeId || `sheet-tabs-${Math.random().toString(36).slice(2, 8)}`;
        root.dataset.tabsRuntimeId = tabsRuntimeId;
        const refreshTabsLayout = () => window.requestAnimationFrame(() => {
          updateNotch();
          ensureFixedSheetTitle();
        });
        buttons.forEach((btn) => {
          btn.addEventListener('click', () => activate(btn.dataset.tabTarget));
        });
        if (window.CC_PERF && typeof window.CC_PERF.onResize === 'function') {
          window.CC_PERF.onResize(tabsRuntimeId, refreshTabsLayout);
        } else {
          window.addEventListener('resize', refreshTabsLayout, { passive: true });
        }
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
        const initialTarget =
          buttons.find((btn) => btn.dataset.tabTarget === 'storica')?.dataset.tabTarget ||
          (buttons.find((btn) => btn.classList.contains('is-active')) || buttons[0])?.dataset.tabTarget;
        if (initialTarget) activate(initialTarget);
        else refreshTabsLayout();
        window.setTimeout(refreshTabsLayout, 80);
        window.setTimeout(refreshTabsLayout, 220);
      });

      const historicalBody = document.querySelector('[data-historical-body]');
      const historicalPrev = document.querySelector('[data-historical-prev]');
      const historicalNext = document.querySelector('[data-historical-next]');
      const historicalPage = document.querySelector('[data-historical-page]');
      const rankingValueEl = document.querySelector('[data-ranking-value]');
      const rankingPositionEl = document.querySelector('[data-ranking-position]');
      if (!historicalBody) return;

      const historicalState = {
        rows: [],
        page: 1,
        pageSize: 100
      };
      let latestMetricsRows = null;
      let nextContestProposal = [];

      const normalizeInlineText = (value, maxLen = 240) => {
        const text = String(value || '').replace(/\s+/g, ' ').trim();
        if (!text) return '';
        if (text.length <= maxLen) return text;
        return `${text.slice(0, Math.max(0, maxLen - 1)).trimEnd()}...`;
      };

      const ensureLabCta = (host) => {
        if (!host) return;
        let cta = host.querySelector('[data-lab-cta]');
        if (!cta) {
          cta = document.createElement('a');
          cta.dataset.labCta = '1';
          cta.className = 'mt-4 inline-flex rounded-full border border-neon/70 bg-neon/10 px-4 py-2 text-sm font-semibold text-neon transition hover:-translate-y-1 hover:bg-neon/20';
          cta.target = '_self';
          host.appendChild(cta);
        }
        cta.href = LAB_TECH_URL;
        cta.textContent = 'Apri il Laboratorio tecnico completo';
      };

      const renderOperationalAlgorithmPanel = (summary = {}) => {
        const panel = document.querySelector('[data-tab-panel="algoritmo"]');
        const box = panel ? panel.querySelector('section[data-adsense-quality]') : null;
        if (!box) return;
        const intro = normalizeInlineText(summary.intro, 220) || 'Questa scheda mostra il funzionamento pratico del modulo in modo rapido.';
        const scope = normalizeInlineText(summary.scope, 220) || 'Usa la tab Storica e la tab Metrica per verificare andamento e coerenza nel tempo.';
        const output = normalizeInlineText(summary.output, 220) || 'La proposta resta comparativa: serve per orientarti, non per promettere esiti.';
        box.innerHTML = `
      <p class="mt-3 text-sm text-ash">${escapeHtml(intro)}</p>
      <p class="mt-3 text-sm text-ash">${escapeHtml(scope)}</p>
      <p class="mt-3 text-sm text-ash">${escapeHtml(output)}</p>
      <p class="mt-3 text-sm text-ash">La versione tecnica estesa, con note metodologiche complete, e centralizzata nel Laboratorio tecnico.</p>
    `;
        ensureFixedSheetTitle();
        ensureLabCta(box);
      };
      renderOperationalAlgorithmPanel();

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
        const historicalRowsHtml = pageRows.map(({ draw, picks }) => {
          const picksHtml = picks.map((pick) => {
            const cls = pick.hit ? 'historical-pick is-hit' : 'historical-pick';
            return `<span class="${cls}">${escapeHtml(String(pick.value ?? ''))}</span>`;
          }).join('');
          return `
            <tr>
              <td class="w-[1%] whitespace-nowrap px-2 py-3 pr-1 text-ash">#${escapeHtml(String(draw ?? ''))}</td>
              <td class="px-2 py-3 pl-1">
                <div class="flex flex-wrap gap-2">${picksHtml}</div>
              </td>
            </tr>
          `;
        }).join('');

        let proposalRowHtml = '';
        if (historicalState.page === 1 && Array.isArray(nextContestProposal) && nextContestProposal.length === 6) {
          const proposalBalls = nextContestProposal
            .map((value) => `<span class="historical-pick is-proposal">${escapeHtml(String(value ?? ''))}</span>`)
            .join('');
          proposalRowHtml = `
            <tr class="bg-neon/10">
              <td class="w-[1%] whitespace-nowrap px-2 py-3 pr-1 font-semibold text-neon">Proposta prossimo concorso</td>
              <td class="px-2 py-3 pl-1">
                <div class="flex flex-wrap gap-2">${proposalBalls}</div>
              </td>
            </tr>
          `;
        }

        historicalBody.innerHTML = `${proposalRowHtml}${historicalRowsHtml}`;
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
          setSummaryRanking(computeRanking([]));
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

      const parseNextContestProposal = (rawValue) => {
        const tokens = String(rawValue || '').match(/\d{1,2}/g) || [];
        return tokens.slice(0, 6).map((value) => value.padStart(2, '0'));
      };

      const asList = (value) => String(value || '')
        .split('|')
        .map((x) => x.trim())
        .filter(Boolean);

      const formatRanking = (value) => {
        if (!Number.isFinite(value)) return '--';
        return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
      };
      const setSummaryRanking = (value) => {
        if (rankingValueEl) rankingValueEl.textContent = formatRanking(value);
      };
      const setSummaryPosition = (value) => {
        if (rankingPositionEl) rankingPositionEl.textContent = value || '--';
      };
      const computeRankingFromCounts = (exact) => {
        if (!exact) return NaN;
        let score = 0;
        for (let k = 0; k <= 6; k += 1) {
          score += (exact[k] || 0) * (RANKING_PAYOUTS[k] || 0);
        }
        return score;
      };
      const computeRankingFromHistoricalRows = (rows) => {
        const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, total: 0 };
        (rows || []).forEach((row) => {
          let hit = 0;
          (row.picks || []).forEach((pick) => {
            if (pick && pick.hit) hit += 1;
          });
          if (hit >= 0 && hit <= 6) {
            counts[hit] += 1;
            counts.total += 1;
          }
        });
        if (!counts.total) return NaN;
        return computeRankingFromCounts(counts);
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
        if (fromHistorical && fromHistorical.total > 0) {
          return computeRankingFromCounts(fromHistorical);
        }
        if (!fromMetrics && (!fromHistorical || fromHistorical.total <= 0)) {
          return NaN;
        }
        return computeRankingFromCounts(fromMetrics || fromHistorical);
      };
      const resolveCurrentAlgorithmId = () => {
        const parts = String(window.location.pathname || '').split('/').filter(Boolean);
        const idx = parts.indexOf('algs');
        if (idx < 0 || idx + 1 >= parts.length) return '';
        return parts[idx + 1];
      };
      const normalizePagePath = (value) => {
        let page = String(value || '').trim();
        if (!page) return '';
        if (!page.startsWith('/')) page = `/${page}`;
        if (!page.endsWith('/')) page = `${page}/`;
        return page;
      };
      const computeGlobalRankingPosition = () => {
        const currentId = resolveCurrentAlgorithmId();
        if (!currentId) {
          setSummaryPosition('--');
          return;
        }
        fetch('../../../../data/modules-manifest.json', { cache: 'no-store' })
          .then((res) => {
            if (!res.ok) throw new Error(`status ${res.status}`);
            return res.json();
          })
          .then((manifest) => {
            const cardPaths = (Array.isArray(manifest) ? manifest : [])
              .map((path) => String(path || '').trim())
              .filter((path) => path.includes('pages/algoritmi/algs/') && path.endsWith('/card.json'));
            return Promise.all(cardPaths.map((path) => {
              const relative = path.startsWith('/') ? path.slice(1) : path;
              return fetch(`../../../../${relative}`, { cache: 'no-store' })
                .then((res) => (res.ok ? res.json() : null))
                .catch(() => null);
            }));
          })
          .then((cards) => {
            const activeCards = (cards || []).filter((card) => card && card.isActive === true && String(card.page || '').includes('pages/algoritmi/algs/'));
            const totalActive = activeCards.length;
            if (!totalActive) {
              setSummaryPosition('--');
              return;
            }
            return Promise.all(activeCards.map((card) => {
              const pagePath = normalizePagePath(card.page);
              if (!pagePath) return Promise.resolve({ id: String(card.id || ''), score: NaN });
              return fetch(`${pagePath}out/historical-db.csv`, { cache: 'no-store' })
                .then((res) => (res.ok ? res.text() : ''))
                .then((text) => ({ id: String(card.id || ''), score: computeRankingFromHistoricalRows(parseArchive(text)) }))
                .catch(() => ({ id: String(card.id || ''), score: NaN }));
            })).then((scores) => {
              const ranked = scores
                .filter((entry) => Number.isFinite(entry.score))
                .sort((a, b) => {
                  if (b.score !== a.score) return b.score - a.score;
                  return String(a.id).localeCompare(String(b.id));
                });
              const idx = ranked.findIndex((entry) => entry.id === currentId);
              if (idx >= 0) {
                setSummaryPosition(`${idx + 1}/${totalActive}`);
              } else {
                setSummaryPosition(`--/${totalActive}`);
              }
            });
          })
          .catch(() => {
            setSummaryPosition('--');
          });
      };

      const applyAlgorithmSheet = (rows) => {
        const map = new Map(rows.map((r) => [String(r[0] || '').trim().toUpperCase(), String(r[1] || '').trim()]));
        const introEl = document.querySelector('[data-algo-intro]');
        const scopeEl = document.querySelector('[data-algo-scope]');
        const outputEl = document.querySelector('[data-algo-output]');
        const inputEl = document.querySelector('[data-algo-input]');
        const methodEl = document.querySelector('[data-algo-method]');
        const limitsEl = document.querySelector('[data-algo-limits]');

        if (introEl) introEl.textContent = map.get('INTRO') || '--';
        if (scopeEl) scopeEl.textContent = map.get('SCOPO') || '--';
        if (outputEl) outputEl.textContent = map.get('OUTPUT') || '--';

        const fillList = (el, values) => {
          if (!el) return;
          const list = asList(values);
          if (!list.length) {
            el.innerHTML = '<li>--</li>';
            return;
          }
          el.innerHTML = list.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
        };

        fillList(inputEl, map.get('INPUT'));
        fillList(methodEl, map.get('METODO'));
        fillList(limitsEl, map.get('LIMITI'));
        renderOperationalAlgorithmPanel({
          intro: map.get('INTRO'),
          scope: map.get('SCOPO'),
          output: map.get('OUTPUT')
        });
      };

      const applyMetricsSheet = (rows) => {
        const tbody = document.querySelector('[data-metrics-body]');
        if (!tbody) return;
        if (!rows.length) {
          tbody.innerHTML = '<tr><td class="px-4 py-3 text-ash" colspan="3">Nessuna metrica disponibile.</td></tr>';
          setSummaryRanking(computeRanking([]));
          return;
        }

        const cards = new Map();
        document.querySelectorAll('[data-metric-card]').forEach((el) => {
          cards.set(String(el.getAttribute('data-metric-card') || '').trim().toLowerCase(), el);
        });
        const lastTrainedEl = document.querySelector('[data-last-trained]');
        const nextPickEl = document.querySelector('[data-next-pick]');

        let extractedProposal = [];
        let html = rows.map((r) => {
          const metric = String(r[0] || '').trim();
          const value = String(r[1] || '').trim();
          const note = String(r[2] || '').trim();
          const key = metric.toLowerCase();
          const cardEl = cards.get(key);
          if (cardEl) cardEl.textContent = value || '--';
          if (key === 'ultimo concorso calcolato' && lastTrainedEl) {
            lastTrainedEl.textContent = value || '--';
          }
          if (key === 'sestina proposta (prossimo concorso)' && nextPickEl) {
            nextPickEl.textContent = value || '--';
          }
          if (key.includes('sestina proposta')) {
            extractedProposal = parseNextContestProposal(value);
          }
          return `<tr><td class="px-4 py-3 text-ash">${escapeHtml(metric)}</td><td class="px-4 py-3 text-white">${escapeHtml(value) || '--'}</td><td class="px-4 py-3 text-ash">${escapeHtml(note) || '-'}</td></tr>`;
        }).join('');

        const hasRankingRow = rows.some((r) => String(r[0] || '').trim().toLowerCase() === 'ranking');
        let rankingValue = computeRanking(rows || []);
        if (!hasRankingRow) {
          html += `<tr><td class="px-4 py-3 text-ash">Ranking</td><td class="px-4 py-3 text-white">${formatRanking(rankingValue)}</td><td class="px-4 py-3 text-ash">Punteggio cumulato con tabella premi da hit esatti (0..6)</td></tr>`;
        } else {
          const rankingRow = rows.find((r) => String(r[0] || '').trim().toLowerCase() === 'ranking');
          const rawValue = String((rankingRow && rankingRow[1]) || '').replace(/\./g, '').replace(',', '.');
          const parsedValue = Number.parseFloat(rawValue);
          if (Number.isFinite(parsedValue)) rankingValue = parsedValue;
        }
        tbody.innerHTML = html;
        nextContestProposal = extractedProposal;
        if (historicalState.rows.length) {
          renderHistoricalRows();
        }
        setSummaryRanking(rankingValue);
      };

      const applyAnalysisText = (rawText) => {
        const textEl = document.querySelector('[data-analysis-text]');
        if (!textEl) return;
        const text = String(rawText || '').trim();
        if (!text) {
          textEl.textContent = 'Approfondimento completo disponibile nel Laboratorio tecnico.';
          ensureLabCta(textEl.closest('.rounded-2xl') || textEl.parentElement);
          return;
        }
        const preview = normalizeInlineText(text, 260);
        textEl.textContent = `${preview}\n\nPer la versione completa apri il Laboratorio tecnico, sezione moduli.`;
        ensureLabCta(textEl.closest('.rounded-2xl') || textEl.parentElement);
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
          renderOperationalAlgorithmPanel();
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
          setSummaryRanking(computeRanking([]));
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

      computeGlobalRankingPosition();
    });
})();
