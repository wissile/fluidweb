// About, contact and the three legal pages. Read by tools/build-seo.js through tools/pages.js.
// About and contact are written in the first person: the owner is speaking.
// The legal pages are drafts based on how the site works. The owner must review them before relying on them.
module.exports = (ctx) => {
  const { esc, usd, icon, CATALOG, P, SITE_NAME, OWNER, PLACE, lowest, templates, price, projects, cardsHTML, heroHTML, sectionHTML, ctaHTML, button, caseFile } = ctx
  const { website, app } = CATALOG
  const webFrom = usd(lowest.website.total)
  const appFrom = usd(lowest.app.total)
  const place = `${PLACE.locality}, ${PLACE.regionName}`
  const enterprise = templates.find((entry) => entry.id === 'enterprise')

  // ---- About ----

  const about = {
    key: 'about',
    file: 'about.html',
    source: 'tools/pages-company.js',
    title: `About ${OWNER.name}, the engineer behind ${SITE_NAME}`,
    description: `${OWNER.name} is a software engineer in ${place} with over 15 years of experience. ${SITE_NAME} is his freelance studio for websites and mobile apps.`,
    crumb: 'About',
    nav: 'about',
    pageType: 'ProfilePage',
    ownPageNode: true,
    graph: (page) => [{ ...ctx.webPageNode(page, 'ProfilePage'), mainEntity: ctx.personRef() }, ctx.personNode()],
    main: (page) => `${heroHTML(page, {
      eyebrow: 'About',
      h1: `I am ${esc(OWNER.name)}, the engineer <span class="brand">behind ${esc(SITE_NAME)}</span>.`,
      lede: `I am a software engineer with over 15 years of experience across enterprise software, small-business projects and personal projects. ${esc(SITE_NAME)} is my freelance studio, based in ${esc(place)}.`,
      actions: `${button('contact.html', 'Get in touch', { primary: true, arrow: true })}${button('portfolio.html', 'See the work')}`,
    })}

  <div class="container pricing">
    ${sectionHTML({
      id: 'who',
      eyebrow: 'Who I am',
      title: 'A software engineer who builds for people and small teams',
      body: `<div class="prose">
        <p>I have spent more than 15 years building software: large systems for enterprises, sites and tools for small businesses, and projects of my own. ${esc(SITE_NAME)} is where I take on freelance work: web design, web development, SEO, AEO and GEO, and mobile apps for iOS and Android.</p>
        <p>When you work with ${esc(SITE_NAME)} you work with me. I answer your message, I am on the kickoff call, and I plan, build and launch your project.</p>
      </div>`,
    })}

    ${sectionHTML({
      id: 'how',
      eyebrow: 'How I work',
      title: 'Prices first, then a plan, then previews',
      intro: 'I would rather show you the price than make you ask for it. So every block of work has a listed price, and you can add up your project before we ever talk.',
      body: `<ol class="steps">
        <li><span class="step-no">01</span><h3>You see the price</h3><p>You stack the blocks your project needs in the <a href="website-cost-calculator.html">calculator</a>. A website starts at ${webFrom} and a mobile app at ${appFrom}. The total you see is the total for that scope.</p></li>
        <li><span class="step-no">02</span><h3>We agree on a plan</h3><p>A ${P.DEPOSIT_PERCENT}% deposit, or payment in full, reserves your slot. On the kickoff call I turn your blocks into a plan and we set the delivery date.</p></li>
        <li><span class="step-no">03</span><h3>You watch it take shape</h3><p>You review progress on a private preview link at every milestone. Two revision rounds are included.</p></li>
        <li><span class="step-no">04</span><h3>I launch it and stay on</h3><p>I launch the project, hand over the keys and stay on for 30 days of support. If the scope changes along the way, the change is priced from the same blocks.</p></li>
      </ol>`,
    })}

    ${sectionHTML({
      id: 'with',
      eyebrow: 'Who I work with',
      title: 'Individuals, small businesses and startups',
      body: `<div class="prose">
        <p>Most of my projects are for three kinds of customer: people who want a personal site, small businesses that need to be found and booked, and startups building a first product. Each has a template in the builder and a page that itemizes the cost: <a href="personal-website-cost.html">personal website</a>, <a href="small-business-website-cost.html">small business website</a>, <a href="saas-website-cost.html">SaaS website</a> and <a href="mobile-app-mvp-cost.html">mobile app MVP</a>.</p>
        <p>I also take on larger and enterprise work. Projects of that size, such as the Enterprise platform template at ${usd(enterprise.total)}, go better with a conversation before any payment, so <a href="contact.html#call">talk to me first</a>.</p>
      </div>`,
    })}

    ${sectionHTML({
      id: 'where',
      eyebrow: 'Where I am',
      title: `Based in ${place}`,
      body: `<div class="prose">
        <p>I live and work in ${esc(place)}, in the United States. Projects start online: you price your build on this site, we talk on a kickoff call, and you follow the work on a preview link.</p>
      </div>`,
    })}

    ${sectionHTML({
      id: 'work',
      eyebrow: 'Work',
      title: 'Projects you can take apart',
      intro: `${ctx.capital(ctx.word(projects.length))} live projects, each with a case study that shows the blocks behind it and what they cost in the builder today.`,
      body: cardsHTML(
        projects.map((project) => ({ href: caseFile(project.id), icon: 'layout-grid', title: project.name, meta: project.tags.join(' · '), text: project.summary.split(/(?<=\.)\s/)[0], link: 'Read the case study' })),
        { columns: 4 },
      ),
    })}
  </div>

  ${ctaHTML({
    title: 'Tell me what you want to build.',
    text: 'Send a question, ask for a quote or ask for a call. Or price the project yourself first.',
    actions: `${button('contact.html', 'Contact me', { primary: true, arrow: true })}${button('index.html#builder', 'Start building')}`,
  })}`,
  }

  // ---- Contact ----

  const field = (id, label, control, { required = false, hint = '', error = true } = {}) => `<div class="field" data-field="${id}">
            <label for="contact-${id}">${esc(label)}${required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>
            ${control}
            ${hint ? `<p class="field-hint" id="contact-${id}-hint">${esc(hint)}</p>` : ''}
            ${error ? `<p class="field-error" id="contact-${id}-error" hidden></p>` : ''}
          </div>`

  const contact = {
    key: 'contact',
    file: 'contact.html',
    source: 'tools/pages-company.js',
    title: `Contact ${SITE_NAME}: ask a question or request a call`,
    description: `Send ${OWNER.name} a question, ask for a quote or request a call about a website or a mobile app. Replies come by email. Based in ${place}.`,
    crumb: 'Contact',
    nav: 'contact',
    pageType: 'ContactPage',
    scripts: ['contact'],
    main: (page) => `${heroHTML(page, {
      eyebrow: 'Contact',
      h1: 'Tell me about <span class="brand">your project</span>.',
      lede: 'Ask a question, ask for a quote or ask for a call. Your message comes straight to me and I reply by email.',
    })}

  <div class="container pricing">
    <div class="split">
      <section aria-labelledby="form-heading" class="form-card">
        <h2 id="form-heading">Send a message</h2>
        <form id="contact-form" novalidate>
          <p class="field-hint">Fields marked <span class="req" aria-hidden="true">*</span><span class="sr-only">with a star</span> are required.</p>
          <div class="field" data-field="topic">
            <label for="contact-topic">What is this about?</label>
            <select class="input" id="contact-topic" name="topic">
              <option value="general">A general question</option>
              <option value="quote">A quote for a project</option>
              <option value="call">I would like a call</option>
            </select>
          </div>
          <div class="field-row">
            ${field('name', 'Full name', '<input class="input" id="contact-name" name="name" autocomplete="name" required maxlength="100" aria-describedby="contact-name-error">', { required: true })}
            ${field('email', 'Email', '<input class="input" id="contact-email" name="email" type="email" autocomplete="email" required maxlength="254" aria-describedby="contact-email-error">', { required: true })}
          </div>
          ${field('company', 'Company (optional)', '<input class="input" id="contact-company" name="company" autocomplete="organization" maxlength="100" aria-describedby="contact-company-error">')}
          <div id="contact-call" hidden>
            ${field('callTimes', 'When are good times for a call? (optional)', '<input class="input" id="contact-callTimes" name="callTimes" maxlength="300" aria-describedby="contact-callTimes-hint contact-callTimes-error">', { hint: 'Days, hours and your time zone.' })}
          </div>
          ${field('message', 'Message', '<textarea class="input" id="contact-message" name="message" rows="6" required maxlength="4000" aria-describedby="contact-message-hint contact-message-error"></textarea>', { required: true, hint: 'What you want to build, links, deadlines, or your question.' })}
          ${ctx.honeypotHTML('contact-website')}
          <div class="alert" id="contact-error" role="alert" hidden>${icon('circle-alert')}<div><p class="alert-title">Your message was not sent</p><p id="contact-error-text"></p></div></div>
          <button type="submit" class="btn btn-primary btn-xl" id="contact-submit">${icon('send')}<span id="contact-submit-text">Send message</span></button>
          <p class="fineprint left">The <a href="privacy.html">privacy policy</a> explains how your details are used.</p>
          <noscript><p class="field-hint">This form needs JavaScript to send. If it is switched off, please switch it on for this page and reload.</p></noscript>
        </form>
        <div id="contact-sent" class="sent" tabindex="-1" hidden>
          ${icon('circle-check')}
          <h3>Message sent</h3>
          <p>Thank you. Your message is on its way to me, and I will reply by email to the address you gave.</p>
          <button type="button" class="btn btn-outline btn-lg" id="contact-again">Send another message</button>
        </div>
        <p class="sr-only" id="contact-status" role="status"></p>
      </section>

      <aside class="aside-stack" aria-label="Other ways to start">
        <div class="aside-card">
          <h2>What happens next</h2>
          <p>I read every message myself and answer by email. If you asked for a call, I reply with times that work and we set it up from there.</p>
        </div>
        <div class="aside-card">
          <h2>Start with a number</h2>
          <p>You can price your project first. Build it in the calculator, then use "Ask about this build" to send it to me with your question.</p>
          <p><a class="text-link" href="website-cost-calculator.html">Open the cost calculator ${icon('arrow-right')}</a></p>
        </div>
        <div class="aside-card">
          <h2>Larger projects</h2>
          <p>For enterprise or unusually large work, choose "I would like a call" so we can agree on the scope before anything is paid.</p>
        </div>
        <div class="aside-card">
          <h2>Where I am</h2>
          <p class="place">${icon('map-pin')}${esc(place)}, United States</p>
          <p><a class="text-link" href="about.html">About me ${icon('arrow-right')}</a></p>
        </div>
      </aside>
    </div>
  </div>`,
  }

  // ---- Legal pages (drafts) ----

  const UPDATED = { iso: '2026-11-17', text: 'November 17, 2026' }
  const DRAFT_NOTE = 'DRAFT FOR THE OWNER TO REVIEW. This page was written from how the site works and has not been reviewed by a lawyer. Check every statement, and the assumptions listed in the handover report, before relying on it. Edit the text in tools/pages-company.js.'

  function legalPage({ key, file, crumb, title, description, h1, lede, body }) {
    return {
      key,
      file,
      source: 'tools/pages-company.js',
      title,
      description,
      crumb,
      nav: null,
      comment: DRAFT_NOTE,
      main: (page) => `${heroHTML(page, {
        eyebrow: 'Legal',
        h1: esc(h1),
        lede: esc(lede),
        extra: `<p class="byline">Last updated <time datetime="${UPDATED.iso}">${UPDATED.text}</time></p>`,
      })}

  <div class="container article">
    <div class="prose">
      ${body.trim()}
      <h2 id="other-policies">Related policies</h2>
      <p>${[['privacy', 'privacy.html', 'Privacy policy'], ['terms', 'terms.html', 'Terms of service'], ['refund', 'refund-policy.html', 'Refund policy']]
        .filter(([other]) => other !== key)
        .map(([, href, label]) => `<a href="${href}">${label}</a>`)
        .join(' and ')}. Questions about any of them go through the <a href="contact.html">contact form</a>.</p>
    </div>
  </div>`,
    }
  }

  const privacy = legalPage({
    key: 'privacy',
    file: 'privacy.html',
    crumb: 'Privacy policy',
    title: `Privacy policy: what this site collects | ${SITE_NAME}`,
    description: `What ${SITE_NAME} collects through the contact form and checkout, how analytics cookies work and how to decline them, and which services process your data.`,
    h1: 'Privacy policy',
    lede: `What this site collects, why, and who handles it. In short: the details you type into a form, and analytics cookies only if you accept them.`,
    body: `
      <h2 id="who">Who is responsible</h2>
      <p>${esc(SITE_NAME)} is the freelance studio of ${esc(OWNER.name)}, based in ${esc(place)}, United States. In this policy "I" means ${esc(OWNER.name)}. To ask anything about your data, use the <a href="contact.html">contact form</a>.</p>

      <h2 id="collect">What I collect</h2>
      <h3>When you send a message</h3>
      <p>The contact form and the "Ask about this build" form collect your name, your email address, your company if you give it, your message, the topic you chose, your preferred call times if you give them, and the build you attached, if any. The message is sent to me by email. This site has no database and keeps no copy.</p>
      <h3>When you check out</h3>
      <p>The checkout form collects your name, your email address, your company and notes if you give them, the build you are ordering and whether you chose the deposit or full payment. Payment itself happens on a page run by Stripe. Your card details go to Stripe and never pass through or get stored on this site.</p>
      <h3>When you browse</h3>
      <p>This site uses Google Analytics to see which pages are visited and how the builder is used. It is set up with Google Consent Mode, and analytics storage is switched off by default:</p>
      <ul>
        <li><b>Until you choose, or if you decline</b>, Google Analytics sets no analytics cookies. The Google tag still loads and may send limited, cookieless signals that are not tied to an identifier stored in your browser.</li>
        <li><b>If you accept</b>, Google Analytics sets cookies in your browser to tell visits apart and measure them.</li>
      </ul>
      <p>Advertising storage and ad personalization stay switched off in both cases. This site runs no advertising. The builder sends a few events to Analytics, such as opening the checkout, copying a link to a build or sending a request, with the build's total, its products and its number of blocks. Those events never include your name, your email address or your message.</p>
      <p>You can change your choice at any time with the "Cookie settings" link at the bottom of every page.</p>

      <h2 id="browser">What stays in your browser</h2>
      <p>Two things are saved in your browser's local storage and are not sent anywhere by being saved:</p>
      <ul>
        <li><b>Your build.</b> The builder saves the blocks you picked so they are still there when you come back. "Start over" deletes it.</li>
        <li><b>Your cookie choice.</b> Whether you accepted or declined analytics cookies.</li>
      </ul>
      <p>Clearing this site's data in your browser removes both.</p>

      <h2 id="use">How I use it</h2>
      <p>I use what you send to answer you, to prepare a quote, to deliver the project you ordered, and to keep the records a business has to keep. I use analytics to improve the site. I do not sell your data and I do not use it for advertising.</p>

      <h2 id="services">Services that process data for this site</h2>
      <ul>
        <li><b>Cloudflare</b> hosts the site. Like any host, it processes technical data such as your IP address in order to deliver pages and protect the site.</li>
        <li><b>Resend</b> delivers the emails that the contact forms send to me.</li>
        <li><b>Stripe</b> processes payments and holds the payment details you enter on its page.</li>
        <li><b>Google Analytics</b> measures visits, as described above.</li>
        <li><b>My email provider</b> stores the messages I receive and my replies.</li>
      </ul>
      <p>Each of these services handles data under its own terms and privacy policy, and some of them process data in the United States.</p>

      <h2 id="keep">How long I keep it</h2>
      <p>I keep messages and project records for as long as I need them to answer you, deliver your project and meet tax and accounting obligations. Messages that do not lead to a project are deleted when they are no longer needed.</p>

      <h2 id="rights">Your choices</h2>
      <p>You can ask what I hold about you, ask me to correct it or ask me to delete it, through the <a href="contact.html">contact form</a>. I will do so unless I am required to keep a record, for example for accounting. Depending on where you live, the law may give you further rights over your data.</p>

      <h2 id="children">Children</h2>
      <p>This site is meant for adults who want to commission a website or an app. It is not directed at children, and I do not knowingly collect data from children under 13.</p>

      <h2 id="changes">Changes to this policy</h2>
      <p>If the site starts to collect something else or use a new service, I will update this page and the date at the top.</p>
    `,
  })

  const terms = legalPage({
    key: 'terms',
    file: 'terms.html',
    crumb: 'Terms of service',
    title: `Terms of service for ${SITE_NAME} projects | ${SITE_NAME}`,
    description: `The terms for ${SITE_NAME} projects: what a build includes, the ${P.DEPOSIT_PERCENT}% deposit, when the balance is due, revisions, scope changes, support after launch and governing law.`,
    h1: 'Terms of service',
    lede: `The agreement between you and ${SITE_NAME} when you order a website or a mobile app: what you get, what you pay and when.`,
    body: `
      <h2 id="parties">Who these terms are between</h2>
      <p>${esc(SITE_NAME)} is the freelance studio of ${esc(OWNER.name)}, based in ${esc(place)}, United States. In these terms "I" means ${esc(OWNER.name)} and "you" means the person or business ordering a project. By paying for a build you agree to these terms.</p>

      <h2 id="scope">What you are buying</h2>
      <p>A project is the set of blocks in your build at checkout: a foundation, a number of pages or screens, and the blocks you added. The <a href="pricing.html">price list</a> describes each block. The website foundation includes: ${website.included.map(ctx.lowerFirst).join('; ')}. The app foundation includes: ${app.included.map(ctx.lowerFirst).join('; ')}.</p>
      <p>The total shown in the builder is the price for that scope. Prices are in US dollars.</p>

      <h2 id="payment">Payment</h2>
      <p>You choose at checkout to pay a ${P.DEPOSIT_PERCENT}% deposit or the full amount. The deposit reserves your slot and starts the project. If you pay the deposit, the balance is invoiced before launch and is due before the project goes live. Payments are processed by Stripe.</p>

      <h2 id="process">How the project runs</h2>
      <p>After payment we hold a kickoff call, where your blocks become a plan and a delivery date is set. You review progress on a private preview link at each milestone. The delivery estimate shown in the builder is a planning figure and not a commitment. The date agreed on the kickoff call depends on you providing content, access and feedback in good time.</p>

      <h2 id="revisions">Revisions</h2>
      <p>Two revision rounds are included with every website and every app. Further rounds cost ${price('w-revision')} each for a website and ${price('a-revision')} each for an app.</p>

      <h2 id="changes">Changes to the scope</h2>
      <p>If you want to add or change something after you pay, the change is priced with the same blocks and the same prices as in the builder. I will confirm the price of a change with you before doing the work.</p>

      <h2 id="support">Support after launch</h2>
      <p>Every build includes 30 days of support after launch for bug fixes. Care plans extend this: for a website, ${price('w-care-3')} for 3 months or ${price('w-care-12')} for 12 months, and for an app, ${price('a-care-3')} for 3 months or ${price('a-care-12')} for 12 months. Care plans are prepaid and do not renew automatically.</p>

      <h2 id="yours">What you provide</h2>
      <p>You are responsible for the content you give me, such as text, images and logos, and for having the right to use it. You also provide access to the accounts the project needs, such as your domain.</p>

      <h2 id="ownership">Ownership</h2>
      <p>Once the project is paid in full, the finished work made for you is yours. Third-party software, fonts, images and services used in the project stay under their own licenses. Unless you ask me not to, I may show the finished project in the ${esc(SITE_NAME)} portfolio.</p>

      <h2 id="third-parties">Third-party services</h2>
      <p>Projects rely on services run by others, such as hosting, payment processing, app stores and email delivery. Those services have their own terms and prices, and I am not responsible for their outages or their decisions, including app store reviews.</p>

      <h2 id="refunds">Refunds and cancellation</h2>
      <p>The <a href="refund-policy.html">refund policy</a> is part of these terms.</p>

      <h2 id="liability">Warranty and liability</h2>
      <p>I build the project with reasonable skill and care and fix bugs reported during the support period. Beyond that the work is provided as it is, and I make no promise about search rankings, citations by AI assistants, traffic, sales or app store approval. To the extent the law allows, my total liability for a project is limited to the amount you paid for it.</p>

      <h2 id="law">Governing law</h2>
      <p>These terms are governed by the laws of the State of Utah, USA.</p>

      <h2 id="updates">Changes to these terms</h2>
      <p>I may update these terms. The version in place when you paid applies to your project.</p>
    `,
  })

  const refund = legalPage({
    key: 'refund',
    file: 'refund-policy.html',
    crumb: 'Refund policy',
    title: `Refund policy: deposits and cancellations | ${SITE_NAME}`,
    description: `The ${SITE_NAME} refund policy: the deposit is fully refundable until the kickoff call has taken place. After that, completed work is not refundable.`,
    h1: 'Refund policy',
    lede: 'The deposit is fully refundable until the kickoff call has taken place. After that, work already completed is not refundable and unused portions are refunded pro rata.',
    body: `
      <h2 id="before">Before the kickoff call</h2>
      <p>If you change your mind before the kickoff call has taken place, you get back everything you paid, whether that was the ${P.DEPOSIT_PERCENT}% deposit or the full amount.</p>

      <h2 id="after">After the kickoff call</h2>
      <p>Once the kickoff call has taken place, work is under way. If you cancel after that point:</p>
      <ul>
        <li>Work already completed is not refundable.</li>
        <li>The portion of what you paid that covers work not yet done is refunded pro rata.</li>
      </ul>
      <p>I will tell you which blocks are complete and which are not, and how the refund was worked out.</p>

      <h2 id="care">Care plans</h2>
      <p>Care plans are prepaid. If you cancel a care plan, the months not yet started are refunded pro rata.</p>

      <h2 id="how">How to ask for a refund</h2>
      <p>Send the request through the <a href="contact.html">contact form</a>, with the name and email address used at checkout. Refunds are returned to the original payment method through Stripe.</p>

      <h2 id="law">Governing law</h2>
      <p>This policy is part of the <a href="terms.html">terms of service</a>, which are governed by the laws of the State of Utah, USA.</p>
    `,
  })

  return { pages: [about, contact, privacy, terms, refund] }
}
