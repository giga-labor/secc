const drawsPath = '../../archives/draws/draws.csv';
const pageSize = 25;

const elements = {
  count: document.querySelector('[data-draws-count]'),
  first: document.querySelector('[data-draws-first]'),
  last: document.querySelector('[data-draws-last]'),
  header: document.querySelector('[data-draws-header]'),
  body: document.querySelector('[data-draws-body]'),
  search: document.querySelector('[data-draws-search]'),
  status: document.querySelector('[data-draws-status]'),
  prev: document.querySelector('[data-draws-prev]'),
  next: document.querySelector('[data-draws-next]'),
  page: document.querySelector('[data-draws-page]'),
  scrollShell: document.querySelector('[data-draws-scroll-shell]'),
  scroll: document.querySelector('[data-draws-scroll]'),
  scrollbar: document.querySelector('[data-draws-scrollbar]'),
  scrollbarInner: document.querySelector('[data-draws-scrollbar-inner]')
};

let rows = [];
let filtered = [];
let headers = [];
let dateIndex = -1;
let drawNumberIndexes = [];
let currentPage = 1;
let searchTimer = null;
let syncingScroll = false;
let drawsMounted = false;

document.addEventListener('DOMContentLoaded', () => {
  if (shouldUseRuntimeDirector()) return;
  mountDrawsPage();
});

function shouldUseRuntimeDirector() {
  return Boolean(window.CC_PAGE_ORCHESTRATOR && document.body?.dataset?.pageId === 'storico');
}

function mountDrawsPage() {
  if (drawsMounted) return;
  drawsMounted = true;
  if (!elements.body) return;
  loadDraws();
}

async function loadDraws() {
  try {
    if (window.location.protocol === 'file:') {
      showUnavailable('Apri la pagina con start-server.bat (http://localhost:8000).');
      return;
    }
    const response = await fetch(drawsPath);
    if (!response.ok) {
      throw new Error('file non trovato');
    }
    const raw = await response.text();
    const parsed = parseCsv(raw);
    rows = parsed.rows;
    headers = parsed.headers;
    dateIndex = findDateIndex(headers);
    drawNumberIndexes = findDrawNumberIndexes(headers);
    sortRowsByDateDesc();
    renderHeader(headers);
    applyFilter('');
    attachEvents();
    updateSummary();
    const hint = document.querySelector('[data-draws-hint]');
    if (hint) {
      hint.textContent = '';
    }
  } catch (error) {
    showUnavailable('Archivio non disponibile. Verifica che il file sia stato caricato.');
  }
}

function showUnavailable(message) {
  if (elements.body) {
    elements.body.innerHTML = `<tr><td class="px-4 py-6 text-ash" colspan="4">${message}</td></tr>`;
  }
  if (elements.status) {
    elements.status.textContent = 'Archivio non disponibile';
  }
  if (elements.count) elements.count.textContent = '???';
  if (elements.first) elements.first.textContent = '???';
  if (elements.last) elements.last.textContent = '???';
  updateHorizontalScrollControls();
}
function detectDelimiter(line) {
  const semi = (line.match(/;/g) || []).length;
  const comma = (line.match(/,/g) || []).length;
  if (semi === 0 && comma === 0) return ',';
  return semi >= comma ? ';' : ',';
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0 && !line.startsWith('#'));
  if (!lines.length) {
    return { headers: ['Data', 'Concorso', 'Numeri', 'Jolly/SuperStar'], rows: [] };
  }
  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map((cell) => cell.trim());
  const body = lines.slice(1).map((line) => line.split(delimiter).map((cell) => cell.trim()));
  return { headers, rows: body };
}

function findDateIndex(headersList) {
  const idx = headersList.findIndex((header) => header.toLowerCase().includes('data'));
  return idx === -1 ? 0 : idx;
}

function findDrawNumberIndexes(headersList) {
  const indexes = [];
  headersList.forEach((header, index) => {
    const normalized = String(header || '').trim().toLowerCase();
    if (/^n\d+$/.test(normalized) || normalized.includes('jolly') || normalized.includes('superstar')) {
      indexes.push(index);
    }
  });
  return indexes;
}

function sortRowsByDateDesc() {
  if (dateIndex < 0) return;
  rows.sort((a, b) => {
    const dateA = parseItalianDate(a[dateIndex]);
    const dateB = parseItalianDate(b[dateIndex]);
    return dateB - dateA;
  });
}

function parseItalianDate(value) {
  if (!value) return 0;
  const parts = value.split('/');
  if (parts.length !== 3) return 0;
  const [day, month, year] = parts.map((part) => parseInt(part, 10));
  return new Date(year, month - 1, day).getTime();
}

function renderHeader(headers) {
  const headerRow = headers
    .map((name) => {
      const normalized = String(name || '').toLowerCase();
      const label = normalized.includes('sequenziale') ? 'NR. SEQ' : name;
      return `<th class="px-4 py-3">${label}</th>`;
    })
    .join('');
  elements.header.innerHTML = headerRow;
  updateHorizontalScrollControls();
}

function applyFilter(term) {
  const normalized = String(term || '').trim().toLowerCase();
  if (!normalized) {
    filtered = rows;
    currentPage = 1;
    renderTable();
    return;
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const numericTokens = tokens.filter((token) => /^\d+$/.test(token)).map(normalizeNumericToken);
  const textTokens = tokens.filter((token) => !/^\d+$/.test(token));

  filtered = rows.filter((row) => {
    const rowText = row.join(' ').toLowerCase();
    const textMatch = textTokens.every((token) => rowText.includes(token));
    if (!textMatch) return false;
    if (!numericTokens.length) return true;

    const rowNumbers = getRowNumberSet(row);
    return numericTokens.every((token) => rowNumbers.has(token));
  });
  currentPage = 1;
  renderTable();
}

function normalizeNumericToken(token) {
  return String(parseInt(token, 10));
}

function getRowNumberSet(row) {
  const numberCells = drawNumberIndexes.length
    ? drawNumberIndexes.map((index) => row[index])
    : row;
  const rowNumbers = numberCells.join(' ').match(/\d+/g) || [];
  return new Set(rowNumbers.map(normalizeNumericToken));
}

function renderTable() {
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  if (!pageRows.length) {
    elements.body.innerHTML = `<tr><td class="px-4 py-6 text-ash" colspan="${elements.header.children.length || 4}">Nessun record trovato.</td></tr>`;
  } else {
    elements.body.innerHTML = pageRows
      .map((row) => `<tr>${row.map((cell) => `<td class="px-4 py-3 text-ash">${escapeHtml(cell)}</td>`).join('')}</tr>`)
      .join('');
  }
  updatePagination();
  updateHorizontalScrollControls();
}

function updatePagination() {
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  elements.page.textContent = `Pagina ${currentPage} / ${totalPages}`;
  elements.status.textContent = `${filtered.length} record`;
  elements.prev.disabled = currentPage === 1;
  elements.next.disabled = currentPage === totalPages;
}

function updateSummary() {
  if (!rows.length) {
    elements.count.textContent = '0';
    elements.first.textContent = '—';
    elements.last.textContent = '—';
    return;
  }
  elements.count.textContent = rows.length.toLocaleString('it-IT');
  const dates = rows.map((row) => row[dateIndex]).filter(Boolean);
  elements.first.textContent = dates[dates.length - 1] || '—';
  elements.last.textContent = dates[0] || '—';
  const statusTag = document.querySelector('[data-draws-status-tag]');
  if (statusTag) {
    statusTag.textContent = 'Archivio attivo';
    statusTag.classList.remove('border-neon', 'text-neon');
    statusTag.classList.add('border-emerald-400', 'text-emerald-300');
  }
}

function attachEvents() {
  elements.search.addEventListener('input', (event) => {
    window.clearTimeout(searchTimer);
    const value = event.target.value;
    searchTimer = window.setTimeout(() => applyFilter(value), 120);
  });
  elements.prev.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage -= 1;
      renderTable();
    }
  });
  elements.next.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (currentPage < totalPages) {
      currentPage += 1;
      renderTable();
    }
  });
  if (elements.scroll) {
    elements.scroll.addEventListener('scroll', () => {
      syncFromTableScroll();
      updateHorizontalScrollControls();
    }, { passive: true });
  }
  if (elements.scrollbar) {
    elements.scrollbar.addEventListener('scroll', () => {
      syncFromFixedBarScroll();
      updateHorizontalScrollControls();
    }, { passive: true });
  }
  window.addEventListener('resize', updateHorizontalScrollControls, { passive: true });
  window.addEventListener('orientationchange', updateHorizontalScrollControls, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateHorizontalScrollControls, { passive: true });
  }
  if ('ResizeObserver' in window && elements.scroll) {
    const observer = new ResizeObserver(() => updateHorizontalScrollControls());
    observer.observe(elements.scroll);
  }
}

function syncFromTableScroll() {
  if (syncingScroll || !elements.scroll || !elements.scrollbar) return;
  syncingScroll = true;
  elements.scrollbar.scrollLeft = elements.scroll.scrollLeft;
  syncingScroll = false;
}

function syncFromFixedBarScroll() {
  if (syncingScroll || !elements.scroll || !elements.scrollbar) return;
  syncingScroll = true;
  elements.scroll.scrollLeft = elements.scrollbar.scrollLeft;
  syncingScroll = false;
}

function updateHorizontalScrollControls() {
  if (!elements.scroll || !elements.scrollbar || !elements.scrollbarInner) return;

  const maxScroll = Math.max(0, elements.scroll.scrollWidth - elements.scroll.clientWidth);
  const hasOverflow = maxScroll > 4;

  if (elements.scrollShell) {
    elements.scrollShell.classList.toggle('has-scroll-controls', hasOverflow);
  }
  elements.scrollbar.hidden = !hasOverflow;
  if (!hasOverflow) return;
  elements.scrollbarInner.style.width = `${elements.scroll.scrollWidth}px`;
  syncFromTableScroll();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.CC_DRAWS_RUNTIME = {
  mount: mountDrawsPage,
  loadDraws
};
