// Portfolio page. Each project is drawn as a stack of layers: one per category of blocks it
// uses, with the finished screen on top. --t (0 to 1) takes the stack apart. In the project view
// every category can be switched off to see what the build costs without it.
(function () {
  const { CATALOG } = window.Catalog
  const P = window.Pricing
  const { esc, icon, SECTION_HUES } = window.Theme
  const { sample, projects: source } = window.Portfolio

  const $ = (selector, root = document) => root.querySelector(selector)
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector))
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const FOUNDATION = 'Foundation'

  // ---- Turn each project's blocks into a quote, a recipe and a set of layers ----

  function describe(project) {
    const { config, total } = P.buildPreset({ id: project.id, name: project.name, description: '', products: project.build })
    const quote = P.computeQuote(config)

    const recipe = quote.products.map((product) => {
      const catalog = CATALOG[product.productId]
      const base = product.lines.find((line) => line.sectionId === 'base')
      const sections = catalog.sections
        .map((section) => {
          const lines = product.lines.filter((line) => line.sectionId === section.id && line.total > 0)
          return {
            key: `${product.productId}:${section.id}`,
            title: section.title,
            hue: SECTION_HUES[section.id] ?? 250,
            blocks: lines.map((line) => line.name),
            amount: lines.reduce((sum, line) => sum + line.total, 0),
          }
        })
        .filter((section) => section.blocks.length > 0)
      return {
        name: product.name,
        size: P.pluralize(config[product.productId].units, catalog.unit.singular),
        foundation: { title: FOUNDATION, blocks: [base.name], amount: base.total },
        sections,
      }
    })

    // One layer per category, shared when the website and the app both use it. Foundation sits at the bottom.
    const layers = [{ title: FOUNDATION, hue: null }]
    for (const product of recipe) {
      for (const section of product.sections) {
        if (!layers.some((layer) => layer.title === section.title)) layers.push({ title: section.title, hue: section.hue })
      }
    }

    const host = project.url ? new URL(project.url).hostname.replace(/^www\./, '') : ''
    const parts = (window.PortfolioShots ?? {})[project.id] ?? null
    return { ...project, parts, host, total, weeks: P.estimateWeeks(quote, config), blocks: quote.blocks, recipe, layers }
  }

  const projects = source.map(describe)
  const hueStyle = (hue) => (hue === null ? '--c:0;--h:0' : `--h:${hue}`)

  // ---- Preview drawings ----

  function screenSVG(kind, hue, light) {
    const accent = light ? `oklch(0.55 0.14 ${hue})` : `oklch(0.78 0.14 ${hue})`
    const soft = light ? `oklch(0.88 0.06 ${hue})` : `oklch(0.32 0.07 ${hue})`
    const bg = light ? '#f5f3ec' : '#0c0c0c'
    const ink = light ? '#1d1d1b' : '#e8e8e8'
    const dim = light ? '#c9c5b8' : '#3a3a3a'
    const panel = light ? '#e9e6dc' : '#1a1a1a'
    const chrome = light ? '#ebe8df' : '#141414'
    const rect = (x, y, w, h, fill, r = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`
    let body

    if (kind === 'app') {
      body =
        rect(0, 0, 90, 190, bg, 0) + rect(34, 5, 22, 5, light ? ink : '#000', 2.5) + rect(8, 18, 34, 6, ink) + rect(8, 28, 22, 3, dim) + rect(8, 38, 74, 46, soft, 6) +
        rect(14, 66, 30, 5, accent) + rect(14, 75, 18, 3, ink) +
        [0, 1, 2].map((i) => rect(8, 92 + i * 22, 74, 17, panel, 4) + rect(13, 96 + i * 22, 9, 9, accent, 4.5) + rect(27, 97 + i * 22, 32, 3, ink) + rect(27, 103 + i * 22, 20, 2.5, dim)).join('') +
        rect(0, 166, 90, 24, chrome, 0) + [0, 1, 2, 3].map((i) => rect(13 + i * 19, 174, 8, 8, i === 0 ? accent : dim, 4)).join('')
      return `<svg viewBox="0 0 90 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}</svg>`
    }

    const nav = rect(8, 7, 8, 5, accent) + rect(96, 8, 12, 3, dim) + rect(112, 8, 12, 3, dim) + rect(132, 6, 20, 7, ink, 3.5)
    if (kind === 'store') {
      body = nav + rect(8, 22, 46, 5, ink) + [0, 1, 2, 3].map((i) => rect(8 + i * 37, 34, 33, 34, i % 2 ? panel : soft, 4) + rect(8 + i * 37, 72, 22, 3, ink) + rect(8 + i * 37, 78, 12, 3, accent)).join('') + rect(8, 88, 144, 6, panel, 3)
    } else if (kind === 'dashboard') {
      const bars = [18, 30, 24, 40, 34, 48, 44]
      body =
        rect(0, 0, 34, 100, chrome, 0) + rect(7, 8, 8, 5, accent) + [0, 1, 2, 3, 4].map((i) => rect(7, 24 + i * 10, 20, 3, i === 1 ? ink : dim)).join('') +
        [0, 1, 2].map((i) => rect(42 + i * 38, 8, 34, 20, panel, 4) + rect(47 + i * 38, 13, 14, 3, dim) + rect(47 + i * 38, 19, 20, 4, i === 0 ? accent : ink)).join('') +
        rect(42, 34, 110, 58, panel, 4) + bars.map((h, i) => rect(50 + i * 14, 86 - h, 8, h, i === 5 ? accent : soft, 2)).join('')
    } else {
      body = nav + rect(8, 26, 78, 8, ink, 3) + rect(8, 38, 56, 8, ink, 3) + rect(8, 52, 64, 3, dim) + rect(8, 62, 26, 9, accent, 4.5) + rect(98, 22, 54, 50, soft, 6) +
        [0, 1, 2].map((i) => rect(8 + i * 49, 80, 45, 14, panel, 4)).join('')
    }
    return `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${rect(0, 0, 160, 100, bg, 0)}${body}</svg>`
  }

  // ---- Real homepage screenshots, cut into components ----
  // At rest the stage shows the top of the homepage like a browser window. As --t grows the page
  // zooms out, tilts, and its components (navigation, hero, sections, footer) drift apart.

  const TILT_X = 58
  const TILT_Z = -38
  const GAP = 0.1 // space between components when apart, as a share of the page width

  // The stage is decorative (aria-hidden), so its images carry no alt text. `eager` is how many
  // components load right away: the ones in view at rest. The others wait until the card is used.
  const AT_REST = 2

  function shotStageHTML(project, eager) {
    const ratio = project.parts.reduce((sum, part) => sum + part.h / part.w, 0)
    const bands = project.parts
      .map((part, index) => `<div class="band" data-part="${index}" style="--i:${index};--z:${index % 2 ? 0.14 : 0.03}"><img src="${esc(part.src)}" width="${part.w}" height="${part.h}" alt="" draggable="false" decoding="async"${index < eager ? '' : ' loading="lazy"'}><span class="pin"></span></div>`)
      .join('')
    const labels = project.parts.map((part, index) => `<span data-part="${index}">${esc(part.name)}</span>`).join('')
    return `<div class="stage shot" aria-hidden="true" data-ratio="${ratio.toFixed(4)}" data-count="${project.parts.length}"><div class="page">${bands}</div><div class="band-labels">${labels}</div><div class="inspect" hidden><img alt="" decoding="async"><span></span></div></div>`
  }

  // Work out how far to zoom out and where to move the tilted page so all of it fits the stage.
  function fitStage(stage) {
    const width = stage.clientWidth
    const height = stage.clientHeight
    if (!width || !height) return
    const pad = stage.closest('.detail-stage')
      ? { l: Math.min(118, width * 0.28), r: 14, t: height * 0.12, b: height * 0.05 }
      : { l: width * 0.06, r: width * 0.06, t: height * 0.16, b: height * 0.08 }
    const pageHeight = width * (Number(stage.dataset.ratio) + (Number(stage.dataset.count) - 1) * GAP)
    const z = (TILT_Z * Math.PI) / 180
    const x = (TILT_X * Math.PI) / 180
    const corners = [[-width / 2, 0], [width / 2, 0], [-width / 2, pageHeight], [width / 2, pageHeight]].map(([px, py]) => [
      px * Math.cos(z) - py * Math.sin(z),
      (px * Math.sin(z) + py * Math.cos(z)) * Math.cos(x),
    ])
    const xs = corners.map((corner) => corner[0])
    const ys = corners.map((corner) => corner[1])
    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const spanX = Math.max(...xs) - minX
    const spanY = Math.max(...ys) - minY
    const roomX = width - pad.l - pad.r
    const roomY = height - pad.t - pad.b
    const scale = Math.min(roomX / spanX, roomY / spanY)
    stage.style.setProperty('--w', `${width}px`)
    stage.style.setProperty('--s', scale.toFixed(4))
    stage.style.setProperty('--dx', `${(pad.l + (roomX - scale * spanX) / 2 - scale * minX - width / 2).toFixed(1)}px`)
    stage.style.setProperty('--dy', `${(pad.t + (roomY - scale * spanY) / 2 - scale * minY).toFixed(1)}px`)
    if (stage.closest('.detail-stage')) placeLabels()
  }

  const stageObserver = new ResizeObserver((entries) => {
    for (const entry of entries) fitStage(entry.target)
  })
  const watchStages = (root) => {
    for (const stage of $$('.stage.shot', root)) {
      fitStage(stage)
      stageObserver.observe(stage)
    }
  }

  // Name tags in the project view follow the left edge of each component as the page moves.
  function placeLabels() {
    const stage = $('.detail-stage .stage.shot')
    if (!stage) return
    const frame = stage.getBoundingClientRect()
    for (const label of $$('.band-labels span', stage)) {
      const pin = $(`.band[data-part="${label.dataset.part}"] .pin`, stage).getBoundingClientRect()
      label.style.transform = `translate(${(pin.left - frame.left - 8).toFixed(1)}px, ${(pin.top - frame.top).toFixed(1)}px) translate(-100%, -50%)`
    }
  }

  function stageHTML(project, eager = Infinity) {
    if (project.parts) return shotStageHTML(project, eager)
    const slabs = project.layers
      .map((layer, index) => `<div class="slab" data-layer="${esc(layer.title)}" style="--i:${index};${hueStyle(layer.hue)}"><span class="slab-label">${esc(layer.title)}</span></div>`)
      .join('')
    return `<div class="stage" aria-hidden="true">
      <div class="slabs${project.screen === 'app' ? ' portrait' : ''}" style="--n:${project.layers.length}">
        ${slabs}
        <div class="slab screen" style="--i:${project.layers.length + 0.6}">${screenSVG(project.screen, project.hue, project.light)}</div>
      </div>
    </div>`
  }

  const chipsHTML = (project) =>
    [...(sample ? ['Sample'] : []), ...project.tags]
      .map((tag) => `<span class="badge${tag === 'Sample' ? ' sample' : ''}">${esc(tag)}</span>`)
      .join('')

  // ---- Grid and filters ----

  const works = $('#works')
  const filters = $('#filters')
  const tags = [...new Set(projects.flatMap((project) => project.tags))]
  let activeTag = 'All'

  // The first row is in view when the page opens; cards further down load their screenshots as they come near.
  const EAGER_CARDS = 2

  // A card is an article with a heading and a real link to the live site. The button in the heading
  // stretches over the whole card, so the card still opens with one click, Enter or Space.
  function cardHTML(project, index) {
    return `<article class="work" id="project-${project.id}" data-project="${project.id}" style="--h:${project.hue};--gap:${Math.min(13, 100 / project.layers.length).toFixed(1)}px;view-transition-name:work-${project.id}">
      ${stageHTML(project, index < EAGER_CARDS ? AT_REST : 0)}
      <div class="work-body">
        <h3 class="work-title"><button type="button" class="work-hit" aria-describedby="work-open-${project.id}">${esc(project.name)}</button><span class="work-price">${P.formatUSD(project.total)}</span></h3>
        ${project.host ? `<a class="work-host" href="${esc(project.url)}" target="_blank" rel="noopener" aria-label="Visit ${esc(project.host)}">${esc(project.host)}</a>` : ''}
        <span class="chips">${chipsHTML(project)}</span>
        <span class="bricks" aria-hidden="true">${project.layers.map((layer) => `<span style="${hueStyle(layer.hue)}"></span>`).join('')}</span>
        <span class="work-meta">${project.recipe.map((product) => product.size).join(' + ')} · ${project.blocks} blocks</span>
        <span class="work-open" id="work-open-${project.id}">Take it apart ${icon('arrow-right')}</span>
        <a class="work-case" href="case-study-${project.id}.html">Read the case study ${icon('arrow-right')}</a>
      </div>
    </article>`
  }

  // Screenshots that were waiting load as soon as a card is pointed at or focused, before it comes apart.
  function loadShots(card) {
    for (const image of $$('img[loading="lazy"]', card)) image.loading = 'eager'
  }

  function renderFilters() {
    const shown = projects.filter((project) => activeTag === 'All' || project.tags.includes(activeTag)).length
    filters.innerHTML =
      ['All', ...tags]
        .map((tag) => `<button type="button" class="preset" data-tag="${esc(tag)}" aria-pressed="${tag === activeTag}"><b>${esc(tag)}</b></button>`)
        .join('') + `<p aria-live="polite">${P.pluralize(shown, 'project')}</p>`
  }

  function applyFilter() {
    for (const card of $$('.work', works)) {
      const project = projects.find((entry) => entry.id === card.dataset.project)
      card.hidden = !(activeTag === 'All' || project.tags.includes(activeTag))
    }
  }

  filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tag]')
    if (!button || button.dataset.tag === activeTag) return
    activeTag = button.dataset.tag
    const update = () => {
      applyFilter()
      renderFilters()
      $(`[data-tag="${CSS.escape(activeTag)}"]`, filters)?.focus()
    }
    // Cards glide to their new places where the browser supports it.
    if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(update)
    else update()
  })

  // A soft light follows the pointer across a card.
  works.addEventListener('pointermove', (event) => {
    const card = event.target.closest('.work')
    if (!card) return
    loadShots(card)
    const box = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${event.clientX - box.left}px`)
    card.style.setProperty('--my', `${event.clientY - box.top}px`)
  })

  works.addEventListener('focusin', (event) => {
    const card = event.target.closest('.work')
    if (card) loadShots(card)
  })

  works.addEventListener('click', (event) => {
    if (event.target.closest('a')) return // the link to the live site
    const card = event.target.closest('.work')
    if (card) openProject(card.dataset.project)
  })

  // ---- Project detail ----

  const dialog = $('#project')
  const body = $('#project-body')
  let revealFrame = 0
  let open = null // { project, off: Set of section keys switched off, shown: price on screen }

  function setApart(value) {
    $('.detail-stage', body).style.setProperty('--t', value)
    $('#apart', body).value = Math.round(value * 100)
    placeLabels()
  }

  function setPrice(value) {
    const node = $('#detail-price', body)
    const from = open.shown
    open.shown = value
    cancelAnimationFrame(node._frame)
    if (from === value || reduceMotion.matches) {
      node.textContent = P.formatUSD(value)
      return
    }
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / 450)
      node.textContent = P.formatUSD(Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) node._frame = requestAnimationFrame(tick)
    }
    node._frame = requestAnimationFrame(tick)
  }

  // Reflect which categories are switched on: rows, layers, the cost bar and the price.
  function syncDetail() {
    const { project, off } = open
    const live = new Map() // layer title -> amount still in the build
    let price = 0
    for (const product of project.recipe) {
      live.set(FOUNDATION, (live.get(FOUNDATION) ?? 0) + product.foundation.amount)
      price += product.foundation.amount
      for (const section of product.sections) {
        const on = !off.has(section.key)
        if (on) price += section.amount
        live.set(section.title, (live.get(section.title) ?? 0) + (on ? section.amount : 0))
      }
    }

    for (const row of $$('.recipe [data-key]', body)) row.setAttribute('aria-pressed', !off.has(row.dataset.key))
    for (const slab of $$('.slab[data-layer]', body)) slab.classList.toggle('ghost', !live.get(slab.dataset.layer))
    for (const segment of $$('.costbar span', body)) segment.style.flexGrow = live.get(segment.dataset.layer) ?? 0

    setPrice(price)
    $('#detail-caption', body).textContent =
      off.size === 0
        ? `All ${project.blocks} blocks at today's prices, about ${project.weeks} weeks of work`
        : `Without ${P.pluralize(off.size, 'category').replace('categorys', 'categories')}, saving ${P.formatUSD(project.total - price)}`
    $('#detail-reset', body).hidden = off.size === 0
  }

  // ---- Deep links: portfolio.html#project-<id> opens that project, and the address follows the dialog ----

  const hashFor = (id) => `#project-${id}`
  const projectFromHash = () => {
    const match = /^#project-([a-z0-9-]+)$/.exec(window.location.hash)
    return (match && projects.find((entry) => entry.id === match[1])) || null
  }

  // Opening a project adds one history entry, so Back closes it again.
  function noteOpened(id) {
    if (window.location.hash === hashFor(id)) return
    try {
      history.pushState({ project: id }, '', hashFor(id))
    } catch {
      window.location.hash = hashFor(id)
    }
  }

  // Closing takes that entry back out. A project opened straight from a link has no entry of ours
  // behind it, so the hash is cleared in place instead of leaving the page.
  function noteClosed() {
    if (!projectFromHash()) return
    if (history.state && history.state.project) {
      history.back()
      return
    }
    try {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    } catch {
      window.location.hash = ''
    }
  }

  // Back, Forward or a hand-edited address: make the dialog match the hash.
  function syncWithHash() {
    const project = projectFromHash()
    if (project) {
      if (!dialog.open || open?.project.id !== project.id) openProject(project.id)
    } else if (dialog.open) {
      dialog.close()
    }
  }

  function openProject(id) {
    const project = projects.find((entry) => entry.id === id)
    if (!project) return
    open = { project, off: new Set(), shown: project.total }
    noteOpened(id)

    const row = (section, toggle) => {
      const inner = `<i aria-hidden="true"></i><b>${esc(section.title)}</b><span class="row-amount">${P.formatUSD(section.amount)}</span><small>${esc(section.blocks.join(', '))}</small>`
      return toggle
        ? `<li><button type="button" class="row" data-key="${section.key}" data-layer="${esc(section.title)}" aria-pressed="true" style="--h:${section.hue}">${inner}</button></li>`
        : `<li><div class="row" data-layer="${esc(section.title)}" style="--c:0;--h:0">${inner}</div></li>`
    }

    const recipe = project.recipe
      .map(
        (product) => `<div>
          <h3>${esc(product.name)}<span>${esc(product.size)}</span></h3>
          <ul>${row(product.foundation, false)}${product.sections.map((section) => row(section, true)).join('')}</ul>
        </div>`,
      )
      .join('')

    const dense = project.layers.length > 8
    body.innerHTML = `<div class="detail-stage${dense ? ' dense' : ''}" style="--h:${project.hue};--gap:${Math.min(26, 210 / project.layers.length).toFixed(1)}px">
        ${stageHTML(project)}
        <div class="apart">
          <label for="apart">Take it apart</label>
          <input id="apart" type="range" min="0" max="100" step="1" value="0">
        </div>
        ${project.parts ? '<p class="hint">Point at a piece to lift it. Click one to look closer.</p>' : ''}
        ${project.url ? `<a class="btn btn-outline btn-lg" href="${esc(project.url)}" target="_blank" rel="noopener">Visit ${esc(project.host)}</a>` : ''}
      </div>
      <div class="detail-info">
        <div class="detail-about">
        <div class="dialog-head">
          <div class="chips">${chipsHTML(project)}</div>
          <h2 id="project-title">${esc(project.name)}</h2>
          <p>${esc(project.summary)}</p>
        </div>
        <div class="detail-foot">
          <a class="btn btn-primary btn-xl" href="index.html#build-${project.id}">Open the full build in the builder ${icon('arrow-right')}</a>
          <a class="text-link" href="case-study-${project.id}.html">Read the ${esc(project.name)} case study ${icon('arrow-right')}</a>
          <p class="fineprint">Prices are what these blocks cost in the builder today, not what the client paid.${project.note ? ` ${esc(project.note)}` : ''}</p>
        </div>
        </div>
        <div class="detail-cost">
        <div class="money">
          <p class="detail-price"><b id="detail-price">${P.formatUSD(project.total)}</b><button type="button" class="btn btn-ghost" id="detail-reset" hidden>${icon('rotate-ccw')}Put it all back</button></p>
          <p class="detail-caption" id="detail-caption"></p>
          <div class="costbar" aria-hidden="true">${project.layers.map((layer) => `<span data-layer="${esc(layer.title)}" style="${hueStyle(layer.hue)}"></span>`).join('')}</div>
        </div>
        <p class="hint">Switch a category off to see the price without it.</p>
        <div class="recipe">${recipe}</div>
        </div>
      </div>`

    syncDetail()
    if (!dialog.open) dialog.showModal()
    watchStages(body)

    // Open assembled, then lift the layers once so it is clear the stack comes apart.
    cancelAnimationFrame(revealFrame)
    const target = open.project.parts ? 1 : 0.7
    if (reduceMotion.matches) {
      setApart(target)
      return
    }
    setApart(0)
    const start = performance.now() + 250
    const tick = (now) => {
      const progress = Math.min(1, Math.max(0, (now - start) / 900))
      setApart(target * (1 - Math.pow(1 - progress, 3)))
      if (progress < 1) revealFrame = requestAnimationFrame(tick)
    }
    revealFrame = requestAnimationFrame(tick)
  }

  body.addEventListener('input', (event) => {
    if (event.target.id !== 'apart') return
    cancelAnimationFrame(revealFrame)
    setApart(Number(event.target.value) / 100)
  })

  body.addEventListener('click', (event) => {
    if (event.target.closest('#detail-reset')) {
      open.off.clear()
      syncDetail()
      return
    }
    // Click a component (or its name tag) to see it flat and large; click again to put it back.
    const inspect = $('.inspect', body)
    if (event.target.closest('.inspect')) {
      inspect.hidden = true
      return
    }
    const piece = event.target.closest('.band, .band-labels span')
    if (piece && inspect) {
      const part = open.project.parts[Number(piece.dataset.part)]
      const image = $('img', inspect)
      image.src = part.src
      image.width = part.w
      image.height = part.h
      image.alt = `${open.project.name} homepage: ${part.name}`
      $('span', inspect).textContent = `${part.name}. Click to put it back.`
      inspect.hidden = false
      return
    }
    const row = event.target.closest('button.row')
    if (!row) return
    if (open.off.has(row.dataset.key)) open.off.delete(row.dataset.key)
    else open.off.add(row.dataset.key)
    syncDetail()
  })

  // Pointing at a category (in the list or the cost bar) lights up its layer in the stack.
  function light(event, on) {
    // In the screenshot view, pointing at a component or its name tag lifts that component.
    const part = event.target.closest?.('.band, .band-labels span')
    if (part) {
      for (const node of $$(`[data-part="${part.dataset.part}"]`, body)) node.classList.toggle('hot', on)
      return
    }
    const source = event.target.closest?.('.recipe .row, .costbar span')
    if (!source) return
    for (const slab of $$('.slab[data-layer]', body)) slab.classList.toggle('lit', on && slab.dataset.layer === source.dataset.layer)
  }
  for (const [type, on] of [['pointerover', true], ['pointerout', false], ['focusin', true], ['focusout', false]]) {
    body.addEventListener(type, (event) => light(event, on))
  }

  $('#project-close').addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => {
    cancelAnimationFrame(revealFrame)
    noteClosed()
  })
  window.addEventListener('popstate', syncWithHash)
  window.addEventListener('hashchange', syncWithHash)

  // ---- Start ----

  for (const placeholder of $$('i[data-icon]')) placeholder.outerHTML = icon(placeholder.dataset.icon)
  $('#year').textContent = new Date().getFullYear()
  $('#sample-note').hidden = !sample
  // The page ships with a plain, readable version of every project (written by tools/build-seo.js).
  // Swap it for the interactive cards.
  works.innerHTML = projects.map(cardHTML).join('')
  watchStages(works)
  renderFilters()
  syncWithHash()
})()
