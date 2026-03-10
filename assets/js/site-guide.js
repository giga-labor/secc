(function () {
  var body = document.body;
  if (!body) return;

  var pageId = body.getAttribute("data-page-id") || "home";
  var seenKey = "secc_tip_seen_v2";
  var autoHideMs = 8500;
  var openDelayMs = 1400;
  var activeTarget = null;
  var hideTimer = null;

  var tipsByPage = {
    home: [
      { id: "h-last", tone: "tone-gold", title: "Ultimo concorso", text: "Apri subito lo storico per vedere l'ultima estrazione aggiornata.", target: "a[href*='storico-estrazioni']", href: "pages/storico-estrazioni/", cta: "Vai ora" },
      { id: "h-news", tone: "tone-emerald", title: "Nuovi algoritmi", text: "Controlla i moduli inseriti di recente e i percorsi spotlight.", target: "a[href*='algoritmi']", href: "pages/algoritmi/", cta: "Apri algoritmi" },
      { id: "h-rank", tone: "tone-violet", title: "Classifica rapida", text: "Consulta ranking per una sintesi veloce dei moduli piu solidi.", target: "a[href*='ranking']", href: "pages/ranking/", cta: "Apri ranking" }
    ],
    "storico": [
      { id: "s-search", tone: "tone-gold", title: "Filtro immediato", text: "Usa il campo ricerca per data, concorso o numeri.", target: "[data-draws-search]", cta: "Evidenzia" },
      { id: "s-archive", tone: "tone-emerald", title: "Tab Archivio", text: "Passa alla tab Archivio per vedere l'elenco completo.", target: "[data-tab-target='archivio']", cta: "Apri tab" },
      { id: "s-bridge", tone: "tone-violet", title: "Contesto statistico", text: "Dopo la ricerca vai su Analisi per leggere il dato nel giusto contesto.", href: "../laboratorio-tecnico/", cta: "Vai al Laboratorio" }
    ],
    analisi: [
      { id: "a-freq", tone: "tone-gold", title: "Sezione piu vista", text: "Apri Frequenze: e il punto piu richiesto dagli utenti.", target: "[data-tab-target='frequenze']", cta: "Apri" },
      { id: "a-delay", tone: "tone-emerald", title: "Ritardi", text: "Controlla ritardi dopo frequenze, non prima.", target: "[data-tab-target='ritardi']", cta: "Apri" },
      { id: "a-back", tone: "tone-violet", title: "Verifica dati", text: "Rientra in Archivio per validare subito quello che hai letto.", href: "../storico-estrazioni/", cta: "Apri archivio" }
    ],
    algoritmi: [
      { id: "g-spot", tone: "tone-gold", title: "Spotlight", text: "Inizia da Spotlight per un percorso semplificato e veloce.", href: "./spotlight/statistici/", cta: "Apri spotlight" },
      { id: "g-search", tone: "tone-emerald", title: "Cerca modulo", text: "Trova subito il modulo per nome o categoria.", target: "[data-alg-search-input]", cta: "Evidenzia" },
      { id: "g-compare", tone: "tone-violet", title: "Confronto", text: "Conferma sempre in Analisi prima di scendere nel paper tecnico.", href: "../laboratorio-tecnico/", cta: "Vai al Laboratorio" }
    ],
    ranking: [
      { id: "r-table", tone: "tone-gold", title: "Lettura veloce", text: "Parti dalla tabella ranking e poi apri i dettagli dei moduli top.", target: "[data-ranking-body]", cta: "Evidenzia" },
      { id: "r-analisi", tone: "tone-emerald", title: "Doppia verifica", text: "Il ranking va sempre letto insieme ad Laboratorio Tecnico.", href: "../laboratorio-tecnico/", cta: "Apri Laboratorio" },
      { id: "r-archive", tone: "tone-violet", title: "Controllo storico", text: "Convalida i segnali nel dataset delle estrazioni.", href: "../storico-estrazioni/", cta: "Apri Storico" }
    ],
    oracle: [
      { id: "o-context", tone: "tone-gold", title: "Tip contestuale", text: "Oracle e visuale: conferma sempre i segnali sulle pagine dati.", href: "../laboratorio-tecnico/", cta: "Vai al Laboratorio" }
    ],
    default: [
      { id: "d-home", tone: "tone-gold", title: "Percorso consigliato", text: "Parti da Home e segui i collegamenti principali.", href: "/#home", cta: "Vai Home" }
    ]
  };

  function readSeen() {
    try {
      var raw = localStorage.getItem(seenKey);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function writeSeen(map) {
    try {
      localStorage.setItem(seenKey, JSON.stringify(map || {}));
    } catch (_) {
      // ignore
    }
  }

  function markSeen(tipId) {
    if (!tipId) return;
    var seen = readSeen();
    var arr = Array.isArray(seen[pageId]) ? seen[pageId] : [];
    if (arr.indexOf(tipId) === -1) arr.push(tipId);
    seen[pageId] = arr;
    writeSeen(seen);
  }

  function unseenTips(list) {
    var seen = readSeen();
    var arr = Array.isArray(seen[pageId]) ? seen[pageId] : [];
    return list.filter(function (tip) { return arr.indexOf(tip.id) === -1; });
  }

  function abs(href) {
    if (!href) return "#";
    if (/^https?:\/\//i.test(href) || href.charAt(0) === "/") return href;
    try {
      return new URL(href, window.location.href).toString();
    } catch (_) {
      return href;
    }
  }

  function clearTarget() {
    if (activeTarget) activeTarget.classList.remove("site-tip-target");
    activeTarget = null;
  }

  function setTarget(selector) {
    clearTarget();
    if (!selector) return null;
    var node = document.querySelector(selector);
    if (!node) return null;
    node.classList.add("site-tip-target");
    activeTarget = node;
    return node;
  }

  var allTips = tipsByPage[pageId] || tipsByPage.default;
  var queue = unseenTips(allTips);
  if (!queue.length) return;

  var badge = document.createElement("button");
  badge.type = "button";
  badge.className = "site-tip-badge";
  badge.setAttribute("aria-label", "Apri tip guidata");
  badge.innerHTML = '<span class="site-tip-dot" aria-hidden="true"></span><span>Tips</span>';

  var box = document.createElement("section");
  box.className = "site-tip";
  box.setAttribute("aria-live", "polite");
  box.innerHTML =
    '<div class="site-tip__bar"></div>' +
    '<div class="site-tip__body">' +
      '<div class="site-tip__head">' +
        '<h3 class="site-tip__title" data-tip-title></h3>' +
        '<span class="site-tip__index" data-tip-index></span>' +
      '</div>' +
      '<p class="site-tip__text" data-tip-text></p>' +
      '<div class="site-tip__actions">' +
        '<button type="button" class="site-tip__btn" data-tip-prev>Prev</button>' +
        '<button type="button" class="site-tip__btn" data-tip-next>Prossimo</button>' +
        '<button type="button" class="site-tip__btn site-tip__btn--primary" data-tip-go>Vai</button>' +
        '<button type="button" class="site-tip__btn" data-tip-close>Chiudi</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(badge);
  document.body.appendChild(box);

  var nTitle = box.querySelector("[data-tip-title]");
  var nIndex = box.querySelector("[data-tip-index]");
  var nText = box.querySelector("[data-tip-text]");
  var bPrev = box.querySelector("[data-tip-prev]");
  var bNext = box.querySelector("[data-tip-next]");
  var bGo = box.querySelector("[data-tip-go]");
  var bClose = box.querySelector("[data-tip-close]");

  var idx = 0;
  var shownThisSession = {};

  function startAutoHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(function () {
      box.classList.remove("is-open");
      clearTarget();
    }, autoHideMs);
  }

  function showCurrent() {
    if (!queue.length) return;
    var tip = queue[idx];
    if (!tip) return;
    box.className = "site-tip " + (tip.tone || "");
    nTitle.textContent = tip.title || "Tip";
    nText.textContent = tip.text || "";
    nIndex.textContent = (idx + 1) + " / " + queue.length;
    box.classList.add("is-open");

    var targetNode = setTarget(tip.target);
    bGo.textContent = tip.cta || "Vai";
    bGo.disabled = !tip.href && !targetNode;

    markSeen(tip.id);
    shownThisSession[tip.id] = true;
    startAutoHide();
  }

  function next(dir) {
    if (!queue.length) return;
    var filtered = queue.filter(function (tip) { return !shownThisSession[tip.id]; });
    if (filtered.length) {
      queue = filtered;
      if (idx >= queue.length) idx = 0;
    }
    if (!queue.length) {
      box.classList.remove("is-open");
      clearTarget();
      badge.style.display = "none";
      return;
    }
    idx = (idx + dir + queue.length) % queue.length;
    showCurrent();
  }

  function goTip() {
    var tip = queue[idx];
    if (!tip) return;
    var targetNode = setTarget(tip.target);
    if (targetNode) {
      targetNode.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof targetNode.focus === "function") {
        try { targetNode.focus({ preventScroll: true }); } catch (_) {}
      }
      startAutoHide();
      return;
    }
    if (tip.href) {
      window.location.href = abs(tip.href);
    }
  }

  badge.addEventListener("click", function () {
    showCurrent();
  });

  bPrev.addEventListener("click", function () { next(-1); });
  bNext.addEventListener("click", function () { next(1); });
  bGo.addEventListener("click", goTip);
  bClose.addEventListener("click", function () {
    box.classList.remove("is-open");
    clearTarget();
    window.clearTimeout(hideTimer);
  });

  box.addEventListener("mouseenter", function () { window.clearTimeout(hideTimer); });
  box.addEventListener("mouseleave", function () { startAutoHide(); });

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      box.classList.remove("is-open");
      clearTarget();
      window.clearTimeout(hideTimer);
    }
    if (ev.key === "?" && !box.classList.contains("is-open")) {
      ev.preventDefault();
      showCurrent();
    }
  });

  window.setTimeout(function () {
    if (!queue.length) return;
    showCurrent();
  }, openDelayMs);
})();


