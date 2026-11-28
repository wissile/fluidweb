// Fluidweb play layer: sound, motion and small rewards that answer what the visitor does.
//
// - Every block has a note. Its category picks the pitch from a pentatonic scale, so any build sounds
//   in tune, and "Play your build" in the summary plays the whole stack as a melody.
// - Adding a block snaps it in: a pluck panned to where it sits on screen, a burst of particles in
//   its category color, the price change floating up, and a brick that flies into the stack.
// - Combos: a few combinations of blocks earn a short toast and a chord, once per visit.
// - The home page hero has floating blocks that drift away from a finger or cursor.
// Sound only ever follows a tap, click or key press (browsers block anything else), can be switched
// off with the speaker button in the header, and is silent on iPhone while the silent switch is on.
// Motion is skipped when the visitor asks for reduced motion. No audio files: everything is
// synthesized with the Web Audio API.
;(function () {
  const $ = (selector, root = document) => root.querySelector(selector)
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector))
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
  const calm = () => reduceMotion.matches
  const Catalog = window.Catalog
  const hues = (window.Theme && window.Theme.SECTION_HUES) || {}
  const haptic = (pattern) => window.FWExperience && window.FWExperience.haptic(pattern)

  // ---- Sound engine ----

  const SOUND_KEY = 'fluidweb.sound.v1'
  let soundOn = true
  try {
    soundOn = localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {}

  let ctx = null
  let out = null

  // Created inside the first tap so iPhone allows it; afterwards it keeps running.
  function audio() {
    if (!soundOn) return null
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return null
    if (!ctx) {
      try {
        ctx = new AudioContext()
        const compressor = ctx.createDynamicsCompressor()
        compressor.threshold.value = -18
        compressor.ratio.value = 4
        out = ctx.createGain()
        out.gain.value = 0.5
        out.connect(compressor)
        compressor.connect(ctx.destination)
        // A silent sample: older iOS versions only unlock Web Audio once something has played.
        const silent = ctx.createBufferSource()
        silent.buffer = ctx.createBuffer(1, 1, 22050)
        silent.connect(ctx.destination)
        silent.start(0)
      } catch {
        ctx = null
        return null
      }
    }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume()
    return ctx
  }
  for (const type of ['pointerup', 'keydown']) document.addEventListener(type, () => audio(), { capture: true, passive: true })

  // Where a sound sits left to right follows where it happened on screen.
  function panner(x) {
    if (!ctx.createStereoPanner || x === undefined) return out
    const pan = ctx.createStereoPanner()
    pan.pan.value = Math.max(-0.7, Math.min(0.7, (x / window.innerWidth) * 1.4 - 0.7))
    pan.connect(out)
    return pan
  }

  function noiseBuffer(seconds) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * seconds))
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    return buffer
  }

  // A soft mallet note, like a small marimba.
  function pluck(frequency, { at = 0, level = 0.32, length = 0.45, x, snap = false } = {}) {
    if (!audio()) return
    const t = ctx.currentTime + 0.005 + at
    const dest = panner(x)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(level, t + 0.006)
    env.gain.exponentialRampToValueAtTime(0.0001, t + length)
    env.connect(dest)
    for (const [type, multiple, share] of [
      ['sine', 1, 1],
      ['triangle', 2, 0.18],
      ['sine', 4.01, 0.05],
    ]) {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.value = frequency * multiple
      const g = ctx.createGain()
      g.gain.value = share
      osc.connect(g).connect(env)
      osc.start(t)
      osc.stop(t + length + 0.05)
    }
    if (snap) {
      // The click of a block locking into place.
      const click = ctx.createBufferSource()
      click.buffer = noiseBuffer(0.03)
      const high = ctx.createBiquadFilter()
      high.type = 'highpass'
      high.frequency.value = 2500
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.22, t)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025)
      click.connect(high).connect(g).connect(dest)
      click.start(t)
    }
  }

  // A lower, falling note for taking a block away.
  function drop(frequency, { x } = {}) {
    if (!audio()) return
    const t = ctx.currentTime + 0.005
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency / 2, t)
    osc.frequency.exponentialRampToValueAtTime(frequency / 3, t + 0.16)
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 900
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(0.3, t + 0.008)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
    osc.connect(low).connect(env).connect(panner(x))
    osc.start(t)
    osc.stop(t + 0.25)
  }

  // A tiny tick for steppers and the page slider.
  function tick(frequency, { x } = {}) {
    if (!audio()) return
    const t = ctx.currentTime + 0.003
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = frequency
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(0.16, t + 0.003)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    osc.connect(env).connect(panner(x))
    osc.start(t)
    osc.stop(t + 0.06)
  }

  function whoosh(up) {
    if (!audio()) return
    const t = ctx.currentTime + 0.005
    const noise = ctx.createBufferSource()
    noise.buffer = noiseBuffer(0.5)
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 1.1
    band.frequency.setValueAtTime(up ? 300 : 3200, t)
    band.frequency.exponentialRampToValueAtTime(up ? 3200 : 250, t + 0.4)
    const env = ctx.createGain()
    env.gain.setValueAtTime(0.0001, t)
    env.gain.exponentialRampToValueAtTime(0.28, t + 0.15)
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
    noise.connect(band).connect(env).connect(out)
    noise.start(t)
  }

  const chord = (frequencies, spread = 0.05, options = {}) =>
    frequencies.forEach((f, i) => pluck(f, { at: i * spread, level: 0.2, length: 1.1, ...options }))

  // ---- Notes: each block's category picks a step on a pentatonic scale ----

  const SCALE = [0, 2, 4, 7, 9]
  const ROOT = { website: 196.0, app: 293.66 } // G3 and D4
  const stepFreq = (productId, step) =>
    (ROOT[productId] || ROOT.website) * Math.pow(2, (SCALE[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)) / 12)

  const optionInfo = new Map() // optionId -> { productId, sectionId, step }
  const sectionStep = new Map() // sectionId -> step
  if (Catalog) {
    for (const productId of Catalog.PRODUCT_IDS) {
      Catalog.CATALOG[productId].sections.forEach((section, index) => {
        sectionStep.set(section.id, index)
        section.options.forEach((option, position) =>
          optionInfo.set(option.id, { productId, sectionId: section.id, step: index + (position % 3) }),
        )
      })
    }
  }
  const lineFreq = (productId, line) => {
    const info = optionInfo.get(line.id)
    if (info) return stepFreq(productId, info.step)
    return stepFreq(productId, line.id.endsWith('-units') ? 2 : 0) / 2
  }

  // ---- Visual effects ----

  let fx = null
  let fxContext = null
  let particles = []
  let fxFrame = 0

  function ensureCanvas() {
    if (fx) return
    fx = document.createElement('canvas')
    fx.className = 'fx-canvas'
    fx.setAttribute('aria-hidden', 'true')
    document.body.appendChild(fx)
    fxContext = fx.getContext('2d')
    const size = () => {
      const ratio = Math.min(2, window.devicePixelRatio || 1)
      fx.width = Math.round(window.innerWidth * ratio)
      fx.height = Math.round(window.innerHeight * ratio)
      fxContext.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    size()
    window.addEventListener('resize', size)
  }

  function burst(x, y, hue, count = 16) {
    if (calm() || x === undefined) return
    ensureCanvas()
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 120 + Math.random() * 260
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120,
        size: 3 + Math.random() * 4,
        spin: (Math.random() - 0.5) * 12,
        angle: Math.random() * Math.PI,
        life: 0,
        max: 0.55 + Math.random() * 0.35,
        color: `oklch(${0.72 + Math.random() * 0.14} 0.15 ${hue})`,
      })
    }
    if (!fxFrame) {
      let last = performance.now()
      const step = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now
        fxContext.clearRect(0, 0, window.innerWidth, window.innerHeight)
        particles = particles.filter((p) => (p.life += dt) < p.max)
        for (const p of particles) {
          p.vy += 700 * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.angle += p.spin * dt
          fxContext.globalAlpha = 1 - p.life / p.max
          fxContext.fillStyle = p.color
          fxContext.save()
          fxContext.translate(p.x, p.y)
          fxContext.rotate(p.angle)
          fxContext.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
          fxContext.restore()
        }
        fxContext.globalAlpha = 1
        fxFrame = particles.length ? requestAnimationFrame(step) : 0
      }
      fxFrame = requestAnimationFrame(step)
    }
  }

  // "+$600" rising from where the block was added.
  function floatDelta(x, y, amount) {
    if (x === undefined || !amount) return
    const node = document.createElement('span')
    node.className = `fx-delta ${amount > 0 ? 'up' : 'down'}`
    node.setAttribute('aria-hidden', 'true')
    node.textContent = `${amount > 0 ? '+' : '−'}${window.Pricing.formatUSD(Math.abs(amount))}`
    node.style.left = `${x}px`
    node.style.top = `${y}px`
    document.body.appendChild(node)
    const animation = node.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.8)', opacity: 0 },
        { transform: 'translate(-50%, -110%) scale(1.05)', opacity: 1, offset: 0.2 },
        { transform: 'translate(-50%, -260%) scale(1)', opacity: 0 },
      ],
      { duration: calm() ? 700 : 1000, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
    )
    animation.onfinish = () => node.remove()
  }

  // A brick that flies from the block into the stack (or the total on a phone).
  function flyToStack(x, y, hue) {
    const sidebar = $('.summary-aside')
    const inSidebar = sidebar && sidebar.offsetParent !== null
    const bricks = inSidebar ? $$('.summary-aside .stack span.new') : []
    const target = bricks[bricks.length - 1] || (inSidebar ? $('.summary-aside [data-total]') : $('#dock:not([hidden]) #dock-total'))
    if (!target || x === undefined) return
    if (calm()) return catchAt(target)
    const box = target.getBoundingClientRect()
    if (!box.width) return
    const tx = box.left + box.width / 2
    const ty = box.top + box.height / 2
    const brick = document.createElement('span')
    brick.className = 'fx-fly'
    brick.setAttribute('aria-hidden', 'true')
    brick.style.setProperty('--h', hue)
    brick.style.left = `${x}px`
    brick.style.top = `${y}px`
    document.body.appendChild(brick)
    if (target.matches('.stack span')) target.style.opacity = '0'
    const dx = tx - x
    const dy = ty - y
    const lift = Math.min(160, Math.abs(dx) * 0.35 + 60)
    const flight = brick.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1.4) rotate(0deg)' },
        { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - lift}px)) scale(1.15) rotate(160deg)`, offset: 0.5 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(360deg)` },
      ],
      { duration: 620, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' },
    )
    flight.onfinish = () => {
      brick.remove()
      if (target.isConnected) target.style.opacity = ''
      catchAt(target)
    }
  }

  function catchAt(target) {
    if (!target.isConnected) return
    target.classList.remove('catch')
    void target.offsetWidth
    target.classList.add('catch')
  }

  function bumpTotals(up) {
    for (const node of $$('[data-total], #dock-total')) {
      node.classList.remove('bump-up', 'bump-down')
      void node.offsetWidth
      node.classList.add(up ? 'bump-up' : 'bump-down')
    }
  }

  function snapBlock(block) {
    if (!block) return
    block.classList.remove('snap')
    void block.offsetWidth
    block.classList.add('snap')
  }

  // ---- Combos ----

  const COMBO_KEY = 'fluidweb.combos.v1'
  const COMBOS = [
    { id: 'search', title: 'Found everywhere', text: 'SEO and AEO together: search engines and AI answers both covered.', test: (h) => h('w-seo') && h('w-aeo') },
    {
      id: 'sell',
      title: 'Open for business',
      text: 'Accounts plus payments: ready to take money.',
      test: (h) => (h('w-auth') && (h('w-payments') || h('w-subscriptions') || h('w-store'))) || (h('a-auth') && (h('a-iap') || h('a-subscriptions') || h('a-payments'))),
    },
    { id: 'global', title: 'Going global', text: 'More languages and accessibility: open to everyone.', test: (h) => (h('w-language') && (h('w-wcag') || h('w-a11y-audit'))) || (h('a-language') && h('a-a11y')) },
    { id: 'fortress', title: 'Fortress mode', text: 'Security, backups and monitoring all stacked.', test: (h) => h('w-security') && h('w-backups') && h('w-monitoring') },
    { id: 'brand', title: 'Brand new look', text: 'A designer and a brand kit: it will look like nobody else.', test: (h) => (h('w-design-custom') || h('w-design-premium')) && h('w-brand-kit') },
    { id: 'both', title: 'Full stack', text: 'A website and an app, built together.', test: (h, config) => config.website.enabled && config.app.enabled },
  ]
  let earned = new Set()
  try {
    earned = new Set(JSON.parse(sessionStorage.getItem(COMBO_KEY) || '[]'))
  } catch {}

  function checkCombos(config) {
    const has = (id) => {
      const productId = id.startsWith('a-') ? 'app' : 'website'
      return Boolean(config[productId] && config[productId].enabled && config[productId].selections[id])
    }
    const fresh = COMBOS.find((combo) => !earned.has(combo.id) && combo.test(has, config))
    if (!fresh) return
    earned.add(fresh.id)
    try {
      sessionStorage.setItem(COMBO_KEY, JSON.stringify([...earned]))
    } catch {}
    setTimeout(() => showCombo(fresh), 380)
  }

  let toastTimer = 0
  function showCombo(combo) {
    let toast = $('#combo-toast')
    if (!toast) {
      toast = document.createElement('div')
      toast.id = 'combo-toast'
      toast.className = 'combo-toast'
      toast.setAttribute('role', 'status')
      document.body.appendChild(toast)
    }
    const icon = window.Theme ? window.Theme.icon('sparkles') : ''
    toast.innerHTML = `${icon}<div><p class="combo-title">Combo: ${combo.title}</p><p>${combo.text}</p></div>`
    toast.classList.remove('show')
    void toast.offsetWidth
    toast.classList.add('show')
    chord([392, 493.88, 587.33, 783.99], 0.06)
    haptic([10, 40, 10, 40, 16])
    const box = toast.getBoundingClientRect()
    burst(box.left + 24, box.top + box.height / 2, 95, 22)
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200)
  }

  // ---- Reacting to the builder ----

  let origin = null
  let point = null
  const ORIGINS = '[data-option], .product, .preset, .scope-card, [data-action], .stepper'
  document.addEventListener(
    'pointerdown',
    (event) => {
      origin = event.target.closest ? event.target.closest(ORIGINS) : null
      point = { x: event.clientX, y: event.clientY }
    },
    true,
  )
  document.addEventListener(
    'keydown',
    () => {
      origin = document.activeElement && document.activeElement.closest ? document.activeElement.closest(ORIGINS) : null
      point = null
    },
    true,
  )

  function originPoint() {
    if (point && origin) return point
    if (!origin) return {}
    const box = origin.getBoundingClientRect()
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
  }

  const lineKeys = (quote) => {
    const map = new Map()
    for (const product of quote.products) for (const line of product.lines) map.set(`${product.productId}:${line.id}`, { productId: product.productId, line })
    return map
  }

  let lastTick = 0

  document.addEventListener('fw:build', (event) => {
    const { action, before, after, config } = event.detail
    const { x, y } = originPoint()
    const delta = after.total - before.total
    const was = lineKeys(before)
    const now = lineKeys(after)
    const added = [...now].filter(([key, entry]) => !was.has(key) || entry.line.quantity > was.get(key).line.quantity)
    const removed = [...was].filter(([key, entry]) => !now.has(key) || entry.line.quantity > now.get(key).line.quantity)

    if (action.type === 'replace') {
      if (!after.products.length) {
        whoosh(false)
        haptic(14)
      } else {
        // A template: the blocks arrive one after another, each with its note.
        const notes = after.products.flatMap((product) => product.lines.map((line) => lineFreq(product.productId, line))).slice(0, 18)
        notes.forEach((f, i) => pluck(f, { at: i * 0.045, level: 0.22, length: 0.5, x }))
        burst(x, y, 250, 26)
        haptic([10, 30, 10])
        if (!calm()) {
          $$('.panel:not(.leaving) .block.active').slice(0, 40).forEach((block, i) => {
            block.style.setProperty('--d', `${i * 22}ms`)
            block.classList.remove('cascade')
            void block.offsetWidth
            block.classList.add('cascade')
          })
        }
      }
    } else if (action.type === 'toggleProduct') {
      const on = config[action.productId].enabled
      const root = ROOT[action.productId]
      if (on) {
        whoosh(true)
        chord([root * 2, root * 2.52, root * 3], 0.07, { x })
        burst(x, y, action.productId === 'app' ? 250 : 0, 26)
      } else {
        drop(root * 2, { x })
      }
    } else if (action.type === 'setUnits') {
      const units = config[action.productId].units
      const time = performance.now()
      if (time - lastTick > 28) {
        tick(320 * Math.pow(2, Math.min(units, 60) / 30), { x })
        lastTick = time
      }
    } else if (added.length) {
      const [, entry] = added[added.length - 1]
      const hue = hues[entry.line.sectionId] ?? 250
      pluck(lineFreq(entry.productId, entry.line), { x, snap: true })
      burst(x, y, hue)
      snapBlock(origin && origin.closest('.block'))
      flyToStack(x, y, hue)
    } else if (removed.length) {
      const [, entry] = removed[removed.length - 1]
      drop(lineFreq(entry.productId, entry.line), { x })
    }

    if (delta && action.type !== 'setUnits') floatDelta(x, y, delta)
    if (delta) bumpTotals(delta > 0)
    if (after.total > before.total) checkCombos(config)
  })

  // ---- Play your build ----

  let playing = 0
  function playBuild(button) {
    const quote = window.FWBuilder && window.FWBuilder.quote()
    if (!quote || !quote.products.length) return
    clearTimeout(playing)
    const lines = quote.products.flatMap((product) => product.lines.map((line) => ({ productId: product.productId, line })))
    const beat = 0.13
    const box = button.getBoundingClientRect()
    lines.forEach(({ productId, line }, i) => pluck(lineFreq(productId, line), { at: i * beat, level: 0.26, length: 0.55, x: box.left }))
    // A closing chord on the last product's root once the melody ends.
    const root = ROOT[lines[lines.length - 1].productId]
    ;[root, root * 1.5, root * 2, root * 3].forEach((f, i) => pluck(f, { at: lines.length * beat + i * 0.05, level: 0.18, length: 1.4 }))
    // Light up each brick as its note plays.
    lines.forEach((_, i) => {
      setTimeout(() => {
        for (const stack of $$('.stack')) {
          const brick = stack.children[i]
          if (!brick) continue
          brick.classList.remove('sing')
          void brick.offsetWidth
          brick.classList.add('sing')
        }
        if (i % 2 === 0) haptic(5)
      }, i * beat * 1000)
    })
    playing = setTimeout(() => {
      const b = button.isConnected ? button.getBoundingClientRect() : box
      burst(b.left + b.width / 2, b.top + b.height / 2, 300, 28)
    }, lines.length * beat * 1000)
  }

  document.addEventListener('click', (event) => {
    const play = event.target.closest('[data-action="play-build"]')
    if (play) playBuild(play)
    const checkout = event.target.closest('[data-action="checkout"], [data-action="ask"], [data-action="talk"]')
    if (checkout) chord([293.66, 369.99, 440, 587.33], 0.035)
    const copy = event.target.closest('[data-action="copy-link"]')
    if (copy) pluck(880, { snap: true, level: 0.2 })
  })

  // ---- Small sounds around the site ----

  document.addEventListener(
    'toggle',
    (event) => {
      if (event.target.tagName === 'DETAILS') tick(event.target.open ? 660 : 440)
    },
    true,
  )

  // ---- Sound switch in the header ----

  function syncToggle() {
    for (const button of $$('[data-sound-toggle]')) {
      button.hidden = false
      button.setAttribute('aria-pressed', String(soundOn))
      button.setAttribute('aria-label', soundOn ? 'Sound effects on. Turn off' : 'Sound effects off. Turn on')
      button.title = soundOn ? 'Sound on' : 'Sound off'
    }
  }
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-sound-toggle]')) return
    soundOn = !soundOn
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off')
    } catch {}
    syncToggle()
    if (soundOn) chord([523.25, 659.25, 783.99], 0.05)
  })
  syncToggle()

  // ---- Home page hero: floating blocks that drift away from a finger or cursor ----

  function heroField() {
    const hero = $('#top.hero')
    if (!hero || calm()) return
    const canvas = document.createElement('canvas')
    canvas.className = 'hero-field'
    canvas.setAttribute('aria-hidden', 'true')
    const grid = hero.querySelector('.hero-grid')
    if (grid) grid.after(canvas)
    else hero.prepend(canvas)
    const c = canvas.getContext('2d')
    const PALETTE = [250, 250, 350, 95, 150, 25, 300, 190]
    let width = 0
    let height = 0
    let blocks = []
    let pointer = null
    let running = false
    let frame = 0

    function layout() {
      const ratio = Math.min(2, window.devicePixelRatio || 1)
      width = hero.clientWidth
      height = hero.clientHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      c.setTransform(ratio, 0, 0, ratio, 0, 0)
      const phone = width < 640
      const count = phone ? 14 : 34
      blocks = Array.from({ length: count }, (_, i) => {
        // Mostly toward the sides, so the headline stays clear.
        const side = i % 2 ? 1 : -1
        const spread = phone ? 0.5 : 0.36
        const hx = width / 2 + side * (width * (0.5 - spread * Math.random()))
        const hy = height * (0.08 + Math.random() * 0.84)
        const size = 8 + Math.random() * (phone ? 12 : 18)
        return { hx, hy, x: hx, y: hy, vx: 0, vy: 0, size, hue: PALETTE[i % PALETTE.length], alpha: phone ? 0.1 + Math.random() * 0.18 : 0.18 + Math.random() * 0.35, phase: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.4 }
      })
    }

    function step(time) {
      c.clearRect(0, 0, width, height)
      const t = time / 1000
      for (const b of blocks) {
        const tx = b.hx + Math.sin(t * 0.5 + b.phase) * 10
        const ty = b.hy + Math.cos(t * 0.4 + b.phase) * 12
        b.vx += (tx - b.x) * 0.02
        b.vy += (ty - b.y) * 0.02
        if (pointer) {
          const dx = b.x - pointer.x
          const dy = b.y - pointer.y
          const distance = Math.hypot(dx, dy) || 1
          if (distance < 140) {
            const force = (140 - distance) / 140
            b.vx += (dx / distance) * force * 2.2
            b.vy += (dy / distance) * force * 2.2
          }
        }
        b.vx *= 0.9
        b.vy *= 0.9
        b.x += b.vx
        b.y += b.vy
        c.save()
        c.translate(b.x, b.y)
        c.rotate(b.phase + t * b.spin)
        c.globalAlpha = b.alpha
        c.fillStyle = `oklch(0.75 0.14 ${b.hue})`
        const r = b.size * 0.28
        const s = b.size
        c.beginPath()
        if (c.roundRect) c.roundRect(-s / 2, -s / 2, s, s, r)
        else c.rect(-s / 2, -s / 2, s, s)
        c.fill()
        c.restore()
      }
      frame = running ? requestAnimationFrame(step) : 0
    }

    const start = () => {
      if (running) return
      running = true
      frame = requestAnimationFrame(step)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(frame)
      frame = 0
    }
    layout()
    new IntersectionObserver(([entry]) => (entry.isIntersecting && !document.hidden ? start() : stop())).observe(hero)
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()))
    window.addEventListener('resize', () => layout())
    const toLocal = (event) => {
      const box = hero.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    hero.addEventListener('pointermove', (event) => (pointer = toLocal(event)), { passive: true })
    hero.addEventListener('pointerleave', () => (pointer = null))
    hero.addEventListener('pointerup', () => {
      if (!finePointer.matches) setTimeout(() => (pointer = null), 350)
    })
    // Tapping empty space in the hero: a burst and a note, higher toward the top.
    hero.addEventListener('click', (event) => {
      if (event.target.closest('a, button, input, label')) return
      pointer = toLocal(event)
      const box = hero.getBoundingClientRect()
      const step = Math.round((1 - (event.clientY - box.top) / box.height) * 9)
      pluck(stepFreq('website', step + 3), { x: event.clientX, snap: true })
      burst(event.clientX, event.clientY, PALETTE[step % PALETTE.length], 18)
      if (!finePointer.matches) setTimeout(() => (pointer = null), 350)
    })
  }

  // ---- Cards that tilt toward the cursor (mouse and trackpad only) ----

  function tilt() {
    const panels = $('#panels')
    if (!panels) return
    let frame = 0
    panels.addEventListener('pointermove', (event) => {
      if (!finePointer.matches || calm()) return
      const block = event.target.closest('.block')
      if (!block) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = block.getBoundingClientRect()
        const px = (event.clientX - box.left) / box.width
        const py = (event.clientY - box.top) / box.height
        block.style.setProperty('--rx', `${(0.5 - py) * 7}deg`)
        block.style.setProperty('--ry', `${(px - 0.5) * 9}deg`)
        block.style.setProperty('--mx', `${px * 100}%`)
        block.style.setProperty('--my', `${py * 100}%`)
      })
    })
    panels.addEventListener(
      'pointerout',
      (event) => {
        const block = event.target.closest('.block')
        if (block && !block.contains(event.relatedTarget)) {
          block.style.removeProperty('--rx')
          block.style.removeProperty('--ry')
        }
      },
      true,
    )
  }

  heroField()
  tilt()
})()
