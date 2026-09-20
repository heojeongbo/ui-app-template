import { Code, ConnectError } from "@connectrpc/connect";

/**
 * The error taxonomy the rest of the app reasons with.
 *
 * The distinction that matters is not "did it work" but **"do we know whether
 * it worked"**. A request the server actively refused and a request whose
 * answer was lost on the way back look identical to `catch`, and treating them
 * the same produces two opposite bugs:
 *
 * - Telling a user "Save failed" when the write landed and only the reply was
 *   dropped, so they do it again and create a duplicate.
 * - Rolling back optimistic UI for a write the server accepted.
 *
 * Everything downstream keys off this split: toast tone (docs/ux/mutations.md),
 * whether a retry is safe, and whether optimistic state should be reverted.
 */

/**
 * Codes that mean **the server received the request and refused it**. The
 * outcome is known, retrying unchanged will fail identically, and the user has
 * to change something.
 */
const DEFINITE_FAILURE_CODES: ReadonlySet<Code> = new Set([
	Code.InvalidArgument,
	Code.NotFound,
	Code.AlreadyExists,
	Code.PermissionDenied,
	Code.Unauthenticated,
	Code.Unimplemented,
	Code.FailedPrecondition,
	Code.OutOfRange,
]);

/**
 * True when the server gave a verdict.
 *
 * Everything else — `Unavailable`, `DeadlineExceeded`, `Internal`, `Unknown`,
 * `Aborted`, `Canceled`, `ResourceExhausted`, `DataLoss`, and any non-Connect
 * throwable such as a network failure — is *indeterminate*. The write may well
 * have happened.
 *
 * `Aborted` and `ResourceExhausted` sit on the indeterminate side on purpose:
 * both describe a request the server was willing to serve and could not finish
 * right now, and both are the classic "retry and it works" cases.
 */
export function isDefiniteFailure(error: unknown): error is ConnectError {
	if (!(error instanceof ConnectError)) return false;
	return DEFINITE_FAILURE_CODES.has(error.code);
}

/**
 * True when the client gave up, not the server — a cancelled query, an
 * unmounted component, a superseded request.
 *
 * These must never reach the user: an aborted request is the app working
 * correctly, and a toast for one is noise that trains people to ignore toasts.
 */
export function isAbortError(error: unknown): boolean {
	if (error instanceof ConnectError) return error.code === Code.Canceled;
	if (error instanceof DOMException) return error.name === "AbortError";
	// `AbortSignal.reason` defaults to a DOMException, but a caller can abort
	// with anything, and fetch in some runtimes rejects with a plain Error.
	return error instanceof Error && error.name === "AbortError";
}

/** True when the session is gone and the app should return to sign-in. */
export function isUnauthenticated(error: unknown): boolean {
	return error instanceof ConnectError && error.code === Code.Unauthenticated;
}

/**
 * The default `retry` predicate for TanStack Query.
 *
 * Retrying a definite failure is pure latency: the server already answered and
 * will answer the same way. Retrying an abort fights the thing that cancelled
 * it. Everything else gets up to `max` attempts.
 */
export function shouldRetry(failureCount: number, error: unknown, max = 2) {
	if (isAbortError(error) || isDefiniteFailure(error)) return false;
	return failureCount < max;
}

/**
 * A message safe to show a user.
 *
 * Deliberately NOT localised here: this package ships no dictionaries, because
 * a component shared across apps cannot know their locales. Pass `fallback`
 * from the call site's i18n — see docs/ux/copy.md.
 *
 * Indeterminate failures get the fallback rather than the server's text
 * precisely because the server did not produce text; whatever `error.message`
 * holds in that case is transport detail ("fetch failed"), which tells a user
 * nothing and looks like a bug.
 */
export function toUserMessage(error: unknown, fallback: string): string {
	if (!isDefiniteFailure(error)) return fallback;
	// Narrowed by `isDefiniteFailure` above — no cast needed.
	const message = error.rawMessage.trim();
	return message.length > 0 ? message : fallback;
}
