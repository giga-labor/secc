(() => {
  const orchestrator = window.CC_PAGE_ORCHESTRATOR;
  if (!orchestrator) return;
  orchestrator.registerDirector('analisi', () => ({
    architect: 'analisi',
    layoutPath: 'layouts/analisi.layout.json'
  }));
})();
