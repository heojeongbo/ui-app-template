/**
 * Is this a redirect target we are willing to send a user to after sign-in?
 *
 * Only same-origin, absolute-path locations. Everything else is an
 * **open redirect**: a link to
 * `https://your-app.example/signin?redirect=https://evil.example/login` looks
 * like your app, arrives at your app, and then hands the user to a page that
 * looks like your sign-in. It is a phishing primitive, and it has been a real
 * vulnerability in a great many apps.
 *
 * Rejected, each for its own reason:
 *
 * - `https://evil.example` — a different origin, the obvious case.
 * - `//evil.example` — protocol-relative. The browser reads it as an absolute
 *   URL; a naive `startsWith("/")` check does not. This is the one that
 *   actually slips through review.
 * - `/\evil.example` and `\\evil.example` — backslashes, which several
 *   browsers normalise to `/` before resolving.
 * - `javascript:...` and `data:...` — not navigation at all.
 * - Anything not starting with `/` — a relative path resolves against whatever
 *   the current page happens to be, which is not a decision this should make.
 */
export function isSafeRedirect(target: string): boolean {
	if (target.length === 0) return false;

	// Must be an absolute path on this origin.
	if (!target.startsWith("/")) return false;

	// Protocol-relative (`//host`) and the backslash variants browsers
	// normalise to it.
	if (target.startsWith("//") || target.startsWith("/\\")) return false;
	if (target.includes("\\")) return false;

	// Control characters — a newline or NUL can truncate the value before
	// whatever consumes it downstream sees the rest.
	// biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the point.
	if (/[\u0000-\u001F\u007F]/.test(target)) return false;

	return true;
}
