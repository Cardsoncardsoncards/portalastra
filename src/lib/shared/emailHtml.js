'use strict'

// HTML escaping and the shared email footer, used by all three generator
// scripts.
//
// Every email template interpolated Claude output and NASA titles straight into
// HTML string literals with no escaping anywhere. An APOD title containing a
// quote character breaks out of `alt="${apod.title}"` and can inject arbitrary
// attributes; a generated paragraph containing `<` silently mangles the layout.
// NASA titles are not attacker-controlled in any interesting way, but they are
// also not ours, and the model output is not ours either.

const ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Escape text for interpolation into HTML, including attribute contexts.
 *
 * Both quote characters are escaped, so this is safe inside `alt="..."`,
 * `title='...'` and element bodies alike.
 */
function esc(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch])
}

/**
 * Escape a URL for an href or src attribute.
 *
 * Only http(s) and protocol-relative URLs pass. Anything else, notably
 * `javascript:` and `data:`, becomes an empty string rather than a live link.
 */
function escUrl(value) {
  const raw = String(value === null || value === undefined ? '' : value).trim()
  if (!raw) return ''
  if (!/^(https?:)?\/\//i.test(raw)) return ''
  return esc(raw)
}

/** The entertainment-purpose disclaimer, shared by every generated email. */
const ENTERTAINMENT_DISCLAIMER =
  'Horoscope, tarot, numerology and ritual content is for entertainment and personal reflection only. Astronomy data comes from NASA open APIs.'

/**
 * The footer block every generated email ends with. Carries the disclaimer,
 * the subscriber line and the unsubscribe link.
 *
 * `{$email}` and `{$unsubscribe}` are MailerLite merge tags and are
 * deliberately not escaped: they are literal template markers, not data.
 */
function emailFooterHTML() {
  return `
          <tr>
            <td style="padding: 24px 0 0 0; border-top: 1px solid rgba(255,255,255,0.07); text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; color: rgba(232,224,255,0.3);">
                <a href="https://portalastra.com" style="color: #9b8aff; text-decoration: none;">portalastra.com</a>
              </p>
              <p style="margin: 0 0 8px 0; font-size: 10px; color: rgba(232,224,255,0.28); line-height: 1.6;">
                ${esc(ENTERTAINMENT_DISCLAIMER)}
              </p>
              <p style="margin: 0 0 6px 0; font-size: 11px; color: rgba(232,224,255,0.3);">
                You are receiving this as a Portal Astra subscriber at {$email}.
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(232,224,255,0.2);">
                <a href="{$unsubscribe}" style="color: rgba(155,138,255,0.4);">Unsubscribe</a>
              </p>
            </td>
          </tr>`
}

module.exports = {
  esc,
  escUrl,
  ENTERTAINMENT_DISCLAIMER,
  emailFooterHTML,
}
