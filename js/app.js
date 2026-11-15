// Fluidweb builder UI. State lives in one object; every change goes through dispatch() and then render().
(function () {
  const { CATALOG, PRODUCT_IDS } = window.Catalog
  const P = window.Pricing
  const { formatUSD, pluralize, DEPOSIT_PERCENT } = P

  const $ = (selector, root = document) => root.querySelector(selector)
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector))
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const { esc, icon, PRODUCT_ICONS, SECTION_ICONS, SECTION_HUES } = window.Theme

  const panels = $('#panels')

  // ---- State ----

  let config = P.defaultBuildConfig()
  let quote = P.computeQuote(config)

  function reducer(state, action) {
    if (action.type === 'replace') return action.config

    const product = CATALOG[action.productId]
    const current = state[action.productId]
    let next = current

    switch (action.type) {
      case 'toggleProduct':
        next = { ...current, enabled: !current.enabled }
        break
      case 'setUnits':
        next = { ...current, units: action.units }
        break
      case 'setQuantity':
        next = { ...current, selections: { ...current.selections, [action.optionId]: action.quantity } }
        break
      case 'choose': {
        const section = product.sections.find((candidate) => candidate.id === action.sectionId)
        const selections = { ...current.selections }
        for (const option of section?.options ?? []) delete selections[option.id]
        selections[action.optionId] = 1
        next = { ...current, selections }
        break
      }
    }

    return { ...state, [action.productId]: P.normalizeProductConfig(product, next) }
  }

  function dispatch(action) {
    config = reducer(config, action)
    quote = P.computeQuote(config)
    render()
  }

  const reset = () => dispatch({ type: 'replace', config: P.defaultBuildConfig() })

  // ---- Animated price ----

  function setPrice(node, value) {
    if (!node) return
    const from = node._shown
    node._shown = value
    cancelAnimationFrame(node._frame)
    if (from === undefined || from === value || reduceMotion.matches) {
      node.textContent = formatUSD(value)
      return
    }
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / 450)
      const eased = 1 - Math.pow(1 - progress, 3)
      node.textContent = formatUSD(Math.round(from + (value - from) * eased))
      if (progress < 1) node._frame = requestAnimationFrame(tick)
    }
    node._frame = requestAnimationFrame(tick)
  }

  // ---- Static pieces built once ----

  function priceLabel(option, product) {
    if (option.price === 0) return 'Included'
    const parts = [`+${formatUSD(option.price)}`]
    if (option.unit === 'perUnit') parts.push(product.unit.singular)
    if (option.stepper) parts.push(option.stepper.noun)
    return parts.join(' / ')
  }

  function stepperHTML(label) {
    return `<div class="stepper" role="group" aria-label="${esc(label)}">
      <button type="button" class="btn btn-outline btn-icon-sm" data-step="-1" aria-label="Decrease ${esc(label)}">${icon('minus')}</button>
      <output aria-live="polite">0</output>
      <button type="button" class="btn btn-outline btn-icon-sm" data-step="1" aria-label="Increase ${esc(label)}">${icon('plus')}</button>
    </div>`
  }

  function buildHero() {
    const blockCount = PRODUCT_IDS.reduce(
      (sum, id) => sum + CATALOG[id].sections.reduce((count, section) => count + section.options.length, 0),
      0,
    )
    const facts = [
      ...PRODUCT_IDS.map((id) => {
        const product = CATALOG[id]
        return { label: `${product.name}s from`, value: formatUSD(product.basePrice + product.unit.min * product.unit.price) }
      }),
      { label: 'Priced blocks', value: String(blockCount) },
    ]
    $('#hero-facts').innerHTML = facts.map((fact) => `<div><dt>${esc(fact.label)}</dt><dd>${esc(fact.value)}</dd></div>`).join('')
  }

  function buildPicker() {
    $('#picker').innerHTML = PRODUCT_IDS.map((id) => {
      const product = CATALOG[id]
      return `<button type="button" class="product" data-product="${id}" aria-pressed="false">
        <span class="product-top">
          <span class="product-icon">${icon(PRODUCT_ICONS[id])}</span>
          <span class="product-pill"></span>
        </span>
        <span class="product-text">
          <span class="product-name">${esc(product.name)}</span>
          <span class="product-tagline">${esc(product.tagline)}</span>
        </span>
        <span class="product-price"><b>${formatUSD(product.basePrice)}</b><span>foundation + ${formatUSD(product.unit.price)} / ${esc(product.unit.singular)}</span></span>
      </button>`
    }).join('')
  }

  const PRESET_FINGERPRINTS = new Map(P.PRESETS.map((preset) => [preset.id, JSON.stringify(preset.config)]))

  function buildPresets() {
    $('#presets').innerHTML = P.PRESETS.map(
      (preset) => `<li><button type="button" class="preset" data-preset="${preset.id}" aria-pressed="false" title="${esc(preset.description)}"><b>${esc(preset.name)}</b><span>${formatUSD(preset.total)}</span></button></li>`,
    ).join('')
  }

  // ---- Product panel ----

  function blockHTML(product, section, option) {
    const isSingle = section.type === 'single'
    const body = (indicator, footer) => `
      <span class="block-top">
        <span class="block-name">${esc(option.name)}${option.popular ? '<span class="badge">Popular</span>' : ''}</span>
        ${indicator}
      </span>
      <span class="block-desc">${esc(option.description)}</span>
      <span class="block-foot">
        <span class="block-price">${esc(priceLabel(option, product))}</span>
        <span class="block-right"><span class="block-line"></span>${footer}</span>
      </span>`

    if (option.stepper) {
      return `<div class="block" data-option="${option.id}">${body('', stepperHTML(option.name))}</div>`
    }
    return `<label class="block" data-option="${option.id}">
      <input type="${isSingle ? 'radio' : 'checkbox'}" class="sr-only" name="${isSingle ? section.id : option.id}" value="${option.id}" id="opt-${option.id}">
      ${body(`<span class="indicator${isSingle ? ' round' : ''}" aria-hidden="true">${icon('check')}</span>`, '')}
    </label>`
  }

  function sectionHTML(product, section, index) {
    const headingId = `${section.id}-heading`
    const { unit } = product
    let body
    if (section.type === 'scope') {
      body = `<div class="scope-card" data-units>
          <div class="scope-top">
            <div>
              <label for="${section.id}-range">How many ${esc(unit.plural)}?</label>
              <p class="scope-count"><b data-count></b><span data-math></span></p>
            </div>
            ${stepperHTML(`number of ${unit.plural}`)}
          </div>
          <input id="${section.id}-range" type="range" min="${unit.min}" max="${unit.max}" step="1">
          <p class="scope-simple"><span>Simple ${esc(unit.plural)} with static content</span><span class="mono"><span data-simple></span> · <span class="muted">Included</span></span></p>
        </div>
        <div class="blocks">${section.options.map((option) => blockHTML(product, section, option)).join('')}</div>`
    } else {
      body = `<div class="blocks" role="${section.type === 'single' ? 'radiogroup' : 'group'}" aria-labelledby="${headingId}">${section.options.map((option) => blockHTML(product, section, option)).join('')}</div>`
    }
    return `<section class="sec" id="sec-${section.id}" data-section="${section.id}" style="--h:${SECTION_HUES[section.id] ?? 250}" aria-labelledby="${headingId}">
      <header class="sec-head">
        <span class="sec-icon">${icon(SECTION_ICONS[section.id] || 'layout-grid')}</span>
        <div class="sec-text">
          <div class="sec-title-row">
            <h4 id="${headingId}"><span class="sec-step" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>${esc(section.title)}</h4>
            <span class="sec-status"></span>
          </div>
          <p>${esc(section.description)}</p>
        </div>
      </header>
      ${body}
    </section>`
  }

  function createPanel(productId) {
    const product = CATALOG[productId]
    const panel = document.createElement('section')
    panel.className = 'panel'
    panel.dataset.panel = productId
    panel.setAttribute('aria-labelledby', `${productId}-panel-heading`)
    panel.innerHTML = `<header class="panel-head">
        <div class="panel-head-top">
          <div>
            <p class="panel-base">${esc(product.baseName)} · ${formatUSD(product.basePrice)}</p>
            <h3 id="${productId}-panel-heading">Your ${esc(product.name.toLowerCase())}</h3>
          </div>
          <p class="panel-subtotal"><span>Subtotal</span><span class="price" data-subtotal></span></p>
        </div>
        <ul class="included">${product.included.map((item) => `<li>${icon('check')}${esc(item)}</li>`).join('')}</ul>
      </header>
      ${product.sections.map((section, index) => sectionHTML(product, section, index)).join('')}`
    return panel
  }

  function setStepper(stepper, value, min, max) {
    const [minus, plus] = $$('button', stepper)
    $('output', stepper).textContent = value
    minus.disabled = value <= min
    plus.disabled = value >= max
  }

  function updatePanel(panel, productId) {
    const product = CATALOG[productId]
    const productConfig = config[productId]
    const productQuote = quote.products.find((entry) => entry.productId === productId)
    const lineTotals = new Map((productQuote?.lines ?? []).map((line) => [line.id, line.total]))
    const { unit } = product

    setPrice($('[data-subtotal]', panel), productQuote?.subtotal ?? 0)

    for (const section of product.sections) {
      const root = $(`[data-section="${section.id}"]`, panel)
      const selectedCount = section.options.filter((option) => productConfig.selections[option.id]).length
      let simple = 0

      if (section.type === 'scope') {
        const allocated = section.options.reduce((sum, option) => sum + (productConfig.selections[option.id] ?? 0), 0)
        simple = productConfig.units - allocated
        const card = $('[data-units]', root)
        $('[data-count]', card).textContent = productConfig.units
        $('[data-math]', card).textContent = `× ${formatUSD(unit.price)} = ${formatUSD(productConfig.units * unit.price)}`
        $('[data-simple]', card).textContent = simple
        $('input[type="range"]', card).value = productConfig.units
        setStepper($('.stepper', card), productConfig.units, unit.min, unit.max)
        $('.sec-status', root).textContent = pluralize(productConfig.units, unit.singular)
      } else {
        $('.sec-status', root).textContent = section.type === 'multi' && selectedCount > 0 ? `${selectedCount} added` : ''
      }

      for (const option of section.options) {
        const block = $(`[data-option="${option.id}"]`, root)
        const quantity = productConfig.selections[option.id] ?? 0
        const active = quantity > 0
        const wasActive = block.classList.contains('active')
        block.classList.toggle('active', active)

        const lineTotal = section.type === 'scope' ? quantity * option.price : (lineTotals.get(option.id) ?? 0)
        $('.block-line', block).textContent = lineTotal > 0 ? formatUSD(lineTotal) : ''

        if (option.stepper) {
          const max = section.type === 'scope' ? quantity + simple : P.optionMax(option, productConfig.units)
          setStepper($('.stepper', block), quantity, 0, max)
        } else {
          $('input', block).checked = active
          if (active && !wasActive && block.dataset.ready) {
            const indicator = $('.indicator', block)
            indicator.classList.remove('pop')
            void indicator.offsetWidth
            indicator.classList.add('pop')
          }
        }
        block.dataset.ready = '1'
      }
    }
  }

  function syncPanels() {
    const container = $('#panels')
    for (const productId of PRODUCT_IDS) {
      let panel = $(`[data-panel="${productId}"]:not(.leaving)`, container)
      if (config[productId].enabled && !panel) {
        panel = createPanel(productId)
        // Website always sits above the app.
        const anchor = productId === 'website' ? $('[data-panel="app"]', container) || $('#empty') : $('#empty')
        container.insertBefore(panel, anchor)
      } else if (!config[productId].enabled && panel) {
        const leaving = panel
        leaving.classList.add('leaving')
        const remove = () => leaving.remove()
        if (reduceMotion.matches) remove()
        else setTimeout(remove, 180)
        panel = null
      }
      if (panel) updatePanel(panel, productId)
    }
    $('#empty').hidden = quote.products.length > 0
  }

  // ---- Summary (rendered into the sidebar and into the mobile sheet) ----

  let seenKeys = new Set()

  function summaryHTML(weeks, isNew) {
    const head = `<div class="summary-head"><h3>Your build</h3><span>${quote.blocks} ${quote.blocks === 1 ? 'block' : 'blocks'}</span></div>`
    if (quote.products.length === 0) {
      return `${head}<p class="summary-empty">Nothing here yet. Add a website or a mobile app and watch your stack grow.</p>`
    }

    const stack = quote.products
      .flatMap((product) =>
        product.lines.map((line) => {
          const hue = SECTION_HUES[line.sectionId]
          return `<span class="${isNew(`${product.productId}-${line.id}`) ? 'new' : ''}"${hue === undefined ? '' : ` style="--h:${hue}" data-hue`}></span>`
        }),
      )
      .join('')

    const groups = quote.products
      .map(
        (product) => `<div class="lines-group">
          <p class="lines-title"><span><span class="swatch ${product.productId}" aria-hidden="true"></span>${esc(product.name)}</span><span class="mono">${formatUSD(product.subtotal)}</span></p>
          <ul>${product.lines
            .map(
              (line) => `<li class="${isNew(`${product.productId}-${line.id}`) ? 'new' : ''}">
                <span class="line-name">${esc(line.name)}${line.detail ? `<small>${esc(line.detail)}</small>` : ''}</span>
                <span class="line-amount">${line.total > 0 ? formatUSD(line.total) : 'Included'}</span>
              </li>`,
            )
            .join('')}</ul>
        </div>`,
      )
      .join('')

    const deposit = P.amountDueCents(quote.total, 'deposit') / 100
    return `${head}
      <div class="stack" aria-hidden="true">${stack}</div>
      <div class="lines" role="region" aria-label="Selected blocks" tabindex="0">${groups}</div>
      <div class="separator"></div>
      <div class="totals">
        <p class="total-row"><span>Project total</span><span aria-live="polite"><span class="price" data-total aria-hidden="true"></span><span class="sr-only">${formatUSD(quote.total)}</span></span></p>
        <p class="deposit-row"><span>${DEPOSIT_PERCENT}% deposit to start</span><span>${formatUSD(deposit)}</span></p>
        <p class="eta">${icon('clock')}Estimated delivery in about ${weeks} weeks</p>
      </div>
      <div class="summary-actions">
        <button type="button" class="btn btn-primary btn-xl btn-block" data-action="checkout">Continue to checkout ${icon('arrow-right')}</button>
        <button type="button" class="btn btn-ghost btn-block" data-action="reset">${icon('rotate-ccw')}Start over</button>
      </div>`
  }

  let shownTotal

  function renderSummaries(weeks) {
    const keys = new Set(quote.products.flatMap((product) => product.lines.map((line) => `${product.productId}-${line.id}`)))
    const previous = seenKeys
    const html = summaryHTML(weeks, (key) => !previous.has(key))
    seenKeys = keys

    for (const container of $$('[data-summary]')) {
      const scroll = $('.lines', container)?.scrollTop ?? 0
      container.innerHTML = html
      const lines = $('.lines', container)
      if (lines) lines.scrollTop = scroll
      const total = $('[data-total]', container)
      if (total) {
        total._shown = shownTotal
        setPrice(total, quote.total)
      }
    }
    shownTotal = quote.total
  }

  // ---- Render ----

  function render() {
    const weeks = P.estimateWeeks(quote, config)
    const hasBuild = quote.products.length > 0

    for (const button of $$('#picker .product')) {
      const enabled = config[button.dataset.product].enabled
      button.setAttribute('aria-pressed', enabled)
      $('.product-pill', button).innerHTML = enabled ? `${icon('check')}Added` : `${icon('plus')}Add`
    }

    const fingerprint = JSON.stringify(config)
    for (const button of $$('#presets .preset')) {
      button.setAttribute('aria-pressed', PRESET_FINGERPRINTS.get(button.dataset.preset) === fingerprint)
    }

    syncPanels()
    renderSummaries(weeks)

    $('#dock').hidden = !hasBuild
    $('#dock-meta').textContent = `${quote.blocks} blocks · about ${weeks} weeks`
    setPrice($('#dock-total'), quote.total)
    if (!hasBuild && $('#sheet').open) $('#sheet').close()
    updateProgress()
  }

  // ---- Progress bar under the nav: one segment per category, filled as you move down the builder ----

  const progress = $('#progress')
  let progressKey = ''

  function updateProgress() {
    const sections = $$('.panel:not(.leaving) .sec', panels)
    progress.hidden = sections.length === 0
    if (sections.length === 0) {
      progressKey = ''
      return
    }

    const line = $('.site-header').getBoundingClientRect().bottom + 140
    let current = null
    for (const section of sections) if (section.getBoundingClientRect().top <= line) current = section
    const finished = panels.getBoundingClientRect().bottom < line

    const productId = (current ?? sections[0]).closest('[data-panel]').dataset.panel
    const product = CATALOG[productId]
    if (progressKey !== productId) {
      progressKey = productId
      $('#progress-segments').innerHTML = product.sections
        .map((section) => `<li><a href="#sec-${section.id}" style="--h:${SECTION_HUES[section.id] ?? 250}" title="${esc(section.title)}" aria-label="${esc(section.title)}"></a></li>`)
        .join('')
    }

    const index = current ? product.sections.findIndex((section) => section.id === current.dataset.section) : -1
    $$('#progress-segments a').forEach((segment, position) => {
      segment.classList.toggle('done', finished || position < index)
      segment.classList.toggle('current', !finished && position === index)
    })

    const total = product.sections.length
    $('#progress-label').textContent = finished
      ? `${product.name} · all ${total} steps seen`
      : index < 0
        ? `${product.name} · ${total} steps`
        : `${product.name} · step ${index + 1} of ${total} · ${product.sections[index].title}`
  }

  let progressFrame = 0
  const scheduleProgress = () => {
    cancelAnimationFrame(progressFrame)
    progressFrame = requestAnimationFrame(updateProgress)
  }
  window.addEventListener('scroll', scheduleProgress, { passive: true })
  window.addEventListener('resize', scheduleProgress)

  // ---- Builder events ----

  $('#picker').addEventListener('click', (event) => {
    const button = event.target.closest('.product')
    if (button) dispatch({ type: 'toggleProduct', productId: button.dataset.product })
  })

  $('#presets').addEventListener('click', (event) => {
    const button = event.target.closest('.preset')
    if (!button) return
    const preset = P.PRESETS.find((entry) => entry.id === button.dataset.preset)
    dispatch({ type: 'replace', config: preset.config })
  })

  panels.addEventListener('click', (event) => {
    const button = event.target.closest('[data-step]')
    if (!button) return
    const productId = button.closest('[data-panel]').dataset.panel
    const delta = Number(button.dataset.step)
    const block = button.closest('[data-option]')
    if (block) {
      const optionId = block.dataset.option
      dispatch({ type: 'setQuantity', productId, optionId, quantity: (config[productId].selections[optionId] ?? 0) + delta })
    } else {
      dispatch({ type: 'setUnits', productId, units: config[productId].units + delta })
    }
  })

  panels.addEventListener('input', (event) => {
    if (event.target.type !== 'range') return
    const productId = event.target.closest('[data-panel]').dataset.panel
    dispatch({ type: 'setUnits', productId, units: Number(event.target.value) })
  })

  panels.addEventListener('change', (event) => {
    const input = event.target
    if (input.type !== 'checkbox' && input.type !== 'radio') return
    const productId = input.closest('[data-panel]').dataset.panel
    if (input.type === 'radio') {
      dispatch({ type: 'choose', productId, sectionId: input.closest('[data-section]').dataset.section, optionId: input.value })
    } else {
      dispatch({ type: 'setQuantity', productId, optionId: input.value, quantity: input.checked ? 1 : 0 })
    }
  })

  // ---- Summary, sheet and dialogs ----

  const sheet = $('#sheet')
  const checkout = $('#checkout')

  document.addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action
    if (action === 'reset') reset()
    if (action === 'checkout') openCheckout()

    const close = event.target.closest('[data-close]')
    if (close) close.closest('dialog').close()
  })

  // Clicking the dimmed backdrop closes a dialog.
  for (const dialog of [sheet, checkout]) {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close()
    })
  }

  $('#dock-open').addEventListener('click', () => sheet.showModal())

  // ---- Checkout ----

  const form = $('#checkout-form')
  const endpoint = $('meta[name="checkout-endpoint"]')?.content.trim() ?? ''
  // Identical retries reuse the id (and so the payment provider's idempotency key); any change to the order gets a new one.
  let attempt = null

  const selectedPlan = () => (form.elements.plan.value === 'full' ? 'full' : 'deposit')
  const amountDue = (plan) => P.amountDueCents(quote.total, plan) / 100

  function showStage(name) {
    for (const stage of $$('[data-stage]', checkout)) stage.hidden = stage.dataset.stage !== name
  }

  function setError(title, text) {
    const box = $('#checkout-error')
    box.hidden = !title
    $('#checkout-error-title').textContent = title || ''
    $('#checkout-error-text').textContent = text || ''
  }

  function setPending(pending) {
    const button = $('#checkout-submit')
    button.disabled = pending
    button.firstElementChild.outerHTML = pending ? '<span class="spinner" aria-hidden="true"></span>' : icon('lock')
    $('#checkout-submit-text').textContent = pending ? 'Preparing checkout' : `Continue to pay ${formatUSD(amountDue(selectedPlan()))}`
  }

  function refreshCheckout() {
    $('#checkout-desc').textContent = `Tell us who you are and how you would like to pay for your ${formatUSD(quote.total)} project.`
    for (const node of $$('[data-plan-amount]', checkout)) node.textContent = formatUSD(amountDue(node.dataset.planAmount))
    setPending(false)
  }

  function openCheckout() {
    if (sheet.open) sheet.close()
    showStage('details')
    setError()
    refreshCheckout()
    checkout.showModal()
  }

  form.addEventListener('change', (event) => {
    if (event.target.name === 'plan') refreshCheckout()
  })

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    setError()

    const order = {
      config,
      plan: selectedPlan(),
      contact: {
        name: form.elements.name.value,
        email: form.elements.email.value,
        company: form.elements.company.value,
        notes: form.elements.notes.value,
      },
    }
    const fingerprint = JSON.stringify(order)
    if (attempt?.fingerprint !== fingerprint) attempt = { fingerprint, id: crypto.randomUUID() }
    const request = { ...order, attemptId: attempt.id }

    try {
      P.parseCheckoutRequest(request)
    } catch (error) {
      if (!(error instanceof P.ValidationError)) throw error
      setError('Checkout could not start', error.message)
      return
    }

    if (!endpoint) {
      setError(
        'Online payment is not connected yet',
        'Nothing was charged and your details were not sent. The site owner needs to connect a payment server (see README.md).',
      )
      return
    }

    setPending(true)
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })
      const result = await response.json()
      if (result.ok && result.url) {
        window.location.assign(result.url)
        return
      }
      setError('Checkout could not start', result.error || 'Please try again in a moment.')
    } catch {
      setError('Checkout could not start', 'We could not reach the payment service. Check your connection and try again.')
    }
    setPending(false)
  })

  // The payment page sends the customer back to /?checkout=success once the payment has gone through.
  function showPaidIfReturning() {
    let params
    try {
      params = new URLSearchParams(window.location.search)
    } catch {
      return
    }
    if (params.get('checkout') !== 'success') return
    showStage('paid')
    checkout.showModal()
    try {
      history.replaceState(null, '', window.location.pathname)
    } catch {}
  }

  // A portfolio project links here as index.html#build-<project id>, and the pricing page links a
  // template as index.html#template-<template id>: load those blocks into the builder.
  function loadBuildFromHash() {
    const match = /^#(build|template)-([a-z0-9-]+)$/.exec(window.location.hash)
    if (!match) return false
    let build
    if (match[1] === 'template') {
      build = P.PRESETS.find((entry) => entry.id === match[2])?.config
    } else {
      const project = (window.Portfolio?.projects ?? []).find((entry) => entry.id === match[2])
      build = project && P.buildPreset({ id: project.id, name: project.name, description: '', products: project.build }).config
    }
    if (!build) return false
    config = build
    quote = P.computeQuote(config)
    requestAnimationFrame(() => $('#builder').scrollIntoView())
    return true
  }

  // ---- Start ----

  for (const placeholder of $$('i[data-icon]')) placeholder.outerHTML = icon(placeholder.dataset.icon)
  $('#year').textContent = new Date().getFullYear()
  buildHero()
  buildPicker()
  buildPresets()
  loadBuildFromHash()
  render()
  showPaidIfReturning()
  window.addEventListener('hashchange', () => {
    if (loadBuildFromHash()) render()
  })
})()
