// The services overview and the five service pages. Read by tools/build-seo.js through tools/pages.js.
// Every price is looked up in js/catalog.js: write price('w-seo'), never a number.
module.exports = (ctx) => {
  const { esc, usd, icon, CATALOG, P, SITE_NAME, lowest, templates, price, opt, buildOf, blocksTable, quoteTable, accordionHTML, cardsHTML, heroHTML, sectionHTML, ctaHTML, button, caseFile, projects, lowerFirst } = ctx
  const { website, app } = CATALOG
  const template = (id) => templates.find((entry) => entry.id === id)
  const project = (id) => projects.find((entry) => entry.id === id)
  const includedList = (product) => `<ul class="included column">${product.included.map((item) => `<li>${icon('check')}${esc(item)}</li>`).join('')}</ul>`
  const webFrom = usd(lowest.website.total)
  const appFrom = usd(lowest.app.total)
  const perPage = usd(website.unit.price)
  const perScreen = usd(app.unit.price)

  // ---- The five services ----

  const SERVICES = [
    {
      key: 'web-design',
      file: 'web-design.html',
      short: 'Web design',
      icon: 'palette',
      hue: 350,
      title: `Web design services, priced per page | ${SITE_NAME}`,
      description: `Web design for individuals, small businesses and startups. AI-designed, human-reviewed layouts are included and custom design is ${price('w-design-custom')} per page.`,
      card: 'Three ways to give every page its look, plus brand identity, a design system and imagery.',
      from: `Custom design ${price('w-design-custom')} per page`,
      h1: 'Web design, <span class="brand">priced per page</span>.',
      lede: `Choose how every page gets its look: AI-designed layouts reviewed by a designer at no extra cost, custom human design at ${price('w-design-custom')} per page, or premium design with motion at ${price('w-design-premium')} per page.`,
      serviceType: 'Web design',
      what: [
        'Web design decides how each page looks and reads: the layout, the type, the colors, the images, and how all of it rearranges on a phone. A good design makes the next step obvious, whether that is reading on, booking a call or buying.',
        `Design is a block in the builder like everything else. You pick one design option for the whole site and it is charged per page, so a small site stays small on the invoice. Brand work, imagery and a second color theme are separate blocks that you add only if you need them.`,
      ],
      who: [
        ['Individuals', `A portfolio, resume or personal project that should look considered without a design budget. AI-designed, human-reviewed layouts are included in the ${perPage} page price.`, 'personal-website-cost.html', 'Personal website cost'],
        ['Small businesses', `A site that has to match a brand you already have, or give you one. Custom human design starts from your brand, and the brand identity kit adds a logo, colors and type for ${price('w-brand-kit')}.`, 'small-business-website-cost.html', 'Small business website cost'],
        ['Startups', `A marketing site that keeps growing after launch. A design system (${price('w-design-system')}) keeps new pages consistent as you add them.`, 'saas-website-cost.html', 'SaaS website cost'],
      ],
      includedIntro: `Every website starts on the ${usd(website.basePrice)} foundation, and each page is ${perPage}. That already covers:`,
      includedProduct: website,
      includedNote: 'The page price includes a responsive layout that works on phones, tablets and desktops. You see progress on a private preview link at each milestone.',
      blocks: ['w-design-ai', 'w-design-custom', 'w-design-premium', 'w-brand-kit', 'w-design-system', 'w-imagery', 'w-theme', 'w-copy'],
      blocksIntro: 'Pick one of the three design options. The other blocks are optional.',
      priceAnchor: 'pricing.html#w-design',
      example: {
        title: 'A six-page site with custom design and a brand identity kit',
        products: { website: { units: 6, picks: { 'w-design-custom': 1, 'w-brand-kit': 1 } } },
        text: (build) => `Six pages on the website foundation come to ${usd(website.basePrice + 6 * website.unit.price)}. Custom human design adds ${price('w-design-custom')} for each of the six pages (${usd(6 * opt('w-design-custom').price)}), and the brand identity kit adds ${price('w-brand-kit')}. The total is ${usd(build.total)}, with a ${P.DEPOSIT_PERCENT}% deposit of ${usd(build.deposit)} to start.`,
      },
      faq: [
        { q: 'How much does web design cost?', a: `AI-designed, human-reviewed layouts are included in the ${perPage} page price. Custom human design costs ${price('w-design-custom')} per page and premium design with motion costs ${price('w-design-premium')} per page. A brand identity kit is ${price('w-brand-kit')} and a design system is ${price('w-design-system')}.` },
        { q: 'What is the difference between the three design options?', a: `AI-designed, human-reviewed: ${lowerFirst(opt('w-design-ai').description)} Custom human design: ${lowerFirst(opt('w-design-custom').description)} Premium design + motion: ${lowerFirst(opt('w-design-premium').description)}` },
        { q: 'Do I get a logo and brand colors?', a: `Only if you add the brand identity kit, which costs ${price('w-brand-kit')} and covers ${lowerFirst(opt('w-brand-kit').description)}` },
        { q: 'How many rounds of changes are included?', a: `Two revision rounds are included with every website. Extra rounds cost ${price('w-revision')} each.` },
      ],
      related: ['web-development', 'seo'],
      project: 'alta-perspective',
      projectWhy: 'An image-led site with custom human design on every page.',
      cta: { title: 'Price your design in the builder.', text: 'Load the worked example above, switch between the three design options and watch the total change.' },
    },
    {
      key: 'web-development',
      file: 'web-development.html',
      short: 'Web development',
      icon: 'code-xml',
      hue: 215,
      title: `Web development services with listed prices | ${SITE_NAME}`,
      description: `Web development from ${webFrom}: a ${usd(website.basePrice)} foundation plus ${perPage} per page. Add a CMS, logins, a database, payments or a store, each with its own price.`,
      card: 'From a five-page site to a signed-in product: CMS, forms, logins, databases, payments and stores.',
      from: `Websites from ${webFrom}`,
      h1: 'Web development, <span class="brand">from five pages to a product</span>.',
      lede: `A website starts at ${webFrom}: the ${usd(website.basePrice)} foundation plus ${perPage} per page. Everything beyond static pages, such as a CMS, logins, a database or payments, is a block with its own price.`,
      serviceType: 'Web development',
      what: [
        'Web development turns a design into a working site: pages that load fast on any screen, forms that reach you, content you can edit, and, when the project needs it, accounts, data and payments behind a login.',
        'The builder separates the work into blocks so you only pay for the parts your project uses. A brochure site needs the foundation and its pages. A product adds authentication, a database and a billing block on top of the same foundation.',
      ],
      who: [
        ['Individuals', `A few static pages and a contact form. The Personal site template is ${usd(template('personal').total)}.`, 'personal-website-cost.html', 'Personal website cost'],
        ['Small businesses', `Pages you can edit yourself, a blog, booking and lead forms. The Small business template is ${usd(template('business').total)}.`, 'small-business-website-cost.html', 'Small business website cost'],
        ['Startups', `A marketing site plus a signed-in product with billing. The SaaS startup template is ${usd(template('saas').total)}.`, 'saas-website-cost.html', 'SaaS website cost'],
      ],
      includedIntro: `The ${usd(website.basePrice)} website foundation covers the work every build needs:`,
      includedProduct: website,
      includedNote: `Each page is ${perPage}. Simple pages with static content need nothing more than that.`,
      blocks: ['w-dynamic', 'w-member', 'w-cms', 'w-forms', 'w-integration', 'w-auth', 'w-database', 'w-user-dashboard', 'w-admin', 'w-payments', 'w-subscriptions', 'w-store', 'w-testing', 'w-staging'],
      blocksIntro: 'The development blocks people add most often. The full list is on the pricing page.',
      priceAnchor: 'pricing.html#website-prices',
      example: {
        title: 'An eight-page site with a CMS, a form, logins and a database',
        products: { website: { units: 8, picks: { 'w-dynamic': 2, 'w-cms': 1, 'w-forms': 1, 'w-auth': 1, 'w-database': 1 } } },
        text: (build) => `Eight pages on the foundation come to ${usd(website.basePrice + 8 * website.unit.price)}. Two of them are dynamic pages at ${price('w-dynamic')} each. The CMS is ${price('w-cms')}, the contact form ${price('w-forms')}, user authentication ${price('w-auth')} and the database and API ${price('w-database')}. The total is ${usd(build.total)}, and the builder estimates about ${build.weeks} weeks.`,
      },
      faq: [
        { q: 'How much does web development cost?', a: `A website starts at ${webFrom}: the ${usd(website.basePrice)} foundation plus one page at ${perPage}. Each further page is ${perPage}, and each feature is a block with a listed price, for example ${price('w-cms')} for a CMS or ${price('w-auth')} for user authentication.` },
        { q: 'What does the foundation include?', a: `The ${usd(website.basePrice)} website foundation includes: ${website.included.map(lowerFirst).join('; ')}.` },
        { q: 'Can the site take payments or subscriptions?', a: `Yes. Online payments cost ${price('w-payments')} (${lowerFirst(opt('w-payments').description.replace(/\.$/, ''))}), subscriptions and billing cost ${price('w-subscriptions')}, and a full online store costs ${price('w-store')}.` },
        { q: 'What happens if I need something added later?', a: 'Changes after you pay are priced with the same blocks and the same prices you see in the builder. Adding a page or a feature later costs exactly what the price list says.' },
        { q: 'Do you take on larger or enterprise projects?', a: 'Yes, through a conversation first. Use the contact form or "Talk to me first" in the builder so the scope is agreed before anything is paid.' },
      ],
      related: ['web-design', 'mobile-app-development'],
      project: 'firedbunny',
      projectWhy: 'A content-heavy site with dynamic pages, a CMS and several integrations.',
      cta: { title: 'Add up your own build.', text: 'Start from the SaaS startup template or from an empty website and add the blocks your project needs.', template: 'saas' },
    },
    {
      key: 'seo',
      file: 'seo-services.html',
      short: 'SEO',
      icon: 'search',
      hue: 95,
      title: `SEO services built into your website | ${SITE_NAME}`,
      description: `SEO optimization costs ${price('w-seo')} per page, added to a website build. Local SEO is ${price('w-local-seo')}, keyword and content strategy ${price('w-keyword')}, and an SEO-safe migration ${price('w-redirects')}.`,
      card: 'On-page SEO, local SEO, keyword strategy and SEO-safe migrations, added to a website build.',
      from: `${price('w-seo')} per page`,
      h1: 'SEO built into the site, <span class="brand">priced per page</span>.',
      lede: `SEO optimization costs ${price('w-seo')} per page and is added to a website build. Local SEO is ${price('w-local-seo')}, a keyword and content strategy is ${price('w-keyword')}, and an SEO-safe migration is ${price('w-redirects')}.`,
      serviceType: 'Search engine optimization',
      what: [
        'SEO (search engine optimization) is the work that helps search engines find, understand and show your pages. Part of it lives in the code: page titles and descriptions, headings, structured data, a sitemap, clean addresses and fast loading. Part of it is deciding which pages to have and what they should say.',
        'Here the SEO blocks are built into the site as it is made, so the work is done once and in the right place. They are one-time prices added to a website build. Nobody controls how a search engine ranks a page, so no ranking is promised.',
      ],
      who: [
        ['Individuals', `Being findable by name. The Personal site template already includes SEO optimization on its ${template('personal').config.website.units} pages.`, 'personal-website-cost.html', 'Personal website cost'],
        ['Small businesses', `Showing up for local searches. Local SEO (${price('w-local-seo')}) covers ${lowerFirst(opt('w-local-seo').description.replace(/\.$/, ''))}.`, 'small-business-website-cost.html', 'Small business website cost'],
        ['Startups', `Knowing what to publish first. The keyword and content strategy (${price('w-keyword')}) is ${lowerFirst(opt('w-keyword').description.replace(/\.$/, ''))}.`, 'saas-website-cost.html', 'SaaS website cost'],
      ],
      includedIntro: `SEO optimization (${price('w-seo')} per page) covers, on every page of the site:`,
      includedItems: ['Meta tags', 'Structured data', 'A sitemap', 'Clean URLs', 'Keyword-tuned headings'],
      includedNote: `Every website also gets a responsive, mobile-first build as part of the foundation. Performance tuning for Core Web Vitals is a separate block at ${price('w-performance')} per page.`,
      blocks: ['w-seo', 'w-local-seo', 'w-keyword', 'w-redirects', 'w-aeo', 'w-performance', 'w-blog', 'w-analytics-setup'],
      blocksIntro: 'The search blocks, plus three blocks that are often added with them.',
      priceAnchor: 'pricing.html#w-search',
      example: {
        title: 'An eight-page local business site with SEO, local SEO and a keyword strategy',
        products: { website: { units: 8, picks: { 'w-seo': 1, 'w-local-seo': 1, 'w-keyword': 1 } } },
        text: (build) => `SEO optimization on eight pages is ${usd(8 * opt('w-seo').price)} (8 pages at ${price('w-seo')}). Local SEO adds ${price('w-local-seo')} and the keyword and content strategy ${price('w-keyword')}, so the search work comes to ${usd(8 * opt('w-seo').price + opt('w-local-seo').price + opt('w-keyword').price)}. With the foundation and the eight pages the whole site is ${usd(build.total)}.`,
      },
      faq: [
        { q: 'How much does SEO cost?', a: `SEO optimization costs ${price('w-seo')} per page, added to a website build. Local SEO is ${price('w-local-seo')}, a keyword and content strategy is ${price('w-keyword')}, and an SEO-safe migration with a 301 redirect map is ${price('w-redirects')}.` },
        { q: 'Is SEO a monthly fee?', a: `No. The SEO blocks are one-time prices that are part of the website build. If you want changes after launch, a 3-month care plan costs ${price('w-care-3')} and covers ${lowerFirst(opt('w-care-3').description.replace(/\.$/, ''))}.` },
        { q: 'Can you guarantee a first-page ranking?', a: 'No. Search engines decide rankings and nobody outside them controls the result. The SEO blocks cover the work that is in the site\'s control: meta tags, structured data, a sitemap, clean URLs and keyword-tuned headings.' },
        { q: 'I am replacing an old site. Will I lose my rankings?', a: `The SEO-safe migration block (${price('w-redirects')}) is made for this: ${lowerFirst(opt('w-redirects').description)}` },
      ],
      related: ['aeo-geo', 'web-development'],
      project: 'bio-nature-sante',
      projectWhy: 'An online store built with SEO optimization and local SEO.',
      guide: true,
      cta: { title: 'Add SEO to a build and see the price.', text: 'The Small business template includes SEO, AEO and GEO optimization and local SEO. Load it and adjust the page count.', template: 'business' },
    },
    {
      key: 'aeo-geo',
      file: 'aeo-geo-services.html',
      short: 'AEO and GEO',
      icon: 'bot',
      hue: 180,
      title: `AEO and GEO services: get cited by AI answers | ${SITE_NAME}`,
      description: `AEO and GEO optimization costs ${price('w-aeo')} per page: answer-first content, crawlable HTML, structured data and entity signals so AI assistants can read and cite you.`,
      card: 'Answer-first content, crawlable HTML, structured data and clear entity signals for AI assistants.',
      from: `${price('w-aeo')} per page`,
      h1: 'AEO and GEO: a site <span class="brand">AI assistants can read and cite</span>.',
      lede: `AEO / GEO optimization costs ${price('w-aeo')} per page, added to a website build. It covers answer-first content, crawlable server-rendered HTML, structured data and clear entity signals.`,
      serviceType: 'Answer engine optimization and generative engine optimization',
      what: [
        'AEO (answer engine optimization) and GEO (generative engine optimization) are about being understood, quoted and linked by AI assistants such as ChatGPT, Perplexity and Google AI overviews. These tools reply to a question with one written answer instead of a list of links.',
        'The work overlaps with SEO and runs alongside it. What matters most, in order: content that answers the question in its first sentences, HTML a crawler can read without running JavaScript, structured data, a clear picture of who you are and what you offer (entity clarity), and mentions of you on other sites. The first four are built into your pages by this block. Mentions on other sites are earned outside your site and are not part of it.',
        'Two things are worth saying plainly. Google no longer shows FAQ rich results (since May 2026), so FAQ markup is not a shortcut to more space in search results. And llms.txt, a summary file for AI tools, is unproven: no major AI platform has confirmed that it reads the file. Nobody can promise that an assistant will cite a given site.',
      ],
      who: [
        ['Individuals', 'Experts and freelancers who want AI assistants to describe them and their work correctly.', 'personal-website-cost.html', 'Personal website cost'],
        ['Small businesses', `Businesses whose customers ask an assistant for a recommendation. The Small business template includes AEO / GEO optimization on all ${template('business').config.website.units} pages.`, 'small-business-website-cost.html', 'Small business website cost'],
        ['Startups', 'Products in a category people research by asking questions, where being the cited answer matters as much as a ranking.', 'saas-website-cost.html', 'SaaS website cost'],
      ],
      includedIntro: `AEO / GEO optimization (${price('w-aeo')} per page) covers, on every page of the site:`,
      includedItems: ['Answer-first content', 'Crawlable server-rendered HTML', 'Structured data', 'Clear entity signals'],
      includedNote: `It is usually added together with SEO optimization (${price('w-seo')} per page), because both depend on the same clean, crawlable pages.`,
      blocks: ['w-aeo', 'w-seo', 'w-keyword', 'w-copy', 'w-blog'],
      blocksIntro: 'The AEO / GEO block and the blocks that support it.',
      priceAnchor: 'pricing.html#w-search',
      example: {
        title: 'An eight-page site with SEO and AEO / GEO optimization',
        products: { website: { units: 8, picks: { 'w-seo': 1, 'w-aeo': 1 } } },
        text: (build) => `AEO / GEO optimization on eight pages is ${usd(8 * opt('w-aeo').price)} and SEO optimization is another ${usd(8 * opt('w-seo').price)}, so the two together add ${usd(8 * (opt('w-aeo').price + opt('w-seo').price))} to the build. With the foundation and the eight pages the whole site is ${usd(build.total)}.`,
      },
      faq: [
        { q: 'What is the difference between SEO, AEO and GEO?', a: 'SEO helps pages appear in search results. AEO (answer engine optimization) helps content get picked as the direct answer to a question. GEO (generative engine optimization) helps content get used and cited when an AI assistant writes an answer. The three share most of their groundwork.' },
        { q: 'How much do AEO and GEO cost?', a: `AEO / GEO optimization costs ${price('w-aeo')} per page, added to a website build. On an eight-page site that is ${usd(8 * opt('w-aeo').price)}.` },
        { q: 'Can you guarantee that ChatGPT or Perplexity will cite my site?', a: 'No. Each assistant decides what it reads and cites, and nobody outside those companies controls it. The block covers what is in the site\'s control: answer-first content, crawlable HTML, structured data and clear entity signals.' },
        { q: 'Does an llms.txt file help?', a: 'It is unproven. The file is cheap to publish, but no major AI platform has confirmed that it reads it, so it should not be the reason to expect citations.' },
        { q: 'Do FAQ rich results still appear in Google?', a: 'No. Google no longer shows FAQ rich results (since May 2026). Clear questions and answers on a page are still useful to readers and to AI assistants, but the markup no longer earns extra space in search results.' },
      ],
      related: ['seo', 'web-design'],
      project: 'firedbunny',
      projectWhy: 'A learning site built with both SEO and AEO / GEO optimization.',
      guide: true,
      cta: { title: 'See what AEO and GEO add to your build.', text: 'Load the Small business template, which includes both search blocks, and change the number of pages.', template: 'business' },
    },
    {
      key: 'mobile-app-development',
      file: 'mobile-app-development.html',
      short: 'Mobile app development',
      icon: 'smartphone',
      hue: 250,
      title: `Mobile app development for iOS and Android | ${SITE_NAME}`,
      description: `Mobile app design and development from ${appFrom}: a ${usd(app.basePrice)} foundation plus ${perScreen} per screen, one codebase for iOS and Android. Every feature has a listed price.`,
      card: 'iOS and Android apps from one codebase, with accounts, a backend, notifications and store submission.',
      from: `Mobile apps from ${appFrom}`,
      h1: 'Mobile apps for iOS and Android, <span class="brand">priced per screen</span>.',
      lede: `A mobile app starts at ${appFrom}: the ${usd(app.basePrice)} app foundation plus ${perScreen} per screen. That price covers one React Native codebase that ships to iOS and Android.`,
      serviceType: 'Mobile app design and development',
      what: [
        'Mobile app development covers the design of each screen, the code that runs on the phone, the backend that stores accounts and data, and the release on the App Store and Google Play.',
        `By default the app is a cross-platform React Native build: one codebase that ships to both stores, at no extra cost. Fully native iOS and Android apps, written separately in Swift and Kotlin, add ${price('a-platform-native')}. Screens that carry heavy logic, such as feeds, maps or editors, are ${price('a-complex')} each on top of the ${perScreen} screen price.`,
      ],
      who: [
        ['Individuals', `A personal project or a tool for a small audience. An app with ${app.unit.default} screens and no extra blocks is ${usd(ctx.example.app.total)}.`, 'mobile-app-mvp-cost.html', 'Mobile app MVP cost'],
        ['Small businesses', `An app for existing customers: bookings, orders or loyalty. Payments cost ${price('a-payments')} and push notifications ${price('a-push')}.`, 'mobile-app-mvp-cost.html', 'Mobile app MVP cost'],
        ['Startups', `A first release on both stores to test the idea. The Mobile MVP template is ${usd(template('mobile-mvp').total)}.`, 'mobile-app-mvp-cost.html', 'Mobile app MVP cost'],
      ],
      includedIntro: `The ${usd(app.basePrice)} app foundation covers the work every app needs:`,
      includedProduct: app,
      includedNote: `Each screen is ${perScreen}. Publishing to the stores is its own block: App Store and Google Play submission costs ${price('a-store')}.`,
      blocks: ['a-complex', 'a-platform-cross', 'a-platform-native', 'a-design-custom', 'a-auth', 'a-backend', 'a-push', 'a-offline', 'a-payments', 'a-subscriptions', 'a-store', 'a-beta', 'a-care-3'],
      blocksIntro: 'The app blocks people add most often. The full list is on the pricing page.',
      priceAnchor: 'pricing.html#app-prices',
      example: {
        title: 'An eight-screen app with accounts, a backend, push notifications and store submission',
        products: { app: { units: 8, picks: { 'a-auth': 1, 'a-backend': 1, 'a-push': 1, 'a-store': 1 } } },
        text: (build) => `Eight screens on the app foundation come to ${usd(app.basePrice + 8 * app.unit.price)}. User authentication adds ${price('a-auth')}, the backend API and database ${price('a-backend')}, push notifications ${price('a-push')} and store submission ${price('a-store')}. The total is ${usd(build.total)}, with a ${P.DEPOSIT_PERCENT}% deposit of ${usd(build.deposit)} to start.`,
      },
      faq: [
        { q: 'How much does it cost to build a mobile app?', a: `A mobile app starts at ${appFrom}: the ${usd(app.basePrice)} app foundation plus one screen at ${perScreen}. An app with ${app.unit.default} screens and no extra blocks costs ${usd(ctx.example.app.total)}. The Mobile MVP template, with accounts, a backend, push notifications and store submission, is ${usd(template('mobile-mvp').total)}.` },
        { q: 'Is the app built for both iOS and Android?', a: `Yes. The standard build is one React Native codebase that ships to both stores, included in the price. Fully native iOS and Android apps, written separately in Swift and Kotlin, add ${price('a-platform-native')}.` },
        { q: 'Do you publish the app to the App Store and Google Play?', a: `Yes, with the store submission block (${price('a-store')}): ${lowerFirst(opt('a-store').description)} A beta testing program on TestFlight and Play testing tracks is ${price('a-beta')}.` },
        { q: 'What support is there after launch?', a: `Every app includes 30 days of post-launch support with bug fixes. A 3-month care plan costs ${price('a-care-3')} and a 12-month care plan costs ${price('a-care-12')}. Care plans are prepaid and do not renew automatically.` },
        { q: 'Can I order an app and a website together?', a: `Yes. Add both foundations in the builder and configure each one separately. They share one checkout and one project plan. A marketing landing page for the app is also available as a single block for ${price('a-landing')}.` },
      ],
      related: ['web-development', 'web-design'],
      project: 'meetworkplace',
      projectWhy: 'A marketing site plus an employee app with accounts, a backend, realtime chat and push notifications.',
      appGuide: true,
      cta: { title: 'Price your app screen by screen.', text: 'Load the Mobile MVP template, set the number of screens and add or remove features.', template: 'mobile-mvp' },
    },
  ]

  const serviceByKey = (key) => SERVICES.find((service) => service.key === key)

  function servicePage(service) {
    const build = buildOf(service.example.products)
    const exampleHref = `index.html#${build.code}`
    const caseProject = project(service.project)
    return {
      key: service.key,
      file: service.file,
      source: 'tools/pages-services.js',
      title: service.title,
      description: service.description,
      crumb: service.short,
      parents: [['Services', 'services.html']],
      nav: 'services',
      short: service.short,
      icon: service.icon,
      card: service.card,
      from: service.from,
      graph: (page) => [
        {
          '@type': 'Service',
          name: service.short,
          serviceType: service.serviceType,
          description: service.description,
          provider: ctx.orgRef(),
          areaServed: { '@type': 'Country', name: 'United States' },
          url: ctx.abs(page.file),
          hasOfferCatalog: { '@type': 'OfferCatalog', name: `${service.short} blocks`, itemListElement: service.blocks.map(ctx.offerFor) },
        },
      ],
      main: (page) => `${heroHTML(page, {
        eyebrow: 'Service',
        h1: service.h1,
        lede: esc(service.lede),
        actions: `${button(exampleHref, 'Open an example in the builder', { primary: true, arrow: true })}${button(service.priceAnchor, 'See these prices in the price list')}`,
      })}

  <div class="container pricing">
    ${sectionHTML({
      id: 'what',
      eyebrow: 'What it is',
      title: `What ${ctx.aboutLabel(service.short).slice(6)} covers`,
      body: `<div class="prose">${service.what.map((text) => `<p>${esc(text)}</p>`).join('')}</div>`,
    })}

    ${sectionHTML({
      id: 'who',
      eyebrow: 'Who it is for',
      title: 'For individuals, small businesses and startups',
      body: `<ul class="steps three">${service.who.map(([name, text, file, label]) => `<li><h3>${esc(name)}</h3><p>${esc(text)}</p><p><a class="text-link" href="${file}">${esc(label)} ${icon('arrow-right')}</a></p></li>`).join('')}</ul>`,
    })}

    ${sectionHTML({
      id: 'included',
      eyebrow: 'What is included',
      title: 'What you get',
      intro: esc(service.includedIntro),
      body: `${service.includedProduct ? includedList(service.includedProduct) : `<ul class="included column">${service.includedItems.map((item) => `<li>${icon('check')}${esc(item)}</li>`).join('')}</ul>`}
      <p class="body-note">${esc(service.includedNote)}</p>`,
    })}

    ${sectionHTML({
      id: 'prices',
      eyebrow: 'Prices',
      title: `${service.short} blocks and what each one costs`,
      intro: `${esc(service.blocksIntro)} Prices come straight from the <a href="${service.priceAnchor}">price list</a>.`,
      body: blocksTable(service.blocks, { hue: service.hue, caption: `${service.short} blocks and prices` }),
    })}

    ${sectionHTML({
      id: 'example',
      eyebrow: 'Worked example',
      title: service.example.title,
      intro: esc(service.example.text(build)),
      body: `${quoteTable(build.quote, { hue: service.hue, caption: service.example.title })}
      <p><a class="text-link" href="${exampleHref}">Open this example in the builder ${icon('arrow-right')}</a></p>`,
    })}

    <section id="questions" aria-labelledby="questions-heading" class="price-product narrow">
      <header class="section-head">
        <p class="eyebrow">Questions</p>
        <h2 id="questions-heading">${esc(service.short)} questions</h2>
      </header>
      ${accordionHTML(service.faq, `faq-${service.key}`)}
    </section>

    ${sectionHTML({
      id: 'related',
      eyebrow: 'Related',
      title: 'Where to go next',
      body: cardsHTML([
        ...service.related.map((key) => {
          const other = serviceByKey(key)
          return { href: other.file, icon: other.icon, title: other.short, text: other.card, link: ctx.aboutLabel(other.short) }
        }),
        { href: caseFile(caseProject.id), icon: 'layout-grid', title: `Case study: ${caseProject.name}`, text: service.projectWhy, link: 'Read the case study' },
        service.guide
          ? { href: 'seo-aeo-geo-guide.html', icon: 'book-open', title: 'Guide: SEO, AEO and GEO', text: 'What each one is, what helps, what is unproven and what each costs.', link: 'Read the guide' }
          : service.appGuide
            ? { href: 'mobile-app-cost-guide.html', icon: 'book-open', title: 'Guide: mobile app cost in 2026', text: 'Published price ranges next to real block prices.', link: 'Read the guide' }
            : { href: 'website-cost-guide.html', icon: 'book-open', title: 'Guide: website cost in 2026', text: 'Published price ranges next to real block prices.', link: 'Read the guide' },
      ], { columns: 4 }),
    })}
  </div>

  ${ctaHTML({
    title: service.cta.title,
    text: esc(service.cta.text),
    actions: `${button(service.cta.template ? `index.html#template-${service.cta.template}` : exampleHref, service.cta.template ? `Load the ${template(service.cta.template).name} template` : 'Open the example in the builder', { primary: true, arrow: true })}${button('contact.html', 'Ask a question')}`,
  })}`,
    }
  }

  // ---- The overview ----

  const hub = {
    key: 'services',
    file: 'services.html',
    source: 'tools/pages-services.js',
    title: `Web design, development, SEO and app services | ${SITE_NAME}`,
    description: `Web design, web development, SEO, AEO and GEO, and mobile app development for individuals, small businesses and startups. Websites from ${webFrom}, apps from ${appFrom}.`,
    crumb: 'Services',
    nav: 'services',
    pageType: 'CollectionPage',
    graph: () => [
      {
        '@type': 'ItemList',
        name: `${SITE_NAME} services`,
        itemListElement: SERVICES.map((service, index) => ({ '@type': 'ListItem', position: index + 1, name: service.short, url: ctx.abs(service.file) })),
      },
    ],
    main: (page) => `${heroHTML(page, {
      h1: 'Five services, <span class="brand">one price list</span>.',
      lede: `Web design, web development, SEO, AEO and GEO, and mobile app development for individuals, small businesses and startups. A website starts at ${webFrom} and a mobile app at ${appFrom}, and every block you add has a listed price.`,
      actions: `${button('index.html#builder', 'Start building', { primary: true, arrow: true })}${button('pricing.html', 'See the price list')}`,
    })}

  <div class="container pricing">
    ${sectionHTML({
      id: 'all',
      eyebrow: 'Services',
      title: 'What you can have built',
      intro: 'Each service page explains what the work is, who it suits, what is included and what every block costs, with a worked example.',
      body: cardsHTML([
        ...SERVICES.map((service) => ({ href: service.file, icon: service.icon, title: service.short, meta: service.from, text: service.card, link: ctx.aboutLabel(service.short) })),
        { href: 'pricing.html', icon: 'coins', title: 'Full price list', meta: `${ctx.blockCount} priced blocks`, text: 'Both foundations, every block with its price and unit, the templates and the deposit terms.', link: 'See the price list' },
      ]),
    })}

    ${sectionHTML({
      id: 'fit',
      eyebrow: 'Who it is for',
      title: 'What a typical project costs',
      intro: 'Four templates cover the most common projects. Each has a page that itemizes its price and shows what moves it up or down.',
      body: cardsHTML(
        [
          ['personal-website-cost.html', 'user', 'personal', 'Personal website cost'],
          ['small-business-website-cost.html', 'store', 'business', 'Small business website cost'],
          ['saas-website-cost.html', 'rocket', 'saas', 'SaaS website cost'],
          ['mobile-app-mvp-cost.html', 'smartphone', 'mobile-mvp', 'Mobile app MVP cost'],
        ].map(([href, iconName, id, title]) => ({ href, icon: iconName, title, meta: usd(template(id).total), text: template(id).description, link: 'See the itemized price' })),
        { columns: 4 },
      ),
    })}

    ${sectionHTML({
      id: 'how',
      eyebrow: 'How it works',
      title: 'How the services fit together',
      body: `<div class="prose">
        <p>Every project starts with a foundation: ${usd(website.basePrice)} for a website, ${usd(app.basePrice)} for a mobile app. On top of it you pay ${perPage} per page or ${perScreen} per screen. Design, content, search optimization, accounts, payments and everything else are blocks that you switch on in the <a href="website-cost-calculator.html">cost calculator</a>, and the total updates with each choice.</p>
        <p>You can pay a ${P.DEPOSIT_PERCENT}% deposit to start, with the balance invoiced before launch, or pay in full. A kickoff call turns the blocks into a plan, you review progress on a private preview link at each milestone, two revision rounds are included, and 30 days of support follow the launch.</p>
        <p>Larger and enterprise projects are welcome. They start with a conversation instead of a payment: use the <a href="contact.html#call">contact form</a> and the scope is agreed before anything is paid.</p>
      </div>`,
    })}
  </div>

  ${ctaHTML({
    title: 'See the price of your project.',
    text: 'Pick a foundation, add the blocks you need and read the total before you talk to anyone.',
    actions: `${button('index.html#builder', 'Start building', { primary: true, arrow: true })}${button('contact.html', 'Talk to me first')}`,
  })}`,
  }

  return { pages: [hub, ...SERVICES.map(servicePage)], keys: SERVICES.map((service) => service.key) }
}
