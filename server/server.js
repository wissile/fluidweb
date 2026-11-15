// Optional payment server. Serves the site and creates Stripe Checkout sessions.
//
//   npm install stripe
//   STRIPE_SECRET_KEY=sk_test_... node server/server.js
//
// Then set <meta name="checkout-endpoint" content="/api/checkout"> in index.html.
// Prices never come from the browser: the total is rebuilt here from js/catalog.js.
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const Pricing = require('../js/pricing.js')
const { formatUSD, DEPOSIT_PERCENT, ValidationError } = Pricing

const PORT = process.env.PORT || 3000
const SITE_URL = process.env.SITE_URL || `http://localhost:${PORT}`
const ROOT = path.resolve(__dirname, '..')

const MAX_LINE_ITEMS = 100
const MAX_CHARGE_CENTS = 99_999_999
const METADATA_VALUE_LIMIT = 500
const MAX_BODY_BYTES = 64 * 1024

let stripeClient
function stripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
  stripeClient ??= require('stripe')(process.env.STRIPE_SECRET_KEY)
  return stripeClient
}

function lineItem(name, unitAmountCents, quantity, description) {
  return {
    price_data: {
      currency: 'usd',
      product_data: { name, ...(description ? { description } : {}) },
      unit_amount: unitAmountCents,
    },
    quantity,
  }
}

function fullLineItems(quote) {
  const itemized = quote.products.flatMap((product) =>
    product.lines
      .filter((line) => line.total > 0)
      .map((line) => lineItem(`${product.name}: ${line.name}`, line.unitAmount * 100, line.quantity, line.detail ?? undefined)),
  )
  if (itemized.length <= MAX_LINE_ITEMS) return itemized
  return quote.products.map((product) =>
    lineItem(`${product.name} build`, product.subtotal * 100, 1, `${product.lines.length} blocks`),
  )
}

function depositLineItem(quote, amountCents) {
  const scope = quote.products.map((product) => product.name).join(' + ')
  return lineItem(
    `${DEPOSIT_PERCENT}% kickoff deposit: ${scope}`,
    amountCents,
    1,
    `Project total ${formatUSD(quote.total)}. The remaining balance is invoiced before launch.`,
  )
}

// The order itself lives in Stripe: the full configuration is attached to the
// payment so it can be read back from the dashboard without a separate database.
function buildMetadata(request, quote, amountCents) {
  const { config, contact, plan } = request
  const metadata = {
    plan,
    project_total_usd: String(quote.total),
    charged_usd: String(amountCents / 100),
    customer_name: contact.name,
  }
  if (contact.company) metadata.company = contact.company
  if (contact.notes) metadata.notes = contact.notes

  const selected = Object.fromEntries(
    quote.products.map((product) => {
      const { units, selections } = config[product.productId]
      return [product.productId, { units, selections }]
    }),
  )
  const serialized = JSON.stringify(selected)
  for (let offset = 0, part = 1; offset < serialized.length; offset += METADATA_VALUE_LIMIT, part++) {
    metadata[`build_${part}`] = serialized.slice(offset, offset + METADATA_VALUE_LIMIT)
  }
  return metadata
}

async function startCheckoutSession(input) {
  let request
  try {
    request = Pricing.parseCheckoutRequest(input)
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, error: error.message }
    throw error
  }

  const quote = Pricing.computeQuote(request.config)
  const amountCents = Pricing.amountDueCents(quote.total, request.plan)
  if (amountCents > MAX_CHARGE_CENTS) {
    return { ok: false, error: 'This build is too large to pay online in one payment. Choose the deposit instead.' }
  }

  const metadata = buildMetadata(request, quote, amountCents)
  const description =
    request.plan === 'deposit'
      ? `${DEPOSIT_PERCENT}% deposit on a ${formatUSD(quote.total)} build`
      : `Full payment for a ${formatUSD(quote.total)} build`

  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: request.contact.email,
        line_items: request.plan === 'deposit' ? [depositLineItem(quote, amountCents)] : fullLineItems(quote),
        metadata,
        payment_intent_data: { description, metadata },
        success_url: `${SITE_URL}/?checkout=success`,
        cancel_url: `${SITE_URL}/#builder`,
      },
      { idempotencyKey: `checkout_${request.attemptId}` },
    )
    if (!session.url) throw new Error('Stripe returned a session without a URL')
    return { ok: true, url: session.url }
  } catch (error) {
    console.error('Failed to create Stripe checkout session', error)
    return { ok: false, error: 'We could not start checkout. Please try again in a moment.' }
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'))
        req.destroy()
      } else chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        resolve(null)
      }
    })
    req.on('error', reject)
  })
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}
// Folders that are public as a whole, and the kinds of file that are public at the top level
// (pages, icons, robots.txt, llms.txt, sitemap.xml, site.webmanifest). Everything else, including
// server/, tools/, README.md, site.config.json and dotfiles, is never served.
const PUBLIC_DIRS = ['css', 'js', 'img', 'fonts']
const ROOT_TYPES = ['.html', '.png', '.svg', '.txt', '.xml', '.webmanifest']
const NOT_FOUND_PAGE = path.join(ROOT, '404.html')

function publicFile(pathname) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const segments = relative.split('/')
  if (segments.some((segment) => segment === '' || segment.startsWith('.'))) return null
  const file = path.resolve(ROOT, relative)
  if (!file.startsWith(ROOT + path.sep) || !TYPES[path.extname(file)]) return null
  const allowed = segments.length === 1 ? ROOT_TYPES.includes(path.extname(file)) : PUBLIC_DIRS.includes(segments[0])
  if (!allowed || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null
  return file
}

function send(req, res, status, file) {
  res.writeHead(status, { 'Content-Type': TYPES[path.extname(file)] })
  if (req.method === 'HEAD') res.end()
  else fs.createReadStream(file).pipe(res)
}

function serveStatic(req, res) {
  let file = null
  try {
    file = publicFile(decodeURIComponent(new URL(req.url, SITE_URL).pathname))
  } catch {
    // A malformed address is treated like any other unknown path.
  }
  if (file && file !== NOT_FOUND_PAGE) send(req, res, 200, file)
  else sendNotFound(req, res)
}

// 404.html uses relative links. An unknown address can be several folders deep, so point them at the root
// (unless tools/build-seo.js already wrote a <base> for the real domain).
function sendNotFound(req, res) {
  if (!fs.existsSync(NOT_FOUND_PAGE)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found')
    return
  }
  let html = fs.readFileSync(NOT_FOUND_PAGE, 'utf8')
  if (!html.includes('<base ')) html = html.replace('<head>', '<head>\n<base href="/">')
  res.writeHead(404, { 'Content-Type': TYPES['.html'] })
  res.end(req.method === 'HEAD' ? undefined : html)
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/checkout') {
      const result = await startCheckoutSession(await readJson(req))
      res.writeHead(result.ok ? 200 : 400, { 'Content-Type': 'application/json' }).end(JSON.stringify(result))
    } else if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res)
    } else {
      res.writeHead(405, { 'Content-Type': 'text/plain' }).end('Method not allowed')
    }
  } catch (error) {
    console.error(error)
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: 'We could not start checkout. Please try again in a moment.' }))
  }
})

if (require.main === module) server.listen(PORT, () => console.log(`Fluidweb running at ${SITE_URL}`))
module.exports = { server, startCheckoutSession }
