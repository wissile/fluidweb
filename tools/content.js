// Words used by tools/build-seo.js: page titles, descriptions and the FAQ.
// Edit the text here, then run `node tools/build-seo.js`.
//
// Numbers are never typed by hand. Write a token and the build script fills it in from
// js/catalog.js and js/pricing.js:
//   {{siteName}}                     the name in site.config.json
//   {{webFrom}} {{appFrom}}          lowest price of a website / an app (foundation plus one page or screen)
//   {{webBase}} {{appBase}}          foundation price
//   {{webUnit}} {{appUnit}}          price per page / per screen
//   {{webPages}} {{appScreens}}      default size in the builder
//   {{webExample}} {{appExample}}    price at the default size with the cheapest options
//   {{webExampleDeposit}}            deposit on {{webExample}}
//   {{deposit}}                      deposit percentage
//   {{blockCount}}                   number of priced blocks
//   {{minWeeks}}                     shortest delivery estimate the builder shows
//   {{price:<block id>}}             price of one block, for example {{price:w-seo}}
//   {{template:<id>}} {{weeks:<id>}} total and delivery estimate of a template
//   {{desc:<block id>}}              a block's description, first letter lowercased, no final period
//   {{included:website}} {{included:app}}   what a foundation includes
//   {{projectCount}} {{projectNames}}       portfolio projects
// An unknown token stops the build, so a typo cannot reach the site.
module.exports = {
  // One sentence used in structured data and llms.txt.
  about:
    '{{siteName}} is the freelance studio of Wissile Sogoyou, a software engineer based in Salt Lake City, Utah. It designs and builds websites and mobile apps for individuals, small businesses and startups, with SEO, AEO and GEO built in. Every project is priced block by block and the full price list is public.',

  // Titles aim for 50 to 60 characters, descriptions for 140 to 160. The build warns outside that range.
  pages: {
    home: {
      title: 'Websites and mobile apps, priced block by block | {{siteName}}',
      description:
        'Websites and mobile apps for individuals, small businesses and startups. Websites from {{webFrom}}, apps from {{appFrom}}. Pick your blocks and see the total before you pay.',
    },
    pricing: {
      title: 'Website and mobile app pricing, block by block | {{siteName}}',
      description:
        'Full price list for web design, development, SEO, AEO, GEO and mobile apps. Websites from {{webFrom}}, apps from {{appFrom}}, and {{blockCount}} blocks with a price on each.',
    },
    portfolio: {
      title: 'Portfolio: websites and apps with their prices | {{siteName}}',
      description:
        '{{projectCount}} live projects: {{projectNames}}. See the blocks each one is made of and what that build costs today.',
    },
    notFound: {
      title: 'Page not found | {{siteName}}',
      description: 'This page does not exist. Go back to the {{siteName}} builder, the price list, the work or the contact page.',
    },
  },

  // The FAQ on the home page. The same text feeds the visible accordion and the FAQPage structured data.
  // Start every answer with the direct answer. Plain text only (no HTML).
  faq: [
    {
      q: 'How much does a website cost?',
      a: 'A website starts at {{webFrom}}: the {{webBase}} website foundation plus one page at {{webUnit}} per page. A site with {{webPages}} pages, AI-designed and human-reviewed layouts and no extra blocks costs {{webExample}}. Custom human design adds {{price:w-design-custom}} per page, and every other block shows its own price in the builder.',
    },
    {
      q: 'How much does it cost to build a mobile app?',
      a: 'A mobile app starts at {{appFrom}}: the {{appBase}} app foundation plus one screen at {{appUnit}} per screen. An app with {{appScreens}} screens and no extra blocks costs {{appExample}}. That price covers one React Native codebase that ships to iOS and Android. Fully native iOS and Android apps add {{price:a-platform-native}}.',
    },
    {
      q: 'What is included in the foundation price?',
      a: 'The {{webBase}} website foundation includes: {{included:website}}. The {{appBase}} app foundation includes: {{included:app}}.',
    },
    {
      q: 'How does block-by-block pricing work?',
      a: 'Every project is priced as a foundation plus a price per page or screen, and each block you add has its own listed price. A block is either a one-time price or a price per page or screen, and the builder shows the math for every line. The total you see is the total you pay for that scope.',
    },
    {
      q: 'How much do SEO, AEO and GEO cost?',
      a: 'SEO optimization costs {{price:w-seo}} per page and AEO / GEO optimization costs {{price:w-aeo}} per page, added to a website build. Local SEO is {{price:w-local-seo}}, a keyword and content strategy is {{price:w-keyword}}, and an SEO-safe migration with a 301 redirect map is {{price:w-redirects}}.',
    },
    {
      q: 'What are AEO and GEO?',
      a: 'AEO (answer engine optimization) and GEO (generative engine optimization) make your content easy for AI assistants such as ChatGPT, Perplexity and Google AI overviews to understand, quote and link to. The work covers answer-first content, crawlable server-rendered HTML, structured data and clear entity signals. It runs alongside classic SEO.',
    },
    {
      q: 'How much do I pay up front?',
      a: 'You pay a {{deposit}}% deposit to reserve your slot, or the full amount if you prefer. With the deposit, the balance is invoiced before launch. On a {{webExample}} website the deposit is {{webExampleDeposit}}. Payments are processed securely by Stripe.',
    },
    {
      q: 'How long does it take to build a website or an app?',
      a: 'The builder shows a delivery estimate that grows with the size of your build, starting at about {{minWeeks}} weeks. The Small business template ({{template:business}}) is estimated at about {{weeks:business}} weeks. The delivery date is confirmed on the kickoff call, once your content and deadlines are known.',
    },
    {
      q: 'Can I get my project delivered faster?',
      a: 'Yes. Rush delivery is {{desc:w-rush}}. It costs {{price:w-rush}} for a website and {{price:a-rush}} for a mobile app.',
    },
    {
      q: 'What support do I get after launch?',
      a: 'Every build includes 30 days of post-launch support with bug fixes. A 3-month care plan costs {{price:w-care-3}} for a website and {{price:a-care-3}} for an app, and a 12-month care plan costs {{price:w-care-12}} for a website and {{price:a-care-12}} for an app. The website plan covers {{desc:w-care-3}}. Care plans are prepaid and do not renew automatically.',
    },
    {
      q: 'How many revision rounds are included?',
      a: 'Two revision rounds are included with every website and every app. Extra rounds cost {{price:w-revision}} each for a website and {{price:a-revision}} each for an app.',
    },
    {
      q: 'Can I order a website and a mobile app together?',
      a: 'Yes. Add both foundations in the builder and configure each one separately. They share one checkout and one project plan.',
    },
    {
      q: 'What happens if I need to add something after I pay?',
      a: 'Changes after you pay are priced with the same blocks and the same prices you see in the builder. Adding a page or a feature later costs exactly what the builder says.',
    },
    {
      q: 'Who builds my project?',
      a: 'Wissile Sogoyou, a software engineer with over 15 years of experience across enterprise software, small-business projects and personal projects. {{siteName}} is his freelance studio, based in Salt Lake City, Utah. The person who answers your message is the person who builds your project.',
    },
    {
      q: 'Can I ask a question or talk to someone before I pay?',
      a: 'Yes. Use the contact form to ask a question, ask for a quote or ask for a call. In the builder, "Ask about this build" sends your build along with your question. For large or enterprise projects a conversation first is the recommended route.',
    },
    {
      q: 'Can I get my deposit back?',
      a: 'The deposit is fully refundable until the kickoff call has taken place. After that, work already completed is not refundable and unused portions are refunded pro rata. Refund requests go through the contact form.',
    },
  ],
}
