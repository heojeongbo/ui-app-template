/**
 * A path that has been through `isSafeRedirect`.
 *
 * A brand, because the check is worth nothing to the type system otherwise. A
 * validated redirect and an arbitrary `string` from a query param are the same
 * type without it, so swapping one for the other during a refactor is
 * invisible — and this is the value whose whole job is to not be arbitrary.
 *
 * `HOME` below carries the only assertion that creates one. That assertion IS
 * the brand's definition: every other `SafeRedirect` in the app comes from
 * `isSafeRedirect` actually returning true.
 */
export type SafeRedirect = string & { readonly __safeRedirect: unique symbol };

/** The fallback, and the one hand-made `SafeRedirect` in the codebase. */
export const HOME = "/" as SafeRedirect;

/**
 * Where the brand's life ends.
 *
 * The router's `to` is a union of known route paths plus `string`, and it
 * rejects a branded string — generic inference on `to` will not take a type it
 * cannot match against the route tree. Widening is safe (it is narrowing that
 * would not be), so this needs no assertion; it exists to say so once instead
 * of at every navigation, and to keep the discharge searchable.
 */
export function toPath(target: SafeRedirect): string {
	return target;
}

/**
 * Is this a redirect target we are willing to send a user to after sign-in?
 *
 * Returns a **type predicate**, not a `boolean`, and that is load-bearing:
 * zod's `.refine` narrows its output only when handed a predicate
 * (`v4/classic/schemas.d.ts:41` — `Ch extends (arg: any) => arg is infer R ?
 * this & ZodType<R, …> : this`). Written as `=> boolean` the runtime check
 * still ran, but `search.redirect` stayed a bare `string` and the type carried
 * no evidence that anything had been checked.
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
export function isSafeRedirect(target: string): target is SafeRedirect {
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
