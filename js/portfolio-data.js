// Projects shown on portfolio.html.
//
// Each project:
//   id      lowercase letters, digits and hyphens. Used in links (index.html#build-<id>).
//   url     the live site.
//   screen  which preview drawing to use: 'site', 'store', 'dashboard' or 'app'.
//   light   true when the live site has a light design, so the preview is drawn light too.
//   hue     accent color as an oklch hue angle (0 red, 75 amber, 145 green, 250 blue, 300 violet).
//   build   the blocks the project is made of, written like a template in js/catalog.js:
//           units = pages or screens, picks = option id -> quantity.
//   note    optional small print shown in the project view.
//
// The block lists below were read off the public sites, so check them against what was really built.
// Pages count distinct page designs: pages that share one template (products, services, lessons)
// count once, and legal pages are covered by the Legal pages block.
// Set `sample: true` to mark every card as a sample.
window.Portfolio = {
  sample: false,
  projects: [
    {
      id: 'meetworkplace',
      name: 'Meetworkplace',
      url: 'https://meetworkplace.com/',
      tags: ['Website', 'Mobile app', 'SaaS'],
      screen: 'app',
      hue: 265,
      summary:
        'An enterprise social network that matches colleagues by shared interests. A marketing site with a blog and sales contact, plus the employee app with AI matchmaking, push messages and surveys.',
      note: 'App blocks are based on the features the site describes.',
      build: {
        website: {
          units: 13,
          picks: {
            'w-dynamic': 3, 'w-design-custom': 1, 'w-cms': 1, 'w-blog': 1, 'w-seo': 1, 'w-forms': 1,
            'w-auth': 1, 'w-legal': 1,
          },
        },
        app: {
          units: 14,
          picks: {
            'a-complex': 4, 'a-platform-cross': 1, 'a-design-custom': 1, 'a-icon': 1, 'a-onboarding': 1,
            'a-auth': 1, 'a-backend': 1, 'a-admin': 1, 'a-realtime': 1, 'a-push': 1, 'a-messaging': 1,
            'a-ai': 1, 'a-analytics': 1, 'a-store': 1,
          },
        },
      },
    },
    {
      id: 'bio-nature-sante',
      name: 'Bio Nature Santé',
      url: 'https://bionaturesante.com/',
      tags: ['Website', 'Online store'],
      screen: 'store',
      light: true,
      hue: 145,
      summary:
        'A French-language shop for organic essential oils and skin care in Lomé. Product and wellness service pages, a cart with delivery zones, and orders that finish on WhatsApp.',
      build: {
        website: {
          units: 10,
          picks: {
            'w-dynamic': 3, 'w-design-custom': 1, 'w-seo': 1, 'w-local-seo': 1, 'w-integration': 2,
            'w-store': 1, 'w-legal': 1,
          },
        },
      },
    },
    {
      id: 'firedbunny',
      name: 'FiredBunny',
      url: 'https://firedbunny.com/',
      tags: ['Website', 'Web app'],
      screen: 'dashboard',
      hue: 75,
      summary:
        'A free personal-finance school you learn by playing: 159 lessons with quizzes, 50 calculators and simulators, a market calendar and a dashboard saved on your device.',
      note: 'The lessons, quizzes and calculators are custom work beyond the standard blocks, so this price covers the site around them.',
      build: {
        website: {
          units: 20,
          picks: {
            'w-dynamic': 6, 'w-design-premium': 1, 'w-cms': 1, 'w-seo': 1, 'w-aeo': 1, 'w-integration': 3,
            'w-performance': 1, 'w-legal': 1,
          },
        },
      },
    },
    {
      id: 'alta-perspective',
      name: 'Alta Perspective',
      url: 'https://altaperspective.com/',
      tags: ['Website'],
      screen: 'site',
      light: true,
      hue: 60,
      summary:
        'A Salt Lake City studio for luxury real estate photography, video, drone and 3D tours. Image-led service pages, pricing, case studies and a booking request form.',
      build: {
        website: {
          units: 10,
          picks: {
            'w-design-custom': 1, 'w-seo': 1, 'w-local-seo': 1, 'w-forms': 1, 'w-performance': 1,
          },
        },
      },
    },
  ],
}
