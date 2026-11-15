// Shared look-and-feel helpers used by the builder (app.js) and the portfolio (portfolio.js).
(function () {
  const esc = (text) =>
    String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

  function icon(name) {
    return `<svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${window.Icons[name] || ''}</svg>`
  }

  const PRODUCT_ICONS = { website: 'globe', app: 'smartphone' }
  const SECTION_ICONS = {
    'w-scope': 'layout-grid', 'w-design': 'palette', 'w-content': 'pen-line', 'w-search': 'search',
    'w-features': 'puzzle', 'w-accounts': 'users', 'w-commerce': 'shopping-cart', 'w-global': 'languages',
    'w-analytics': 'chart-column', 'w-quality': 'gauge', 'w-launch': 'rocket', 'w-care': 'life-buoy',
    'a-scope': 'layout-grid', 'a-platform': 'monitor-smartphone', 'a-design': 'palette', 'a-brand': 'sparkles',
    'a-accounts': 'users', 'a-engagement': 'bell', 'a-device': 'cpu', 'a-money': 'coins',
    'a-global': 'languages', 'a-quality': 'shield-check', 'a-launch': 'rocket', 'a-care': 'life-buoy',
  }

  // One hue per category (an oklch hue angle), so each group of blocks is recognizable by color.
  const SECTION_HUES = {
    'w-scope': 250, 'w-design': 350, 'w-content': 300, 'w-search': 95, 'w-features': 150, 'w-accounts': 215,
    'w-commerce': 25, 'w-global': 180, 'w-analytics': 60, 'w-quality': 125, 'w-launch': 325, 'w-care': 275,
    'a-scope': 250, 'a-platform': 215, 'a-design': 350, 'a-brand': 300, 'a-accounts': 180, 'a-engagement': 95,
    'a-device': 150, 'a-money': 25, 'a-global': 125, 'a-quality': 60, 'a-launch': 325, 'a-care': 275,
  }

  window.Theme = { esc, icon, PRODUCT_ICONS, SECTION_ICONS, SECTION_HUES }
})()
