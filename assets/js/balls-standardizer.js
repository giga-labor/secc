(function () {
  function pageId() {
    return (document.body && document.body.getAttribute("data-page-id")) || "";
  }

  if (pageId() === "ranking") {
    return;
  }

  function normalizeNum(v) {
    var n = parseInt(String(v || "").replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n)) return "";
    return String(n).padStart(2, "0");
  }

  function parseToken(raw) {
    var t = String(raw || "").trim();
    if (!t) return null;
    var hit = false;
    if (t.startsWith("[") && t.endsWith("]")) {
      hit = true;
      t = t.slice(1, -1);
    }
    var n = normalizeNum(t);
    if (!n) return null;
    return { value: n, hit: hit };
  }

  function parseTextToBalls(text) {
    var src = String(text || "").trim();
    if (!src) return [];
    var parts = src
      .replace(/\s*[-–—|/]\s*/g, " ")
      .replace(/[;,]+/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    var out = [];
    for (var i = 0; i < parts.length; i += 1) {
      var token = parseToken(parts[i]);
      if (token) out.push(token);
    }
    return out;
  }

  function buildBall(token) {
    var span = document.createElement("span");
    span.className = "cc-ball" + (token.hit ? " cc-ball--hit" : "");
    span.textContent = token.value;
    return span;
  }

  function applyBallRow(node, tokens) {
    if (!node || !tokens || !tokens.length) return;
    node.innerHTML = "";
    var row = document.createElement("div");
    row.className = "cc-ball-row";
    for (var i = 0; i < tokens.length; i += 1) row.appendChild(buildBall(tokens[i]));
    node.appendChild(row);
    node.setAttribute("data-balls-standardized", "1");
  }

  function maybeEnhanceCell(td) {
    if (!td || td.getAttribute("data-balls-standardized") === "1") return;
    if (td.querySelector(".cc-ball, .ball-3d, .cc-proposal-ball, .historical-pick")) return;
    var text = (td.textContent || "").trim();
    if (!text) return;
    var balls = parseTextToBalls(text);
    if (balls.length < 5 || balls.length > 8) return;
    applyBallRow(td, balls.slice(0, 8));
  }

  function enhanceLatestBridge() {
    var targets = document.querySelectorAll("[data-latest-draw-numbers], [data-card-numbers], [data-proposal-box]");
    for (var i = 0; i < targets.length; i += 1) {
      var node = targets[i];
      if (!node || node.getAttribute("data-balls-standardized") === "1") continue;
      if (node.querySelector(".cc-ball, .ball-3d, .cc-proposal-ball, .historical-pick")) continue;
      var tokens = parseTextToBalls(node.textContent || "");
      if (tokens.length >= 5) applyBallRow(node, tokens.slice(0, 8));
    }
  }

  function enhanceTables() {
    var rows = document.querySelectorAll(".draws-table td, .cc-table-wrap td, td[data-draws-body], [data-draws-body] td");
    for (var i = 0; i < rows.length; i += 1) maybeEnhanceCell(rows[i]);
  }

  function normalizeExistingHitClasses() {
    var hitNodes = document.querySelectorAll(".is-hit, .historical-pick.is-hit");
    for (var i = 0; i < hitNodes.length; i += 1) {
      var n = hitNodes[i];
      if (n.classList.contains("ball-3d") || n.classList.contains("cc-proposal-ball") || n.classList.contains("historical-pick") || n.classList.contains("cc-ball")) {
        n.classList.add("is-hit");
      }
    }
  }

  function run() {
    enhanceLatestBridge();
    enhanceTables();
    normalizeExistingHitClasses();
  }

  var mo = new MutationObserver(function () {
    run();
  });

  function boot() {
    run();
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (!document.body) return;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
