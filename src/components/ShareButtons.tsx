'use client'

import { useEffect, useState } from 'react'

// The one share row for the whole site.
//
// This replaces five separate copy-pasted implementations (the footer's own
// row, the homepage's local ShareButtons, the calendars ShareRow, and the
// Pinterest-only blocks on the blog post and moon pages). They had drifted:
// different button sets, different labels for the same platform ("X" vs
// "Post"), different Copy Link colours, and two of them rendered on the same
// page at once so visitors saw the same seven buttons twice.
//
// What each platform actually renders in its preview card comes from the Open
// Graph tags at `url`, not from the parameters below. The `title` here only
// sets the pre-filled user text; `image` is passed to Pinterest, which is the
// one target that takes an explicit media URL.

export interface ShareButtonsProps {
  /** Pre-filled share text. Falls back to the site name. */
  title?: string
  /** Absolute URL to share. Defaults to the live page URL. */
  url?: string
  /** Absolute image URL, used by Pinterest as the pin media. */
  image?: string
  /** Style hook so callers can space the row within their own layout. */
  style?: React.CSSProperties
  className?: string
}

const BTN: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  fontFamily: 'inherit',
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#fff',
}

// Open a share dialog in a small popup instead of a full tab. Kept from the
// homepage implementation, which was the only one that did this.
function openSharePopup(shareUrl: string) {
  window.open(shareUrl, '_blank', 'width=600,height=400,noopener,noreferrer')
}

export default function ShareButtons({
  title = 'Portal Astra',
  url,
  image,
  style,
  className,
}: ShareButtonsProps) {
  const [liveUrl, setLiveUrl] = useState(url || 'https://portalastra.com')
  const [copied, setCopied] = useState(false)
  const enc = encodeURIComponent

  // Read the live URL only on the client, to avoid an SSR/hydration mismatch.
  // An explicit `url` prop always wins.
  useEffect(() => {
    if (!url) setLiveUrl(window.location.href)
  }, [url])

  const shareUrl = url || liveUrl
  // Platforms with no separate URL field need it inside the text.
  const textWithUrl = `${title} ${shareUrl}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}&quote=${enc(title)}`
  const xUrl = `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(title)}`
  const redditUrl = `https://www.reddit.com/submit?url=${enc(shareUrl)}&title=${enc(title)}`
  const pinUrl =
    `https://pinterest.com/pin/create/button/?url=${enc(shareUrl)}&description=${enc(title)}` +
    (image ? `&media=${enc(image)}` : '')

  return (
    <div
      className={className}
      style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', ...style }}
    >
      <a
        style={{ ...BTN, background: '#1877F2' }}
        href={fbUrl}
        onClick={(e) => {
          e.preventDefault()
          openSharePopup(fbUrl)
        }}
        target="_blank"
        rel="noopener noreferrer"
      >
        Facebook
      </a>
      <a
        style={{ ...BTN, background: '#000000' }}
        href={xUrl}
        onClick={(e) => {
          e.preventDefault()
          openSharePopup(xUrl)
        }}
        target="_blank"
        rel="noopener noreferrer"
      >
        X
      </a>
      <a
        style={{ ...BTN, background: '#25D366' }}
        href={`https://wa.me/?text=${enc(textWithUrl)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        WhatsApp
      </a>
      <a
        style={{ ...BTN, background: '#FF4500' }}
        href={redditUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Reddit
      </a>
      <a
        style={{ ...BTN, background: '#E60023' }}
        href={pinUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Pinterest
      </a>
      {/* Not a share target: this opens the Portal Astra profile. Kept because
          it was in every previous row, but it does not share the page. */}
      <a
        style={{ ...BTN, background: '#E1306C' }}
        href="https://www.instagram.com/portalastra"
        target="_blank"
        rel="noopener noreferrer"
      >
        Instagram
      </a>
      <button style={{ ...BTN, background: '#b8a4ff', color: '#07070d' }} onClick={copy}>
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
    </div>
  )
}
