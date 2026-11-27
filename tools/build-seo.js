#!/usr/bin/env node
// Writes everything search engines and AI crawlers read without running JavaScript:
// head tags, structured data, the static price list, FAQ and portfolio content, and the
// crawl files (robots.txt, sitemap.xml, llms.txt, site.webmanifest).
//
//   node tools/build-seo.js
//
// Sources: site.config.json (domain and name), tools/content.js (titles, descriptions, FAQ),
// tools/pages.js and the tools/pages-*.js files (the text of every generated page),
// js/catalog.js + js/pricing.js (every price), js/portfolio-data.js + js/portfolio-shots.js.
//
// Two kinds of page:
//   - index.html, pricing.html, portfolio.html and 404.html are kept by hand. Only the text between
//     <!-- seo:NAME:start --> and <!-- seo:NAME:end --> is replaced, so everything else can be edited.
//   - Every other page (services, cost pages, calculator, case studies, guides, company and legal
//     pages) is written whole from tools/pages*.js. Edit the text there, never in the .html file.
// Running it twice changes nothing. No dependencies.
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const at = (...parts) => path.join(ROOT, ...parts)

// The browser scripts attach to `window`; give them one.
global.window = global.window || {}
require(at('js/icons.js'))
require(at('js/theme.js'))
const { CATALOG, PRODUCT_IDS } = require(at('js/catalog.js'))
const P = require(at('js/pricing.js'))
const Share = require(at('js/share.js'))
require(at('js/portfolio-data.js'))
require(at('js/portfolio-shots.js'))
const { icon, SECTION_ICONS, SECTION_HUES } = window.Theme
const PORTFOLIO = window.Portfolio
const SHOTS = window.PortfolioShots || {}
const CONTENT = require('./content.js')

// ---- Config ----

const config = JSON.parse(fs.readFileSync(at('site.config.json'), 'utf8'))
const SITE_NAME = String(config.siteName || '').trim()
if (!SITE_NAME) throw new Error('site.config.json: "siteName" is empty')
const SITE_URL = String(config.siteUrl || '').trim().replace(/\/+$/, '')
if (SITE_URL && !/^https?:\/\/[^/\s]+/.test(SITE_URL)) {
  throw new Error('site.config.json: "siteUrl" must look like https://example.com (or stay empty until there is a domain)')
}
const LOCALE = config.locale || 'en_US'
const LANG = LOCALE.split('_')[0]
// Optional facts about the business. Only what the owner has written into site.config.json is published.
const ORG_EXTRA = config.organization && typeof config.organization === 'object' ? config.organization : {}

const YEAR = new Date().getFullYear()
const SHARE_IMAGE = { file: 'og.png', width: 1200, height: 630 }
// Where the visitor's cookie choice is stored. js/site.js uses the same key.
const CONSENT_KEY = 'fluidweb.consent.v1'

// ---- Helpers ----

const esc = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const usd = P.formatUSD
const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1)
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const word = (count) => WORDS[count] ?? String(count)
const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1)
// Pages are flat .html files so links work from disk. In production the host serves them without
// the extension (pricing.html at /pricing, index.html at /), so every address written with the
// domain uses that form: canonical, og:url, sitemap, JSON-LD.
function cleanPath(file) {
  const [name, hash] = file.split('#')
  const base = name === 'index.html' ? '' : name.replace(/\.html$/, '')
  return hash ? `${base}#${hash}` : base
}
const isPage = (relative) => /\.html(#|$)/.test(relative)
// Absolute URL when the domain is known, otherwise the relative path.
const abs = (relative) => (SITE_URL ? `${SITE_URL}/${isPage(relative) ? cleanPath(relative) : relative}` : relative)

function read(file) {
  return fs.readFileSync(at(file), 'utf8')
}

const changed = []
function write(file, content) {
  const target = at(file)
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === content) return
  fs.writeFileSync(target, content)
  changed.push(file)
}

function remove(file) {
  if (!fs.existsSync(at(file))) return
  fs.unlinkSync(at(file))
  changed.push(`${file} (removed)`)
}

function replaceRegion(html, name, content, file) {
  const start = `<!-- seo:${name}:start -->`
  const end = `<!-- seo:${name}:end -->`
  const from = html.indexOf(start)
  const to = html.indexOf(end)
  if (from < 0 || to < from || html.indexOf(start, from + 1) >= 0) {
    throw new Error(`${file}: expected exactly one ${start} ... ${end} pair`)
  }
  return `${html.slice(0, from + start.length)}\n${content.trim()}\n${html.slice(to)}`
}

// ---- Numbers, all taken from the catalog ----

const allOptions = new Map(
  PRODUCT_IDS.flatMap((id) => CATALOG[id].sections.flatMap((section) => section.options.map((option) => [option.id, option]))),
)
const blockCount = allOptions.size

/** Quote for one product at a given size with nothing added (single-choice sections fall back to their first, cheapest option). */
function plainBuild(productId, units) {
  const build = P.defaultBuildConfig()
  build[productId] = P.normalizeProductConfig(CATALOG[productId], { enabled: true, units, selections: {} })
  const quote = P.computeQuote(build)
  return { config: build, quote, total: quote.total, weeks: P.estimateWeeks(quote, build) }
}

const lowest = Object.fromEntries(PRODUCT_IDS.map((id) => [id, plainBuild(id, CATALOG[id].unit.min)]))
const example = Object.fromEntries(PRODUCT_IDS.map((id) => [id, plainBuild(id, CATALOG[id].unit.default)]))
const depositOf = (total) => P.amountDueCents(total, 'deposit') / 100

const templates = P.PRESETS.map((preset) => {
  const quote = P.computeQuote(preset.config)
  const products = quote.products.map((product) => {
    const catalog = CATALOG[product.productId]
    return {
      name: product.name,
      size: P.pluralize(preset.config[product.productId].units, catalog.unit.singular),
      blocks: product.lines
        .filter((line) => line.sectionId !== 'base' && !line.id.endsWith('-units') && line.total > 0)
        .map((line) => {
          const option = allOptions.get(line.id)
          const picked = preset.config[product.productId].selections[line.id]
          return option?.stepper && picked > 1 ? `${line.name} (${picked})` : line.name
        }),
    }
  })
  return { ...preset, quote, products, weeks: P.estimateWeeks(quote, preset.config) }
})

function describeProject(project) {
  const { config: build, total } = P.buildPreset({ id: project.id, name: project.name, description: '', products: project.build })
  const quote = P.computeQuote(build)
  const recipe = quote.products.map((product) => {
    const catalog = CATALOG[product.productId]
    return {
      name: product.name,
      size: P.pluralize(build[product.productId].units, catalog.unit.singular),
      foundation: product.lines.find((line) => line.sectionId === 'base'),
      sections: catalog.sections
        .map((section) => {
          const lines = product.lines.filter((line) => line.sectionId === section.id && line.total > 0)
          return { title: section.title, hue: SECTION_HUES[section.id] ?? 250, blocks: lines.map((line) => line.name), amount: lines.reduce((sum, line) => sum + line.total, 0) }
        })
        .filter((section) => section.blocks.length > 0),
    }
  })
  const parts = SHOTS[project.id] || []
  const shot = parts.find((part) => part.name === 'Hero') || parts[1] || parts[0] || null
  const host = project.url ? new URL(project.url).hostname.replace(/^www\./, '') : ''
  return { ...project, total, blocks: quote.blocks, recipe, shot, host }
}
const projects = PORTFOLIO.projects.map(describeProject)

const tokens = {
  siteName: SITE_NAME,
  webFrom: usd(lowest.website.total),
  appFrom: usd(lowest.app.total),
  webBase: usd(CATALOG.website.basePrice),
  appBase: usd(CATALOG.app.basePrice),
  webUnit: usd(CATALOG.website.unit.price),
  appUnit: usd(CATALOG.app.unit.price),
  webPages: String(CATALOG.website.unit.default),
  appScreens: String(CATALOG.app.unit.default),
  webExample: usd(example.website.total),
  appExample: usd(example.app.total),
  webExampleDeposit: usd(depositOf(example.website.total)),
  deposit: String(P.DEPOSIT_PERCENT),
  blockCount: String(blockCount),
  minWeeks: String(Math.min(...PRODUCT_IDS.map((id) => lowest[id].weeks))),
  projectCount: capital(word(projects.length)),
  projectNames: projects.map((project) => project.name).join(', ').replace(/, ([^,]*)$/, ' and $1'),
}

function fill(text) {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    if (key in tokens) return tokens[key]
    const [kind, id] = key.split(':')
    if (kind === 'price' && allOptions.has(id)) return usd(allOptions.get(id).price)
    if (kind === 'desc' && allOptions.has(id)) return lowerFirst(allOptions.get(id).description.replace(/\.$/, ''))
    if (kind === 'template' || kind === 'weeks') {
      const template = templates.find((entry) => entry.id === id)
      if (template) return kind === 'template' ? usd(template.total) : String(template.weeks)
    }
    if (kind === 'included' && CATALOG[id]) return CATALOG[id].included.map(lowerFirst).join('; ')
    throw new Error(`tools/content.js: unknown token ${match}`)
  })
}

const FAQ = CONTENT.faq.map((entry) => ({ q: fill(entry.q), a: fill(entry.a) }))
const ABOUT = fill(CONTENT.about)

// ---- People and places (facts from the owner; nothing here is invented) ----

const OWNER = {
  name: 'Wissile Sogoyou',
  jobTitle: 'Software engineer',
  description:
    'Software engineer with over 15 years of experience across enterprise software, small-business projects and personal projects. Founder of ' + SITE_NAME + ', based in Salt Lake City, Utah.',
}
const PLACE = { locality: 'Salt Lake City', region: 'UT', regionName: 'Utah', country: 'US' }

// ---- Pages ----

const HAND_PAGES = [
  { key: 'home', file: 'index.html', nav: null, builder: true, regions: ['head', 'header', 'hero-facts', 'builder', 'home-fit', 'home-proof', 'costs', 'faq', 'footer', 'builder-dialogs'] },
  { key: 'pricing', file: 'pricing.html', crumb: 'Pricing', nav: 'pricing', regions: ['head', 'header', 'pricing', 'footer'] },
  { key: 'portfolio', file: 'portfolio.html', crumb: 'Work', nav: 'work', regions: ['head', 'header', 'crumbs', 'works', 'footer'] },
  { key: 'notFound', file: '404.html', nav: null, indexable: false, regions: ['head', 'header', 'footer'] },
]
for (const page of HAND_PAGES) {
  page.title = fill(CONTENT.pages[page.key].title)
  page.description = fill(CONTENT.pages[page.key].description)
}

// The header links. `key` matches a page's `nav`, which marks the current section.
const NAV = [
  { label: 'Services', file: 'services.html', key: 'services' },
  { label: 'Pricing', file: 'pricing.html', key: 'pricing' },
  { label: 'Work', file: 'portfolio.html', key: 'work', keep: true },
  { label: 'Guides', file: 'guides.html', key: 'guides' },
  { label: 'About', file: 'about.html', key: 'about' },
  { label: 'Contact', file: 'contact.html', key: 'contact', extra: true },
]
const builderHref = (page) => (page.builder ? '#builder' : 'index.html#builder')
const LOGO_MARK = '<span class="logo-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>'

// ---- Structured data ----

const orgId = SITE_URL ? `${SITE_URL}/#organization` : null
const siteId = SITE_URL ? `${SITE_URL}/#website` : null
const orgRef = () => (orgId ? { '@id': orgId } : { '@type': 'Organization', name: SITE_NAME })
const siteRef = () => (siteId ? { '@id': siteId } : { '@type': 'WebSite', name: SITE_NAME })

const personId = SITE_URL ? `${SITE_URL}/about#person` : null
const personRef = () => (personId ? { '@id': personId } : { '@type': 'Person', name: OWNER.name })
const addressNode = () => ({ '@type': 'PostalAddress', addressLocality: PLACE.locality, addressRegion: PLACE.region, addressCountry: PLACE.country })

function personNode() {
  return {
    '@type': 'Person',
    ...(personId ? { '@id': personId, url: abs('about.html') } : {}),
    name: OWNER.name,
    jobTitle: OWNER.jobTitle,
    description: OWNER.description,
    address: addressNode(),
    worksFor: orgRef(),
    knowsAbout: ['Web design', 'Web development', 'Search engine optimization', 'Answer engine optimization', 'Generative engine optimization', 'Mobile app development'],
  }
}

// No street address, phone, email, reviews or ratings: only what the site itself says.
function organizationNode() {
  const extra = {}
  for (const key of ['legalName', 'email', 'telephone', 'sameAs']) {
    const value = ORG_EXTRA[key]
    if (value && (!Array.isArray(value) || value.length > 0)) extra[key] = value
  }
  return {
    '@type': ['Organization', 'ProfessionalService'],
    ...(orgId ? { '@id': orgId, url: `${SITE_URL}/`, logo: `${SITE_URL}/icon-512.png` } : {}),
    name: SITE_NAME,
    description: ABOUT,
    founder: { '@type': 'Person', name: OWNER.name, jobTitle: OWNER.jobTitle, ...(personId ? { '@id': personId } : {}) },
    address: addressNode(),
    areaServed: { '@type': 'Country', name: 'United States' },
    ...extra,
  }
}

function websiteNode() {
  return {
    '@type': 'WebSite',
    ...(siteId ? { '@id': siteId, url: `${SITE_URL}/` } : {}),
    name: SITE_NAME,
    description: ABOUT,
    inLanguage: LANG,
    publisher: orgRef(),
  }
}

function webPageNode(page, type = 'WebPage') {
  return {
    '@type': type,
    ...(SITE_URL && page.url !== null ? { '@id': `${SITE_URL}/${page.url}#webpage`, url: `${SITE_URL}/${page.url}` } : {}),
    name: page.title,
    description: page.description,
    inLanguage: LANG,
    isPartOf: siteRef(),
  }
}

/** The trail to a page: Home, any parents, then the page itself. `parents` is a list of [label, file]. */
function trail(page) {
  return [['Home', 'index.html'], ...(page.parents || []), [page.crumb, page.file]]
}

function breadcrumbNode(page) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail(page).map(([name, file], index) => ({ '@type': 'ListItem', position: index + 1, name, item: abs(file) })),
  }
}

function crumbsHTML(page) {
  const steps = trail(page)
  const items = steps.map(([name, file], index) =>
    index === steps.length - 1 ? `<li aria-current="page">${esc(name)}</li>` : `<li><a href="${file}">${esc(name)}</a>${icon('chevron-right')}</li>`,
  )
  return `<nav aria-label="Breadcrumb" class="crumbs"><ol>${items.join('')}</ol></nav>`
}

function unitText(option, product) {
  const parts = []
  if (option.unit === 'perUnit') parts.push(product.unit.singular)
  if (option.stepper) parts.push(option.stepper.noun)
  return parts.join(' per ')
}

function blockOffer(option, product) {
  const unit = unitText(option, product)
  return {
    '@type': 'Offer',
    name: option.name,
    description: option.description,
    price: option.price,
    priceCurrency: 'USD',
    ...(unit && option.price > 0
      ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: option.price, priceCurrency: 'USD', unitText: unit } }
      : {}),
  }
}

/** The lowest real configuration of a product, as an Offer. */
function fromOffer(product) {
  const { unit } = product
  return {
    '@type': 'Offer',
    name: `${product.baseName} with ${P.pluralize(unit.min, unit.singular)}`,
    description: `Lowest configuration: the ${usd(product.basePrice)} foundation plus ${P.pluralize(unit.min, unit.singular)} at ${usd(unit.price)} per ${unit.singular}, with no extra blocks.`,
    price: lowest[product.id].total,
    priceCurrency: 'USD',
    url: abs('pricing.html'),
  }
}

function unitOffer(product) {
  const { unit } = product
  return {
    '@type': 'Offer',
    name: `Additional ${unit.singular}`,
    price: unit.price,
    priceCurrency: 'USD',
    priceSpecification: { '@type': 'UnitPriceSpecification', price: unit.price, priceCurrency: 'USD', unitText: unit.singular },
  }
}

const SEARCH_SECTION = 'w-search'

function sectionCatalog(section, product) {
  return { '@type': 'OfferCatalog', name: section.title, itemListElement: section.options.map((option) => blockOffer(option, product)) }
}

/** `full` lists every block (pricing page); otherwise only the foundation and the per-page or per-screen price. */
function serviceNodes(full) {
  const build = (product, name, serviceType, description, skip) => ({
    '@type': 'Service',
    name,
    serviceType,
    description,
    provider: orgRef(),
    url: abs('pricing.html'),
    offers: fromOffer(product),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: `${product.name} price list`,
      itemListElement: [
        {
          '@type': 'OfferCatalog',
          name: product.baseName,
          itemListElement: [
            { '@type': 'Offer', name: product.baseName, description: `Includes: ${product.included.map(lowerFirst).join('; ')}.`, price: product.basePrice, priceCurrency: 'USD' },
            unitOffer(product),
          ],
        },
        ...(full ? product.sections.filter((section) => section.id !== skip).map((section) => sectionCatalog(section, product)) : []),
      ],
    },
  })

  const { website, app } = CATALOG
  const search = website.sections.find((section) => section.id === SEARCH_SECTION)
  return [
    build(
      website,
      'Website design and development',
      'Web design and web development',
      `Websites designed and built block by block, from ${usd(lowest.website.total)}: a ${usd(website.basePrice)} foundation plus ${usd(website.unit.price)} per page, with optional blocks that each have a listed price.`,
      SEARCH_SECTION,
    ),
    {
      '@type': 'Service',
      name: 'SEO, AEO and GEO optimization',
      serviceType: 'Search engine optimization, answer engine optimization and generative engine optimization',
      description: `${search.description} These blocks are added to a website build and each has a listed price.`,
      provider: orgRef(),
      url: abs('pricing.html'),
      hasOfferCatalog: sectionCatalog(search, website),
    },
    build(
      app,
      'Mobile app design and development',
      'Mobile app design and mobile app development',
      `Mobile apps for iOS and Android designed and built block by block, from ${usd(lowest.app.total)}: a ${usd(app.basePrice)} foundation plus ${usd(app.unit.price)} per screen, with optional blocks that each have a listed price.`,
    ),
  ]
}

function faqNode() {
  return {
    '@type': 'FAQPage',
    mainEntity: FAQ.map((entry) => ({ '@type': 'Question', name: entry.q, acceptedAnswer: { '@type': 'Answer', text: entry.a } })),
  }
}

function portfolioNode() {
  return {
    '@type': 'ItemList',
    name: `${SITE_NAME} portfolio`,
    numberOfItems: projects.length,
    itemListElement: projects.map((project, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'WebSite',
        name: project.name,
        url: project.url,
        description: project.summary,
        keywords: project.tags.join(', '),
        ...(project.shot ? { image: abs(project.shot.src) } : {}),
        creator: orgRef(),
      },
    })),
  }
}

function graphFor(page) {
  const graph = [organizationNode(), websiteNode()]
  if (page.key === 'home') graph.push(webPageNode(page), ...serviceNodes(false), faqNode())
  else if (page.key === 'pricing') graph.push(webPageNode(page), breadcrumbNode(page), ...serviceNodes(true))
  else if (page.key === 'portfolio') graph.push(webPageNode(page, 'CollectionPage'), breadcrumbNode(page), portfolioNode())
  else if (page.url !== null) {
    // Generated pages: the page itself (unless it brings its own main node), its trail, and anything it adds.
    const extra = page.graph ? page.graph(page) : []
    if (!page.ownPageNode) graph.push(webPageNode(page, page.pageType || 'WebPage'))
    graph.push(breadcrumbNode(page), ...extra)
  }
  return { '@context': 'https://schema.org', '@graph': graph }
}

// ---- Regions shared by every page ----

function headHTML(page) {
  const indexable = page.url !== null
  const lines = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}">`,
    `<meta name="robots" content="${indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'}">`,
  ]
  // The 404 page is served at any path, so it needs a base for its relative links once the domain is known.
  if (!indexable && SITE_URL) lines.push(`<base href="${esc(SITE_URL)}/">`)
  if (indexable && SITE_URL) lines.push(`<link rel="canonical" href="${esc(`${SITE_URL}/${page.url}`)}">`)
  lines.push(
    `<meta property="og:type" content="${page.ogType || 'website'}">`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}">`,
    `<meta property="og:locale" content="${esc(LOCALE)}">`,
    `<meta property="og:title" content="${esc(page.title)}">`,
    `<meta property="og:description" content="${esc(page.description)}">`,
  )
  if (indexable && SITE_URL) lines.push(`<meta property="og:url" content="${esc(`${SITE_URL}/${page.url}`)}">`)
  if (SITE_URL) {
    lines.push(
      `<meta property="og:image" content="${esc(`${SITE_URL}/${SHARE_IMAGE.file}`)}">`,
      `<meta property="og:image:width" content="${SHARE_IMAGE.width}">`,
      `<meta property="og:image:height" content="${SHARE_IMAGE.height}">`,
      `<meta property="og:image:alt" content="${esc(`${SITE_NAME}: websites and mobile apps, priced block by block`)}">`,
    )
  }
  lines.push(
    `<meta name="twitter:card" content="${SITE_URL ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${esc(page.title)}">`,
    `<meta name="twitter:description" content="${esc(page.description)}">`,
  )
  if (SITE_URL) lines.push(`<meta name="twitter:image" content="${esc(`${SITE_URL}/${SHARE_IMAGE.file}`)}">`)
  lines.push(`<script type="application/ld+json">${JSON.stringify(graphFor(page)).replace(/</g, '\\u003c')}</script>`)
  // Analytics. Both tags start with Google Consent Mode v2 set to "denied" for everything, before
  // the tag itself loads, then switch analytics storage on if the visitor accepted earlier (the
  // choice is stored by js/site.js under CONSENT_KEY). Tags load only over http(s), so opening the
  // files from disk never sends hits.
  const consent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{ad_storage:'denied',analytics_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});try{if(localStorage.getItem('${CONSENT_KEY}')==='granted')gtag('consent','update',{analytics_storage:'granted'})}catch(e){}`
  // Google Tag Manager, when site.config.json has googleTagManagerId. Analytics tags themselves are configured inside the GTM container.
  const gtmId = String(config.googleTagManagerId || '').trim()
  if (gtmId) {
    if (!/^GTM-[A-Z0-9]+$/.test(gtmId)) throw new Error(`site.config.json: googleTagManagerId "${gtmId}" does not look like GTM-XXXXXXX`)
    lines.push(
      `<script>${consent}if(location.protocol.indexOf('http')===0){dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});var g=document.createElement('script');g.async=true;g.src='https://www.googletagmanager.com/gtm.js?id=${gtmId}';document.head.appendChild(g)}</script>`,
    )
  }
  // Google Analytics 4 installed directly, when site.config.json has googleAnalyticsId. Use this or
  // googleTagManagerId, not both, or page views are counted twice.
  const gaId = String(config.googleAnalyticsId || '').trim()
  if (gaId) {
    if (!/^G-[A-Z0-9]+$/.test(gaId)) throw new Error(`site.config.json: googleAnalyticsId "${gaId}" does not look like G-XXXXXXXXXX`)
    if (gtmId) throw new Error('site.config.json: set googleAnalyticsId or googleTagManagerId, not both')
    lines.push(
      `<script>${consent}if(location.protocol.indexOf('http')===0){gtag('js',new Date());gtag('config','${gaId}');var g=document.createElement('script');g.async=true;g.src='https://www.googletagmanager.com/gtag/js?id=${gaId}';document.head.appendChild(g)}</script>`,
    )
  }
  // Touch-device extras (js/experience.js): the first-visit warp intro and scroll haptics, switched in
  // site.config.json "experience". The inline part runs before first paint so the intro can cover the
  // page without a flash; it adds the "intro" class when the site is opened on a phone or tablet
  // (not when moving between its own pages or going back), with motion allowed, and never for
  // crawlers or speed tests, so they see the page as it is.
  const experience = config.experience || {}
  if (experience.intro || experience.haptics) {
    const decide = experience.intro
      ? `(function(){try{var m=window.matchMedia;if(m('(hover: none) and (pointer: coarse)').matches&&!m('(prefers-reduced-motion: reduce)').matches&&!/bot|crawl|spider|slurp|lighthouse|headless|pagespeed|facebookexternalhit|whatsapp|slack|telegram/i.test(navigator.userAgent)){var n=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||{},r=document.referrer,inside=false;try{inside=!!r&&new URL(r).host===location.host}catch(e){}if(n.type!=='back_forward'&&(n.type==='reload'||!inside))document.documentElement.classList.add('intro')}}catch(e){}})();`
      : ''
    lines.push(
      `<script>window.FW_EXPERIENCE={intro:${Boolean(experience.intro)},haptics:${Boolean(experience.haptics)}};${decide}</script>`,
      `<script src="js/experience.js" defer></script>`,
    )
  }
  // Where the checkout form posts the order. Empty until a payment service is connected (see README.md).
  if (page.builder) lines.push(`<meta name="checkout-endpoint" content="${esc(String(config.checkoutEndpoint || '').trim())}">`)
  return lines.join('\n')
}

function headerHTML(page) {
  const links = NAV.map((item) => {
    const attrs = [`href="${item.file}"`]
    const classes = [item.keep ? 'keep' : '', item.extra ? 'nav-extra' : ''].filter(Boolean)
    if (classes.length) attrs.push(`class="${classes.join(' ')}"`)
    if (item.key === page.nav) attrs.push('aria-current="page"')
    return `      <a ${attrs.join(' ')}>${item.label}</a>`
  }).join('\n')
  return `    <a href="index.html" aria-label="${esc(SITE_NAME)} home" class="logo">${LOGO_MARK}${esc(SITE_NAME)}</a>
    <nav aria-label="Main" class="site-nav" id="site-nav">
${links}
    </nav>
    <a href="${builderHref(page)}" class="btn btn-primary btn-lg">Start building</a>
    <button type="button" class="btn btn-outline nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Menu" hidden>${icon('menu')}</button>`
}

// Every page of the site appears in the footer, grouped. Filled in once the generated pages are known.
function footerColumns() {
  const link = (key, label) => [label, pageByKey(key).file]
  return [
    { title: 'Services', links: [link('services', 'All services'), ...SERVICE_KEYS.map((key) => link(key, pageByKey(key).short))] },
    { title: 'Pricing', links: [link('pricing', 'Price list'), link('calculator', 'Cost calculator'), ...COST_KEYS.map((key) => link(key, pageByKey(key).short))] },
    { title: 'Work', links: [link('portfolio', 'Portfolio'), ...CASE_KEYS.map((key) => link(key, pageByKey(key).short))] },
    { title: 'Guides', links: [link('guides', 'All guides'), ...GUIDE_KEYS.map((key) => link(key, pageByKey(key).short))] },
    { title: 'Company', links: [link('about', 'About'), link('contact', 'Contact'), ['Builder', 'index.html#builder']] },
    { title: 'Legal', links: [link('privacy', 'Privacy policy'), link('terms', 'Terms of service'), link('refund', 'Refund policy')] },
  ]
}

const hasAnalytics = () => Boolean(String(config.googleAnalyticsId || '').trim() || String(config.googleTagManagerId || '').trim())

function footerHTML(page) {
  const href = (file) => (page.builder && file === 'index.html#builder' ? '#builder' : file)
  const columns = footerColumns()
    .map(
      (column) => `      <div>
        <p class="footer-title">${esc(column.title)}</p>
        <ul>${column.links.map(([label, file]) => `<li><a href="${href(file)}">${esc(label)}</a></li>`).join('')}</ul>
      </div>`,
    )
    .join('\n')
  // The button reopens the cookie choice. js/site.js shows it; it stays hidden without JavaScript or without analytics.
  const cookies = hasAnalytics() ? '\n      <button type="button" class="link" data-cookie-settings hidden>Cookie settings</button>' : ''
  return `<footer class="site-footer">
  <div class="container site-footer-inner">
    <div class="footer-brand">
      <a href="index.html" aria-label="${esc(SITE_NAME)} home" class="logo">${LOGO_MARK}${esc(SITE_NAME)}</a>
      <p>Websites and mobile apps for individuals, small businesses and startups, priced block by block.</p>
      <p class="footer-place">${icon('map-pin')}${esc(PLACE.locality)}, ${esc(PLACE.regionName)}</p>
    </div>
    <nav aria-label="Footer" class="footer-cols">
${columns}
    </nav>
    <div class="footer-base">
      <p>© <span id="year">${YEAR}</span> ${esc(SITE_NAME)}</p>${cookies}
    </div>
  </div>
</footer>`
}

// ---- Home page ----

function heroFactsHTML() {
  const facts = [
    ...PRODUCT_IDS.map((id) => ({ label: `${CATALOG[id].name}s from`, value: usd(lowest[id].total) })),
    { label: 'Priced blocks', value: String(blockCount) },
  ]
  return `      <dl class="hero-facts" id="hero-facts">${facts.map((fact) => `<div><dt>${esc(fact.label)}</dt><dd>${esc(fact.value)}</dd></div>`).join('')}</dl>`
}

function foundationCardHTML(product, level) {
  const { unit } = product
  return `<article class="panel-head foundation">
        <div class="panel-head-top">
          <div>
            <p class="panel-base">${esc(product.baseName)}</p>
            <h${level}>${esc(product.name)}</h${level}>
          </div>
          <p class="panel-subtotal"><span>From</span><span class="price">${usd(lowest[product.id].total)}</span></p>
        </div>
        <p class="foundation-math">${usd(product.basePrice)} foundation plus ${usd(unit.price)} per ${esc(unit.singular)}, for ${unit.min} to ${unit.max} ${esc(unit.plural)}. ${esc(product.tagline)}</p>
        <ul class="included">${product.included.map((item) => `<li>${icon('check')}${esc(item)}</li>`).join('')}</ul>
      </article>`
}

function costsHTML() {
  const { website, app } = CATALOG
  return `  <section id="costs" aria-labelledby="costs-heading" class="band">
    <div class="container band-inner">
      <header class="section-head">
        <p class="eyebrow">Pricing</p>
        <h2 id="costs-heading">What a website and a mobile app cost</h2>
        <p>A website costs from ${usd(lowest.website.total)} and a mobile app from ${usd(lowest.app.total)}. A website with ${website.unit.default} pages and no extra blocks is ${usd(example.website.total)}, and an app with ${app.unit.default} screens is ${usd(example.app.total)}. Each block you add has its own listed price.</p>
      </header>
      <div class="foundations">
      ${PRODUCT_IDS.map((id) => foundationCardHTML(CATALOG[id], 3)).join('\n      ')}
      </div>
      <div class="cost-templates">
        <h3>Templates as a starting point</h3>
        <ul>${templates
          .map((template) => {
            const cost = PAGES.find((page) => page.template && page.template.id === template.id)
            const name = cost ? `<a href="${cost.file}">${esc(template.name)}</a>` : esc(template.name)
            return `<li><b>${name}</b><span>${esc(template.description)}</span><span class="mono">${usd(template.total)}</span></li>`
          })
          .join('')}</ul>
      </div>
      <p class="hero-actions start"><a href="pricing.html" class="btn btn-outline btn-xl">See the full price list ${icon('arrow-right')}</a><a href="website-cost-guide.html" class="btn btn-outline btn-xl">Read the website cost guide</a></p>
    </div>
  </section>`
}

function faqHTML() {
  return `      <div class="accordion">
${FAQ.map((entry, index) => `        <details name="faq"${index === 0 ? ' open' : ''}><summary>${esc(entry.q)}${icon('chevron-down')}</summary><p>${esc(entry.a)}</p></details>`).join('\n')}
      </div>`
}

// ---- Pricing page ----

function priceCell(option, product) {
  if (option.price === 0) return '<td class="price"><b>Included</b></td>'
  const parts = []
  if (option.unit === 'perUnit') parts.push(`per ${product.unit.singular}`)
  if (option.stepper) parts.push(`per ${option.stepper.noun}`)
  return `<td class="price"><b>${usd(option.price)}</b><small>${esc(parts.length ? parts.join(', ') : 'one-time')}</small></td>`
}

const SECTION_NOTES = { scope: (product) => `Per ${product.unit.singular}`, single: () => 'Pick one', multi: () => 'Add any' }

function priceSectionHTML(section, product) {
  const { unit } = product
  const rows = section.options.map(
    (option) => `<tr><th scope="row">${esc(option.name)}<span>${esc(option.description)}</span></th>${priceCell(option, product)}</tr>`,
  )
  if (section.type === 'scope') {
    rows.unshift(
      `<tr><th scope="row">Every ${esc(unit.singular)}<span>Simple ${esc(unit.plural)} with static content need nothing more than this.</span></th><td class="price"><b>${usd(unit.price)}</b><small>per ${esc(unit.singular)}</small></td></tr>`,
    )
  }
  const headingId = `${section.id}-heading`
  return `<section class="sec price-sec" id="${section.id}" style="--h:${SECTION_HUES[section.id] ?? 250}" aria-labelledby="${headingId}">
        <header class="sec-head">
          <span class="sec-icon">${icon(SECTION_ICONS[section.id] || 'layout-grid')}</span>
          <div class="sec-text">
            <div class="sec-title-row">
              <h3 id="${headingId}">${esc(section.title)}</h3>
              <span class="sec-status">${esc(SECTION_NOTES[section.type](product))}</span>
            </div>
            <p>${esc(section.description)}</p>
          </div>
        </header>
        <table class="price-table">
          <thead><tr><th scope="col">Block</th><th scope="col">Price</th></tr></thead>
          <tbody>
            ${rows.join('\n            ')}
          </tbody>
        </table>
      </section>`
}

function priceProductHTML(product, heading) {
  const { unit } = product
  const count = product.sections.reduce((sum, section) => sum + section.options.length, 0)
  return `<section class="price-product" id="${product.id}-prices" aria-labelledby="${product.id}-prices-heading">
      <header class="section-head">
        <p class="eyebrow">${esc(product.name)}</p>
        <h2 id="${product.id}-prices-heading">${esc(heading)}</h2>
        <p>${capital(P.pluralize(unit.min, unit.singular).replace(/^1 /, 'one '))} on the ${usd(product.basePrice)} foundation costs ${usd(lowest[product.id].total)}, and each further ${esc(unit.singular)} is ${usd(unit.price)}. The ${count} blocks below are optional. Blocks marked per ${esc(unit.singular)} are multiplied by the number of ${esc(unit.plural)} in your build.</p>
      </header>
      ${product.sections.map((section) => priceSectionHTML(section, product)).join('\n      ')}
    </section>`
}

function templateHTML(template) {
  const contents = template.products
    .map((product) => `<p><b>${esc(product.name)}, ${esc(product.size)}.</b> ${esc(product.blocks.join(', '))}.</p>`)
    .join('')
  return `<li class="template">
          <div class="template-head"><h3>${esc(template.name)}</h3><span class="template-price">${usd(template.total)}</span></div>
          <p class="template-desc">${esc(template.description)}</p>
          ${contents}
          <a href="index.html#template-${template.id}">Open the ${esc(template.name)} template in the builder ${icon('arrow-right')}</a>
        </li>`
}

function pricingHTML() {
  const { website, app } = CATALOG
  const sample = templates.find((template) => template.id === 'business') || templates[0]
  return `<main>
  <section class="hero compact">
    <div class="hero-grid" aria-hidden="true"></div>
    <div class="container hero-inner">
      ${crumbsHTML(pageByKey('pricing'))}
      <h1>Website and mobile app pricing, <span class="brand">block by block</span>.</h1>
      <p class="hero-lede">A website costs from ${usd(lowest.website.total)} and a mobile app from ${usd(lowest.app.total)}. A website with ${website.unit.default} pages and no extra blocks is ${usd(example.website.total)}, and an app with ${app.unit.default} screens is ${usd(example.app.total)}. Every block on this page has a fixed price, so you can add up your project before you talk to anyone.</p>
      <ul class="jump" aria-label="On this page">
        <li><a class="preset" href="#foundations"><b>Foundations</b></a></li>
        <li><a class="preset" href="#website-prices"><b>Website prices</b></a></li>
        <li><a class="preset" href="#app-prices"><b>Mobile app prices</b></a></li>
        <li><a class="preset" href="#templates"><b>Templates</b></a></li>
        <li><a class="preset" href="#payment"><b>Deposit and payment</b></a></li>
      </ul>
    </div>
  </section>

  <div class="container pricing">
    <section id="foundations" aria-labelledby="foundations-heading" class="price-product">
      <header class="section-head">
        <p class="eyebrow">Where every build starts</p>
        <h2 id="foundations-heading">${capital(word(PRODUCT_IDS.length))} foundations</h2>
        <p>Every project starts with a foundation, which covers the work every build needs. On top of it you pay per page or per screen, then add only the blocks you want.</p>
      </header>
      <div class="foundations">
      ${PRODUCT_IDS.map((id) => foundationCardHTML(CATALOG[id], 3)).join('\n      ')}
      </div>
    </section>

    ${priceProductHTML(website, 'Website prices')}

    ${priceProductHTML(app, 'Mobile app prices')}

    <section id="templates" aria-labelledby="templates-heading" class="price-product">
      <header class="section-head">
        <p class="eyebrow">Templates</p>
        <h2 id="templates-heading">${capital(word(templates.length))} templates and what they cost</h2>
        <p>Each template is a set of blocks that suits a common kind of project. Load one in the builder, then add or remove anything.</p>
      </header>
      <ul class="templates">
        ${templates.map(templateHTML).join('\n        ')}
      </ul>
    </section>

    <section id="payment" aria-labelledby="payment-heading" class="price-product">
      <header class="section-head">
        <p class="eyebrow">Paying</p>
        <h2 id="payment-heading">Deposit and payment</h2>
        <p>You choose at checkout how to pay. On the ${esc(sample.name)} template (${usd(sample.total)}) the deposit is ${usd(depositOf(sample.total))}.</p>
      </header>
      <ul class="steps three">
        <li><h3>${P.DEPOSIT_PERCENT}% deposit</h3><p>A ${P.DEPOSIT_PERCENT}% deposit reserves your slot and kicks off the project. The balance is invoiced before launch.</p></li>
        <li><h3>Pay in full</h3><p>One payment up front, with nothing left to settle at launch. Payments are processed securely by Stripe.</p></li>
        <li><h3>Changes later</h3><p>Scope changes are priced with the same blocks and the same prices listed here, so adding a page or a feature later costs exactly what this page says.</p></li>
      </ul>
    </section>
  </div>

  <section class="band">
    <div class="container cta-band">
      <h2>Add up your own project.</h2>
      <p>Pick a foundation in the builder, stack the blocks you need and watch the total update with every choice.</p>
      <div class="hero-actions">
        <a href="index.html#builder" class="btn btn-primary btn-xl">Start building ${icon('arrow-right')}</a>
        <a href="website-cost-calculator.html" class="btn btn-outline btn-xl">Open the cost calculator</a>
      </div>
    </div>
  </section>
</main>`
}

// ---- Portfolio page ----

// The first row sits near the top of the page, so its images load right away; the rest wait until they are close.
const EAGER_PROJECTS = 2

function projectHTML(project, index) {
  const recipe = project.recipe
    .map((product) => {
      const rows = [
        `<div><dt>Foundation</dt><dd>${esc(product.foundation.name)}</dd></div>`,
        ...product.sections.map((section) => `<div style="--h:${section.hue}"><dt>${esc(section.title)}</dt><dd>${esc(section.blocks.join(', '))}</dd></div>`),
      ]
      return `<h4>${esc(product.name)}, ${esc(product.size)}</h4>
        <dl class="work-recipe">${rows.join('')}</dl>`
    })
    .join('\n        ')
  const shot = project.shot
    ? `<img class="work-shot" src="${esc(project.shot.src)}" width="${project.shot.w}" height="${project.shot.h}" alt="${esc(`Screenshot of the ${project.name} homepage at ${project.host}`)}"${index < EAGER_PROJECTS ? '' : ' loading="lazy"'} decoding="async">`
    : ''
  return `<article class="work static" id="project-${project.id}" style="--h:${project.hue}">
      ${shot}
      <div class="work-body">
        <h3 class="work-title">${esc(project.name)}<span class="work-price">${usd(project.total)}</span></h3>
        ${project.url ? `<a class="work-host" href="${esc(project.url)}" rel="noopener">${esc(project.host)}</a>` : ''}
        <p class="chips">${project.tags.map((tag) => `<span class="badge">${esc(tag)}</span>`).join('')}</p>
        <p class="work-summary">${esc(project.summary)}</p>
        <p class="work-meta">${project.recipe.map((product) => product.size).join(' + ')} · ${project.blocks} blocks · ${usd(project.total)} at today's prices</p>
        ${recipe}
        <p class="fineprint">Prices are what these blocks cost in the builder today, not what the client paid.${project.note ? ` ${esc(project.note)}` : ''}</p>
        <a class="work-open" href="${caseFile(project.id)}">Read the ${esc(project.name)} case study ${icon('arrow-right')}</a>
        <a class="work-open" href="index.html#build-${project.id}">Open the ${esc(project.name)} build in the builder ${icon('arrow-right')}</a>
      </div>
    </article>`
}

const worksHTML = () => `    ${projects.map(projectHTML).join('\n    ')}`

// ---- The builder (home page and calculator page share this shell, so the two never drift) ----

const BUILDER_TEXT = {
  home: {
    eyebrow: 'The builder',
    heading: 'Build and price your website or app',
    intro: 'Pick a foundation, then snap on the blocks you need. Every block shows its own price and the total updates as you go.',
  },
  calculator: {
    eyebrow: 'Calculator',
    heading: 'Choose what you are pricing',
    intro: 'Add a website, a mobile app or both. Set the number of pages or screens, then switch blocks on and off and watch the total.',
  },
}

function builderHTML(page) {
  const text = BUILDER_TEXT[page.key]
  return `<section id="builder" aria-labelledby="builder-heading" class="container builder">
    <header class="section-head">
      <p class="eyebrow">${esc(text.eyebrow)}</p>
      <h2 id="builder-heading">${esc(text.heading)}</h2>
      <p>${esc(text.intro)}</p>
    </header>

    <div class="picker" id="picker"></div>

    <div class="presets">
      <p id="preset-label">Not sure where to start? Load a template and adjust it.</p>
      <ul aria-labelledby="preset-label" id="presets"></ul>
    </div>

    <div class="workbench">
      <div class="panels" id="panels">
        <p class="empty" id="empty">Choose a website, a mobile app or both above, or start from a template. Your blocks will appear here.</p>
        <noscript><p class="empty">The builder needs JavaScript to run. Every price is also listed on the <a href="pricing.html">pricing page</a>, and the <a href="contact.html">contact page</a> has a form for questions.</p></noscript>
      </div>
      <aside aria-label="Build summary" class="summary-aside">
        <div class="summary" data-summary></div>
      </aside>
    </div>
  </section>`
}

// A field people never see. A script that fills in every field gives itself away, and the Worker refuses the message.
const honeypotHTML = (id) =>
  `<div class="hp" aria-hidden="true"><label for="${id}">Leave this field empty</label><input id="${id}" name="website" type="text" tabindex="-1" autocomplete="off"></div>`

function builderDialogsHTML() {
  return `<!-- Phone and tablet: total bar pinned to the bottom, opens the summary as a sheet. -->
<div class="dock" id="dock" hidden>
  <div class="container dock-inner">
    <div class="dock-text">
      <span id="dock-meta"></span>
      <span class="dock-total" id="dock-total" aria-hidden="true"></span>
    </div>
    <button type="button" class="btn btn-primary btn-dock" id="dock-open">Review build ${icon('arrow-right')}</button>
  </div>
</div>
<p class="sr-only" id="build-status" role="status"></p>

<dialog class="sheet" id="sheet" aria-label="Your build">
  <button type="button" class="btn btn-ghost btn-icon-sm dialog-close" data-close aria-label="Close">${icon('x')}</button>
  <div class="sheet-body"><div class="summary" data-summary></div></div>
</dialog>

<dialog class="dialog" id="checkout" aria-labelledby="checkout-title">
  <button type="button" class="btn btn-ghost btn-icon-sm dialog-close" data-close aria-label="Close">${icon('x')}</button>

  <div data-stage="details">
    <div class="dialog-head">
      <h2 id="checkout-title">Lock in your build</h2>
      <p id="checkout-desc"></p>
    </div>
    <form id="checkout-form" novalidate>
      <div class="field-row">
        <div class="field"><label for="checkout-name">Full name</label><input class="input" id="checkout-name" name="name" autocomplete="name" required maxlength="100"></div>
        <div class="field"><label for="checkout-email">Email</label><input class="input" id="checkout-email" name="email" type="email" autocomplete="email" required maxlength="254"></div>
      </div>
      <div class="field"><label for="checkout-company">Company (optional)</label><input class="input" id="checkout-company" name="company" autocomplete="organization" maxlength="100"></div>
      <div class="field">
        <label for="checkout-notes">Project notes (optional)</label>
        <textarea class="input" id="checkout-notes" name="notes" rows="3" maxlength="500" aria-describedby="checkout-notes-hint"></textarea>
        <p class="field-hint" id="checkout-notes-hint">Links, deadlines or anything else I should know.</p>
      </div>
      ${honeypotHTML('checkout-website')}
      <fieldset class="plans">
        <legend>Payment</legend>
        <div class="plan-grid">
          <label class="plan"><input type="radio" name="plan" value="deposit" id="plan-deposit" class="sr-only" checked><span class="plan-title">Pay ${P.DEPOSIT_PERCENT}% deposit</span><span class="plan-amount" data-plan-amount="deposit"></span><span class="plan-desc">Kick off now. The balance is invoiced before launch.</span></label>
          <label class="plan"><input type="radio" name="plan" value="full" id="plan-full" class="sr-only"><span class="plan-title">Pay in full</span><span class="plan-amount" data-plan-amount="full"></span><span class="plan-desc">One payment, nothing left to settle at launch.</span></label>
        </div>
      </fieldset>
      <div class="alert" id="checkout-error" role="alert" hidden>${icon('circle-alert')}<div><p class="alert-title" id="checkout-error-title"></p><p id="checkout-error-text"></p></div></div>
      <div class="notice" id="checkout-offer" role="status" hidden>
        <p class="notice-title">Online payment is not open yet</p>
        <p>Nothing was charged and nothing was sent. You can send this build as a request instead, with the details above, and I will reply by email to arrange the next step.</p>
        <button type="button" class="btn btn-primary btn-xl" id="checkout-request">Send this build as a request</button>
      </div>
      <button type="submit" class="btn btn-primary btn-xl" id="checkout-submit">${icon('lock')}<span id="checkout-submit-text"></span></button>
      <p class="fineprint">Payments are processed securely by Stripe. By continuing you agree to the <a href="terms.html">terms of service</a> and the <a href="refund-policy.html">refund policy</a>. The <a href="privacy.html">privacy policy</a> explains how your details are used.</p>
    </form>
  </div>

  <div data-stage="paid" class="paid" hidden>
    ${icon('circle-check')}
    <div class="dialog-head">
      <h2>Payment received</h2>
      <p>Thank you. A receipt is on its way to your email, and I will be in touch to schedule your kickoff call.</p>
    </div>
    <button type="button" class="btn btn-primary" data-close>Done</button>
  </div>

  <div data-stage="requested" class="paid" hidden>
    ${icon('circle-check')}
    <div class="dialog-head">
      <h2>Request sent</h2>
      <p>Thank you. Your build and your details are on their way to me, and I will reply by email. Nothing was charged.</p>
    </div>
    <button type="button" class="btn btn-primary" data-close>Done</button>
  </div>
</dialog>

<dialog class="dialog" id="ask" aria-labelledby="ask-title">
  <button type="button" class="btn btn-ghost btn-icon-sm dialog-close" data-close aria-label="Close">${icon('x')}</button>

  <div data-stage="form">
    <div class="dialog-head">
      <h2 id="ask-title">Ask about this build</h2>
      <p id="ask-desc"></p>
    </div>
    <form id="ask-form" novalidate>
      <div class="field-row">
        <div class="field"><label for="ask-name">Full name</label><input class="input" id="ask-name" name="name" autocomplete="name" required maxlength="100"></div>
        <div class="field"><label for="ask-email">Email</label><input class="input" id="ask-email" name="email" type="email" autocomplete="email" required maxlength="254"></div>
      </div>
      <div class="field"><label for="ask-message">Your question or message</label><textarea class="input" id="ask-message" name="message" rows="4" required maxlength="4000"></textarea></div>
      ${honeypotHTML('ask-website')}
      <div class="alert" id="ask-error" role="alert" hidden>${icon('circle-alert')}<div><p id="ask-error-text"></p></div></div>
      <button type="submit" class="btn btn-primary btn-xl" id="ask-submit">${icon('send')}<span id="ask-submit-text">Send message</span></button>
      <p class="fineprint">Nothing is charged. The <a href="privacy.html">privacy policy</a> explains how your details are used.</p>
    </form>
  </div>

  <div data-stage="sent" class="paid" hidden>
    ${icon('circle-check')}
    <div class="dialog-head">
      <h2>Message sent</h2>
      <p>Thank you. Your message and your build are on their way to me, and I will reply by email.</p>
    </div>
    <button type="button" class="btn btn-primary" data-close>Done</button>
  </div>
</dialog>`
}

const BUILDER_SCRIPTS = ['icons', 'theme', 'site', 'catalog', 'pricing', 'share', 'portfolio-data', 'app']
const PLAIN_SCRIPTS = ['icons', 'theme', 'site']

// ---- Shared pieces of the generated pages ----

const caseFile = (projectId) => `case-study-${projectId}.html`
const optionProduct = new Map(PRODUCT_IDS.flatMap((id) => CATALOG[id].sections.flatMap((section) => section.options.map((option) => [option.id, { product: CATALOG[id], section }]))))

function opt(id) {
  if (!allOptions.has(id)) throw new Error(`Unknown block id ${id}`)
  return allOptions.get(id)
}
const price = (id) => usd(opt(id).price)

/** A build described like a template: { website: { units, picks }, app: { units, picks } }. */
function buildOf(products) {
  const { config: build } = P.buildPreset({ id: 'x', name: 'x', description: '', products })
  // Fail loudly if the content asks for something the catalog would silently drop.
  for (const [productId, product] of Object.entries(products)) {
    for (const [optionId, quantity] of Object.entries(product.picks || {})) {
      if (build[productId].selections[optionId] !== quantity) throw new Error(`Example build: ${optionId} x${quantity} does not fit the catalog`)
    }
  }
  const quote = P.computeQuote(build)
  return { config: build, quote, total: quote.total, weeks: P.estimateWeeks(quote, build), deposit: depositOf(quote.total), code: Share.encodeBuild(build) }
}

/** A table of blocks with their real prices. */
function blocksTable(ids, { hue = 250, caption = 'Blocks and prices' } = {}) {
  const rows = ids.map((id) => {
    const option = opt(id)
    return `<tr><th scope="row">${esc(option.name)}<span>${esc(option.description)}</span></th>${priceCell(option, optionProduct.get(id).product)}</tr>`
  })
  return `<div class="sec" style="--h:${hue}">
        <table class="price-table">
          <caption class="sr-only">${esc(caption)}</caption>
          <thead><tr><th scope="col">Block</th><th scope="col">Price</th></tr></thead>
          <tbody>
            ${rows.join('\n            ')}
          </tbody>
        </table>
      </div>`
}

/** An itemized quote: every line of a build with its amount, then the total and the deposit. */
function quoteTable(quote, { hue = 250, caption = 'Itemized price' } = {}) {
  const many = quote.products.length > 1
  const rows = quote.products.flatMap((product) => [
    ...(many ? [`<tr class="group"><th scope="row">${esc(product.name)}</th><td class="price"><b>${usd(product.subtotal)}</b></td></tr>`] : []),
    ...product.lines.map(
      (line) => `<tr><th scope="row">${esc(line.name)}${line.detail ? `<span>${esc(line.detail)}</span>` : ''}</th><td class="price"><b>${line.total > 0 ? usd(line.total) : 'Included'}</b></td></tr>`,
    ),
  ])
  return `<div class="sec" style="--h:${hue}">
        <table class="price-table quote-table">
          <caption class="sr-only">${esc(caption)}</caption>
          <thead><tr><th scope="col">Line</th><th scope="col">Amount</th></tr></thead>
          <tbody>
            ${rows.join('\n            ')}
          </tbody>
          <tfoot>
            <tr class="total"><th scope="row">Total</th><td class="price"><b>${usd(quote.total)}</b></td></tr>
            <tr><th scope="row">${P.DEPOSIT_PERCENT}% deposit to start</th><td class="price"><b>${usd(depositOf(quote.total))}</b></td></tr>
          </tfoot>
        </table>
      </div>`
}

/** A plain table: `head` is a list of column titles, `rows` a list of lists of HTML cells. The first cell of a row is its header. */
function dataTable(head, rows, { caption = '' } = {}) {
  return `<div class="table-scroll"><table class="data-table">
          ${caption ? `<caption class="sr-only">${esc(caption)}</caption>` : ''}
          <thead><tr>${head.map((title) => `<th scope="col">${esc(title)}</th>`).join('')}</tr></thead>
          <tbody>
            ${rows.map((cells) => `<tr>${cells.map((cell, index) => (index === 0 ? `<th scope="row">${cell}</th>` : `<td>${cell}</td>`)).join('')}</tr>`).join('\n            ')}
          </tbody>
        </table></div>`
}

function accordionHTML(entries, name) {
  return `<div class="accordion">
${entries.map((entry, index) => `        <details name="${name}"${index === 0 ? ' open' : ''}><summary>${esc(entry.q)}${icon('chevron-down')}</summary><p>${entry.html || esc(entry.a)}</p></details>`).join('\n')}
      </div>`
}

/** Link cards. Each item: { href, icon, title, text, link, meta }. */
function cardsHTML(items, { columns = 3, level = 3 } = {}) {
  return `<ul class="cards cols-${columns}">
        ${items
          .map(
            (item) => `<li><a class="card" href="${item.href}">
          ${item.icon ? `<span class="card-icon">${icon(item.icon)}</span>` : ''}
          <h${level}>${esc(item.title)}</h${level}>
          ${item.meta ? `<p class="card-meta">${esc(item.meta)}</p>` : ''}
          <p>${esc(item.text)}</p>
          <span class="card-link">${esc(item.link)} ${icon('arrow-right')}</span>
        </a></li>`,
          )
          .join('\n        ')}
      </ul>`
}

function heroHTML(page, { eyebrow = '', h1, lede, actions = '', extra = '' }) {
  return `<section class="hero compact text">
    <div class="hero-grid" aria-hidden="true"></div>
    <div class="container hero-inner">
      ${crumbsHTML(page)}
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
      <h1>${h1}</h1>
      <p class="hero-lede">${lede}</p>
      ${actions ? `<div class="hero-actions">${actions}</div>` : ''}
      ${extra}
    </div>
  </section>`
}

function sectionHTML({ id, eyebrow = '', title, intro = '', body = '', wide = false }) {
  return `<section id="${id}" aria-labelledby="${id}-heading" class="price-product">
      <header class="section-head${wide ? ' wide' : ''}">
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
        <h2 id="${id}-heading">${esc(title)}</h2>
        ${intro ? `<p>${intro}</p>` : ''}
      </header>
      ${body}
    </section>`
}

function ctaHTML({ title, text, actions }) {
  return `<section class="band">
    <div class="container cta-band">
      <h2>${esc(title)}</h2>
      <p>${text}</p>
      <div class="hero-actions">${actions}</div>
    </div>
  </section>`
}

// "About web design", but "About SEO" and "About AEO and GEO".
const aboutLabel = (name) => `About ${/^[A-Z]{2,}/.test(name) ? name : lowerFirst(name)}`

const button = (href, label, { primary = false, arrow = false } = {}) =>
  `<a href="${href}" class="btn ${primary ? 'btn-primary' : 'btn-outline'} btn-xl">${esc(label)}${arrow ? ` ${icon('arrow-right')}` : ''}</a>`

// Published market ranges. Each claim is shown next to a visible link to its source.
const SOURCES = {
  webfx: { name: 'WebFX', title: 'WebFX web design pricing', url: 'https://www.webfx.com/web-design/b2c/pricing/' },
  pceWeb: { name: 'Project Cost Estimator', title: 'Project Cost Estimator: website cost', url: 'https://projectcostestimator.com/website-cost' },
  pceApp: { name: 'Project Cost Estimator', title: 'Project Cost Estimator: mobile app cost', url: 'https://projectcostestimator.com/mobile-app-cost' },
}
const sourceLink = (key, label) => `<a class="source" href="${SOURCES[key].url}" rel="noopener">${esc(label || SOURCES[key].name)}</a>`
const MARKET = {
  freelancerDesign: { low: 500, high: 10000, open: true, label: 'Web design by a freelancer', source: 'webfx' },
  agencyDesign: { low: 3000, high: 30000, open: true, label: 'Web design by an agency', source: 'webfx' },
  landing: { low: 300, high: 3000, label: 'Landing page', source: 'pceWeb' },
  business: { low: 800, high: 10000, typical: 4000, label: 'Business website', source: 'pceWeb' },
  ecommerce: { low: 2500, high: 25000, label: 'Ecommerce store', source: 'pceWeb' },
  webApp: { low: 5000, high: 120000, label: 'Web app or SaaS', source: 'pceWeb' },
  appFreelancer: { low: 10000, high: 50000, label: 'Mobile app built by a freelancer', source: 'pceApp' },
  appAgency: { low: 25000, high: 150000, label: 'Mobile app built by an agency', source: 'pceApp' },
}
const rangeText = (key) => `${usd(MARKET[key].low)} to ${usd(MARKET[key].high)}${MARKET[key].open ? '+' : ''}`
/** Where a price sits against a published range: "below", "inside" or "above". Worked out, never typed. */
const against = (total, key) => (total < MARKET[key].low ? 'below' : total > MARKET[key].high && !MARKET[key].open ? 'above' : total > MARKET[key].high ? 'at the upper end of' : 'inside')

function marketTable(keys, caption) {
  // The source sits in the same cell as the figure, so it stays next to the claim on a narrow screen.
  return dataTable(
    ['Kind of project', 'Published range and source'],
    keys.map((key) => [esc(MARKET[key].label), `<span class="mono">${rangeText(key)}</span>${MARKET[key].typical ? `, typical about ${usd(MARKET[key].typical)}` : ''} <small>Source: ${sourceLink(MARKET[key].source, SOURCES[MARKET[key].source].title)}</small>`]),
    { caption },
  )
}

// ---- Home page sections ----

function homeFitHTML() {
  const fit = [
    { key: 'cost-personal', icon: 'user', title: 'Individuals', text: 'A portfolio, a resume site or a personal project. Start small, pay per page and add only what you will use.' },
    { key: 'cost-business', icon: 'store', title: 'Small businesses', text: 'A site that gets found locally and turns visits into calls and bookings, with a way to edit it yourself.' },
    { key: 'cost-saas', icon: 'rocket', title: 'Startups', text: 'A marketing site with a signed-in product and billing behind it, or a first mobile release on both stores.' },
  ].map((item) => {
    const page = pageByKey(item.key)
    return { href: page.file, icon: item.icon, title: item.title, text: item.text, meta: `${page.template.name} template: ${usd(page.template.total)}`, link: page.linkLabel }
  })
  const services = SERVICE_KEYS.map((key) => {
    const page = pageByKey(key)
    return { href: page.file, icon: page.icon, title: page.short, text: page.card, meta: page.from, link: aboutLabel(page.short) }
  })
  services.push({ href: 'website-cost-calculator.html', icon: 'calculator', title: 'Cost calculator', text: 'Every service in one place: switch blocks on and off and read the total, the deposit and a delivery estimate.', meta: `${blockCount} priced blocks`, link: 'Open the calculator' })
  return `  <section id="who" aria-labelledby="who-heading" class="band">
    <div class="container band-inner">
      <header class="section-head">
        <p class="eyebrow">Who it is for</p>
        <h2 id="who-heading">Built for individuals, small businesses and startups</h2>
        <p>Each kind of project has a template in the builder and a page that itemizes what it costs. Larger and enterprise projects are welcome too: <a href="contact.html">talk to me first</a> so the scope is right before anything is paid.</p>
      </header>
      ${cardsHTML(fit)}
    </div>
  </section>

  <section id="services" aria-labelledby="services-heading" class="band">
    <div class="container band-inner">
      <header class="section-head">
        <p class="eyebrow">Services</p>
        <h2 id="services-heading">Web design, development, SEO, AEO and GEO, and mobile apps</h2>
        <p>Every service is a set of blocks in the builder, each with a listed price. The <a href="services.html">services overview</a> explains how they fit together.</p>
      </header>
      ${cardsHTML(services)}
    </div>
  </section>`
}

function homeProofHTML() {
  const work = projects
    .map(
      (project) => `<li><a class="card shot-card" href="${caseFile(project.id)}">
          ${project.shot ? `<img src="${esc(project.shot.src)}" width="${project.shot.w}" height="${project.shot.h}" alt="${esc(`Screenshot of the ${project.name} homepage`)}" loading="lazy" decoding="async">` : ''}
          <h3>${esc(project.name)}</h3>
          <p class="card-meta">${esc(project.tags.join(' · '))}</p>
          <span class="card-link">Read the case study ${icon('arrow-right')}</span>
        </a></li>`,
    )
    .join('\n        ')
  return `  <section id="work" aria-labelledby="work-heading" class="band">
    <div class="container band-inner">
      <header class="section-head">
        <p class="eyebrow">Work</p>
        <h2 id="work-heading">${capital(word(projects.length))} live projects, taken apart block by block</h2>
        <p>Each case study shows the real homepage, the blocks behind it and what those blocks cost in the builder today. The <a href="portfolio.html">portfolio</a> lets you pull each one apart.</p>
      </header>
      <ul class="cards cols-4">
        ${work}
      </ul>
    </div>
  </section>

  <section id="about" aria-labelledby="about-heading" class="band">
    <div class="container band-inner">
      <div class="person">
        <header class="section-head">
          <p class="eyebrow">Who you work with</p>
          <h2 id="about-heading">One engineer, from the first call to launch</h2>
        </header>
        <div class="person-text">
          <p>${esc(SITE_NAME)} is the freelance studio of ${esc(OWNER.name)}, a software engineer with over 15 years of experience across enterprise software, small-business projects and personal projects. He is based in ${esc(PLACE.locality)}, ${esc(PLACE.regionName)}.</p>
          <p>The person who answers your message is the person who plans, builds and launches your project.</p>
          <p class="hero-actions"><a href="about.html" class="btn btn-outline btn-xl">About ${esc(OWNER.name.split(' ')[0])} ${icon('arrow-right')}</a><a href="contact.html" class="btn btn-outline btn-xl">Get in touch</a></p>
        </div>
      </div>
    </div>
  </section>`
}

// ---- Generated pages (the text lives in tools/pages.js and tools/pages-*.js) ----

// The calculator page describes the delivery estimate in words ("about one week per $2,000, at least
// two weeks"). js/pricing.js does not export those numbers, so check that the sentence is still true.
{
  const idle = P.defaultBuildConfig()
  if (P.estimateWeeks({ total: 10000 }, idle) !== 5 || P.estimateWeeks({ total: 100 }, idle) !== 2) {
    throw new Error('The delivery estimate rule in js/pricing.js changed: update the sentence about it in tools/pages-costs.js and this check')
  }
}

const ctx = {
  esc, usd, icon, word, capital, lowerFirst, fill,
  SITE_NAME, OWNER, PLACE, CATALOG, PRODUCT_IDS, P, Share, SECTION_HUES,
  templates, projects, lowest, example, blockCount, depositOf,
  opt, price, buildOf, blocksTable, quoteTable, dataTable, accordionHTML, cardsHTML, heroHTML, sectionHTML, ctaHTML, button,
  aboutLabel, SOURCES, MARKET, sourceLink, rangeText, against, marketTable,
  caseFile, abs, orgRef, siteRef, personRef, personNode, webPageNode,
  offerFor: (id) => blockOffer(opt(id), optionProduct.get(id).product),
  SHOTS,
  builderHTML, honeypotHTML,
  pageByKey: (key) => pageByKey(key),
  lang: LANG,
}
const GENERATED = require('./pages.js')(ctx)
const PAGES = [...HAND_PAGES, ...GENERATED.pages]
const { SERVICE_KEYS, COST_KEYS, CASE_KEYS, GUIDE_KEYS } = GENERATED

function pageByKey(key) {
  const page = PAGES.find((entry) => entry.key === key)
  if (!page) throw new Error(`No page with key "${key}"`)
  return page
}

{
  const files = new Set()
  for (const page of PAGES) {
    if (files.has(page.file)) throw new Error(`Two pages are both named ${page.file}`)
    files.add(page.file)
    page.url = page.indexable === false ? null : cleanPath(page.file)
    if (page.url !== null) {
      if (page.title.length < 45 || page.title.length > 62) console.warn(`Note: ${page.file} title is ${page.title.length} characters (aim for 50 to 60)`)
      if (page.description.length < 130 || page.description.length > 165) console.warn(`Note: ${page.file} description is ${page.description.length} characters (aim for 140 to 160)`)
    }
  }
}

/** A whole page, for the files that are generated from tools/pages*.js. */
function shellHTML(page) {
  const scripts = [...(page.builder ? BUILDER_SCRIPTS : PLAIN_SCRIPTS), ...(page.scripts || [])]
  return `<!DOCTYPE html>
<html lang="${LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#000000">
<!-- seo:head:start -->
${headHTML(page).trim()}
<!-- seo:head:end -->
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<!-- Preload the main font when the site is served over http(s). Opened as a local file, a preload is refused by the browser, so it is skipped there. -->
<script>if(location.protocol!=='file:'){var l=document.createElement('link');l.rel='preload';l.as='font';l.type='font/woff2';l.crossOrigin='anonymous';l.href='fonts/geist-latin-wght-normal.woff2';document.head.appendChild(l)}</script>
<link rel="stylesheet" href="css/styles.css">
</head>
<body>
<!-- This whole page is written by tools/build-seo.js from ${page.source}. Edit the text there, then run: node tools/build-seo.js -->
${page.comment ? `<!-- ${page.comment} -->\n` : ''}
<header class="site-header">
  <div class="container site-header-inner">
    <!-- seo:header:start -->
${headerHTML(page).trim()}
<!-- seo:header:end -->
  </div>${page.builder ? `
  <div class="progress" id="progress" hidden>
    <div class="container progress-inner">
      <p id="progress-label" aria-live="off"></p>
      <ol id="progress-segments" aria-label="Builder steps"></ol>
    </div>
  </div>` : ''}
</header>

<main>
  ${page.main(page).trim()}
</main>

<!-- seo:footer:start -->
${footerHTML(page).trim()}
<!-- seo:footer:end -->
${page.builder ? `\n${builderDialogsHTML()}\n` : ''}
${scripts.map((name) => `<script src="js/${name}.js"></script>`).join('\n')}
</body>
</html>
`
}

// ---- Standalone files ----

const CRAWLERS = [
  'Googlebot', 'Bingbot', 'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot',
  'PerplexityBot', 'Google-Extended', 'Applebot-Extended', 'CCBot',
]

function robotsTxt() {
  return `# ${SITE_NAME}: every crawler may read every page, including AI search and answer engines.
# Generated by tools/build-seo.js.

${CRAWLERS.map((name) => `User-agent: ${name}`).join('\n')}
Allow: /

User-agent: *
Allow: /
${SITE_URL ? `\nSitemap: ${SITE_URL}/sitemap.xml\n` : ''}`
}

function sitemapXml() {
  const day = (file) => fs.statSync(at(file)).mtime.toISOString().slice(0, 10)
  const urls = PAGES.filter((page) => page.url !== null).map(
    (page) => `  <url>\n    <loc>${esc(`${SITE_URL}/${page.url}`)}</loc>\n    <lastmod>${day(page.file)}</lastmod>\n  </url>`,
  )
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

function llmsTxt() {
  const { website, app } = CATALOG
  const link = (file) => abs(file)
  const search = website.sections.find((section) => section.id === SEARCH_SECTION)
  const perUnitNote = (option, product) => (option.unit === 'perUnit' ? ` per ${product.unit.singular}` : '')
  return `# ${SITE_NAME}

> ${ABOUT}

## Services

- Website design and development: from ${usd(lowest.website.total)}.
- SEO, AEO and GEO optimization: priced per page or as one-time blocks, added to a website build.
- Mobile app design and development for iOS and Android: from ${usd(lowest.app.total)}.

## How pricing works

- Every project is a foundation, plus a price per page or screen, plus optional blocks. Each block has a fixed listed price. There are ${blockCount} blocks.
- Website: ${usd(website.basePrice)} foundation plus ${usd(website.unit.price)} per page (${website.unit.min} to ${website.unit.max} pages). The foundation includes: ${website.included.map(lowerFirst).join('; ')}.
- Mobile app: ${usd(app.basePrice)} foundation plus ${usd(app.unit.price)} per screen (${app.unit.min} to ${app.unit.max} screens). The foundation includes: ${app.included.map(lowerFirst).join('; ')}.
- A website with ${website.unit.default} pages and no extra blocks costs ${usd(example.website.total)}. An app with ${app.unit.default} screens and no extra blocks costs ${usd(example.app.total)}.
- ${search.title}: ${search.options.map((option) => `${option.name} ${usd(option.price)}${perUnitNote(option, website)}`).join(', ')}.
- Templates: ${templates.map((template) => `${template.name} ${usd(template.total)}`).join(', ')}.
- Payment: a ${P.DEPOSIT_PERCENT}% deposit to start with the balance invoiced before launch, or the full amount up front.

## Pages

${[pageByKey('home'), ...PAGES.filter((page) => page.url !== null && page.key !== 'home')].map((page) => `- [${page.llms || page.title.replace(/ \| .*$/, '')}](${link(page.file)}): ${page.description}`).join('\n')}

## Who runs it

- ${OWNER.name}, a software engineer with over 15 years of experience across enterprise software, small-business projects and personal projects, based in ${PLACE.locality}, ${PLACE.regionName}. ${SITE_NAME} is his freelance studio.
- Customers: individuals, small businesses and startups. Larger and enterprise projects start with a conversation through the contact page.

## Portfolio

${projects.map((project) => `- [${project.name}](${project.url}): ${project.summary} The same blocks cost ${usd(project.total)} in the builder today. Case study: ${link(caseFile(project.id))}`).join('\n')}
`
}

function webManifest() {
  return `${JSON.stringify(
    {
      name: SITE_NAME,
      short_name: SITE_NAME,
      description: ABOUT,
      start_url: 'index.html',
      display: 'browser',
      background_color: '#000000',
      theme_color: '#000000',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    null,
    2,
  )}\n`
}

// ---- Build ----

const REGIONS = {
  head: headHTML,
  header: headerHTML,
  footer: footerHTML,
  crumbs: crumbsHTML,
  builder: builderHTML,
  'builder-dialogs': builderDialogsHTML,
  'home-fit': homeFitHTML,
  'home-proof': homeProofHTML,
  'hero-facts': heroFactsHTML,
  costs: costsHTML,
  faq: faqHTML,
  pricing: pricingHTML,
  works: worksHTML,
}

for (const page of HAND_PAGES) {
  let html = read(page.file)
  for (const name of page.regions) html = replaceRegion(html, name, REGIONS[name](page), page.file)
  write(page.file, html)
}
for (const page of GENERATED.pages) write(page.file, shellHTML(page))

write('robots.txt', robotsTxt())
write('llms.txt', llmsTxt())
write('site.webmanifest', webManifest())
// The sitemap needs full addresses, so it only exists once the domain is known.
if (SITE_URL) write('sitemap.xml', sitemapXml())
else remove('sitemap.xml')

for (const file of [SHARE_IMAGE.file, 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'favicon.svg']) {
  if (!fs.existsSync(at(file))) console.warn(`Note: ${file} is missing. Create it with: python3 tools/make-images.py`)
}

console.log(SITE_URL ? `Site address: ${SITE_URL}` : 'No siteUrl in site.config.json yet: canonical links, og:url, og:image and sitemap.xml are left out.')
console.log(changed.length ? `Updated: ${changed.join(', ')}` : 'Everything is already up to date.')
