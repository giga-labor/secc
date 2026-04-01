(() => {
  const orchestrator = window.CC_PAGE_ORCHESTRATOR;
  if (!orchestrator) return;
  orchestrator.registerDirector('algsheet', () => ({
    architect: 'algsheet',
    layoutPath: 'layouts/algsheet.layout.json'
  }));
})();
