(() => {
  const orchestrator = window.CC_PAGE_ORCHESTRATOR;
  if (!orchestrator) return;
  orchestrator.registerDirector('storico', () => ({
    architect: 'storico',
    layoutPath: 'layouts/storico.layout.json'
  }));
})();
