(() => {
  if (window.__CC_LAZY_BOOTSTRAP__) return;
  window.__CC_LAZY_BOOTSTRAP__ = true;

  const DEFAULT_MODULES = [
    "site-guide.js",
    "user-first.js",
    "balls-standardizer.js",
    "lab-referral.js"
  ];

  const loaded = new Set();

  function getBasePrefix() {
    const current = document.currentScript;
    const src = current && current.getAttribute("src") ? String(current.getAttribute("src")) : "";
    if (!src) return "/assets/js/";
    const normalized = src.replace(/\\/g, "/");
    const idx = normalized.lastIndexOf("assets/js/lazy-bootstrap.js");
    if (idx === -1) return "/assets/js/";
    return normalized.slice(0, idx) + "assets/js/";
  }

  function resolveModulePath(name, basePrefix) {
    const safe = String(name || "").trim();
    if (!safe) return "";
    if (/^https?:\/\//i.test(safe) || safe.startsWith("/")) return safe;
    return basePrefix + safe.replace(/^\.\//, "");
  }

  function loadScript(src) {
    return new Promise((resolve) => {
      if (!src || loaded.has(src)) {
        resolve();
        return;
      }
      if (document.querySelector(`script[data-cc-lazy-module="1"][src="${src}"]`)) {
        loaded.add(src);
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.defer = true;
      script.async = true;
      script.dataset.ccLazyModule = "1";
      script.onload = () => {
        loaded.add(src);
        resolve();
      };
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  async function run() {
    const root = document.documentElement;
    const declared = root && root.dataset ? root.dataset.ccLazyModules : "";
    const modules = declared
      ? declared.split(",").map((s) => s.trim()).filter(Boolean)
      : DEFAULT_MODULES;
    const basePrefix = getBasePrefix();
    for (const moduleName of modules) {
      const path = resolveModulePath(moduleName, basePrefix);
      await loadScript(path);
    }
  }

  function schedule() {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(run, { timeout: 1600 });
      return;
    }
    window.setTimeout(run, 600);
  }

  if (document.readyState === "complete") {
    schedule();
  } else {
    window.addEventListener("load", schedule, { once: true, passive: true });
  }
})();

