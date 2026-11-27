// Touch-device extras for phones and tablets (never on a desktop with a mouse):
//   1. A "warp" intro when the site is opened (arriving from another site, a link, a bookmark or a
//      reload), not when moving between its pages: stars rush past, the logo waits briefly for a tap,
//      and the page lands.
//   2. A short chime with the landing. Phone browsers only allow sound after the visitor taps, so it
//      plays on the tap during the intro (or straight away where the browser already allows sound).
//      On iPhone, sound from websites is muted while the ring/silent switch is on silent.
//   3. Haptics: a light tick on scroll and on taps of links and buttons. Android phones support this
//      through the Vibration API. iPhones have no official web API for haptics; on iOS 18 and later
//      Safari plays a haptic when a switch control is toggled during a tap, which is used here.
//      iPads have no haptic hardware for this.
// Switched on and off in site.config.json ("experience"), which the generator turns into
// window.FW_EXPERIENCE in the head of every page, next to the snippet that decides whether the intro
// runs and adds the "intro" class before first paint. lab.html tests sound and haptics on a device.
;(function () {
  const options = window.FW_EXPERIENCE || {}
  const root = document.documentElement
  const now = () => performance.now()

  // ---- Haptics ----

  let makingHaptic = false

  function haptic(pattern = 8) {
    if (typeof navigator.vibrate === 'function') {
      // Chrome ignores (and warns about) vibration before the visitor has tapped the page.
      if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return
      try {
        navigator.vibrate(pattern)
      } catch {}
      return
    }
    // iPhone, iOS 18 and later: toggling a switch control during a touch plays a light haptic.
    // It only works inside a touch or click handler, which is where this is called from.
    makingHaptic = true
    try {
      const label = document.createElement('label')
      label.setAttribute('aria-hidden', 'true')
      label.style.display = 'none'
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.setAttribute('switch', '')
      input.tabIndex = -1
      label.appendChild(input)
      document.head.appendChild(label)
      label.click()
      label.remove()
    } catch {}
    makingHaptic = false
  }

  // ---- Chime (synthesized, no audio file) ----

  function newAudio() {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return null
    try {
      return new AudioContext()
    } catch {
      return null
    }
  }

  // iPhone only starts sound inside a tap (touchend or click, not touchstart). Call this from such a
  // handler: it resumes the context, or replaces it with one created inside the tap, and plays a
  // silent sample, which is what unlocks Web Audio on older iOS versions.
  function unlockAudio(ctx) {
    if (!ctx || ctx.state === 'closed') ctx = newAudio()
    if (!ctx) return null
    try {
      if (ctx.resume) ctx.resume()
      const source = ctx.createBufferSource()
      source.buffer = ctx.createBuffer(1, 1, 22050)
      source.connect(ctx.destination)
      source.start(0)
    } catch {}
    return ctx
  }

  function chime(ctx) {
    if (!ctx) return
    if (ctx.state !== 'running' && ctx.resume) ctx.resume()
    const t0 = ctx.currentTime + 0.02

    const master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)
    // A short, soft echo for shimmer.
    const delay = ctx.createDelay(1)
    delay.delayTime.value = 0.16
    const feedback = ctx.createGain()
    feedback.gain.value = 0.3
    const wet = ctx.createGain()
    wet.gain.value = 0.35
    master.connect(delay)
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(wet)
    wet.connect(ctx.destination)

    // The swoosh: noise through a band-pass filter that sweeps upward.
    const length = Math.floor(ctx.sampleRate * 0.6)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 0.9
    band.frequency.setValueAtTime(240, t0)
    band.frequency.exponentialRampToValueAtTime(4200, t0 + 0.45)
    const swoosh = ctx.createGain()
    swoosh.gain.setValueAtTime(0.0001, t0)
    swoosh.gain.exponentialRampToValueAtTime(0.45, t0 + 0.28)
    swoosh.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55)
    noise.connect(band).connect(swoosh).connect(master)
    noise.start(t0)
    noise.stop(t0 + 0.6)

    // The landing: a bright bell chord, notes a few milliseconds apart (E5, B5, E6, G#6).
    const notes = [
      [659.25, 0.3, 0],
      [987.77, 0.22, 0.06],
      [1318.51, 0.15, 0.12],
      [1661.22, 0.07, 0.18],
    ]
    for (const [frequency, level, offset] of notes) {
      const start = t0 + 0.3 + offset
      for (const [type, detune, share] of [
        ['sine', 0, 1],
        ['triangle', 7, 0.3],
      ]) {
        const osc = ctx.createOscillator()
        osc.type = type
        osc.frequency.value = frequency
        osc.detune.value = detune
        const env = ctx.createGain()
        env.gain.setValueAtTime(0.0001, start)
        env.gain.exponentialRampToValueAtTime(level * share, start + 0.012)
        env.gain.exponentialRampToValueAtTime(0.0001, start + 1.4)
        osc.connect(env).connect(master)
        osc.start(start)
        osc.stop(start + 1.5)
      }
    }
    setTimeout(() => ctx.close && ctx.close(), 2800)
  }

  window.FWExperience = { haptic, chime, newAudio, unlockAudio }

  const touch = window.matchMedia('(hover: none) and (pointer: coarse)').matches
  if (!touch) return

  let introRunning = false

  if (options.haptics) {
    // Taps on anything that does something: links, buttons, form controls, FAQ questions.
    const TAPPABLE = 'a[href], button, [role="button"], summary, select, input[type="checkbox"], input[type="radio"], input[type="range"], label'
    document.addEventListener(
      'click',
      (event) => {
        if (!event.isTrusted || makingHaptic || introRunning) return
        if (event.target.closest && event.target.closest(TAPPABLE)) haptic(8)
      },
      true,
    )

    if (typeof navigator.vibrate === 'function') {
      // One tick when a scroll starts; the rest of the same swipe (and its momentum) stays quiet.
      let last = -Infinity
      window.addEventListener(
        'scroll',
        () => {
          const t = now()
          if (t - last > 240 && !introRunning) haptic(7)
          last = t
        },
        { passive: true },
      )
    } else {
      // iPhone: the switch trick needs a touch event, so tick when a swipe ends.
      let startY = null
      let last = -Infinity
      window.addEventListener('touchstart', (event) => (startY = event.touches[0]?.clientY ?? null), { passive: true })
      window.addEventListener(
        'touchend',
        (event) => {
          if (startY === null || introRunning) return
          const moved = Math.abs((event.changedTouches[0]?.clientY ?? startY) - startY)
          startY = null
          if (moved > 14 && now() - last > 150) {
            last = now()
            haptic()
          }
        },
        { passive: true },
      )
    }
  }

  // ---- Warp intro ----

  const timing = { warp: 1300, holdUntil: 2800 } // the logo waits for a tap until 2.8 s, then the page lands anyway
  const LAND_MS = 650

  function runIntro() {
    if (document.hidden) {
      root.classList.remove('intro')
      return
    }
    introRunning = true

    // Sound now if the browser allows it (some do once the visitor has interacted with this site);
    // otherwise the context stays suspended and a tap starts it.
    let audio = newAudio()
    let soundPlayed = false
    const canPlayNow = () => Boolean(audio) && audio.state === 'running'

    const overlay = document.createElement('div')
    overlay.className = 'warp'
    overlay.setAttribute('aria-hidden', 'true')
    overlay.innerHTML =
      '<canvas></canvas><div class="warp-mark"><span></span><span></span><span></span><span></span></div><p class="warp-hint">Tap to enter</p>'
    document.body.appendChild(overlay)
    root.classList.add('warp-on')
    root.classList.remove('intro')

    const canvas = overlay.querySelector('canvas')
    const ctx = canvas.getContext('2d')
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    let width = 0
    let height = 0
    function size() {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, width, height)
    }
    size()
    window.addEventListener('resize', size)

    const COUNT = 420
    const stars = []
    const spawn = (star, far) => {
      star.x = (Math.random() * 2 - 1) * 1.6
      star.y = (Math.random() * 2 - 1) * 1.6
      star.z = far ? 1 : 0.05 + Math.random() * 0.95
      star.pz = star.z
      star.blue = Math.random() < 0.28
      return star
    }
    for (let i = 0; i < COUNT; i++) stars.push(spawn({}, false))

    const start = now()
    let lastFrame = start
    let landing = false
    let frame = 0

    // Speed in depth units per second: a slow drift that ramps hard into warp, then eases off.
    function speed(t) {
      if (t < timing.warp) {
        const p = t / timing.warp
        return 0.3 + 3.2 * p * p * p
      }
      const p = Math.min(1, (t - timing.warp) / 500)
      return 3.5 - 3.28 * (1 - Math.pow(1 - p, 3))
    }

    function draw(time) {
      const t = time - start
      const dt = Math.min(0.05, (time - lastFrame) / 1000)
      lastFrame = time
      const v = speed(t)
      ctx.fillStyle = `rgba(0,0,0,${v > 1.5 ? 0.38 : 0.6})`
      ctx.fillRect(0, 0, width, height)
      const cx = width / 2
      const cy = height / 2
      const scale = Math.max(width, height) * 0.5
      for (const star of stars) {
        star.pz = star.z
        star.z -= v * dt
        if (star.z <= 0.02) {
          spawn(star, true)
          continue
        }
        const x = cx + (star.x / star.z) * scale
        const y = cy + (star.y / star.z) * scale
        const px = cx + (star.x / star.pz) * scale
        const py = cy + (star.y / star.pz) * scale
        if (x < -50 || x > width + 50 || y < -50 || y > height + 50) {
          spawn(star, true)
          continue
        }
        const near = 1 - star.z
        const alpha = Math.min(1, 0.2 + near * 1.5)
        ctx.strokeStyle = star.blue ? `rgba(89,165,245,${alpha})` : `rgba(255,255,255,${alpha})`
        ctx.lineWidth = Math.max(0.6, near * 2.4)
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(x, y)
        ctx.stroke()
      }
      if (t > timing.warp - 250) overlay.classList.add('warp-arrived')
      // When sound is already allowed there is no reason to wait for a tap.
      if (!landing && t > timing.warp && canPlayNow()) land(false)
      if (t > timing.warp + 150) overlay.classList.add('warp-ask')
      if (!landing && t > timing.holdUntil) land(false)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    function land(tapped) {
      if (landing) return
      landing = true
      if (tapped) audio = unlockAudio(audio)
      if (audio && (tapped || canPlayNow())) {
        chime(audio)
        soundPlayed = true
      }
      if (tapped) haptic([12, 40, 18])
      overlay.classList.add('warp-land')
      root.classList.add('warp-landing')
      setTimeout(() => {
        cancelAnimationFrame(frame)
        window.removeEventListener('resize', size)
        overlay.remove()
        root.classList.remove('warp-on', 'warp-landing')
        introRunning = false
        if (audio && !soundPlayed && audio.close) audio.close()
      }, LAND_MS + 100)
    }

    // A click (after the finger lifts) counts as a tap for sound and haptics on iPhone; a touchstart does not.
    overlay.addEventListener('click', () => land(true))
  }

  if (options.intro && root.classList.contains('intro')) runIntro()
})()
