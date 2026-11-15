// Copies the files that should be public into dist/ for static hosting (Cloudflare Pages, Netlify, ...).
// server/, tools/, README.md and site.config.json stay out of the published site.
//   npm run build   -> regenerates the SEO content, then fills dist/
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
console.log(`dist/ ready: ${count} top-level entries copied`)
