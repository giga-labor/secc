(function () {
  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function pageId() { return (document.body && document.body.getAttribute("data-page-id")) || ""; }

  function relLabHref() {
    var id = pageId();
    if (id === "home") return "pages/laboratorio-tecnico/";
    return "/pages/laboratorio-tecnico/";
  }

  function render() {
    var root = qs(".content-box") || qs("main");
    if (!root) return;
    if (qs(".lab-referral", root)) return;
    if (pageId() === "laboratorio-tecnico") return;

    var box = document.createElement("aside");
    box.className = "lab-referral";
    box.innerHTML =
      "<p><strong>Versione easy mode:</strong> qui teniamo le cose leggere. " +
      "Se vuoi la versione nerd con formule, metodo e dettagli completi, vai al " +
      '<a href="' + relLabHref() + '">Laboratorio Tecnico</a>.</p>';

    var anchor = qs(":scope > header", root) || root.firstElementChild;
    if (anchor && anchor.nextSibling) root.insertBefore(box, anchor.nextSibling);
    else root.appendChild(box);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();
