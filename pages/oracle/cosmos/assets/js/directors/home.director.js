(() => {
  const orchestrator = window.CC_PAGE_ORCHESTRATOR;
  if (!orchestrator) return;
  orchestrator.registerDirector('home', () => ({
    architect: 'home',
    layoutPath: 'layouts/home.layout.json'
  }));
})();
