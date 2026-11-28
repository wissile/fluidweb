# Fluidweb

The Fluidweb site in plain HTML, CSS and JavaScript. No framework. One script generates the pages and the text search engines read; a small Cloudflare Worker delivers the contact form.

## Run it

Open `index.html` in a browser, or serve the folder with any static host. Every page is a flat `.html` file at the top of the folder, so links work from disk. One script, `tools/build-seo.js`, writes the generated pages and refreshes the text that search engines read (see below). Opened from disk, the contact forms show "not sent": they need the Worker.

## Files

| File | What it holds |
|---|---|
| `index.html` | Home page, kept by hand: hero and process. The builder, "Who it is for", services, work, "Who you work with", costs, FAQ, footer and dialogs are written into it by `tools/build-seo.js` |
| `services.html`, `web-design.html`, `web-development.html`, `seo-services.html`, `aeo-geo-services.html`, `mobile-app-development.html` | Services overview and the five service pages. Generated from `tools/pages-services.js` |
| `personal-website-cost.html`, `small-business-website-cost.html`, `saas-website-cost.html`, `mobile-app-mvp-cost.html` | One cost page per template (not Enterprise). Generated from `tools/pages-costs.js` |
| `website-cost-calculator.html` | The same builder as the home page on a page of its own. Generated from `tools/pages-costs.js` |
| `case-study-<project id>.html` | One case study per project in `js/portfolio-data.js`. Generated from `tools/pages.js` |
| `guides.html`, `website-cost-guide.html`, `mobile-app-cost-guide.html`, `seo-aeo-geo-guide.html` | Guides overview and three guides. Generated from `tools/pages-guides.js` |
| `about.html`, `contact.html`, `privacy.html`, `terms.html`, `refund-policy.html` | Company and legal pages. Generated from `tools/pages-company.js`. The legal pages are drafts: review them |
| `pricing.html` | The full price list as plain HTML. Its content is written by `tools/build-seo.js` |
| `portfolio.html` | Portfolio page. Ships with a plain version of every project that `js/portfolio.js` swaps for the interactive cards |
| `404.html` | Page shown for unknown addresses |
| `css/styles.css` | All styling. Colors, radii and fonts are variables at the top |
| `fonts/` | Geist and Geist Mono (Latin, variable weight), served from the site itself. License in `fonts/LICENSE.txt` |
| `js/catalog.js` | Every product, section, block, price and template. Edit prices here |
| `js/pricing.js` | Quote maths, validation, deposit and delivery estimate |
| `js/app.js` | The builder UI: state, rendering, summary, checkout dialog, "Ask about this build", saved build, build links |
| `js/share.js` | Writes a build as a short code for links (`#b1-...`) and local storage |
| `js/contact.js` | The contact form on `contact.html` |
| `js/site.js` | Shared by every page: the phone menu, icons, the year in the footer, the cookie choice, analytics events, posting to `/api/contact` |
| `js/portfolio-data.js` | The projects shown in the portfolio. Replace the samples with real work here |
| `js/portfolio-shots.js`, `img/portfolio/` | Homepage screenshots cut into components, and the list of slices per project |
| `js/portfolio.js` | Portfolio UI: layered previews, filters, project detail, links to a single project (`portfolio.html#project-<id>`) |
| `js/theme.js` | Shared icons and category colors |
| `js/icons.js` | Icon paths (Lucide, ISC license) |
| `site.config.json` | The site's address and name, the analytics id and the checkout endpoint, read by `tools/build-seo.js` |
| `tools/build-seo.js` | Writes the head tags, structured data, static price list, FAQ, portfolio text and the crawl files |
| `tools/content.js` | Titles and descriptions of the hand-kept pages, and the home FAQ |
| `tools/pages.js`, `tools/pages-*.js` | The text of every generated page |
| `tools/build-dist.js` | Fills `dist/` and rewrites links there to clean addresses |
| `src/worker.js`, `wrangler.jsonc` | The Cloudflare Worker (contact form) and its configuration |
| `tools/make-images.py` | Draws `og.png`, the icons and `favicon.svg` (needs Python with Pillow) |
| `robots.txt`, `llms.txt`, `site.webmanifest`, `sitemap.xml` | Written by `tools/build-seo.js`. `sitemap.xml` only exists once the address is set |
| `og.png`, `icon-512.png`, `icon-192.png`, `apple-touch-icon.png`, `favicon.svg` | Share image and icons, written by `tools/make-images.py` |
| `server/server.js` | Optional Node server that takes payments through Stripe. Not used on Cloudflare |

Links that load something into the builder (they work on `index.html` and on `website-cost-calculator.html`): `#build-<project id>` loads a portfolio project, `#template-<template id>` loads a template, and `#b1-<code>` loads a build copied with "Copy link to this build". The current build is also kept in the browser's local storage until "Start over".

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

In the four hand-kept files (`index.html`, `pricing.html`, `portfolio.html`, `404.html`) it only replaces what sits between marker comments such as `<!-- seo:faq:start -->` and `<!-- seo:faq:end -->`. Everything outside the markers is yours to edit by hand; text inside them is overwritten on the next run. Every other page is written whole: edit its text in `tools/pages*.js`, never in the `.html` file.

| Marker | Page | Content |
|---|---|---|
| `head` | all | Title, description, robots, canonical, Open Graph, Twitter card, JSON-LD |
| `header`, `footer` | all | Logo, main links, footer columns with every page, "Cookie settings" |
| `builder`, `builder-dialogs` | `index.html` | The builder shell and its dialogs, shared with the calculator page |
| `home-fit`, `home-proof` | `index.html` | "Who it is for" and services; featured work and "Who you work with" |
| `crumbs` | `portfolio.html` | Breadcrumb |
| `hero-facts` | `index.html` | "Websites from", "Mobile apps from", "Priced blocks" |
| `costs` | `index.html` | The "What it costs" section |
| `faq` | `index.html` | The FAQ accordion. The same text goes into the FAQPage structured data |
| `pricing` | `pricing.html` | The whole price list: foundations, every block, templates, deposit terms |
| `works` | `portfolio.html` | A plain version of every project: name, summary, link, blocks, price, one screenshot |

Structured data (JSON-LD): Organization (with founder, city, region and country; no street address, phone, email, reviews or ratings) and WebSite on every page; BreadcrumbList on every page below the home page; Service entries with prices on the home, pricing, service and cost pages; FAQPage on `index.html`; ItemList on `portfolio.html`, `services.html` and `guides.html`; Article with author and dateModified on the guides; Person and ProfilePage on `about.html`.

Addresses: the source links to `pricing.html` so pages work from disk. With `siteUrl` set, canonical links, `og:url`, the sitemap and JSON-LD use the form the host serves (`/pricing`, and `/` for the home page). `tools/build-dist.js` rewrites every link in `dist/` to that form.

Market price ranges quoted on cost pages and guides come only from the sources listed as `SOURCES` in `tools/build-seo.js`, and each is shown next to a link to its source. Guides carry a "Last updated" date set in `tools/pages-guides.js`: change it when the text changes.

Numbers in `tools/content.js` are written as tokens such as `{{webFrom}}` or `{{price:w-seo}}` and filled in from the catalog. The list of tokens is at the top of that file.

### Business details

The structured data only says what the site says. The owner's name, role and city are set as `OWNER` and `PLACE` in `tools/build-seo.js`. To publish more, add an `organization` object to `site.config.json` with any of `legalName`, `email`, `telephone`, `sameAs` (a list of profile links), then run the script. Only add details that are true and that you are happy to make public. Reviews and ratings are not supported on purpose: they must come from real, visible customer reviews.

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

A static site cannot hold a Stripe secret key, so payments need a small server. Until one is connected, the checkout form validates the order, says online payment is not open yet and offers to send the build as a request through the contact Worker.

1. `npm install stripe`
2. `STRIPE_SECRET_KEY=sk_test_... node server/server.js` (set `SITE_URL` to your public address in production)
3. In `site.config.json`, set `"checkoutEndpoint": "/api/checkout"` and run `node tools/build-seo.js` (it writes the meta tag on both builder pages)

The server serves the pages, `css/`, `js/`, `img/`, `fonts/` and the crawl files, and answers unknown addresses with `404.html`. It never serves `server/`, `tools/`, `README.md`, `site.config.json` or dotfiles. `SITE_URL` here is where Stripe sends customers back to; it is separate from `siteUrl` in `site.config.json`.

The server re-prices every order from `js/catalog.js`, creates a Stripe Checkout session and sends the customer to Stripe's payment page. After paying they return to `/?checkout=success` and see the confirmation.

Differences from the Next.js version: payment happens on Stripe's hosted page instead of an embedded form, and Vercel Analytics is not included.

## Deploying (Cloudflare Workers)

The site runs as a Cloudflare Worker: static files from `dist/`, plus `src/worker.js` for the contact form. It is connected to this GitHub repository: every push to `main` builds and deploys.

| Setting (Worker > Settings > Build) | Value |
|---|---|
| Git repository | `wissile/fluidweb`, branch `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

`npm run build` regenerates the pages and copies only the public files into `dist/`, with links rewritten to clean addresses. `wrangler.jsonc` tells Cloudflare to publish `dist/`, to run `src/worker.js` for addresses that match no file, and to serve `404.html` for unknown paths; `_headers` sets caching and basic security headers. Requests that match a file never run the Worker.

### Contact form (Resend)

`contact.html`, "Ask about this build" and the checkout fallback post JSON to `/api/contact`. The Worker checks the message (types, lengths, email shape, a hidden honeypot field, same-origin, 16 KB limit), re-prices any attached build from `js/catalog.js`, and sends one email through Resend with the visitor's address as reply-to. It answers `{ "ok": true }` only when Resend accepted the email. Message contents are never logged.

To switch it on:

1. Create an account at resend.com and verify the `fluidweb.app` domain there (Domains > Add domain; Resend can add the DNS records in Cloudflare automatically). The sender `CONTACT_FROM` must be an address on a verified domain.
2. In Resend, create an API key (sending access is enough).
3. In the Cloudflare dashboard: Workers & Pages > fluidweb > Settings > Variables and Secrets > Add > type Secret, name `RESEND_API_KEY`, value the key. Or run `npx wrangler secret put RESEND_API_KEY`.
4. To send from another address, change `CONTACT_FROM` in `wrangler.jsonc` and push.

Until the secret exists the Worker answers 503 and the forms say the message was not sent. The key and the destination address must never be written into a public file; `wrangler.jsonc` is not published.

Cloudflare does not run the Stripe payment server in `server/`. Until it is hosted somewhere (or ported into the Worker), checkout offers to send the build as a request instead.

## Analytics

`site.config.json` has `googleAnalyticsId` (a Google Analytics 4 measurement ID, `G-...`). `node tools/build-seo.js` writes the Analytics tag into the head of every page; clear the id and rebuild to take it out. The tag runs only over http(s), so opening the files from disk sends nothing.

To use Google Tag Manager instead, clear `googleAnalyticsId` and set `googleTagManagerId` (`GTM-...`). Set one or the other, not both, or page views are counted twice.

Events: `begin_checkout` (the checkout dialog opens, with `value`, `currency`, `products`, `blocks`), `checkout_redirect` (just before the customer is sent to the payment page), `quote_request` (a build was sent as a request), `build_link_copied`, and `contact_submit` (with the topic only). No event carries a name, an email address or a message.

### Cookie choice

The tag starts in Google Consent Mode v2 with `ad_storage`, `analytics_storage`, `ad_user_data` and `ad_personalization` denied. A small banner offers Accept and Decline; the choice is stored in local storage and "Cookie settings" in the footer reopens it. Accepting grants `analytics_storage` only. Without an analytics id there is no banner and no footer link.

## Touch intro and haptics (experiment)

`js/experience.js`, switched in `site.config.json` under `"experience"` (`"intro"` and `"haptics"`, each `true` or `false`; rebuild after changing). Phones and tablets only.

- **Intro:** when the site is opened (from another site, a typed address, a bookmark or a reload), stars rush past for about 1.3 seconds, then the logo waits for a tap until 2.8 seconds and the page lands. Moving between the site's own pages or going back does not replay it. Skipped for reduced-motion settings, crawlers and speed tests.
- **Chime:** synthesized in the browser, no audio file. Phone browsers block sound until the visitor taps, so it plays on the tap during the intro (or straight away where a browser already allows sound). On iPhone, website sound is muted while the ring/silent switch is on silent.
- **Haptics:** a short tick on taps of links, buttons and form controls, and on scroll. Android uses the Vibration API (after the visitor's first tap). iPhones have no official web haptics; on iOS 18 and later a toggled switch control plays a haptic during a tap, which is used for taps and when a swipe ends. It needs System Haptics on (Settings, Sounds & Haptics). iPads have no haptic hardware for this.
- **Testing on a device:** `/lab` (lab.html, unlisted and `noindex`) has buttons for the chime, the chime through silent mode, a real switch and the site's haptic.

## Play layer (sound, motion and rewards)

`js/play.js`, switched in `site.config.json` with `"experience": { "play": true }` (rebuild after changing). It listens for the `fw:build` event that `js/app.js` sends after every change to a build, so the builder works the same without it.

- **Notes:** every block has a note, picked by its category from a pentatonic scale (website blocks around G3, app blocks around D4), so any build sounds in tune. Adding a block plucks its note with a snap, panned to where it sits on screen; removing one plays a falling note; steppers and the page slider tick; templates play their blocks as a quick run; checkout plays a chord. "Play" in the summary plays the whole build as a melody while each brick lights up.
- **Motion:** a burst of particles in the block's category color, the price change floating up (green for more, grey for less), a brick that flies into the stack (or into the total on phones), the total bumping, block cards that tilt toward a mouse cursor, and floating blocks in the home page hero that drift away from a finger or cursor (a tap in empty hero space plays a note).
- **Combos:** six combinations earn a toast and a chord once per visit (SEO + AEO, accounts + payments, languages + accessibility, security + backups + monitoring, custom design + brand kit, website + app).
- **Sound switch:** the speaker button in the header, remembered in local storage (`fluidweb.sound.v1`). Sound only follows a tap, click or key press; nothing plays on its own.
- Reduced-motion settings turn the motion off; sound stays available through the switch.
