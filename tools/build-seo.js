#!/usr/bin/env node
// Writes everything search engines and AI crawlers read without running JavaScript:
// head tags, structured data, the static price list, FAQ and portfolio content, and the
// crawl files (robots.txt, sitemap.xml, llms.txt, site.webmanifest).
//
//   node tools/build-seo.js
//
// Sources: site.config.json (domain and name), tools/content.js (titles, descriptions, FAQ),
// js/catalog.js + js/pricing.js (every price), js/portfolio-data.js + js/portfolio-shots.js.
// In the HTML files only the text between <!-- seo:NAME:start --> and <!-- seo:NAME:end -->
// is replaced, so everything else can be edited by hand. Running it twice changes nothing.
// No dependencies.
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

// ---- Helpers ----

const esc = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const usd = P.formatUSD
const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1)
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const word = (count) => WORDS[count] ?? String(count)
const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1)
// Absolute URL when the domain is known, otherwise the relative path.
const abs = (relative) => (SITE_URL ? `${SITE_URL}/${relative}` : relative)

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

// ---- Pages ----

const PAGES = [
  { key: 'home', file: 'index.html', url: '', regions: ['head', 'header', 'hero-facts', 'costs', 'faq', 'footer'] },
  { key: 'pricing', file: 'pricing.html', url: 'pricing.html', crumb: 'Pricing', regions: ['head', 'header', 'pricing', 'footer'] },
  { key: 'portfolio', file: 'portfolio.html', url: 'portfolio.html', crumb: 'Portfolio', regions: ['head', 'header', 'works', 'footer'] },
  { key: 'notFound', file: '404.html', url: null, regions: ['head', 'header', 'footer'] },
]
for (const page of PAGES) {
  page.title = fill(CONTENT.pages[page.key].title)
  page.description = fill(CONTENT.pages[page.key].description)
  if (page.url !== null) {
    if (page.title.length < 45 || page.title.length > 62) console.warn(`Note: ${page.file} title is ${page.title.length} characters (aim for 50 to 60)`)
    if (page.description.length < 130 || page.description.length > 165) console.warn(`Note: ${page.file} description is ${page.description.length} characters (aim for 140 to 160)`)
  }
}

// Links to sections of the home page are plain #anchors on the home page itself.
const NAV = [
  { label: 'Builder', home: '#builder' },
  { label: 'Pricing', file: 'pricing.html', key: 'pricing' },
  { label: 'Portfolio', file: 'portfolio.html', key: 'portfolio', keep: true },
  { label: 'Process', home: '#process' },
  { label: 'FAQ', home: '#faq' },
]
const navHref = (item, page) => (item.file ? item.file : page.key === 'home' ? item.home : `index.html${item.home}`)
const builderHref = (page) => (page.key === 'home' ? '#builder' : 'index.html#builder')
const LOGO_MARK = '<span class="logo-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>'

// ---- Structured data ----

const orgId = SITE_URL ? `${SITE_URL}/#organization` : null
const siteId = SITE_URL ? `${SITE_URL}/#website` : null
const orgRef = () => (orgId ? { '@id': orgId } : { '@type': 'Organization', name: SITE_NAME })
const siteRef = () => (siteId ? { '@id': siteId } : { '@type': 'WebSite', name: SITE_NAME })

function organizationNode() {
  const extra = {}
  for (const key of ['legalName', 'email', 'telephone', 'address', 'founder', 'sameAs']) {
    const value = ORG_EXTRA[key]
    if (value && (!Array.isArray(value) || value.length > 0)) extra[key] = value
  }
  return {
    '@type': 'Organization',
    ...(orgId ? { '@id': orgId, url: `${SITE_URL}/`, logo: `${SITE_URL}/icon-512.png` } : {}),
    name: SITE_NAME,
    description: ABOUT,
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

function breadcrumbNode(page) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL ? `${SITE_URL}/` : 'index.html' },
      { '@type': 'ListItem', position: 2, name: page.crumb, item: abs(page.url) },
    ],
  }
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
  if (page.key === 'pricing') graph.push(webPageNode(page), breadcrumbNode(page), ...serviceNodes(true))
  if (page.key === 'portfolio') graph.push(webPageNode(page, 'CollectionPage'), breadcrumbNode(page), portfolioNode())
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
    '<meta property="og:type" content="website">',
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
  return lines.join('\n')
}

function headerHTML(page) {
  const links = NAV.map((item) => {
    const attrs = [`href="${navHref(item, page)}"`]
    if (item.keep) attrs.push('class="keep"')
    if (item.key && item.key === page.key) attrs.push('aria-current="page"')
    return `      <a ${attrs.join(' ')}>${item.label}</a>`
  }).join('\n')
  return `    <a href="index.html" aria-label="${esc(SITE_NAME)} home" class="logo">${LOGO_MARK}${esc(SITE_NAME)}</a>
    <nav aria-label="Main" class="site-nav" id="site-nav">
${links}
    </nav>
    <a href="${builderHref(page)}" class="btn btn-primary btn-lg">Start building</a>
    <button type="button" class="btn btn-outline nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Menu" hidden>${icon('menu')}</button>`
}

function footerHTML(page) {
  const links = NAV.map((item) => `      <a href="${navHref(item, page)}">${item.label}</a>`).join('\n')
  return `<footer class="site-footer">
  <div class="container site-footer-inner">
    <div class="footer-brand">
      <a href="index.html" aria-label="${esc(SITE_NAME)} home" class="logo">${LOGO_MARK}${esc(SITE_NAME)}</a>
      <p>Web design, development, search optimization and mobile apps.</p>
    </div>
    <nav aria-label="Footer" class="footer-nav">
${links}
    </nav>
    <p>© <span id="year">${YEAR}</span> ${esc(SITE_NAME)}</p>
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
        <h2 id="costs-heading">What it costs</h2>
        <p>A website costs from ${usd(lowest.website.total)} and a mobile app from ${usd(lowest.app.total)}. A website with ${website.unit.default} pages and no extra blocks is ${usd(example.website.total)}, and an app with ${app.unit.default} screens is ${usd(example.app.total)}. Each block you add has its own listed price.</p>
      </header>
      <div class="foundations">
      ${PRODUCT_IDS.map((id) => foundationCardHTML(CATALOG[id], 3)).join('\n      ')}
      </div>
      <div class="cost-templates">
        <h3>Templates as a starting point</h3>
        <ul>${templates.map((template) => `<li><b>${esc(template.name)}</b><span>${esc(template.description)}</span><span class="mono">${usd(template.total)}</span></li>`).join('')}</ul>
      </div>
      <p><a href="pricing.html" class="btn btn-outline btn-xl">See the full price list ${icon('arrow-right')}</a></p>
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
      <a href="index.html#builder" class="btn btn-primary btn-xl">Start building ${icon('arrow-right')}</a>
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
        <a class="work-open" href="index.html#build-${project.id}">Open the ${esc(project.name)} build in the builder ${icon('arrow-right')}</a>
      </div>
    </article>`
}

const worksHTML = () => `    ${projects.map(projectHTML).join('\n    ')}`

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
  const link = (file) => (SITE_URL ? `${SITE_URL}/${file === 'index.html' ? '' : file}` : file)
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

- [Builder](${link('index.html')}): pick a website, a mobile app or both, add blocks and see the total.
- [Pricing](${link('pricing.html')}): the full price list, every block with its price and unit.
- [Portfolio](${link('portfolio.html')}): live projects with the blocks each one uses.

## Portfolio

${projects.map((project) => `- [${project.name}](${project.url}): ${project.summary} The same blocks cost ${usd(project.total)} in the builder today.`).join('\n')}
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
  'hero-facts': heroFactsHTML,
  costs: costsHTML,
  faq: faqHTML,
  pricing: pricingHTML,
  works: worksHTML,
}

for (const page of PAGES) {
  let html = read(page.file)
  for (const name of page.regions) html = replaceRegion(html, name, REGIONS[name](page), page.file)
  write(page.file, html)
}

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
