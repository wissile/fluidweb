// Small things every page shares: the phone menu, icons, the year in the footer, the cookie choice,
// the analytics helper and the function that posts a message to /api/contact.
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

  // ---- Analytics events ----
  // With Google Analytics installed directly they go through gtag(); with Tag Manager they land in the
  // data layer for a trigger to pick up. Without either, nothing is sent. Never pass personal data here.
  function track(event, data) {
    if (typeof window.gtag === 'function') window.gtag('event', event, data)
    else (window.dataLayer = window.dataLayer || []).push({ event, ...data })
  }

  // ---- Messages ----
  // Posts to the Worker (src/worker.js). Resolves to { ok: true } only when the Worker confirms the
  // email was handed to the mail service. Opened from disk, or on a host without the Worker, it
  // resolves to { ok: false } so a page can never show a false "sent".
  const CONTACT_ENDPOINT = '/api/contact'

  async function sendContact(payload) {
    if (window.location.protocol === 'file:') return { ok: false, status: 0, error: '' }
    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      let result = null
      try {
        result = await response.json()
      } catch {}
      if (response.ok && result && result.ok === true) return { ok: true }
      // Only a 400 carries a message meant for the visitor (which field to fix).
      const error = response.status === 400 && result && typeof result.error === 'string' ? result.error : ''
      return { ok: false, status: response.status, error }
    } catch {
      return { ok: false, status: 0, error: '' }
    }
  }

  // ---- Cookie choice (Google Consent Mode v2) ----
  // The head of every page sets consent to "denied" before the analytics tag loads and reads this key.
  // The banner only exists when an analytics id is configured (the head then defines gtag) and the
  // page is served over http(s), because nothing is measured when the files are opened from disk.
  const CONSENT_KEY = 'fluidweb.consent.v1'
  const analyticsOn = typeof window.gtag === 'function' && window.location.protocol.indexOf('http') === 0

  function readConsent() {
    try {
      const value = window.localStorage.getItem(CONSENT_KEY)
      return value === 'granted' || value === 'denied' ? value : null
    } catch {
      return null
    }
  }

  function storeConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_KEY, value)
    } catch {}
    // Only analytics storage is ever switched on. The site runs no advertising.
    window.gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: value === 'granted' ? 'granted' : 'denied',
    })
  }

  let banner = null

  function closeConsent(returnFocus) {
    if (!banner) return
    banner.remove()
    banner = null
    if (returnFocus) returnFocus.focus()
  }

  function openConsent(opener) {
    if (banner) {
      banner.querySelector('button').focus()
      return
    }
    const current = readConsent()
    banner = document.createElement('section')
    banner.className = 'consent'
    banner.setAttribute('aria-label', 'Cookie settings')
    const state = current === 'granted' ? 'Analytics cookies are on.' : current === 'denied' ? 'Analytics cookies are off.' : ''
    banner.innerHTML = `<p><b>Cookies for analytics</b> This site uses Google Analytics to see which pages are useful. Analytics cookies are set only if you accept. ${state} <a href="privacy.html">Privacy policy</a></p>
      <div class="consent-actions">
        <button type="button" class="btn btn-outline btn-lg" data-consent="denied">Decline</button>
        <button type="button" class="btn btn-primary btn-lg" data-consent="granted">Accept</button>
      </div>`
    banner.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-consent]')
      if (!choice) return
      storeConsent(choice.dataset.consent)
      closeConsent(opener)
    })
    banner.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && opener) closeConsent(opener)
    })
    // First in the page, so a keyboard reaches it before anything else. It is fixed to a corner and takes no room in the layout.
    document.body.prepend(banner)
    if (opener) banner.querySelector('button').focus()
  }

  if (analyticsOn) {
    for (const link of document.querySelectorAll('[data-cookie-settings]')) {
      link.hidden = false
      link.addEventListener('click', () => openConsent(link))
    }
    if (readConsent() === null) openConsent(null)
  }

  window.Site = { track, sendContact }
})()
