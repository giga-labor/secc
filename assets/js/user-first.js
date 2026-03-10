(function () {
  function qs(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (typeof html === "string") n.innerHTML = html;
    return n;
  }

  function pageId() {
    return (document.body && document.body.getAttribute("data-page-id")) || "home";
  }

  function findMainContainer() {
    return qs(".content-box") || qs("main") || document.body;
  }

  function clickTab(target) {
    if (!target) return false;
    var btn = qs('[data-tab-target="' + target + '"]');
    if (!btn) return false;
    btn.click();
    btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    return true;
  }

  function buildCards(cfg) {
    var grid = el("div", "intent-hub__grid");
    var i;
    for (i = 0; i < cfg.cards.length; i += 1) {
      (function () {
        var c = cfg.cards[i];
        var node;
        if (c.action) {
          node = el("button", "intent-card intent-card--action", "<strong>" + c.t + "</strong><span>" + c.d + "</span>");
          node.type = "button";
          node.addEventListener("click", function () {
            if (c.action.type === "tab") clickTab(c.action.target);
            if (c.action.type === "selector") {
              var e = qs(c.action.target);
              if (e) {
                e.scrollIntoView({ block: "center", behavior: "smooth" });
                if (typeof e.focus === "function") e.focus();
              }
            }
          });
        } else {
          node = el("a", "intent-card", "<strong>" + c.t + "</strong><span>" + c.d + "</span>");
          node.href = c.href || "#";
        }
        grid.appendChild(node);
      })();
    }
    return grid;
  }

  function buildPath(cfg) {
    var wrap = el("div", "intent-path");
    var i;
    for (i = 0; i < cfg.path.length; i += 1) {
      wrap.appendChild(el("p", "intent-path__line", cfg.path[i]));
    }
    return wrap;
  }

  var configs = {
    home: {
      context: "Richieste piu frequenti",
      title: "Cosa vuoi fare adesso?",
      subtitle: "Dopo le news: percorso rapido con le voci piu cliccate.",
      chips: ["Ultimo concorso", "Numeri ritardatari", "Classifica moduli", "Lettura facile"],
      cards: [
        { t: "Vedere l'ultimo concorso", d: "Apri archivio con focus su dati recenti.", href: "pages/storico-estrazioni/" },
        { t: "Nuovi algoritmi inseriti", d: "Vai al catalogo aggiornato con spotlight.", href: "pages/algoritmi/" },
        { t: "Numeri frequenti e ritardatari", d: "Vai su Analisi e apri subito frequenze/ritardi.", href: "pages/laboratorio-tecnico/" },
        { t: "Moduli piu affidabili", d: "Consulta ranking comparativo aggiornato.", href: "pages/ranking/" },
        { t: "Archivio estrazioni completo", d: "Ricerca veloce per data, concorso e numeri.", href: "pages/storico-estrazioni/" }
      ],
      path: [
        "<b>Step 1</b> Ultimo concorso e verifica rapida in Archivio.",
        "<b>Step 2</b> Controlla i nuovi algoritmi e i moduli top.",
        "<b>Step 3</b> Confronta su Analisi prima di approfondire i paper."
      ]
    },
    "storico-estrazioni": {
      context: "Obiettivo rapido",
      title: "Vai subito al dato che cerchi",
      subtitle: "Usa filtro e riepilogo senza perdere tempo in sezioni secondarie.",
      chips: ["Ricerca veloce", "Ultimi concorsi", "Validazione dati"],
      cards: [
        { t: "Apri tab Archivio", d: "Passa subito alla tab con ricerca rapida.", action: { type: "tab", target: "archivio" } },
        { t: "Filtra per data o concorso", d: "Cursor nel campo ricerca e cerca.", action: { type: "selector", target: "[data-draws-search]" } },
        { t: "Confronta con Analisi", d: "Capisci il significato statistico del dato.", href: "../laboratorio-tecnico/" },
        { t: "Vedi i moduli correlati", d: "Apri catalogo algoritmi collegato.", href: "../algoritmi/" }
      ],
      path: [
        "<b>Step 1</b> Ricerca il concorso o la combinazione.",
        "<b>Step 2</b> Verifica frequenze/ritardi in Analisi.",
        "<b>Step 3</b> Usa Ranking per contestualizzare i moduli."
      ]
    },
    analisi: {
      context: "Lettura semplice",
      title: "Analisi senza sovraccarico tecnico",
      subtitle: "Parti dalle tab base, poi approfondisci solo quello che ti serve.",
      chips: ["Frequenze", "Ritardi", "Pattern", "Rischio"],
      cards: [
        { t: "Fondamenti", d: "Capisci il metodo in modo semplice.", action: { type: "tab", target: "fondamenti" } },
        { t: "Frequenze e ritardi", d: "Apri la vista piu richiesta dal pubblico.", action: { type: "tab", target: "frequenze" } },
        { t: "Vedi lo storico reale", d: "Confronta subito con le estrazioni.", href: "../storico-estrazioni/" },
        { t: "Controlla ranking", d: "Misura coerenza dei moduli attivi.", href: "../ranking/" }
      ],
      path: [
        "<b>Step 1</b> Leggi fondamenti e frequenze.",
        "<b>Step 2</b> Controlla i ritardi solo dopo il contesto.",
        "<b>Step 3</b> Valida tutto con Storico e Ranking."
      ]
    },
    algoritmi: {
      context: "Uso pratico",
      title: "Trova il modulo giusto senza confusione",
      subtitle: "Percorso guidato prima, paper completi solo se necessari.",
      chips: ["Scelta rapida", "Spotlight", "Paper on demand"],
      cards: [
        { t: "Spotlight consigliati", d: "Parti dai percorsi semplificati.", href: "./spotlight/statistici/" },
        { t: "Ricerca nel catalogo", d: "Trova modulo per nome o categoria.", action: { type: "selector", target: "[data-alg-search-input]" } },
        { t: "Apri dashboard analisi", d: "Confronto con dati statistici aggregati.", href: "../laboratorio-tecnico/" },
        { t: "Verifica storico", d: "Rientra al dataset estrazioni.", href: "../storico-estrazioni/" }
      ],
      path: [
        "<b>Step 1</b> Guarda Spotlight per orientarti.",
        "<b>Step 2</b> Seleziona pochi moduli ad alta coerenza.",
        "<b>Step 3</b> Apri paper completi solo sui candidati finali."
      ]
    },
    ranking: {
      context: "Decisione rapida",
      title: "Classifica utile, senza interpretazioni sbagliate",
      subtitle: "Leggi il ranking come confronto operativo tra moduli.",
      chips: ["Top moduli", "Confronto chiaro", "Sintesi rapida"],
      cards: [
        { t: "Controlla classifica attuale", d: "Rimani nella tab ranking principale.", action: { type: "tab", target: "ranking" } },
        { t: "Vai al Laboratorio", d: "Aggiungi contesto statistico ai numeri.", href: "../laboratorio-tecnico/" },
        { t: "Apri catalogo moduli", d: "Dettagli per ogni algoritmo.", href: "../algoritmi/" },
        { t: "Confronta con storico", d: "Valida sul dataset estrazioni.", href: "../storico-estrazioni/" }
      ],
      path: [
        "<b>Step 1</b> Leggi posizione e dettaglio hit.",
        "<b>Step 2</b> Verifica coerenza con Analisi.",
        "<b>Step 3</b> Controlla dati reali su Storico."
      ]
    },
    oracle: {
      context: "Esperienza visuale",
      title: "Oracle e orientamento dati",
      subtitle: "Sezione immersiva: usala insieme a pagine numeriche.",
      chips: ["Esperienza", "Supporto decisione", "Passaggio ai dati"],
      cards: [
        { t: "Torna Home operativa", d: "Riparti dal percorso principale.", href: "../../#home" },
        { t: "Apri Laboratorio", d: "Leggi frequenze e ritardi reali.", href: "../laboratorio-tecnico/" },
        { t: "Vai su Storico", d: "Controlla gli ultimi concorsi.", href: "../storico-estrazioni/" },
        { t: "Vedi Ranking", d: "Confronto moduli in classifica.", href: "../ranking/" }
      ],
      path: [
        "<b>Step 1</b> Esperienza Oracle.",
        "<b>Step 2</b> Convalida su Analisi/Storico.",
        "<b>Step 3</b> Usa Ranking per sintesi finale."
      ]
    },
    default: {
      context: "Navigazione guidata",
      title: "Percorso consigliato",
      subtitle: "Le azioni principali piu utili per orientarti nel sito.",
      chips: ["Orientamento", "Rapidita", "Chiarezza"],
      cards: [
        { t: "Home", d: "Panoramica e ingressi principali.", href: "/#home" },
        { t: "Storico", d: "Estratti e ricerca concorsi.", href: "/pages/storico-estrazioni/" },
        { t: "Analisi", d: "Frequenze, ritardi e pattern.", href: "/pages/laboratorio-tecnico/" },
        { t: "Algoritmi", d: "Catalogo moduli e paper.", href: "/pages/algoritmi/" }
      ],
      path: [
        "<b>Step 1</b> Parti dalla Home.",
        "<b>Step 2</b> Verifica dati in Storico.",
        "<b>Step 3</b> Completa con Analisi e Algoritmi."
      ]
    }
  };

  function render() {
    if (!document.body) return;
    if (qs(".intent-hub")) return;

    var id = pageId();
    var cfg = configs[id] || configs.default;
    var root = findMainContainer();
    if (!root) return;

    var hub = el("section", "intent-hub");
    hub.setAttribute("data-intent-hub", "1");
    hub.innerHTML =
      '<div class="intent-hub__head">' +
      '<div><h2 class="intent-hub__title">' + cfg.title + '</h2><p class="intent-hub__subtitle">' + cfg.subtitle + "</p></div>" +
      '<p class="intent-hub__context">' + cfg.context + "</p>" +
      "</div>";

    if (cfg.chips && cfg.chips.length) {
      var chips = el("div", "intent-hub__market");
      for (var i = 0; i < cfg.chips.length; i += 1) {
        chips.appendChild(el("span", "intent-chip", cfg.chips[i]));
      }
      hub.appendChild(chips);
    }

    hub.appendChild(buildCards(cfg));
    hub.appendChild(buildPath(cfg));

    root.appendChild(hub);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }
})();


