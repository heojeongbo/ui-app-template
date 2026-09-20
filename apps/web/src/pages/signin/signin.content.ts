/**
 * Everything this screen says.
 *
 * Copy lives in its own module, not inline in the JSX. Three things fall out
 * of that: the page component becomes pure rendering, a scenario test can
 * assert against the same strings the UI shows, and swapping this file for an
 * i18n dictionary later touches nothing else.
 *
 * The voice rules these follow (docs/ux/copy.md):
 * - Sentence case, not Title Case.
 * - Say what is true right now. "Signing in…" while the request is open, not
 *   "Signed in".
 * - Never claim a failure when the answer was merely lost — "Could not confirm"
 *   beats "Failed" for a request that may well have succeeded.
 */
export const signInContent = {
	title: "Sign in",
	description: "Use your account to continue.",

	usernameLabel: "Username",
	passwordLabel: "Password",

	submit: "Sign in",
	submitting: "Signing in…",

	// Fed to zod, so plain `string` — see the Copy prop shapes in docs/ux/copy.md.
	usernameRequired: "Enter your username.",
	passwordRequired: "Enter your password.",
	// No "too short" message here on purpose. A length rule belongs to the
	// screen that CREATES a password, not the one that checks it — see
	// signin.schema.ts.

	// A definite refusal. The server said no, and said why.
	rejected: "That username and password do not match.",
	// An indeterminate failure. The request may have gone through; do not claim
	// it did not.
	unreachable: "Could not reach the server. Check your connection and retry.",
} as const;

export type SignInContent = typeof signInContent;
