// Every page that tools/build-seo.js writes whole. The text lives here and in the tools/pages-*.js files:
//   pages-services.js  the services overview and the five service pages
//   pages-costs.js     the four cost pages and the calculator page
//   pages.js           the case studies (below), one per project in js/portfolio-data.js
//   pages-guides.js    the guides overview and the three guides
//   pages-company.js   about, contact, privacy, terms and refund policy
//
// A page is an object: key, file, source, title, description, crumb (its name in the breadcrumb),
// parents (list of [label, file] between Home and the page), nav (which header link is current),
// main(page) (the HTML inside <main>), and optionally graph(page) (extra JSON-LD nodes), builder,
// scripts, comment, ogType. Prices are never typed: use the helpers passed in as `ctx`.
module.exports = (ctx) => {
  const { esc, usd, icon, P, SITE_NAME, projects, quoteTable, cardsHTML, heroHTML, sectionHTML, ctaHTML, button, caseFile } = ctx

  const services = require('./pages-services.js')(ctx)
  const costs = require('./pages-costs.js')(ctx)
  const guides = require('./pages-guides.js')(ctx)
  const company = require('./pages-company.js')(ctx)

  // ---- Case studies ----

  const firstSentence = (text) => text.split(/(?<=\.)\s/)[0]
  const SHOTS = ctx.SHOTS
  // Which service page goes with a project, by the kind of work it shows.
  const SERVICE_FOR = {
    meetworkplace: ['mobile-app-development.html', 'smartphone', 'Mobile app development', 'What the app foundation includes and what each feature costs.'],
    'bio-nature-sante': ['seo-services.html', 'search', 'SEO', 'SEO optimization and local SEO, both used in this build.'],
    firedbunny: ['aeo-geo-services.html', 'bot', 'AEO and GEO', 'The block that makes a site readable and citable for AI assistants, used in this build.'],
    'alta-perspective': ['web-design.html', 'palette', 'Web design', 'Custom human design, the option this build uses.'],
  }

  function casePage(project) {
    const parts = SHOTS[project.id] || []
    const { config } = P.buildPreset({ id: project.id, name: project.name, description: '', products: project.build })
    const quote = P.computeQuote(config)
    const size = project.recipe.map((product) => product.size).join(' and ')
    const categories = [...new Map(project.recipe.flatMap((product) => product.sections.map((section) => [section.title, section.hue]))).entries()]
    const others = projects.filter((entry) => entry.id !== project.id)
    const service = SERVICE_FOR[project.id]
    return {
      key: `case-${project.id}`,
      file: caseFile(project.id),
      source: 'tools/pages.js (the project itself comes from js/portfolio-data.js)',
      title: `${project.name} case study: blocks and cost | ${SITE_NAME}`,
      description: `See the ${project.name} homepage piece by piece and the ${project.blocks} blocks behind it: ${size}. The same build costs ${usd(project.total)} in the builder today.`,
      crumb: project.name,
      parents: [['Work', 'portfolio.html']],
      nav: 'work',
      short: project.name,
      graph: (page) => [
        {
          '@type': 'CreativeWork',
          name: `${project.name} case study`,
          description: project.summary,
          url: ctx.abs(page.file),
          about: { '@type': 'WebSite', name: project.name, url: project.url },
          keywords: project.tags.join(', '),
          creator: ctx.orgRef(),
          ...(project.shot ? { image: ctx.abs(project.shot.src) } : {}),
        },
      ],
      main: (page) => `${heroHTML(page, {
        eyebrow: 'Case study',
        h1: `${esc(project.name)}, <span class="brand">block by block</span>.`,
        lede: `The live ${esc(project.host)} homepage cut into its components, the ${project.blocks} blocks behind the build (${esc(size)}), and what those blocks cost in the builder today: ${usd(project.total)}.`,
        actions: `<a href="${esc(project.url)}" class="btn btn-primary btn-xl" rel="noopener">Visit ${esc(project.host)} ${icon('external-link')}</a>${button(`index.html#build-${project.id}`, 'Open this build in the builder')}`,
      })}

  <div class="container pricing">
    ${sectionHTML({
      id: 'project',
      eyebrow: 'The project',
      title: `What ${project.name} is`,
      intro: esc(project.summary),
      body: `<dl class="facts">
        <div><dt>Live site</dt><dd><a class="text-link" href="${esc(project.url)}" rel="noopener">${esc(project.host)}</a></dd></div>
        <div><dt>Kind of project</dt><dd>${project.tags.map((tag) => `<span class="badge">${esc(tag)}</span>`).join(' ')}</dd></div>
        <div><dt>Size</dt><dd>${esc(size)}</dd></div>
        <div><dt>Blocks</dt><dd>${project.blocks}</dd></div>
        <div><dt>These blocks today</dt><dd class="mono">${usd(project.total)}</dd></div>
      </dl>`,
    })}

    ${
      parts.length
        ? sectionHTML({
            id: 'homepage',
            eyebrow: 'The homepage',
            title: 'The homepage, piece by piece',
            intro: `The real ${esc(project.name)} homepage, cut into its ${ctx.word(parts.length)} components from top to bottom. The <a href="portfolio.html#project-${project.id}">interactive view in the portfolio</a> lets you pull them apart and switch categories off.`,
            body: `<ol class="shots">
        ${parts
          .map(
            (part, index) => `<li><figure>
          <img src="${esc(part.src)}" width="${part.w}" height="${part.h}" alt="${esc(`${project.name} homepage: the ${part.name.toLowerCase()} component`)}"${index < 2 ? '' : ' loading="lazy"'} decoding="async">
          <figcaption><span class="mono">${String(index + 1).padStart(2, '0')}</span>${esc(part.name)}</figcaption>
        </figure></li>`,
          )
          .join('\n        ')}
      </ol>`,
          })
        : ''
    }

    ${sectionHTML({
      id: 'blocks',
      eyebrow: 'The build',
      title: 'The blocks behind it and what they cost today',
      intro: `${esc(project.name)} uses blocks from ${ctx.word(categories.length)} categories. Added up at today's prices, the same build comes to ${usd(project.total)}.`,
      body: `<p class="chips">${categories.map(([title, hue]) => `<span class="badge tint" style="--h:${hue}">${esc(title)}</span>`).join('')}</p>
      ${quoteTable(quote, { hue: project.hue, caption: `${project.name}: the build, itemized at today's prices` })}
      <p class="body-note">Prices are what these blocks cost in the builder today, not what the client paid.${project.note ? ` ${esc(project.note)}` : ''}</p>
      <p><a class="text-link" href="index.html#build-${project.id}">Open the ${esc(project.name)} build in the builder ${icon('arrow-right')}</a></p>`,
    })}

    ${sectionHTML({
      id: 'related',
      eyebrow: 'Related',
      title: 'More work and the services behind it',
      body: cardsHTML(
        [
          { href: service[0], icon: service[1], title: service[2], text: service[3], link: ctx.aboutLabel(service[2]) },
          ...others.map((other) => ({ href: caseFile(other.id), icon: 'layout-grid', title: `Case study: ${other.name}`, text: firstSentence(other.summary), link: 'Read the case study' })),
        ],
        { columns: 4 },
      ),
    })}
  </div>

  ${ctaHTML({
    title: 'Start from this build.',
    text: `Open the ${esc(project.name)} build in the builder, then add or remove blocks until it fits your project.`,
    actions: `${button(`index.html#build-${project.id}`, 'Open this build in the builder', { primary: true, arrow: true })}${button('portfolio.html', 'See all work')}`,
  })}`,
    }
  }

  const cases = projects.map(casePage)

  return {
    pages: [...services.pages, ...costs.pages, ...cases, ...guides.pages, ...company.pages],
    SERVICE_KEYS: services.keys,
    COST_KEYS: costs.keys,
    CASE_KEYS: cases.map((page) => page.key),
    GUIDE_KEYS: guides.keys,
  }
}
