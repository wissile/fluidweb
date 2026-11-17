// Copies the files that should be public into dist/ for static hosting (Cloudflare Workers assets).
// server/, src/, tools/, README.md, site.config.json and wrangler.jsonc stay out of the published site.
//   npm run build   -> regenerates the SEO content, then fills dist/
//
// The source keeps links such as pricing.html#templates so every page works when opened from disk.
// In production the host serves pricing.html at /pricing (and redirects /pricing.html to it), so the
// copies in dist/ get root-relative addresses without the extension:
//   index.html -> /        pricing.html#x -> /pricing#x        css/styles.css -> /css/styles.css
// That also lets 404.html, which is served at any depth, find its styles and links.
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')
const FOLDERS = ['css', 'js', 'img', 'fonts']
const FILE_TYPES = ['.html', '.png', '.svg', '.txt', '.xml', '.webmanifest']
const EXTRA_FILES = ['_headers']

fs.rmSync(dist, { recursive: true, force: true })
fs.mkdirSync(dist)

let count = 0
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  const from = path.join(root, entry.name)
  const to = path.join(dist, entry.name)
  if (entry.isDirectory() && FOLDERS.includes(entry.name)) {
    fs.cpSync(from, to, { recursive: true })
    count += 1
  } else if (entry.isFile() && (FILE_TYPES.includes(path.extname(entry.name)) || EXTRA_FILES.includes(entry.name))) {
    fs.copyFileSync(from, to)
    count += 1
  }
}

// ---- Clean addresses ----

const pages = fs
  .readdirSync(dist)
  .filter((name) => name.endsWith('.html') && name !== '404.html')
  .map((name) => name.slice(0, -'.html'.length))
const rootFiles = fs.readdirSync(dist).filter((name) => fs.statSync(path.join(dist, name)).isFile() && !name.endsWith('.html') && !name.startsWith('_'))
const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const cleanPage = (name) => (name === 'index' ? '/' : `/${name}`)

// A page name right after a quote, a backtick or "(" : href="pricing.html#x", 'index.html#build-', `case-study-${id}.html`, [text](pricing.html).
const pageLink = new RegExp(`(["'\`(])(${pages.map(escapeRe).join('|')})\\.html(?=[#?"'\`)]|$)`, 'gm')
// Pages whose name is put together in a script: `case-study-${project.id}.html`.
const builtLink = /(["'`])(case-study-\$\{[^}]+\})\.html(?=[#"'`])/g
// Files and folders at the top of the site, in an attribute or a script string.
const assetLink = new RegExp(`(["'\`(])((?:${FOLDERS.join('|')})/|(?:${rootFiles.map(escapeRe).join('|')})(?=["'\`)]))`, 'g')

function cleanLinks(text, { assets }) {
  let out = text.replace(pageLink, (match, open, name) => `${open}${cleanPage(name)}`).replace(builtLink, (match, open, name) => `${open}/${name}`)
  if (assets) out = out.replace(assetLink, (match, open, target) => `${open}/${target}`)
  return out
}

let rewritten = 0
function rewrite(file, options) {
  const before = fs.readFileSync(file, 'utf8')
  const after = cleanLinks(before, options)
  if (after !== before) {
    fs.writeFileSync(file, after)
    rewritten += 1
  }
}

for (const name of fs.readdirSync(dist)) {
  const file = path.join(dist, name)
  if (name.endsWith('.html')) rewrite(file, { assets: true })
  if (name === 'llms.txt') rewrite(file, { assets: false })
  if (name === 'site.webmanifest') {
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
    manifest.start_url = '/'
    manifest.icons = manifest.icons.map((icon) => ({ ...icon, src: `/${icon.src.replace(/^\/+/, '')}` }))
    fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
    rewritten += 1
  }
}
// Scripts build links (to the builder, to case studies) and image paths (portfolio screenshots).
for (const name of fs.readdirSync(path.join(dist, 'js'))) rewrite(path.join(dist, 'js', name), { assets: true })

// Nothing in dist/ may still point at a page by its file name.
const leftovers = []
for (const file of [...fs.readdirSync(dist).filter((name) => name.endsWith('.html')).map((name) => path.join(dist, name)), ...fs.readdirSync(path.join(dist, 'js')).map((name) => path.join(dist, 'js', name))]) {
  const found = fs.readFileSync(file, 'utf8').match(/(?:href|src)="(?!https?:|\/|#|mailto:|data:|\$\{)[^"]*"/g)
  if (found) leftovers.push(`${path.relative(dist, file)}: ${[...new Set(found)].slice(0, 5).join(' ')}`)
}
if (leftovers.length) {
  console.error(`dist/ still has relative addresses:\n  ${leftovers.join('\n  ')}`)
  process.exit(1)
}

console.log(`dist/ ready: ${count} top-level entries copied, ${rewritten} files rewritten to clean addresses`)
