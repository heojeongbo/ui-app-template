import type { Interceptor, Transport } from "@connectrpc/connect";
import { createTransport } from "@template/core/api";
import { env } from "@template/core/config";

import { resetClients } from "./client";

export type TransportConfig = {
	/**
	 * What to do when the server says the session is gone. Supplied by `app`,
	 * because only it knows about the session store and the router.
	 */
	onUnauthenticated?: () => void;
	/** Dev-only RPC mocks, composed by `app`. */
	interceptors?: readonly Interceptor[];
};

let config: TransportConfig = {};
let instance: Transport | undefined;

/**
 * The transport, built lazily on first use.
 *
 * **Why lazy.** The transport needs two things only the `app` layer knows —
 * how to sign out, and which RPCs are mocked — but every entity's `api`
 * segment needs the transport, and `shared` importing from `app` is the FSD
 * direction reversed.
 * (Steiger catches it; the reason it is a rule is that anything `app` owns can
 * reach the router and the session, and an entity that can do that stops being
 * reusable.)
 *
 * Deferring construction inverts the dependency: `app` calls
 * `configureTransport` at startup, and the first actual RPC — which happens
 * after render, in a `queryFn` or a loader — builds it. There is no window in
 * which an unconfigured transport can be used.
 *
 * It also replaces the trick of mutating the interceptor array after the
 * transport exists. That makes the effective chain depend on module evaluation
 * order, and the resulting bug looks like an interceptor that "sometimes" runs.
 */
export function configureTransport(next: TransportConfig): void {
	config = next;
	// Drop the built instance so the next call picks up the new chain. Without
	// this, calling configure twice (a test, a hot reload) silently keeps the
	// first configuration.
	instance = undefined;
	// A memoised client holds the transport it was built with, so dropping the
	// instance alone would leave every existing client on the old chain.
	resetClients();
}

export function getTransport(): Transport {
	instance ??= createTransport({
		baseUrl: env.VITE_API_BASE_URL,
		protocol: env.VITE_API_PROTOCOL,
		onUnauthenticated: config.onUnauthenticated,
		interceptors: config.interceptors ?? [],
	});
	return instance;
}
