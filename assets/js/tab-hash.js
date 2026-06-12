// tab-hash.js — Deep link via URL hash per pagine con [data-tabs-root]
// Legge il hash all'init, attiva il tab corrispondente.
// Scrive il hash all'URL ad ogni cambio tab (history.replaceState).
// Compatibile con qualsiasi pagina che usa il pattern data-tab-target / data-tab-panel.

(function () {
  'use strict';

  function applyHashToTabs() {
    var hash = String(window.location.hash || '').replace('#', '').trim();
    if (!hash) return;
    var roots = Array.from(document.querySelectorAll('[data-tabs-root]'));
    roots.forEach(function (root) {
      // Cerca prima corrispondenza esatta, poi parziale
      var btn = root.querySelector('[data-tab-target="' + hash + '"]');
      if (btn) {
        btn.click();
        return;
      }
      // Fallback: il hash potrebbe essere l'id del panel (es. #lab-metriche)
      var byId = root.querySelector('[data-tab-panel="' + hash + '"]');
      if (byId) {
        var target = byId.dataset.tabPanel;
        var matchBtn = root.querySelector('[data-tab-target="' + target + '"]');
        if (matchBtn) matchBtn.click();
      }
    });
  }

  function attachHashWriting() {
    var roots = Array.from(document.querySelectorAll('[data-tabs-root]'));
    roots.forEach(function (root) {
      if (root.dataset.tabHashReady === '1') return;
      root.dataset.tabHashReady = '1';
      var buttons = Array.from(root.querySelectorAll('[data-tab-target]'));
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.dataset.tabTarget;
          if (key) {
            try { history.replaceState(null, '', '#' + key); } catch (e) {}
          }
        });
      });
    });
  }

  function init() {
    attachHashWriting();
    applyHashToTabs();
    // Gestisci anche navigazione browser (back/forward)
    window.addEventListener('hashchange', applyHashToTabs, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    // Aspetta un tick per permettere ad altri script (algorithm-sheet-view, motion)
    // di inizializzare i tab prima che tab-hash.js cerchi di attivare quello giusto
    setTimeout(init, 80);
  }
})();
