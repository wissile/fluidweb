# Fluidweb

The Fluidweb site rebuilt in plain HTML, CSS and JavaScript. No framework and no build step.

## Run it

Open `index.html` in a browser, or serve the folder with any static host. The pages need no build step to run. One script, `tools/build-seo.js`, refreshes the text that search engines read (see below).

## Files

| File | What it holds |
|---|---|
| `index.html` | Home page: header, hero, builder shell, process, "What it costs", FAQ, footer, dialogs |
| `pricing.html` | The full price list as plain HTML. Its content is written by `tools/build-seo.js` |
| `portfolio.html` | Portfolio page. Ships with a plain version of every project that `js/portfolio.js` swaps for the interactive cards |
| `404.html` | Page shown for unknown addresses |
| `css/styles.css` | All styling. Colors, radii and fonts are variables at the top |
| `fonts/` | Geist and Geist Mono (Latin, variable weight), served from the site itself. License in `fonts/LICENSE.txt` |
| `js/catalog.js` | Every product, section, block, price and template. Edit prices here |
| `js/pricing.js` | Quote maths, validation, deposit and delivery estimate |
| `js/app.js` | The builder UI: state, rendering, summary, checkout dialog |
| `js/site.js` | Shared by every page: the phone menu, icons, the year in the footer |
| `js/portfolio-data.js` | The projects shown in the portfolio. Replace the samples with real work here |
| `js/portfolio-shots.js`, `img/portfolio/` | Homepage screenshots cut into components, and the list of slices per project |
| `js/portfolio.js` | Portfolio UI: layered previews, filters, project detail, links to a single project (`portfolio.html#project-<id>`) |
| `js/theme.js` | Shared icons and category colors |
| `js/icons.js` | Icon paths (Lucide, ISC license) |
| `site.config.json` | The site's address and name, read by `tools/build-seo.js` |
| `tools/build-seo.js` | Writes the head tags, structured data, static price list, FAQ, portfolio text and the crawl files |
| `tools/content.js` | Page titles, descriptions and the FAQ text |
| `tools/make-images.py` | Draws `og.png`, the icons and `favicon.svg` (needs Python with Pillow) |
| `robots.txt`, `llms.txt`, `site.webmanifest`, `sitemap.xml` | Written by `tools/build-seo.js`. `sitemap.xml` only exists once the address is set |
| `og.png`, `icon-512.png`, `icon-192.png`, `apple-touch-icon.png`, `favicon.svg` | Share image and icons, written by `tools/make-images.py` |
| `server/server.js` | Optional Node server that takes payments through Stripe |

Links that load something into the builder: `index.html#build-<project id>` loads a portfolio project and `index.html#template-<template id>` loads a template.

## Search engines and AI assistants (SEO, AEO, GEO)

Crawlers from OpenAI, Anthropic and Perplexity do not run JavaScript, and Google only does so in a second pass. So the prices, the FAQ and the portfolio text are also written into the HTML as ordinary, visible content. A small script keeps that copy in step with the catalog, so a price is never typed twice.

### Set the address once

1. Open `site.config.json` and set `siteUrl` to the public address, for example `"siteUrl": "https://your-domain.com"`. `siteName` is the name used in titles and structured data.
2. Run `node tools/build-seo.js` (Node 18 or newer, nothing to install).
3. Upload the folder.

While `siteUrl` is empty the script leaves out everything that needs a full address: canonical links, `og:url`, the share image tags, the `Sitemap:` line in `robots.txt` and `sitemap.xml` itself. Nothing in the site contains a made-up domain.

### Run it again whenever content changes

Run `node tools/build-seo.js` after changing any of these:

- prices, blocks or templates in `js/catalog.js`, or pricing rules in `js/pricing.js`
- titles, descriptions or the FAQ in `tools/content.js`
- projects in `js/portfolio-data.js` or screenshots in `js/portfolio-shots.js`
- `site.config.json`

Running it twice in a row changes nothing. It prints the files it updated.

### What it writes

In the HTML files it only replaces what sits between marker comments such as `<!-- seo:faq:start -->` and `<!-- seo:faq:end -->`. Everything outside the markers is yours to edit by hand; text inside them is overwritten on the next run.

| Marker | Page | Content |
|---|---|---|
| `head` | all | Title, description, robots, canonical, Open Graph, Twitter card, JSON-LD |
| `header`, `footer` | all | Logo, main links, footer links |
| `hero-facts` | `index.html` | "Websites from", "Mobile apps from", "Priced blocks" |
| `costs` | `index.html` | The "What it costs" section |
| `faq` | `index.html` | The FAQ accordion. The same text goes into the FAQPage structured data |
| `pricing` | `pricing.html` | The whole price list: foundations, every block, templates, deposit terms |
| `works` | `portfolio.html` | A plain version of every project: name, summary, link, blocks, price, one screenshot |

Structured data (JSON-LD): Organization and WebSite on every page; Service entries with prices on `index.html` and `pricing.html`; FAQPage on `index.html`; ItemList of the projects on `portfolio.html`; BreadcrumbList on `pricing.html` and `portfolio.html`.

Numbers in `tools/content.js` are written as tokens such as `{{webFrom}}` or `{{price:w-seo}}` and filled in from the catalog. The list of tokens is at the top of that file.

### Business details

The structured data only says what the site says. To publish more, add an `organization` object to `site.config.json` with any of `legalName`, `email`, `telephone`, `address`, `founder`, `sameAs` (a list of profile links), then run the script. Only add details that are true and that you are happy to make public. Reviews and ratings are not supported on purpose: they must come from real, visible customer reviews.

### Share image and icons

`python3 tools/make-images.py` redraws `og.png` (1200 x 630), the icons and `favicon.svg` with the name from `site.config.json`. Run it if the name changes.

### Notes

- `robots.txt` allows every crawler and names the main search and AI crawlers. To keep one out, give it its own `User-agent` block with `Disallow: /` after running the script, or change the list in `tools/build-seo.js`.
- `llms.txt` is a short plain-text summary for AI tools. It is cheap to keep, but its value is unproven: no major AI platform has confirmed that it reads the file.
- `sitemap.xml` dates come from the day each page file last changed on the machine that ran the script.
- `404.html`: most static hosts show it for unknown addresses automatically (some need it switched on in their settings). Once `siteUrl` is set the page loads its styles from that address, so it also looks right for addresses several folders deep.
- The home page can be reached as `/` and as `/index.html`. The canonical link tells search engines that `/` is the one to index.
- After going live, add the site to Google Search Console and Bing Webmaster Tools and submit `sitemap.xml` there.

## Taking payments

A static site cannot hold a Stripe secret key, so payments need a small server. Until one is connected, the checkout form validates the order and then says online payment is not connected.

1. `npm install stripe`
2. `STRIPE_SECRET_KEY=sk_test_... node server/server.js` (set `SITE_URL` to your public address in production)
3. In `index.html`, set `<meta name="checkout-endpoint" content="/api/checkout">`

The server serves the pages, `css/`, `js/`, `img/`, `fonts/` and the crawl files, and answers unknown addresses with `404.html`. It never serves `server/`, `tools/`, `README.md`, `site.config.json` or dotfiles. `SITE_URL` here is where Stripe sends customers back to; it is separate from `siteUrl` in `site.config.json`.

The server re-prices every order from `js/catalog.js`, creates a Stripe Checkout session and sends the customer to Stripe's payment page. After paying they return to `/?checkout=success` and see the confirmation.

Differences from the Next.js version: payment happens on Stripe's hosted page instead of an embedded form, and Vercel Analytics is not included.

## Deploying (Cloudflare Pages)

The repository is set up for Cloudflare Pages with Git integration: every push to `main` redeploys.

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |

`npm run build` regenerates the SEO content and copies only the public files into `dist/`, so `server/`, `tools/`, this README and `site.config.json` are not published. `_headers` sets caching and basic security headers. Cloudflare Pages serves `404.html` for unknown paths.

Pages hosts static files only, so the Stripe payment server in `server/` does not run there. Until it is hosted somewhere (or ported to a Cloudflare Worker), checkout stays in its "not connected" state.

## Analytics

`site.config.json` has `googleAnalyticsId` (a Google Analytics 4 measurement ID, `G-...`). `node tools/build-seo.js` writes the Analytics tag into the head of every page; clear the id and rebuild to take it out. The tag runs only over http(s), so opening the files from disk sends nothing.

To use Google Tag Manager instead, clear `googleAnalyticsId` and set `googleTagManagerId` (`GTM-...`). Set one or the other, not both, or page views are counted twice.

The builder sends two events: `begin_checkout` (when the checkout dialog opens, with `value`, `currency`, `products`, `blocks`) and `checkout_redirect` (just before the customer is sent to the payment page).
