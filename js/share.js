// A build written as a short piece of text, used for "Copy link to this build" (page.html#b1-...)
// and for the copy the builder keeps in the browser's local storage.
//
//   b1-w.8.dynamic~2.design-custom.seo_a.10.complex~3.platform-cross
//
// "b1" is the format version. Products are joined with "_": w = website, a = mobile app. Inside a
// product the parts are joined with ".": the number of pages or screens first, then every selected
// block (its id without the "w-" or "a-" prefix), with "~quantity" when the quantity is above one.
// decodeBuild only checks the shape. Callers must pass the result through Pricing.parseBuildConfig,
// which rejects unknown blocks and out-of-range numbers.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./catalog.js'))
  else root.Share = factory(root.Catalog)
})(typeof self !== 'undefined' ? self : this, function (Catalog) {
  const { PRODUCT_IDS } = Catalog

  const VERSION = 'b1'
  const MAX_LENGTH = 2000
  const LETTERS = { website: 'w', app: 'a' }
  const PRODUCT_OF = Object.fromEntries(Object.entries(LETTERS).map(([productId, letter]) => [letter, productId]))
  const CODE_PATTERN = /^b1-[a-z0-9.~_-]+$/

  /** Returns '' when nothing is in the build. */
  function encodeBuild(config) {
    const parts = []
    for (const productId of PRODUCT_IDS) {
      const product = config && config[productId]
      if (!product || !product.enabled) continue
      const letter = LETTERS[productId]
      const tokens = [letter, String(product.units)]
      for (const [optionId, quantity] of Object.entries(product.selections)) {
        if (!(quantity > 0) || !optionId.startsWith(`${letter}-`)) continue
        const short = optionId.slice(2)
        tokens.push(quantity > 1 ? `${short}~${quantity}` : short)
      }
      parts.push(tokens.join('.'))
    }
    return parts.length ? `${VERSION}-${parts.join('_')}` : ''
  }

  /** Returns { website?: { enabled, units, selections }, app?: ... } or null when the text is not a build code. */
  function decodeBuild(text) {
    if (typeof text !== 'string' || text.length > MAX_LENGTH || !CODE_PATTERN.test(text)) return null
    const build = {}
    for (const part of text.slice(VERSION.length + 1).split('_')) {
      const [letter, units, ...blocks] = part.split('.')
      const productId = PRODUCT_OF[letter]
      if (!productId || build[productId] || !/^[1-9][0-9]{0,2}$/.test(units || '')) return null
      const selections = {}
      for (const block of blocks) {
        const match = /^([a-z0-9]+(?:-[a-z0-9]+)*)(?:~([1-9][0-9]{0,2}))?$/.exec(block)
        if (!match) return null
        const optionId = `${letter}-${match[1]}`
        if (optionId in selections) return null
        selections[optionId] = match[2] ? Number(match[2]) : 1
      }
      build[productId] = { enabled: true, units: Number(units), selections }
    }
    return Object.keys(build).length ? build : null
  }

  return { VERSION, CODE_PATTERN, encodeBuild, decodeBuild }
})
