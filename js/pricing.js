// Pricing rules shared by the builder (browser) and the optional checkout server (Node).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalog.js'))
  else root.Pricing = factory(root.Catalog)
})(typeof self !== 'undefined' ? self : this, function (Catalog) {
  const { CATALOG, PRODUCT_IDS, RUSH_OPTION_IDS, PRESET_SEEDS } = Catalog

  const DEPOSIT_PERCENT = 50

  const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  const formatUSD = (dollars) => usd.format(dollars)
  const pluralize = (count, noun) => `${count} ${count === 1 ? noun : `${noun}s`}`

  class ValidationError extends Error {}

  const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)

  function clampInt(value, min, max) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return min
    return Math.min(max, Math.max(min, Math.trunc(value)))
  }

  const isIntInRange = (value, min, max) =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max

  function optionMax(option, units) {
    if (!option.stepper) return 1
    return option.stepper.max === 'units' ? units : option.stepper.max
  }

  /**
   * Lenient pass used by the builder UI: clamps quantities, fills in the default
   * for single-choice sections and keeps scope steppers inside the unit budget.
   * A product config is { enabled, units, selections: { optionId: quantity } }.
   */
  function normalizeProductConfig(product, config) {
    const units = clampInt(config.units, product.unit.min, product.unit.max)
    const selections = {}

    for (const section of product.sections) {
      if (section.type === 'single') {
        const chosen = section.options.find((option) => config.selections[option.id] > 0) ?? section.options[0]
        selections[chosen.id] = 1
        continue
      }

      let budget = section.type === 'scope' ? units : Number.POSITIVE_INFINITY
      for (const option of section.options) {
        const max = Math.min(optionMax(option, units), budget)
        const quantity = clampInt(config.selections[option.id], 0, max)
        if (quantity > 0) {
          selections[option.id] = quantity
          budget -= quantity
        }
      }
    }

    return { enabled: config.enabled, units, selections }
  }

  const defaultProductConfig = (product) =>
    normalizeProductConfig(product, { enabled: false, units: product.unit.default, selections: {} })

  const defaultBuildConfig = () => ({
    website: defaultProductConfig(CATALOG.website),
    app: defaultProductConfig(CATALOG.app),
  })

  /**
   * Strict pass used before charging: anything unknown, fractional,
   * non-positive or out of range is rejected rather than silently corrected.
   */
  function parseBuildConfig(input) {
    if (!isRecord(input)) throw new ValidationError('Your build could not be read. Please try again.')

    const config = defaultBuildConfig()
    for (const productId of PRODUCT_IDS) {
      const raw = input[productId]
      if (isRecord(raw) && raw.enabled === true) config[productId] = parseProductConfig(CATALOG[productId], raw)
    }

    if (!PRODUCT_IDS.some((productId) => config[productId].enabled)) {
      throw new ValidationError('Add a website or a mobile app before checking out.')
    }
    return config
  }

  function parseProductConfig(product, raw) {
    const { unit } = product
    const { units, selections } = raw

    if (!isIntInRange(units, unit.min, unit.max)) {
      throw new ValidationError(`${product.name}: choose between ${unit.min} and ${unit.max} ${unit.plural}.`)
    }
    if (!isRecord(selections)) {
      throw new ValidationError(`${product.name}: the selected blocks could not be read.`)
    }

    const options = new Map(product.sections.flatMap((section) => section.options.map((option) => [option.id, option])))
    const parsed = {}

    for (const [optionId, quantity] of Object.entries(selections)) {
      const option = options.get(optionId)
      if (!option) throw new ValidationError(`${product.name}: one of the blocks is no longer available.`)
      if (!isIntInRange(quantity, 1, optionMax(option, units))) {
        throw new ValidationError(`${product.name}: "${option.name}" has an invalid quantity.`)
      }
      parsed[optionId] = quantity
    }

    for (const section of product.sections) {
      const picked = section.options.filter((option) => parsed[option.id])
      if (section.type === 'single' && picked.length !== 1) {
        throw new ValidationError(`${product.name}: choose one option for "${section.title}".`)
      }
      if (section.type === 'scope') {
        const allocated = picked.reduce((sum, option) => sum + parsed[option.id], 0)
        if (allocated > units) {
          throw new ValidationError(`${product.name}: more ${unit.plural} are allocated than the build contains.`)
        }
      }
    }

    return { enabled: true, units, selections: parsed }
  }

  function optionLine(product, section, option, selected, units) {
    const scalesWithUnits = option.unit === 'perUnit'
    const quantity = selected * (scalesWithUnits ? units : 1)

    let detail = null
    if (option.price > 0) {
      const factors = []
      if (option.stepper && scalesWithUnits) factors.push(pluralize(selected, option.stepper.noun))
      else if (option.stepper) factors.push(String(selected))
      if (scalesWithUnits) factors.push(pluralize(units, product.unit.singular))
      if (factors.length > 0) detail = [...factors, formatUSD(option.price)].join(' × ')
    }

    return {
      id: option.id,
      sectionId: section.id,
      name: option.name,
      detail,
      unitAmount: option.price,
      quantity,
      total: option.price * quantity,
    }
  }

  function quoteProduct(product, config) {
    const { unit } = product
    const scope = product.sections.find((section) => section.type === 'scope')

    const lines = [
      {
        id: `${product.id}-base`,
        sectionId: 'base',
        name: product.baseName,
        detail: null,
        unitAmount: product.basePrice,
        quantity: 1,
        total: product.basePrice,
      },
      {
        id: `${product.id}-units`,
        sectionId: scope?.id ?? 'base',
        name: pluralize(config.units, unit.singular),
        detail: `${config.units} × ${formatUSD(unit.price)}`,
        unitAmount: unit.price,
        quantity: config.units,
        total: unit.price * config.units,
      },
    ]

    for (const section of product.sections) {
      for (const option of section.options) {
        const selected = config.selections[option.id] ?? 0
        if (selected > 0) lines.push(optionLine(product, section, option, selected, config.units))
      }
    }

    return {
      productId: product.id,
      name: product.name,
      lines,
      subtotal: lines.reduce((sum, line) => sum + line.total, 0),
    }
  }

  function computeQuote(config) {
    const products = PRODUCT_IDS.filter((productId) => config[productId].enabled).map((productId) =>
      quoteProduct(CATALOG[productId], config[productId]),
    )
    return {
      products,
      total: products.reduce((sum, product) => sum + product.subtotal, 0),
      blocks: products.reduce((sum, product) => sum + product.lines.length, 0),
    }
  }

  /** Amount charged today, in cents. `plan` is 'deposit' or 'full'. */
  const amountDueCents = (totalDollars, plan) =>
    plan === 'deposit' ? totalDollars * DEPOSIT_PERCENT : totalDollars * 100

  // A rough planning figure, not a commitment: one working week per ~$2,000 of scope.
  const DOLLARS_PER_WEEK = 2000
  const MIN_WEEKS = 2
  const RUSH_FACTOR = 0.7

  function estimateWeeks(quote, config) {
    const weeks = Math.max(MIN_WEEKS, Math.ceil(quote.total / DOLLARS_PER_WEEK))
    const rushed = PRODUCT_IDS.some(
      (productId) =>
        config[productId].enabled && RUSH_OPTION_IDS.some((optionId) => config[productId].selections[optionId]),
    )
    return rushed ? Math.max(MIN_WEEKS, Math.ceil(weeks * RUSH_FACTOR)) : weeks
  }

  // ---- Templates ----

  function buildPreset(seed) {
    const config = defaultBuildConfig()
    for (const productId of PRODUCT_IDS) {
      const product = seed.products[productId]
      if (product) {
        config[productId] = normalizeProductConfig(CATALOG[productId], {
          enabled: true,
          units: product.units,
          selections: product.picks,
        })
      }
    }
    return { id: seed.id, name: seed.name, description: seed.description, config, total: computeQuote(config).total }
  }

  const PRESETS = PRESET_SEEDS.map(buildPreset)

  // ---- Checkout request ----

  const CONTACT_LIMITS = { name: 100, email: 254, company: 100, notes: 500 }
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  function readText(value, label, max, required) {
    if (typeof value !== 'string') throw new ValidationError(`${label} is missing.`)
    const text = value.trim()
    if (required && text.length === 0) throw new ValidationError(`${label} is required.`)
    if (text.length > max) throw new ValidationError(`${label} must be ${max} characters or fewer.`)
    return text
  }

  function parseContact(input) {
    if (!isRecord(input)) throw new ValidationError('Your contact details are missing.')

    const name = readText(input.name, 'Name', CONTACT_LIMITS.name, true)
    const email = readText(input.email, 'Email', CONTACT_LIMITS.email, true)
    if (!EMAIL_PATTERN.test(email)) throw new ValidationError('Enter a valid email address.')

    return {
      name,
      email,
      company: readText(input.company, 'Company', CONTACT_LIMITS.company, false),
      notes: readText(input.notes, 'Notes', CONTACT_LIMITS.notes, false),
    }
  }

  /** Validates { config, plan, contact, attemptId } and returns a clean copy, or throws ValidationError. */
  function parseCheckoutRequest(input) {
    if (!isRecord(input)) throw new ValidationError('The checkout request could not be read.')

    const { plan, attemptId } = input
    if (plan !== 'deposit' && plan !== 'full') throw new ValidationError('Choose how you would like to pay.')
    if (typeof attemptId !== 'string' || !UUID_PATTERN.test(attemptId)) {
      throw new ValidationError('The checkout request could not be read.')
    }

    return { config: parseBuildConfig(input.config), plan, contact: parseContact(input.contact), attemptId }
  }

  return {
    DEPOSIT_PERCENT,
    CONTACT_LIMITS,
    PRESETS,
    buildPreset,
    ValidationError,
    formatUSD,
    pluralize,
    optionMax,
    normalizeProductConfig,
    defaultBuildConfig,
    parseBuildConfig,
    computeQuote,
    amountDueCents,
    estimateWeeks,
    parseCheckoutRequest,
  }
})
