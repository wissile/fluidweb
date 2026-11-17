// The cost pages (one per template, except Enterprise platform) and the calculator page.
// Read by tools/build-seo.js through tools/pages.js. Every number is worked out from js/catalog.js.
module.exports = (ctx) => {
  const { esc, usd, icon, CATALOG, P, SITE_NAME, lowest, templates, price, buildOf, quoteTable, dataTable, cardsHTML, heroHTML, sectionHTML, ctaHTML, button, caseFile, projects, MARKET, rangeText, against, sourceLink, marketTable } = ctx
  const { website, app } = CATALOG
  const template = (id) => templates.find((entry) => entry.id === id)
  const seedOf = (id) => {
    const config = template(id).config
    const products = {}
    for (const productId of ctx.PRODUCT_IDS) {
      if (config[productId].enabled) products[productId] = { units: config[productId].units, picks: { ...config[productId].selections } }
    }
    return products
  }
  // Single-choice sections: picking another option means dropping the one in place.
  const swap = (picks, remove, add) => {
    for (const id of remove) delete picks[id]
    for (const id of add) picks[id] = 1
  }
  const webFrom = usd(lowest.website.total)
  const appFrom = usd(lowest.app.total)
  const signed = (amount) => `${amount < 0 ? '−' : '+'}${usd(Math.abs(amount))}`
  const typicalSide = (total, key) => (total < MARKET[key].typical ? 'below' : total > MARKET[key].typical ? 'above' : 'equal to')

  const COSTS = [
    {
      key: 'cost-personal',
      template: 'personal',
      file: 'personal-website-cost.html',
      short: 'Personal website cost',
      icon: 'user',
      hue: 250,
      h1: 'How much does a personal website cost?',
      answer: (t) => `A personal website costs ${usd(t.total)} at ${SITE_NAME}: a ${ctx.word(t.config.website.units)}-page site with SEO optimization, a contact form, analytics and domain setup. The smallest site, one page on the website foundation, is ${webFrom}.`,
      meta: (t) => `A personal website costs ${usd(t.total)} for ${ctx.word(t.config.website.units)} pages with SEO, a contact form, analytics and domain setup. See every line, what moves the price and how it compares.`,
      suits: 'This is the Personal site template: a portfolio, a resume site or a passion project. Layouts are AI-designed and reviewed by a designer, which is included in the page price, and the site launches on your own domain.',
      changes: [
        ['Three pages instead of four', (p) => { p.website.units = 3 }],
        ['Without analytics', (p) => swap(p.website.picks, ['w-analytics-setup'], [])],
        ['Custom human design on every page', (p) => swap(p.website.picks, ['w-design-ai'], ['w-design-custom'])],
        ['Copywriting for every page', (p) => swap(p.website.picks, [], ['w-copy'])],
        ['A blog', (p) => swap(p.website.picks, [], ['w-blog'])],
        ['A CMS to edit the site yourself', (p) => swap(p.website.picks, [], ['w-cms'])],
        ['A 3-month care plan after launch', (p) => swap(p.website.picks, ['w-care-none'], ['w-care-3'])],
      ],
      market: ['landing', 'business', 'freelancerDesign'],
      compare: (t) => `${usd(t.total)} is ${against(t.total, 'business')} the ${rangeText('business')} range that ${sourceLink('pceWeb')} gives for a business website, and ${typicalSide(t.total, 'business')} its typical figure of about ${usd(MARKET.business.typical)}. The one-page starting price of ${webFrom} is ${against(lowest.website.total, 'landing')} its ${rangeText('landing')} range for a landing page. ${sourceLink('webfx')} puts web design by a freelancer at roughly ${rangeText('freelancerDesign')}.`,
      related: [['web-design.html', 'palette', 'Web design', 'The three design options and what each adds per page.'], ['seo-services.html', 'search', 'SEO', 'What the SEO optimization in this template covers.']],
      project: 'alta-perspective',
    },
    {
      key: 'cost-business',
      template: 'business',
      file: 'small-business-website-cost.html',
      short: 'Small business website cost',
      icon: 'store',
      hue: 150,
      h1: 'How much does a small business website cost?',
      answer: (t) => `A small business website costs ${usd(t.total)} at ${SITE_NAME}: ${ctx.word(t.config.website.units)} custom-designed pages with a CMS, a blog, SEO, AEO and GEO optimization, local SEO, a contact form, booking and a 3-month care plan. A plain five-page site with no extra blocks is ${usd(ctx.example.website.total)}.`,
      meta: (t) => `A small business website costs ${usd(t.total)}: ${ctx.word(t.config.website.units)} custom-designed pages with a CMS, blog, SEO, local SEO and booking. See every line and what moves the price.`,
      suits: 'This is the Small business template, built to get found locally and turn visits into bookings. It suits a service business, a shop, a studio or a practice that wants to edit its own pages and publish news.',
      changes: [
        ['Six pages instead of eight', (p) => { p.website.units = 6 }],
        ['AI-designed, human-reviewed layouts instead of custom design', (p) => swap(p.website.picks, ['w-design-custom'], ['w-design-ai'])],
        ['Without the blog', (p) => swap(p.website.picks, ['w-blog'], [])],
        ['Without booking and scheduling', (p) => swap(p.website.picks, ['w-booking'], [])],
        ['Copywriting for every page', (p) => swap(p.website.picks, [], ['w-copy'])],
        ['Online payments', (p) => swap(p.website.picks, [], ['w-payments'])],
        ['One additional language', (p) => swap(p.website.picks, [], ['w-language'])],
        ['A 12-month care plan instead of 3 months', (p) => swap(p.website.picks, ['w-care-3'], ['w-care-12'])],
      ],
      market: ['business', 'ecommerce', 'freelancerDesign', 'agencyDesign'],
      compare: (t) => `${usd(t.total)} is ${against(t.total, 'business')} the ${rangeText('business')} range that ${sourceLink('pceWeb')} gives for a business website, and ${typicalSide(t.total, 'business')} its typical figure of about ${usd(MARKET.business.typical)}, because this template includes custom design, a CMS, a blog and booking. ${sourceLink('webfx')} puts web design by a freelancer at roughly ${rangeText('freelancerDesign')} and by an agency at roughly ${rangeText('agencyDesign')}.`,
      related: [['seo-services.html', 'search', 'SEO', 'SEO optimization and local SEO, both part of this template.'], ['web-design.html', 'palette', 'Web design', 'Custom human design, the option this template uses.']],
      project: 'alta-perspective',
    },
    {
      key: 'cost-saas',
      template: 'saas',
      file: 'saas-website-cost.html',
      short: 'SaaS website cost',
      icon: 'rocket',
      hue: 215,
      h1: 'How much does a SaaS or startup website cost?',
      answer: (t) => `A SaaS website with a signed-in product costs ${usd(t.total)} at ${SITE_NAME}: a ${ctx.word(t.config.website.units)}-page marketing site plus user accounts, a database and API, a customer account area and subscription billing. A marketing site alone starts at ${webFrom}.`,
      meta: (t) => `A SaaS startup website costs ${usd(t.total)}: marketing pages plus logins, a database, a customer area and subscription billing. See every line and what moves the price.`,
      suits: 'This is the SaaS startup template: a marketing site and the first version of a product behind a login, with billing, tests and monitoring in place from the start. It suits a founder who wants a real product in front of paying users.',
      changes: [
        ['Eight pages instead of ten', (p) => { p.website.units = 8 }],
        ['Without subscriptions and billing', (p) => swap(p.website.picks, ['w-subscriptions'], [])],
        ['Without automated tests and CI/CD', (p) => swap(p.website.picks, ['w-testing'], [])],
        ['A CMS for the marketing pages', (p) => swap(p.website.picks, [], ['w-cms'])],
        ['Roles and permissions', (p) => swap(p.website.picks, [], ['w-roles'])],
        ['An admin dashboard', (p) => swap(p.website.picks, [], ['w-admin'])],
        ['Premium design and motion instead of custom design', (p) => swap(p.website.picks, ['w-design-custom'], ['w-design-premium'])],
        ['Rush delivery', (p) => swap(p.website.picks, [], ['w-rush'])],
      ],
      market: ['webApp', 'business', 'agencyDesign'],
      compare: (t) => `${usd(t.total)} is ${against(t.total, 'webApp')} the ${rangeText('webApp')} range that ${sourceLink('pceWeb')} gives for a web app or SaaS. That range is wide because products differ so much in size, which is why this page lists every line. For the marketing pages alone, the same source gives ${rangeText('business')} for a business website, and ${sourceLink('webfx')} puts agency web design at roughly ${rangeText('agencyDesign')}.`,
      related: [['web-development.html', 'code-xml', 'Web development', 'Logins, databases, dashboards and billing, block by block.'], ['mobile-app-development.html', 'smartphone', 'Mobile app development', 'Add an iOS and Android app to the same project.']],
      project: 'meetworkplace',
    },
    {
      key: 'cost-mobile-mvp',
      template: 'mobile-mvp',
      file: 'mobile-app-mvp-cost.html',
      short: 'Mobile app MVP cost',
      icon: 'smartphone',
      hue: 265,
      h1: 'How much does a mobile app MVP cost?',
      answer: (t) => `A mobile app MVP costs ${usd(t.total)} at ${SITE_NAME}: ${ctx.word(t.config.app.units)} custom-designed screens for iOS and Android from one codebase, with user accounts, a backend, push notifications, analytics, crash reporting, a beta program and store submission. The smallest app, one screen on the app foundation, is ${appFrom}.`,
      meta: (t) => `A mobile app MVP costs ${usd(t.total)}: ${ctx.word(t.config.app.units)} screens for iOS and Android with accounts, a backend, push notifications and store submission. See every line and what moves it.`,
      suits: 'This is the Mobile MVP template: a first release on both stores to test an idea with real users. It is one React Native codebase for iOS and Android, with the accounts, backend and measurement a first version needs.',
      changes: [
        ['Eight screens instead of ten', (p) => { p.app.units = 8 }],
        ['AI-designed, human-reviewed screens instead of custom design', (p) => swap(p.app.picks, ['a-design-custom'], ['a-design-ai'])],
        ['Without the beta testing program', (p) => swap(p.app.picks, ['a-beta'], [])],
        ['Subscriptions', (p) => swap(p.app.picks, [], ['a-subscriptions'])],
        ['Offline mode and sync', (p) => swap(p.app.picks, [], ['a-offline'])],
        ['Realtime and chat', (p) => swap(p.app.picks, [], ['a-realtime'])],
        ['Fully native iOS and Android apps', (p) => swap(p.app.picks, ['a-platform-cross'], ['a-platform-native'])],
        ['A 3-month care plan after launch', (p) => swap(p.app.picks, ['a-care-none'], ['a-care-3'])],
      ],
      market: ['appFreelancer', 'appAgency'],
      compare: (t) => `${usd(t.total)} is ${against(t.total, 'appFreelancer')} the ${rangeText('appFreelancer')} range that ${sourceLink('pceApp')} gives for a mobile app built by a freelancer, and ${against(t.total, 'appAgency')} its ${rangeText('appAgency')} range for an agency.`,
      related: [['mobile-app-development.html', 'smartphone', 'Mobile app development', 'What the app foundation includes and what each feature costs.'], ['web-development.html', 'code-xml', 'Web development', 'Add a website or a web dashboard to the same project.']],
      project: 'meetworkplace',
      guide: ['mobile-app-cost-guide.html', 'Guide: mobile app cost in 2026'],
    },
  ]

  function costPage(def) {
    const t = template(def.template)
    const base = buildOf(seedOf(def.template))
    if (base.total !== t.total) throw new Error(`Cost page ${def.key}: rebuilt total does not match the template`)
    const rows = def.changes.map(([label, change]) => {
      const products = seedOf(def.template)
      change(products)
      const variant = buildOf(products)
      return [esc(label), `<span class="mono">${signed(variant.total - base.total)}</span>`, `<span class="mono">${usd(variant.total)}</span>`]
    })
    const caseProject = projects.find((entry) => entry.id === def.project)
    const guide = def.guide || ['website-cost-guide.html', 'Guide: website cost in 2026']
    const unit = t.config.website.enabled ? website.unit : app.unit
    return {
      key: def.key,
      file: def.file,
      source: 'tools/pages-costs.js',
      title: `${def.short}: ${usd(t.total)}, itemized | ${SITE_NAME}`,
      description: def.meta(t),
      crumb: def.short,
      parents: [['Pricing', 'pricing.html']],
      nav: 'pricing',
      short: def.short,
      linkLabel: def.short,
      template: t,
      graph: (page) => [
        {
          '@type': 'Service',
          name: `${t.name} template`,
          description: def.answer(t),
          provider: ctx.orgRef(),
          url: ctx.abs(page.file),
          offers: { '@type': 'Offer', name: `${t.name} template`, price: t.total, priceCurrency: 'USD', url: ctx.abs(page.file) },
        },
      ],
      main: (page) => `${heroHTML(page, {
        eyebrow: 'Cost',
        h1: esc(def.h1),
        lede: esc(def.answer(t)),
        actions: `${button(`index.html#template-${t.id}`, `Load the ${t.name} template`, { primary: true, arrow: true })}${button('website-cost-calculator.html', 'Open the cost calculator')}`,
      })}

  <div class="container pricing">
    ${sectionHTML({
      id: 'itemized',
      eyebrow: 'Itemized',
      title: `What the ${usd(t.total)} covers`,
      intro: `${esc(def.suits)} Every line below is a block from the <a href="pricing.html">price list</a>.`,
      body: quoteTable(t.quote, { hue: def.hue, caption: `${t.name} template, itemized` }),
    })}

    ${sectionHTML({
      id: 'changes',
      eyebrow: 'Up or down',
      title: 'What changes the price',
      intro: `Each row changes one thing in the template and shows the new total. A ${unit.singular} more or less also changes the blocks that are priced per ${unit.singular}.`,
      body: dataTable(['Change', 'Effect on price', 'New total'], rows, { caption: `What changes the price of the ${t.name} template` }),
    })}

    ${sectionHTML({
      id: 'market',
      eyebrow: 'Market',
      title: 'How this compares with published prices',
      intro: `${def.compare(t)} Published ranges cover many kinds of provider and scope, so read them as context. The itemized price above is what this exact set of blocks costs here.`,
      body: marketTable(def.market, 'Published price ranges and their sources'),
    })}

    ${sectionHTML({
      id: 'paying',
      eyebrow: 'Paying',
      title: 'What you pay and when',
      body: `<div class="prose">
        <p>You can start with a ${P.DEPOSIT_PERCENT}% deposit of ${usd(base.deposit)}, with the balance invoiced before launch, or pay the ${usd(t.total)} in full. Payments are processed by Stripe.</p>
        <p>The builder estimates about ${t.weeks} weeks for this build. That figure is a planning estimate, and the delivery date is confirmed on the kickoff call once your content and deadlines are known. Two revision rounds and 30 days of support after launch are included. The <a href="terms.html">terms</a> and the <a href="refund-policy.html">refund policy</a> have the details.</p>
      </div>`,
    })}

    ${sectionHTML({
      id: 'related',
      eyebrow: 'Related',
      title: 'Where to go next',
      body: cardsHTML([
        ...def.related.map(([href, iconName, title, text]) => ({ href, icon: iconName, title, text, link: ctx.aboutLabel(title) })),
        { href: caseFile(caseProject.id), icon: 'layout-grid', title: `Case study: ${caseProject.name}`, text: `A live project and the ${caseProject.blocks} blocks behind it.`, link: 'Read the case study' },
        { href: guide[0], icon: 'book-open', title: guide[1], text: 'Published price ranges next to real block prices.', link: 'Read the guide' },
      ], { columns: 4 }),
    })}
  </div>

  ${ctaHTML({
    title: `Make the ${t.name} template yours.`,
    text: 'Load it in the builder, add or remove blocks and watch the total change. Nothing is charged until you check out.',
    actions: `${button(`index.html#template-${t.id}`, `Load the ${t.name} template`, { primary: true, arrow: true })}${button('contact.html', 'Ask a question')}`,
  })}`,
    }
  }

  // ---- Calculator: the same builder as the home page, on a page of its own ----

  const calculator = {
    key: 'calculator',
    file: 'website-cost-calculator.html',
    source: 'tools/pages-costs.js',
    title: `Website and app cost calculator, itemized | ${SITE_NAME}`,
    description: `Work out what a website or a mobile app costs. Set the pages or screens, switch ${ctx.blockCount} priced blocks on and off and see the total, the deposit and a delivery estimate.`,
    crumb: 'Cost calculator',
    parents: [['Pricing', 'pricing.html']],
    nav: 'pricing',
    builder: true,
    graph: (page) => [
      {
        '@type': 'WebApplication',
        name: `${SITE_NAME} website and app cost calculator`,
        url: ctx.abs(page.file),
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript',
        offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
        provider: ctx.orgRef(),
      },
    ],
    main: (page) => `${heroHTML(page, {
      h1: 'Website and app <span class="brand">cost calculator</span>.',
      lede: `Work out what a website or a mobile app costs before you talk to anyone. A website starts at ${webFrom} and a mobile app at ${appFrom}. Add the blocks you need and the total, the ${P.DEPOSIT_PERCENT}% deposit and a delivery estimate update as you go.`,
    })}

  ${ctx.builderHTML(page)}

  <section class="band">
    <div class="container pricing">
      ${sectionHTML({
        id: 'how',
        eyebrow: 'How it adds up',
        title: 'How the calculator works out the price',
        body: `<div class="prose">
          <p>Every total is a foundation, plus a price per page or screen, plus the blocks you switch on. A website is ${usd(website.basePrice)} plus ${usd(website.unit.price)} per page. A mobile app is ${usd(app.basePrice)} plus ${usd(app.unit.price)} per screen. A block is either a one-time price or a price per page or screen, and the summary shows the math for every line.</p>
          <p>The delivery estimate is a planning figure: about one week for every ${usd(2000)} of scope, with a minimum of two weeks. Rush delivery shortens it by roughly 30%.</p>
          <p>Your build is saved in this browser, so it is still here when you come back. "Copy link to this build" puts the whole build into a link you can send to someone else, and "Ask about this build" sends it along with your question.</p>
        </div>`,
      })}

      ${sectionHTML({
        id: 'typical',
        eyebrow: 'Typical projects',
        title: 'What common projects cost',
        intro: 'Each of these pages itemizes one template and shows what moves the price up or down.',
        body: cardsHTML(
          COSTS.map((def) => ({ href: def.file, icon: def.icon, title: def.short, meta: usd(template(def.template).total), text: template(def.template).description, link: 'See the itemized price' })),
          { columns: 4 },
        ),
      })}
    </div>
  </section>`,
  }

  return { pages: [...COSTS.map(costPage), calculator], keys: COSTS.map((def) => def.key) }
}
