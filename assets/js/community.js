(() => {
  const FEED_PATH = 'data/community-feed.json';
  const ADMIN_EMAIL = 'giga.labor2026@gmail.com';
  const MAIL_SUBJECT = '[SECC][AUTO][COMMUNITY-ADMIN] Nuovo invio utente';
  const FORM_ENDPOINT_AJAX = 'https://formsubmit.co/ajax/';
  const FORM_ENDPOINT_FORM = 'https://formsubmit.co/';

  const resolveWithBase = (path) => {
    const value = String(path || '').trim();
    if (!value) return value;
    if (value.startsWith('#') || /^https?:\/\//i.test(value) || value.startsWith('file:')) return value;
    const base = window.CC_BASE?.url;
    if (!base) {
      if (value.startsWith('/')) return value;
      if (/^(pages|data|assets|img|archives)\//i.test(value)) return `../../${value}`;
      return value;
    }
    const trimmed = value.startsWith('/') ? value.slice(1) : value.replace(/^\.\//, '');
    return new URL(trimmed, base).toString();
  };

  const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const formatNumber = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '--';
    return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  const formatDateTime = (value) => {
    const date = new Date(String(value || ''));
    if (!Number.isFinite(date.getTime())) return '--';
    return new Intl.DateTimeFormat('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const parseIntSafe = (value, fallback = 0) => {
    const n = Number.parseInt(String(value ?? ''), 10);
    return Number.isFinite(n) ? n : fallback;
  };

  const mountPulse = (feed) => {
    const onlineNode = document.querySelector('[data-community-online]');
    const actionsNode = document.querySelector('[data-community-actions]');
    const signalsNode = document.querySelector('[data-community-signals]');
    const noteNode = document.querySelector('[data-community-pulse-note]');
    if (!onlineNode && !actionsNode && !signalsNode && !noteNode) return;

    const payload = feed && typeof feed === 'object' ? feed : null;
    const pulse = payload && payload.pulse && typeof payload.pulse === 'object' ? payload.pulse : {};
    const online = parseIntSafe(pulse.online_users, 0);
    const actions24 = parseIntSafe(pulse.actions_24h, Array.isArray(payload?.activities) ? payload.activities.length : 0);
    const signalsToday = parseIntSafe(pulse.signals_today, Array.isArray(payload?.highlights) ? payload.highlights.length : 0);
    const demoMode = Boolean(payload?.demo_mode);

    if (onlineNode) onlineNode.textContent = String(online);
    if (actionsNode) actionsNode.textContent = String(actions24);
    if (signalsNode) signalsNode.textContent = String(signalsToday);
    if (noteNode) {
      if (payload && demoMode) {
        noteNode.textContent = 'Modalita demo dichiarata: in attesa dei primi segnali reali della community.';
      } else if (payload) {
        noteNode.textContent = 'Dati reali community aggiornati da feed statico.';
      } else {
        noteNode.textContent = 'Nessun feed disponibile: contatori impostati su fallback minimo.';
      }
    }
  };

  const mountHighlights = (feed) => {
    const host = document.querySelector('[data-community-highlights]');
    if (!host) return;
    const rows = Array.isArray(feed?.highlights) ? feed.highlights.slice(0, 4) : [];
    if (!rows.length) {
      host.innerHTML = '<li>Nessun utente ha ancora generato highlight operativi.</li>';
      return;
    }
    host.innerHTML = rows.map((row) => `<li>${escapeHtml(row)}</li>`).join('');
  };

  const mountLeaderboard = (feed) => {
    const body = document.querySelector('[data-community-leaderboard]');
    if (!body) return;
    const rows = Array.isArray(feed?.leaderboard) ? feed.leaderboard : [];
    if (!rows.length) {
      body.innerHTML = '<tr><td class="px-4 py-3 text-ash" colspan="5">Nessun utente ha ancora inviato risultati in classifica.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((row) => `
      <tr>
        <td class="px-4 py-3 text-ash">#${escapeHtml(String(row?.position ?? '--'))}</td>
        <td class="px-4 py-3 text-white">${escapeHtml(row?.alias || 'utente')}</td>
        <td class="px-4 py-3 text-white">${escapeHtml(formatNumber(row?.score))}</td>
        <td class="px-4 py-3 text-ash">${escapeHtml(String(row?.streak ?? '--'))}</td>
        <td class="px-4 py-3 text-ash">${escapeHtml(row?.favorite_algorithm || '--')}</td>
      </tr>
    `).join('');
  };

  const mountActivities = (feed) => {
    const body = document.querySelector('[data-community-activities]');
    if (!body) return;
    const rows = Array.isArray(feed?.activities) ? feed.activities : [];
    if (!rows.length) {
      body.innerHTML = '<li class="text-ash">Nessun utente ha ancora inviato attivita recenti.</li>';
      return;
    }
    body.innerHTML = rows.slice(0, 10).map((row) => `
      <li class="rounded-xl border border-white/10 bg-midnight/60 px-3 py-3 text-sm">
        <p class="text-ash">${escapeHtml(formatDateTime(row?.ts))}</p>
        <p class="text-white"><strong>${escapeHtml(row?.alias || 'utente')}</strong> ${escapeHtml(row?.action || 'azione')}</p>
        <p class="text-ash">${escapeHtml(row?.payload || '--')}</p>
      </li>
    `).join('');
  };

  const mountFailure = () => {
    const leaderboard = document.querySelector('[data-community-leaderboard]');
    const activities = document.querySelector('[data-community-activities]');
    const highlights = document.querySelector('[data-community-highlights]');
    if (leaderboard) leaderboard.innerHTML = '<tr><td class="px-4 py-3 text-ash" colspan="5">Nessun utente ha ancora inviato risultati in classifica.</td></tr>';
    if (activities) activities.innerHTML = '<li class="text-ash">Nessun utente ha ancora inviato attivita recenti.</li>';
    if (highlights) highlights.innerHTML = '<li>Nessun utente ha ancora generato highlight operativi.</li>';
    mountPulse(null);
  };

  const setFormStatus = (message, tone = 'muted') => {
    const node = document.querySelector('[data-community-form-status]');
    if (!node) return;
    node.textContent = message;
    node.classList.remove('text-emerald-300', 'text-rose-300', 'text-ash');
    if (tone === 'ok') {
      node.classList.add('text-emerald-300');
      return;
    }
    if (tone === 'error') {
      node.classList.add('text-rose-300');
      return;
    }
    node.classList.add('text-ash');
  };

  const buildMailBody = (payload) => {
    const lines = [
      'Nuovo invio da form Admin Community SECC',
      '',
      `Sito: ${payload.site}`,
      `Sezione: ${payload.section}`,
      `URL sorgente: ${payload.url}`,
      `Timestamp UTC: ${payload.ts}`,
      `Alias: ${payload.alias || '--'}`,
      `Email utente: ${payload.userEmail || '--'}`,
      `Sestina proposta: ${payload.sestina || '--'}`,
      '',
      'Messaggio:',
      payload.message || '--',
      '',
      `User-Agent: ${payload.ua}`
    ];
    return lines.join('\n');
  };

  const extractDigits = (value) => (String(value || '').match(/\d+/g) || []);

  const normalizeSestina = (value) => {
    const digits = extractDigits(value).slice(0, 6).map((token) => {
      const n = Number.parseInt(token, 10);
      if (!Number.isFinite(n) || n < 1 || n > 90) return null;
      return String(n).padStart(2, '0');
    }).filter(Boolean);
    if (!digits.length) return '';
    return digits.join(' ');
  };

  const buildProviderPayload = (payload) => ({
      _subject: `${MAIL_SUBJECT} [${payload.section}]`,
      _template: 'table',
      _captcha: 'false',
      _honey: '',
      _autoresponse: '',
      _replyto: payload.userEmail || '',
      section: payload.section,
      site: payload.site,
      source_url: payload.url,
      submitted_at_utc: payload.ts,
      alias: payload.alias || '--',
      user_email: payload.userEmail || '--',
      sestina: payload.sestina || '--',
      message: payload.message || '--',
      user_agent: payload.ua || '--',
      context_dump: buildMailBody(payload)
    });

  const postAutomaticEmail = async (payload) => {
    const endpointAjax = `${FORM_ENDPOINT_AJAX}${encodeURIComponent(ADMIN_EMAIL)}`;
    const body = buildProviderPayload(payload);

    const response = await fetch(endpointAjax, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
    const json = await response.json().catch(() => ({}));
    if (json && json.success === 'false') {
      const reason = String(json.message || json.error || 'provider_error').trim();
      throw new Error(`provider_error:${reason}`);
    }
    return { mode: 'ajax', payload: json };
  };

  const postAutomaticEmailFallback = async (payload) => {
    const endpointForm = `${FORM_ENDPOINT_FORM}${encodeURIComponent(ADMIN_EMAIL)}`;
    const formData = new FormData();
    const body = buildProviderPayload(payload);
    Object.keys(body).forEach((key) => {
      formData.append(key, body[key]);
    });
    await fetch(endpointForm, {
      method: 'POST',
      mode: 'no-cors',
      body: formData
    });
    return { mode: 'form-no-cors' };
  };

  const postAutomaticEmailIframe = (payload) => new Promise((resolve, reject) => {
    try {
      const endpointForm = `${FORM_ENDPOINT_FORM}${encodeURIComponent(ADMIN_EMAIL)}`;
      const frameName = `cc-formsubmit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const iframe = document.createElement('iframe');
      iframe.name = frameName;
      iframe.style.display = 'none';
      iframe.setAttribute('aria-hidden', 'true');

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = endpointForm;
      form.target = frameName;
      form.style.display = 'none';

      const body = buildProviderPayload(payload);
      Object.keys(body).forEach((key) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(body[key] ?? '');
        form.appendChild(input);
      });

      document.body.appendChild(iframe);
      document.body.appendChild(form);

      let settled = false;
      const cleanup = () => {
        if (form.parentNode) form.parentNode.removeChild(form);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      };
      const settle = (result) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      const timeoutId = window.setTimeout(() => {
        settle({ mode: 'iframe-timeout' });
      }, 2500);

      iframe.addEventListener('load', () => {
        window.clearTimeout(timeoutId);
        settle({ mode: 'iframe-load' });
      }, { once: true });

      form.submit();
    } catch (error) {
      reject(error);
    }
  });

  const humanizeSendError = (error) => {
    const raw = String(error?.message || '').toLowerCase();
    if (raw.includes('confirm') || raw.includes('activation') || raw.includes('provider_error')) {
      return 'Invio bloccato dal provider: serve attivare il form destinatario.';
    }
    return 'Invio non riuscito. Verifica FormSubmit (attivazione indirizzo) e riprova.';
  };

  const initFeedbackForm = () => {
    const form = document.querySelector('[data-community-form]');
    if (!(form instanceof HTMLFormElement)) return;
    const submitButton = form.querySelector('button[type="submit"]');
    const withSubmitLock = (locked) => {
      if (!(submitButton instanceof HTMLButtonElement)) return;
      submitButton.disabled = locked;
      submitButton.classList.toggle('opacity-60', locked);
      submitButton.classList.toggle('pointer-events-none', locked);
    };

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const alias = String(form.querySelector('[name=\"alias\"]')?.value || '').trim();
      const userEmail = String(form.querySelector('[name=\"user_email\"]')?.value || '').trim();
      const sestinaRaw = String(form.querySelector('[name=\"sestina\"]')?.value || '').trim();
      const message = String(form.querySelector('[name=\"message\"]')?.value || '').trim();
      const section = String(form.querySelector('[name=\"section\"]')?.value || 'community-admin').trim();

      if (!message) {
        setFormStatus('Inserisci un messaggio prima dell\'invio.', 'error');
        return;
      }
      const sestina = normalizeSestina(sestinaRaw);
      if (sestinaRaw && !sestina) {
        setFormStatus('Sestina non valida: usa massimo 6 numeri tra 1 e 90.', 'error');
        return;
      }

      const payload = {
        site: 'superenalottocc.it',
        section,
        url: window.location.href,
        ts: new Date().toISOString(),
        alias,
        userEmail,
        sestina,
        message,
        ua: navigator.userAgent || '--'
      };

      withSubmitLock(true);
      setFormStatus('Invio automatico in corso...', 'muted');
      try {
        let result = null;
        try {
          result = await postAutomaticEmail(payload);
        } catch (_) {
          try {
            result = await postAutomaticEmailIframe(payload);
          } catch (iframeError) {
            result = await postAutomaticEmailFallback(payload);
            if (!result) throw iframeError;
          }
        }
        form.reset();
        if (result && (result.mode === 'form-no-cors' || result.mode === 'iframe-timeout' || result.mode === 'iframe-load')) {
          setFormStatus('Invio completato (modalita fallback): messaggio inoltrato ad admin.', 'ok');
        } else {
          setFormStatus('Invio completato: messaggio inoltrato ad admin.', 'ok');
        }
      } catch (error) {
        setFormStatus(humanizeSendError(error), 'error');
      } finally {
        withSubmitLock(false);
      }
    });
  };

  const applyDepth = () => {
    if (!window.CARDS || typeof window.CARDS.enableDepth !== 'function') return;
    const main = document.querySelector('main') || document;
    window.CARDS.enableDepth(main);
  };

  const load = async () => {
    initFeedbackForm();
    try {
      const response = await fetch(resolveWithBase(FEED_PATH), { cache: 'no-store' });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const feed = await response.json();
      mountHighlights(feed);
      mountLeaderboard(feed);
      mountActivities(feed);
      mountPulse(feed);
      applyDepth();
      setFormStatus('Invio disponibile: il messaggio sara inoltrato automaticamente ad admin.', 'muted');
    } catch (_) {
      mountFailure();
      setFormStatus('Feed non disponibile: il form invio resta attivo.', 'muted');
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { load().catch(() => {}); }, { once: true });
  } else {
    load().catch(() => {});
  }
})();
