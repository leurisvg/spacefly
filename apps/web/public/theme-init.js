// Runs before the first paint (an external file: the server's CSP is script-src 'self'). Sets the saved theme on <html>
// so the page doesn't flash midnight before Angular boots. The key and ids mirror libs/client/src/state/theme.store.ts.
(function () {
  try {
    var saved = localStorage.getItem('spacefly.theme');
    if (saved === 'midnight' || saved === 'earth') document.documentElement.setAttribute('data-theme', saved);
  } catch (e) {
    /* storage blocked: stay on the default theme */
  }
})();
