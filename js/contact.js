// The contact form on contact.html. Posts to the Worker through Site.sendContact (js/site.js).
// It shows "sent" only when the Worker confirms delivery. Anything else, including opening the
// page from disk, shows "not sent" and keeps what the visitor typed.
(function () {
  const form = document.getElementById('contact-form')
  if (!form || !window.Site) return
  const { sendContact, track } = window.Site

  const $ = (id) => document.getElementById(id)
  const topic = form.elements.topic
  const callBox = $('contact-call')
  const sent = $('contact-sent')
  const status = $('contact-status')
  const button = $('contact-submit')
  const buttonText = $('contact-submit-text')
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const RULES = {
    name: (value) => (value ? '' : 'Enter your name.'),
    email: (value) => (!value ? 'Enter your email address.' : EMAIL_PATTERN.test(value) ? '' : 'Enter a valid email address, such as name@example.com.'),
    message: (value) => (value ? '' : 'Write a message.'),
  }

  function syncTopic() {
    callBox.hidden = topic.value !== 'call'
  }

  // contact.html#call and contact.html#quote open the form on that topic.
  function readHash() {
    const wanted = window.location.hash.slice(1)
    if (wanted === 'call' || wanted === 'quote') topic.value = wanted
    syncTopic()
  }
  readHash()
  window.addEventListener('hashchange', readHash)
  topic.addEventListener('change', syncTopic)

  function setFieldError(name, text) {
    const input = form.elements[name]
    const error = $(`contact-${name}-error`)
    if (!input || !error) return
    error.textContent = text
    error.hidden = !text
    if (text) input.setAttribute('aria-invalid', 'true')
    else input.removeAttribute('aria-invalid')
  }

  function validate() {
    let first = null
    for (const [name, rule] of Object.entries(RULES)) {
      const text = rule(form.elements[name].value.trim())
      setFieldError(name, text)
      if (text && !first) first = form.elements[name]
    }
    return first
  }

  // Once a field has shown an error, clear it as soon as the field is valid again.
  form.addEventListener('input', (event) => {
    const name = event.target.name
    if (RULES[name] && event.target.hasAttribute('aria-invalid')) setFieldError(name, RULES[name](event.target.value.trim()))
  })

  function setFailed(text) {
    $('contact-error').hidden = !text
    $('contact-error-text').textContent = text || ''
  }

  function setSending(sending) {
    button.disabled = sending
    buttonText.textContent = sending ? 'Sending' : 'Send message'
    if (sending) status.textContent = 'Sending your message.'
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    setFailed('')
    const invalid = validate()
    if (invalid) {
      status.textContent = 'The form has errors. Check the marked fields.'
      invalid.focus()
      return
    }

    const payload = {
      topic: topic.value,
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      company: form.elements.company.value.trim(),
      message: form.elements.message.value.trim(),
      website: form.elements.website.value,
    }
    if (topic.value === 'call') payload.callTimes = form.elements.callTimes.value.trim()

    setSending(true)
    const result = await sendContact(payload)
    setSending(false)

    if (result.ok) {
      track('contact_submit', { topic: payload.topic })
      form.hidden = true
      sent.hidden = false
      status.textContent = 'Your message was sent.'
      sent.focus()
      return
    }
    // What the visitor typed stays in the form.
    setFailed(result.error || 'It did not reach me. Nothing was lost: your text is still in the form. Please try again later.')
    status.textContent = 'Your message was not sent.'
  })

  $('contact-again').addEventListener('click', () => {
    form.elements.message.value = ''
    sent.hidden = true
    form.hidden = false
    status.textContent = ''
    form.elements.message.focus()
  })
})()
