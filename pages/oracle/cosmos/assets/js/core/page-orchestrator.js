(() => {
  if (window.CC_PAGE_ORCHESTRATOR) return;

  const directors = new Map();
  const architects = new Map();

  const registerDirector = (pageId, factory) => {
    if (!pageId || typeof factory !== 'function') return false;
    directors.set(String(pageId), factory);
    return true;
  };

  const registerArchitect = (name, factory) => {
    if (!name || typeof factory !== 'function') return false;
    architects.set(String(name), factory);
    return true;
  };

  const createRuntimeContext = (pageId) => ({
    pageId,
    repo: window.CC_DATA_REPOSITORY,
    cache: window.CC_CACHE_ENGINE,
    components: window.CC_COMPONENTS,
    telemetry: window.CC_TELEMETRY,
    resolveWithBase: (path) => window.CC_DATA_REPOSITORY?.resolveWithBase?.(path) || path
  });

  const loadLayout = async (ctx, layoutPath) => {
    if (!ctx.repo || !ctx.repo.fetchJson) throw new Error('repository_unavailable');
    return ctx.repo.fetchJson(layoutPath, { cache: 'no-store' });
  };

  const start = async () => {
    const pageId = document.body?.dataset?.pageId || 'home';
    const directorFactory = directors.get(pageId);
    if (!directorFactory) return;

    const ctx = createRuntimeContext(pageId);
    const director = directorFactory(ctx);
    if (!director || !director.layoutPath || !director.architect) return;

    const architectFactory = architects.get(String(director.architect));
    if (!architectFactory) throw new Error(`architect_not_found:${director.architect}`);

    const layout = await loadLayout(ctx, director.layoutPath);
    const architect = architectFactory(ctx, director);
    if (!architect || typeof architect.run !== 'function') throw new Error('architect_invalid');

    const dataSnapshot = await architect.collectData(layout);
    const signature = ctx.cache?.computeSignature?.({ layout, data: dataSnapshot }) || null;
    const prev = ctx.cache?.read?.(pageId) || null;

    const mode = (!prev || !signature || prev.combined_hash !== signature.combined_hash) ? 'rebuild' : 'patch';
    await architect.run(layout, dataSnapshot, { mode, previous: prev, signature });

    if (signature && ctx.cache?.write) {
      ctx.cache.write(pageId, {
        page_id: pageId,
        layout_version: layout?.version || '0',
        ...signature,
        saved_at: new Date().toISOString()
      });
    }
  };

  window.CC_PAGE_ORCHESTRATOR = {
    registerDirector,
    registerArchitect,
    start
  };
})();
