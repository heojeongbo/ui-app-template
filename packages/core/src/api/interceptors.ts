import type { Interceptor } from "@connectrpc/connect";

import { createScopedLogger } from "../logger";
import { isAbortError, isUnauthenticated } from "./errors";

const log = createScopedLogger("Api");

/**
 * Logs every RPC rejection and **returns the call unchanged**.
 *
 * That last part is the whole contract. An interceptor that swallows a
 * rejection to log it takes the error away from the error boundary, from
 * TanStack Query's retry logic, and from the call site's `catch` — the screen
 * then shows a spinner forever and nobody is told why.
 *
 * Note what this does NOT do: toast. Logging is for whoever is reading a
 * console; telling the *user* something went wrong is a decision only the call
 * site can make, because only it knows whether the failure is visible in the
 * UI already. See docs/ux/mutations.md.
 */
export function loggingInterceptor(): Interceptor {
	return (next) => async (req) => {
		const started = performance.now();
		try {
			return await next(req);
		} catch (error) {
			const ms = Math.round(performance.now() - started);

			// An aborted request is the app working correctly — a cancelled query,
			// an unmounted component. Logging it at error level trains people to
			// ignore the error channel.
			if (isAbortError(error)) {
				log.debug(`${req.method.name} aborted`, { ms });
			} else {
				log.error(`${req.method.name} failed`, { ms }, error);
			}

			throw error;
		}
	};
}

/**
 * Handles an expired session, once, centrally.
 *
 * `onUnauthenticated` is injected rather than reached for: the alternative —
 * importing the auth store and the router from here — makes this module
 * impossible to test and couples the transport to the app's navigation.
 *
 * `PermissionDenied` is deliberately NOT handled globally. The user is signed
 * in and simply may not do this thing; bouncing them to sign-in would be both
 * wrong and confusing. That stays a call-site concern.
 */
export function authInterceptor(onUnauthenticated: () => void): Interceptor {
	return (next) => async (req) => {
		try {
			return await next(req);
		} catch (error) {
			if (isUnauthenticated(error)) {
				log.warn(`${req.method.name} unauthenticated — signing out`);
				onUnauthenticated();
			}
			throw error;
		}
	};
}

/**
 * Run `handler` for one specific RPC and pass everything else through.
 *
 * This is the seam that makes a dev mock tractable: a single endpoint can be
 * answered locally while the rest of the app talks to a real server, and
 * deleting the entry is the entire "swap to the real thing" step.
 *
 * `method` is the generated method descriptor, so a renamed RPC is a compile
 * error rather than a mock that silently stops matching.
 */
export function intercept(
	method: { name: string; parent: { typeName: string } },
	handler: Interceptor,
): Interceptor {
	const target = `${method.parent.typeName}/${method.name}`;
	return (next) => async (req) => {
		const current = `${req.method.parent.typeName}/${req.method.name}`;
		if (current !== target) return next(req);
		return handler(next)(req);
	};
}

/**
 * Compose per-RPC handlers into one interceptor.
 *
 * Use this and not a bare spread of raw handlers. An unwrapped handler answers
 * EVERY rpc — it has no idea which method it was registered for — and it still
 * type-checks, so the mistake surfaces as unrelated endpoints returning the
 * wrong shape at runtime. Wrapping each with `intercept()` first is what makes
 * the composition safe.
 */
export function mergeInterceptors(
	interceptors: readonly Interceptor[],
): Interceptor[] {
	return [...interceptors];
}
