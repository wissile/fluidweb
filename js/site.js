// Small things every page shares: the phone menu, icons and the year in the footer.
(function () {
  const header = document.querySelector('.site-header')
  const toggle = header && header.querySelector('.nav-toggle')
  const nav = header && header.querySelector('.site-nav')

  // On phones the main links fold into a menu under the header. Without JavaScript the button stays hidden.
  if (toggle && nav) {
    const setOpen = (open) => {
      header.classList.toggle('nav-open', open)
      toggle.setAttribute('aria-expanded', String(open))
    }
    header.classList.add('has-menu')
    toggle.hidden = false
    toggle.addEventListener('click', () => setOpen(!header.classList.contains('nav-open')))
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false)
    })
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.site-nav, .nav-toggle')) setOpen(false)
    })
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !header.classList.contains('nav-open')) return
      setOpen(false)
      toggle.focus()
    })
    window.matchMedia('(min-width: 640px)').addEventListener('change', () => setOpen(false))
  }

  if (window.Theme) {
    for (const placeholder of document.querySelectorAll('i[data-icon]')) placeholder.outerHTML = window.Theme.icon(placeholder.dataset.icon)
  }
  const year = document.getElementById('year')
  if (year) year.textContent = new Date().getFullYear()
})()
