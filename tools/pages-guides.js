// The guides overview and the three guides. Read by tools/build-seo.js through tools/pages.js.
// Each guide answers its question in the first paragraph, uses question-style headings, ends with
// a summary table, and names its author and the date it was last updated.
// Market ranges come only from the sources in tools/build-seo.js (SOURCES), each linked where it is used.
module.exports = (ctx) => {
  const { esc, usd, icon, CATALOG, P, SITE_NAME, OWNER, lowest, example, templates, price, opt, blocksTable, quoteTable, dataTable, cardsHTML, heroHTML, ctaHTML, button, MARKET, rangeText, sourceLink, marketTable, lowerFirst } = ctx
  const { website, app } = CATALOG
  const template = (id) => templates.find((entry) => entry.id === id)
  const webFrom = usd(lowest.website.total)
  const appFrom = usd(lowest.app.total)

  // Change this date whenever a guide's text changes.
  const UPDATED = { iso: '2026-11-17', text: 'November 17, 2026' }

  const mono = (text) => `<span class="mono">${text}</span>`
  const h2 = (id, text) => `<h2 id="${id}">${esc(text)}</h2>`

  function guidePage(def) {
    return {
      key: def.key,
      file: def.file,
      source: 'tools/pages-guides.js',
      title: def.title,
      description: def.description,
      crumb: def.short,
      parents: [['Guides', 'guides.html']],
      nav: 'guides',
      short: def.short,
      card: def.card,
      icon: def.icon,
      ogType: 'article',
      graph: (page) => [
        {
          '@type': 'Article',
          headline: def.headline,
          description: def.description,
          author: ctx.personRef(),
          publisher: ctx.orgRef(),
          datePublished: UPDATED.iso,
          dateModified: UPDATED.iso,
          inLanguage: ctx.lang,
          mainEntityOfPage: ctx.abs(page.file),
        },
        ctx.personNode(),
      ],
      main: (page) => `<article>
  ${heroHTML(page, {
    eyebrow: 'Guide',
    h1: esc(def.headline),
    lede: def.answer,
    extra: `<p class="byline">By <a href="about.html">${esc(OWNER.name)}</a><span aria-hidden="true">·</span>Last updated <time datetime="${UPDATED.iso}">${UPDATED.text}</time></p>`,
  })}

  <div class="container article">
    <div class="prose">
      ${def.body.trim()}
    </div>
  </div>
  </article>

  ${ctaHTML(def.cta)}`,
    }
  }

  // ---- How much does a website cost in 2026? ----

  const websiteGuide = guidePage({
    key: 'guide-website-cost',
    file: 'website-cost-guide.html',
    short: 'Website cost in 2026',
    icon: 'globe',
    headline: 'How much does a website cost in 2026?',
    title: `How much does a website cost in 2026? | ${SITE_NAME}`,
    description: `Website prices in 2026: published ranges from ${usd(MARKET.landing.low)} for a landing page to ${usd(MARKET.webApp.high)} for a web app, next to real block prices that start at ${webFrom}.`,
    card: 'Published price ranges for landing pages, business sites, stores and web apps, next to real block prices.',
    answer: `A website costs from about ${usd(MARKET.landing.low)} for a simple landing page to as much as ${usd(MARKET.webApp.high)} for a large web app in 2026, according to ${sourceLink('pceWeb')}. The same source puts a business website at ${rangeText('business')}, with about ${usd(MARKET.business.typical)} as typical. At ${esc(SITE_NAME)} a website starts at ${webFrom}, and a small business site with custom design, a CMS and SEO is ${usd(template('business').total)}.`,
    body: `
      ${h2('ranges', 'What do published price ranges say?')}
      <p>Two public sources give a sense of the market. ${sourceLink('pceWeb')} lists a range for each kind of site, and ${sourceLink('webfx')} compares what freelancers and agencies charge for web design.</p>
      ${marketTable(['landing', 'business', 'ecommerce', 'webApp', 'freelancerDesign', 'agencyDesign'], 'Published website price ranges and their sources')}

      ${h2('why-wide', 'Why are the ranges so wide?')}
      <p>"A website" can mean one page with a contact form or a product with accounts, payments and a database. The price follows the scope: how many pages there are, whether each page is designed from scratch, and how much the site has to do beyond showing content. A range tells you what kind of budget is realistic. An itemized list tells you what your own project costs.</p>

      ${h2('fluidweb', `What does a website cost at ${SITE_NAME}?`)}
      <p>A website costs ${webFrom} at the least: the ${usd(website.basePrice)} website foundation plus one page at ${usd(website.unit.price)}. Each further page is ${usd(website.unit.price)}, so a site with ${website.unit.default} pages and no extra blocks is ${usd(example.website.total)}. The foundation includes: ${website.included.map(lowerFirst).join('; ')}.</p>
      ${dataTable(
        ['Project', 'What it is', 'Price'],
        [
          ['One-page site', 'The website foundation plus one page', mono(webFrom)],
          [`${website.unit.default}-page site`, 'No extra blocks', mono(usd(example.website.total))],
          ['<a href="personal-website-cost.html">Personal site</a>', esc(template('personal').description), mono(usd(template('personal').total))],
          ['<a href="small-business-website-cost.html">Small business</a>', esc(template('business').description), mono(usd(template('business').total))],
          ['<a href="saas-website-cost.html">SaaS startup</a>', esc(template('saas').description), mono(usd(template('saas').total))],
        ],
        { caption: `Website prices at ${SITE_NAME}` },
      )}

      ${h2('drivers', 'What adds the most to the price of a website?')}
      <p>Three things: design, content tools and anything that needs a login or a payment. These are the blocks behind most of the difference between a ${usd(example.website.total)} site and a ${usd(template('saas').total)} one.</p>
      ${blocksTable(['w-design-custom', 'w-cms', 'w-blog', 'w-auth', 'w-database', 'w-subscriptions', 'w-store', 'w-language', 'w-wcag'], { hue: 250, caption: 'Blocks that add the most to a website price' })}
      <p>The <a href="pricing.html">full price list</a> shows every block with its price and unit.</p>

      ${h2('who', 'What does a website cost for a person, a small business and a startup?')}
      <p><b>For a person</b>, a ${ctx.word(template('personal').config.website.units)}-page site with SEO, a contact form, analytics and domain setup is ${usd(template('personal').total)}. The <a href="personal-website-cost.html">personal website cost</a> page itemizes it.</p>
      <p><b>For a small business</b>, ${ctx.word(template('business').config.website.units)} custom-designed pages with a CMS, a blog, SEO, local SEO, booking and a 3-month care plan are ${usd(template('business').total)}. See the <a href="small-business-website-cost.html">small business website cost</a> page.</p>
      <p><b>For a startup</b>, a marketing site plus a signed-in product with accounts, a database and subscription billing is ${usd(template('saas').total)}. See the <a href="saas-website-cost.html">SaaS website cost</a> page.</p>

      ${h2('freelancer-agency', 'Does a freelancer cost less than an agency?')}
      <p>Usually, but the ranges overlap. ${sourceLink('webfx')} puts web design by a freelancer at roughly ${rangeText('freelancerDesign')} and by an agency at roughly ${rangeText('agencyDesign')}. With a freelancer you deal with the person doing the work. An agency brings a team. ${esc(SITE_NAME)} is a one-person studio, so its prices sit in the freelancer range for most projects.</p>

      ${h2('after-launch', 'What do you pay after launch?')}
      <p>Every build includes 30 days of support after launch for bug fixes. After that a care plan is optional: ${price('w-care-3')} for 3 months or ${price('w-care-12')} for 12 months, prepaid, with no automatic renewal. The plan covers ${lowerFirst(opt('w-care-3').description.replace(/\.$/, ''))}. Changes to the scope are priced with the same blocks as the original build.</p>

      ${h2('summary', 'Summary: website cost in 2026')}
      ${dataTable(
        ['Kind of website', `Price at ${SITE_NAME}`, 'Published range'],
        [
          ['One-page site', mono(webFrom), `${mono(rangeText('landing'))} for a landing page (${sourceLink('pceWeb')})`],
          ['Personal site', mono(usd(template('personal').total)), `${mono(rangeText('business'))} for a business website (${sourceLink('pceWeb')})`],
          ['Small business site', mono(usd(template('business').total)), `${mono(rangeText('freelancerDesign'))} for freelancer web design (${sourceLink('webfx')})`],
          ['SaaS site with a product', mono(usd(template('saas').total)), `${mono(rangeText('webApp'))} for a web app or SaaS (${sourceLink('pceWeb')})`],
        ],
        { caption: 'Summary of website costs in 2026' },
      )}

      ${h2('exact', 'How do you get an exact number for your project?')}
      <p>Open the <a href="website-cost-calculator.html">cost calculator</a>, set the number of pages and switch on the blocks you need. The total, the ${P.DEPOSIT_PERCENT}% deposit and a delivery estimate update with every choice, and you can send the build with a question before paying anything.</p>
    `,
    cta: {
      title: 'Work out your own website cost.',
      text: 'Set the number of pages, add the blocks you need and read the total.',
      actions: `${button('website-cost-calculator.html', 'Open the cost calculator', { primary: true, arrow: true })}${button('pricing.html', 'See the price list')}`,
    },
  })

  // ---- How much does a mobile app cost in 2026? ----

  const appGuide = guidePage({
    key: 'guide-app-cost',
    file: 'mobile-app-cost-guide.html',
    short: 'Mobile app cost in 2026',
    icon: 'smartphone',
    headline: 'How much does a mobile app cost in 2026?',
    title: `How much does a mobile app cost in 2026? | ${SITE_NAME}`,
    description: `Mobile app prices in 2026: published ranges of ${rangeText('appFreelancer')} for a freelancer and ${rangeText('appAgency')} for an agency, next to block prices from ${appFrom}.`,
    card: 'What freelancers and agencies charge for an app, and what each screen and feature costs here.',
    answer: `A mobile app costs roughly ${rangeText('appFreelancer')} when a freelancer builds it and ${rangeText('appAgency')} with an agency in 2026, according to ${sourceLink('pceApp')}. At ${esc(SITE_NAME)} an app starts at ${appFrom}, and a first release with accounts, a backend, push notifications and store submission is ${usd(template('mobile-mvp').total)}.`,
    body: `
      ${h2('ranges', 'What do published price ranges say?')}
      <p>${sourceLink('pceApp')} gives two ranges, depending on who builds the app.</p>
      ${marketTable(['appFreelancer', 'appAgency'], 'Published mobile app price ranges and their source')}
      <p>Both ranges are wide because an app can be a handful of simple screens or a product with accounts, payments, realtime features and offline use. The number of screens and what sits behind them decide the price.</p>

      ${h2('fluidweb', `What does a mobile app cost at ${SITE_NAME}?`)}
      <p>A mobile app costs ${appFrom} at the least: the ${usd(app.basePrice)} app foundation plus one screen at ${usd(app.unit.price)}. Each further screen is ${usd(app.unit.price)}, so an app with ${app.unit.default} screens and no extra blocks is ${usd(example.app.total)}. That price covers one React Native codebase that ships to iOS and Android. The foundation includes: ${app.included.map(lowerFirst).join('; ')}.</p>

      ${h2('drivers', 'What makes an app cost more?')}
      <p>Screens with heavy logic, and everything that needs a server. These blocks account for most of the difference between a simple app and a product.</p>
      ${blocksTable(['a-complex', 'a-auth', 'a-backend', 'a-admin', 'a-realtime', 'a-offline', 'a-payments', 'a-subscriptions', 'a-ai', 'a-platform-native'], { hue: 265, caption: 'Blocks that add the most to a mobile app price' })}

      ${h2('native', 'Should the app be cross-platform or fully native?')}
      <p>The standard build is cross-platform: ${lowerFirst(opt('a-platform-cross').description)} It is included in the price. Fully native apps are ${lowerFirst(opt('a-platform-native').description.replace(/\.$/, ''))}, and add ${price('a-platform-native')}. For a first version, one codebase keeps the cost down and gets the app onto both stores at once.</p>

      ${h2('mvp', 'What does a first version (MVP) include, and what does it cost?')}
      <p>The Mobile MVP template is ${usd(template('mobile-mvp').total)}: ${ctx.word(template('mobile-mvp').config.app.units)} custom-designed screens, ${ctx.word(template('mobile-mvp').config.app.selections['a-complex'])} of them complex, with user accounts, a backend, push notifications, analytics, crash reporting, a beta program and store submission. The <a href="mobile-app-mvp-cost.html">mobile app MVP cost</a> page shows what moves that price up or down.</p>
      ${quoteTable(template('mobile-mvp').quote, { hue: 265, caption: 'Mobile MVP template, itemized' })}

      ${h2('after-launch', 'What do you pay to launch, and after?')}
      <p>App Store and Google Play submission is a block of its own at ${price('a-store')}. A beta testing program is ${price('a-beta')} and over-the-air updates, which ship fixes without waiting on a store review, are ${price('a-ota')}. Every app includes 30 days of support after launch for bug fixes. After that a care plan is optional: ${price('a-care-3')} for 3 months or ${price('a-care-12')} for 12 months, prepaid, with no automatic renewal.</p>

      ${h2('summary', 'Summary: mobile app cost in 2026')}
      ${dataTable(
        ['Kind of app', 'Price', 'Source'],
        [
          ['App built by a freelancer', mono(rangeText('appFreelancer')), sourceLink('pceApp')],
          ['App built by an agency', mono(rangeText('appAgency')), sourceLink('pceApp')],
          [`One screen at ${esc(SITE_NAME)}`, mono(appFrom), '<a href="pricing.html#app-prices">Price list</a>'],
          [`${app.unit.default} screens, no extra blocks`, mono(usd(example.app.total)), '<a href="pricing.html#app-prices">Price list</a>'],
          ['Mobile MVP template', mono(usd(template('mobile-mvp').total)), '<a href="mobile-app-mvp-cost.html">Mobile app MVP cost</a>'],
        ],
        { caption: 'Summary of mobile app costs in 2026' },
      )}

      ${h2('exact', 'How do you get an exact number for your app?')}
      <p>Open the <a href="website-cost-calculator.html">cost calculator</a>, add a mobile app, set the number of screens and switch on the features you need. The <a href="mobile-app-development.html">mobile app development</a> page explains what each block does.</p>
    `,
    cta: {
      title: 'Price your app screen by screen.',
      text: 'Load the Mobile MVP template, then add or remove features and watch the total.',
      actions: `${button('index.html#template-mobile-mvp', 'Load the Mobile MVP template', { primary: true, arrow: true })}${button('mobile-app-development.html', 'About mobile app development')}`,
    },
  })

  // ---- SEO, AEO and GEO ----

  const eight = 8
  const searchGuide = guidePage({
    key: 'guide-seo-aeo-geo',
    file: 'seo-aeo-geo-guide.html',
    short: 'SEO, AEO and GEO explained',
    icon: 'search',
    headline: 'SEO, AEO and GEO: what each one is and what it costs',
    title: `SEO, AEO and GEO: what they are and what they cost | ${SITE_NAME}`,
    description: `SEO gets pages found in search. AEO and GEO get content quoted by AI assistants. What helps, what is unproven, and what each costs: from ${price('w-seo')} per page.`,
    card: 'What each term means, what helps a site get cited by AI assistants, what is unproven, and the prices.',
    answer: `SEO helps your pages appear in search results. AEO and GEO help AI assistants such as ChatGPT, Perplexity and Google AI overviews understand, quote and link to your content. At ${esc(SITE_NAME)} SEO optimization costs ${price('w-seo')} per page and AEO / GEO optimization costs ${price('w-aeo')} per page, so both together add ${usd(eight * (opt('w-seo').price + opt('w-aeo').price))} to an eight-page site.`,
    body: `
      ${h2('seo', 'What is SEO?')}
      <p>SEO stands for search engine optimization. It is the work that helps a search engine find your pages, understand what they are about and show them for the right searches. On the site itself that means accurate page titles and descriptions, clear headings, structured data, a sitemap, clean addresses and pages that load fast.</p>

      ${h2('aeo', 'What is AEO?')}
      <p>AEO stands for answer engine optimization. An answer engine replies to a question with one answer instead of a list of links. AEO is writing and structuring a page so that its answer is easy to lift out: the question is stated, and the answer comes first, in plain words.</p>

      ${h2('geo', 'What is GEO?')}
      <p>GEO stands for generative engine optimization. A generative engine, such as ChatGPT or Perplexity, writes a new answer from several sources and may cite them. GEO is making your content easy for those systems to read, trust and attribute to you.</p>

      ${h2('difference', 'How do SEO, AEO and GEO differ?')}
      ${dataTable(
        ['Term', 'Aims for', 'What success looks like'],
        [
          ['SEO', 'A place in search results', 'Your page is listed for a search and people click through'],
          ['AEO', 'Being the direct answer', 'Your wording is used to answer a question'],
          ['GEO', 'Being a cited source', 'An AI assistant uses your content and links to you'],
        ],
        { caption: 'How SEO, AEO and GEO differ' },
      )}
      <p>The three share most of their groundwork. A page that is clear, crawlable and well structured serves all of them.</p>

      ${h2('what-helps', 'What helps a site get cited by AI assistants?')}
      <p>In rough order of importance:</p>
      <ol>
        <li><b>Answer-first content.</b> State the question, then answer it in the first sentence or two. Details follow.</li>
        <li><b>Crawlable HTML.</b> The words and prices have to be in the page itself. Many AI crawlers do not run JavaScript, so content that only appears after a script runs may never be read.</li>
        <li><b>Structured data.</b> Markup that states plainly what a page is: an article and its author, a service and its price, an organization and where it is.</li>
        <li><b>Entity clarity.</b> One consistent description of who you are, what you offer, for whom and where, repeated the same way across the site.</li>
        <li><b>Third-party mentions.</b> Other sites that name you and link to you. These are earned outside your own site and cannot be built into it.</li>
      </ol>

      ${h2('unproven', 'What does not work, or is unproven?')}
      <ul>
        <li><b>FAQ rich results.</b> Google no longer shows them (since May 2026). Questions and answers on a page still help readers and AI assistants, but FAQ markup does not earn extra space in search results any more.</li>
        <li><b>llms.txt.</b> A plain-text summary of a site for AI tools. It is cheap to publish, but unproven: no major AI platform has confirmed that it reads the file.</li>
        <li><b>Guarantees.</b> Nobody outside a search engine or an AI company controls what it ranks or cites. Anyone who promises a ranking or a citation is promising something they do not control.</li>
      </ul>

      ${h2('cost', 'What do SEO, AEO and GEO cost?')}
      <p>At ${esc(SITE_NAME)} the search blocks are one-time prices added to a website build. On an eight-page site, SEO optimization is ${usd(eight * opt('w-seo').price)} and AEO / GEO optimization is ${usd(eight * opt('w-aeo').price)}.</p>
      ${blocksTable(['w-seo', 'w-aeo', 'w-local-seo', 'w-keyword', 'w-redirects'], { hue: 95, caption: 'SEO, AEO and GEO blocks and prices' })}
      <p>The <a href="seo-services.html">SEO</a> and <a href="aeo-geo-services.html">AEO and GEO</a> service pages each have a worked example.</p>

      ${h2('need-all', 'Do you need all three?')}
      <p>Start with SEO. It is the base the other two stand on: if a search engine cannot read and understand a page, an AI assistant will not either. Add AEO and GEO when your customers are likely to ask an assistant the kind of question your site answers. A business with local customers should also consider local SEO (${price('w-local-seo')}), which covers ${lowerFirst(opt('w-local-seo').description.replace(/\.$/, ''))}.</p>

      ${h2('summary', 'Summary: SEO, AEO and GEO')}
      ${dataTable(
        ['Term', 'Stands for', 'Goal', `Price at ${SITE_NAME}`],
        [
          ['SEO', 'Search engine optimization', 'Appear in search results', `${mono(price('w-seo'))} per page`],
          ['AEO', 'Answer engine optimization', 'Be the direct answer', `${mono(price('w-aeo'))} per page, together with GEO`],
          ['GEO', 'Generative engine optimization', 'Be cited by AI assistants', `${mono(price('w-aeo'))} per page, together with AEO`],
        ],
        { caption: 'Summary of SEO, AEO and GEO' },
      )}
    `,
    cta: {
      title: 'Add search optimization to a build.',
      text: 'The Small business template includes SEO, AEO and GEO optimization and local SEO. Load it and change the page count.',
      actions: `${button('index.html#template-business', 'Load the Small business template', { primary: true, arrow: true })}${button('seo-services.html', 'About SEO')}`,
    },
  })

  const guideList = [websiteGuide, appGuide, searchGuide]

  const hub = {
    key: 'guides',
    file: 'guides.html',
    source: 'tools/pages-guides.js',
    title: `Guides to website, app and search costs | ${SITE_NAME}`,
    description: 'Plain guides to what a website costs, what a mobile app costs, and what SEO, AEO and GEO are. Each starts with the answer and shows where the numbers come from.',
    crumb: 'Guides',
    nav: 'guides',
    pageType: 'CollectionPage',
    graph: () => [
      {
        '@type': 'ItemList',
        name: `${SITE_NAME} guides`,
        itemListElement: guideList.map((guide, index) => ({ '@type': 'ListItem', position: index + 1, name: guide.short, url: ctx.abs(guide.file) })),
      },
    ],
    main: (page) => `${heroHTML(page, {
      h1: 'Guides that <span class="brand">start with the answer</span>.',
      lede: 'What a website costs, what a mobile app costs, and what SEO, AEO and GEO are. Each guide answers its question in the first paragraph, then shows where every number comes from.',
    })}

  <div class="container pricing">
    <section aria-labelledby="guides-heading" class="price-product">
      <h2 id="guides-heading" class="sr-only">All guides</h2>
      ${cardsHTML(guideList.map((guide) => ({ href: guide.file, icon: guide.icon, title: guide.title.replace(/ \| .*$/, ''), meta: `Updated ${UPDATED.text}`, text: guide.card, link: 'Read the guide' })))}
    </section>
    <section aria-labelledby="more-heading" class="price-product">
      <header class="section-head">
        <p class="eyebrow">Costs</p>
        <h2 id="more-heading">Looking for one specific price?</h2>
        <p>The cost pages itemize the most common projects, and the calculator prices your own.</p>
      </header>
      ${cardsHTML(
        [
          { href: 'personal-website-cost.html', icon: 'user', title: 'Personal website cost', meta: usd(template('personal').total), text: template('personal').description, link: 'See the itemized price' },
          { href: 'small-business-website-cost.html', icon: 'store', title: 'Small business website cost', meta: usd(template('business').total), text: template('business').description, link: 'See the itemized price' },
          { href: 'saas-website-cost.html', icon: 'rocket', title: 'SaaS website cost', meta: usd(template('saas').total), text: template('saas').description, link: 'See the itemized price' },
          { href: 'mobile-app-mvp-cost.html', icon: 'smartphone', title: 'Mobile app MVP cost', meta: usd(template('mobile-mvp').total), text: template('mobile-mvp').description, link: 'See the itemized price' },
        ],
        { columns: 4 },
      )}
    </section>
  </div>

  ${ctaHTML({
    title: 'Get a number for your own project.',
    text: 'The cost calculator adds up a website or an app block by block.',
    actions: `${button('website-cost-calculator.html', 'Open the cost calculator', { primary: true, arrow: true })}${button('contact.html', 'Ask a question')}`,
  })}`,
  }

  return { pages: [hub, ...guideList], keys: guideList.map((guide) => guide.key) }
}
