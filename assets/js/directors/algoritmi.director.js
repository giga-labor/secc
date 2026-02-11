(() => {
  const orchestrator = window.CC_PAGE_ORCHESTRATOR;
  if (!orchestrator) return;
  orchestrator.registerDirector('algoritmi', () => ({
    architect: 'algoritmi',
    layoutPath: 'layouts/algoritmi.layout.json'
  }));
})();
