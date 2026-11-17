/* One explicit appearance preference for the reader and information pages. */
(() => {
  function set(value, save = false) {
    const appearance = value === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.appearance = appearance;
    document.documentElement.style.colorScheme = appearance;
    if (save) try { localStorage.setItem('gr:appearance', appearance); } catch (_) {}
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.content = appearance === 'dark' ? '#15131a' : '#f7f5f2';
    const button = document.querySelector('#appearanceToggle');
    if (button) {
      button.textContent = appearance === 'dark' ? '☀ Light mode' : '☾ Dark mode';
      button.setAttribute('aria-label', appearance === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      button.setAttribute('aria-pressed', String(appearance === 'dark'));
    }
  }
  function bind() {
    const button = document.querySelector('#appearanceToggle');
    if (button) button.onclick = () => set(document.documentElement.dataset.appearance === 'dark' ? 'light' : 'dark', true);
    set(document.documentElement.dataset.appearance);
  }
  let saved;
  try { saved = localStorage.getItem('gr:appearance'); } catch (_) {}
  set(saved);
  window.GRAppearance = { set, bind };
  document.addEventListener('DOMContentLoaded', bind);
  addEventListener('pageshow', () => {
    let value;
    try { value = localStorage.getItem('gr:appearance'); } catch (_) {}
    set(value);
  });
  addEventListener('storage', event => { if (event.key === 'gr:appearance') set(event.newValue); });
})();
