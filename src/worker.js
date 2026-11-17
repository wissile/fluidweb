// Cloudflare Worker for the site. Static files are served by the assets binding without running
// this script; it only runs for addresses that match no file. It answers POST /api/contact (the
// contact form and "Ask about this build") and hands everything else back to the assets binding,
// which serves 404.html.
//
// Configuration (Worker settings, never in the repository):
//   RESEND_API_KEY  secret. API key from resend.com.
//   CONTACT_TO      var in wrangler.jsonc. Where messages are delivered.
//   CONTACT_FROM    var in wrangler.jsonc. The sender, an address Resend may send from.
//
// Message contents are never logged.
//
// js/catalog.js, js/pricing.js and js/share.js are the same files the browser loads. They are
// written as UMD (module.exports under a bundler or Node), so wrangler's bundler pulls them in as
// CommonJS and a build attached to a message is re-priced here from the catalog.
import Pricing from '../js/pricing.js'
import Share from '../js/share.js'

const CONTACT_PATH = '/api/contact'
const RESEND_URL = 'https://api.resend.com/emails'
const MAX_BODY_BYTES = 16 * 1024

const LIMITS = { name: 100, email: 254, company: 100, message: 4000, callTimes: 300 }
const TOPICS = {
  general: 'General question',
  quote: 'Quote request',
  call: 'Call request',
}
const FIELDS = ['name', 'email', 'company', 'message', 'topic', 'callTimes', 'build', 'website']
const EMAIL_PATTERN = /^[^\s@<>(),;:"\\[\]]+@[^\s@<>(),;:"\\[\]]+\.[^\s@<>(),;:"\\[\]]{2,}$/
// Line breaks and other control characters are refused in single-line fields (they end up in the subject line).
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/
const CONTROL_CHARS_EXCEPT_BREAKS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

class InputError extends Error {}

function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
  })
}

const fail = (status, error, headers) => json(status, { ok: false, error }, headers)

function readLine(input, key, label, required) {
  const value = input[key]
  if (value === undefined || value === null) {
    if (required) throw new InputError(`${label} is required.`)
    return ''
  }
  if (typeof value !== 'string') throw new InputError(`${label} must be text.`)
  const text = value.trim()
  if (required && text.length === 0) throw new InputError(`${label} is required.`)
  if (text.length > LIMITS[key]) throw new InputError(`${label} must be ${LIMITS[key]} characters or fewer.`)
  if (CONTROL_CHARS.test(text)) throw new InputError(`${label} must be a single line.`)
  return text
}

function readText(input, key, label, required) {
  const value = input[key]
  if (value === undefined || value === null) {
    if (required) throw new InputError(`${label} is required.`)
    return ''
  }
  if (typeof value !== 'string') throw new InputError(`${label} must be text.`)
  const text = value.replace(/\r\n?/g, '\n').trim()
  if (required && text.length === 0) throw new InputError(`${label} is required.`)
  if (text.length > LIMITS[key]) throw new InputError(`${label} must be ${LIMITS[key]} characters or fewer.`)
  if (CONTROL_CHARS_EXCEPT_BREAKS.test(text)) throw new InputError(`${label} contains characters that cannot be sent.`)
  return text
}

/** The build arrives as the builder's configuration object or as the short code from js/share.js. Either way it is validated strictly and priced here. */
function readBuild(value) {
  if (value === undefined || value === null || value === '') return null
  const raw = typeof value === 'string' ? Share.decodeBuild(value) : value
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw new InputError('The attached build could not be read.')
  let config
  try {
    config = Pricing.parseBuildConfig(raw)
  } catch (error) {
    if (error instanceof Pricing.ValidationError) throw new InputError(`The attached build could not be read. ${error.message}`)
    throw error
  }
  const quote = Pricing.computeQuote(config)
  return { config, quote, weeks: Pricing.estimateWeeks(quote, config), code: Share.encodeBuild(config) }
}

/** Returns a clean message, or throws InputError with a sentence that is safe to show the visitor. */
export function parseContact(input) {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new InputError('The message could not be read.')
  for (const key of Object.keys(input)) {
    if (!FIELDS.includes(key)) throw new InputError('The message could not be read.')
  }
  // The honeypot: a field people never see. Anything in it means the form was filled in by a script.
  if (input.website !== undefined && input.website !== '') throw new InputError('The message could not be sent.')

  const topic = input.topic === undefined ? 'general' : input.topic
  if (typeof topic !== 'string' || !Object.hasOwn(TOPICS, topic)) throw new InputError('Choose what the message is about.')

  const name = readLine(input, 'name', 'Name', true)
  const email = readLine(input, 'email', 'Email', true)
  if (!EMAIL_PATTERN.test(email)) throw new InputError('Enter a valid email address.')
  const company = readLine(input, 'company', 'Company', false)
  const build = readBuild(input.build)
  // A build says what is being asked for, so the message may be empty when one is attached.
  const message = readText(input, 'message', 'Message', build === null)
  const callTimes = readLine(input, 'callTimes', 'Preferred call times', false)

  return { topic, name, email, company, message, callTimes, build }
}

const usd = Pricing.formatUSD

export function quoteText(build) {
  const { quote, weeks, code } = build
  const lines = []
  for (const product of quote.products) {
    lines.push(`${product.name}: ${usd(product.subtotal)}`)
    for (const line of product.lines) {
      const amount = line.total > 0 ? usd(line.total) : 'Included'
      lines.push(`  - ${line.name}${line.detail ? ` (${line.detail})` : ''}: ${amount}`)
    }
    lines.push('')
  }
  lines.push(
    `Project total: ${usd(quote.total)}`,
    `${Pricing.DEPOSIT_PERCENT}% deposit: ${usd(Pricing.amountDueCents(quote.total, 'deposit') / 100)}`,
    `Builder estimate: about ${weeks} weeks`,
    `Blocks: ${quote.blocks}`,
    '',
    'Priced by the Worker from js/catalog.js. To open this build, add this to the address of the home page:',
    `#${code}`,
  )
  return lines.join('\n')
}

export function emailFor(contact, env) {
  const { topic, name, email, company, message, callTimes, build } = contact
  const subject = `${TOPICS[topic]} from ${name}${build ? ` (${usd(build.quote.total)} build)` : ''}`
  const parts = [
    `Topic: ${TOPICS[topic]}`,
    `Name: ${name}`,
    `Email: ${email}`,
    ...(company ? [`Company: ${company}`] : []),
    ...(callTimes ? [`Preferred call times: ${callTimes}`] : []),
    '',
    'Message:',
    message || '(no message)',
  ]
  if (build) parts.push('', '---- Attached build ----', '', quoteText(build))
  parts.push('', '--', 'Sent from the contact form on the website. Reply to this email to answer the visitor.')
  return { from: env.CONTACT_FROM, to: [env.CONTACT_TO], reply_to: email, subject, text: parts.join('\n') }
}

/** Reads at most MAX_BODY_BYTES. Returns null when the body is larger. */
async function readBody(request) {
  const declared = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null
  if (!request.body) return ''
  const reader = request.body.getReader()
  const chunks = []
  let size = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > MAX_BODY_BYTES) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

/** A form on another site must not be able to post here: the Origin header has to name this host. */
function sameOrigin(request, url) {
  const origin = request.headers.get('Origin')
  if (!origin) return false
  try {
    return new URL(origin).host === url.host
  } catch {
    return false
  }
}

async function handleContact(request, env, url) {
  if (request.method !== 'POST') return fail(405, 'Use POST.', { Allow: 'POST' })
  if (!sameOrigin(request, url)) return fail(403, 'This form only accepts messages sent from this website.')
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase()
  if (type !== 'application/json') return fail(415, 'Send the message as JSON.')

  const body = await readBody(request)
  if (body === null) return fail(413, 'The message is too long.')

  let contact
  try {
    let input
    try {
      input = JSON.parse(body)
    } catch {
      throw new InputError('The message could not be read.')
    }
    contact = parseContact(input)
  } catch (error) {
    if (error instanceof InputError) return fail(400, error.message)
    throw error
  }

  // Never answer "sent" unless the mail service accepted the message.
  if (!env.RESEND_API_KEY || !env.CONTACT_TO || !env.CONTACT_FROM) {
    return fail(503, 'Messages cannot be delivered yet because email is not set up on this site. Nothing was sent.')
  }

  let delivered = false
  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(emailFor(contact, env)),
    })
    delivered = response.ok
    // Only the status is logged, never the message.
    if (!delivered) console.error(`Contact email was refused by the mail service (status ${response.status})`)
  } catch {
    console.error('Contact email could not reach the mail service')
  }
  if (!delivered) return fail(502, 'The message could not be delivered. Nothing was sent. Please try again later.')
  return json(200, { ok: true })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === CONTACT_PATH) {
      try {
        return await handleContact(request, env, url)
      } catch {
        console.error('Contact request failed unexpectedly')
        return fail(500, 'Something went wrong. Nothing was sent. Please try again later.')
      }
    }
    return env.ASSETS.fetch(request)
  },
}
