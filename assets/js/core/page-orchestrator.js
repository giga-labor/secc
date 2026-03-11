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
    const perf = window.CC_PERF;
    const directorFactory = directors.get(pageId);
    if (!directorFactory) return;

    const ctx = createRuntimeContext(pageId);
    const director = directorFactory(ctx);
    if (!director || !director.layoutPath || !director.architect) return;
    const orchestratorMark = `orchestrator:${pageId}`;
    perf?.markModuleStart?.(orchestratorMark);

    try {
      const architectFactory = architects.get(String(director.architect));
      if (!architectFactory) throw new Error(`architect_not_found:${director.architect}`);

      perf?.markModuleStart?.(`layout:${pageId}`);
      const layout = await loadLayout(ctx, director.layoutPath);
      perf?.markModuleEnd?.(`layout:${pageId}`);
      const architect = architectFactory(ctx, director);
      if (!architect || typeof architect.run !== 'function') throw new Error('architect_invalid');

      perf?.markModuleStart?.(`collect:${pageId}`);
      const dataSnapshot = await architect.collectData(layout);
      perf?.markModuleEnd?.(`collect:${pageId}`);
      const signature = ctx.cache?.computeSignature?.({ layout, data: dataSnapshot }) || null;
      const prev = ctx.cache?.read?.(pageId) || null;

      const mode = (!prev || !signature || prev.combined_hash !== signature.combined_hash) ? 'rebuild' : 'patch';
      perf?.markModuleStart?.(`render:${pageId}:${mode}`);
      await architect.run(layout, dataSnapshot, { mode, previous: prev, signature });
      perf?.markModuleEnd?.(`render:${pageId}:${mode}`);

      if (signature && ctx.cache?.write) {
        ctx.cache.write(pageId, {
          page_id: pageId,
          layout_version: layout?.version || '0',
          ...signature,
          saved_at: new Date().toISOString()
        });
      }
    } finally {
      perf?.markModuleEnd?.(orchestratorMark);
    }
  };

  window.CC_PAGE_ORCHESTRATOR = {
    registerDirector,
    registerArchitect,
    start
  };
})();
