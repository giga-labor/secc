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
  page: document.querySelector('[data-draws-page]')
};

let rows = [];
let filtered = [];
let headers = [];
let dateIndex = -1;
let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
  if (!elements.body) return;
  loadDraws();
});

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
}

function applyFilter(term) {
  const normalized = term.toLowerCase();
  filtered = rows.filter((row) => row.join(' ').toLowerCase().includes(normalized));
  currentPage = 1;
  renderTable();
}

function renderTable() {
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);
  if (!pageRows.length) {
    elements.body.innerHTML = `<tr><td class="px-4 py-6 text-ash" colspan="${elements.header.children.length || 4}">Nessun record trovato.</td></tr>`;
  } else {
    elements.body.innerHTML = pageRows
      .map((row) => `<tr>${row.map((cell) => `<td class="px-4 py-3 text-ash">${cell}</td>`).join('')}</tr>`)
      .join('');
  }
  updatePagination();
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
    applyFilter(event.target.value);
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
}
