// Compatibility alias.
//
// This route used to be the entitlement grant: POST an email, and if MailerLite
// said it was in the Paid group it answered `{ isPaid: true }` and the browser
// wrote an unsigned `pa_premium_verified` flag into localStorage. That was both
// an email-enumeration oracle (SEC-002) and a client-side-only gate anyone
// could set by hand (SEC-003).
//
// It now forwards to the magic-link request handler, which returns the same
// response for every email and grants nothing directly. The path is kept so
// that a browser running a cached copy of the old page bundle degrades to
// "check your email" rather than to a hard error.
//
// New code should call /api/premium/request-link.

export { POST } from '../premium/request-link/route'

// Declared literally rather than re-exported: Next.js reads these fields
// statically at build time and cannot follow a re-export.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
