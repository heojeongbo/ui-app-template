import type { Interceptor, Transport } from "@connectrpc/connect";
import {
	createConnectTransport,
	createGrpcWebTransport,
} from "@connectrpc/connect-web";

import { authInterceptor, loggingInterceptor } from "./interceptors";

export type TransportProtocol = "connect" | "grpc-web";

export type CreateTransportOptions = {
	/**
	 * Where the RPCs go. Default `/api`, i.e. same-origin — which is what makes
	 * a session cookie flow without CORS, and what the dev-server proxy exists
	 * to preserve.
	 */
	baseUrl?: string;

	/**
	 * `connect` by default: it speaks JSON, so a failing call is readable in the
	 * DevTools network tab instead of being an opaque binary frame. Choose
	 * `grpc-web` when a gateway in front of the service requires it.
	 */
	protocol?: TransportProtocol;

	/**
	 * Called when the server reports the session is gone. Injected rather than
	 * imported so this module stays free of the auth store and the router —
	 * see `authInterceptor`.
	 */
	onUnauthenticated?: () => void;

	/**
	 * Extra interceptors, applied AFTER the built-ins.
	 *
	 * Order is explicit and fixed: `[...builtins, ...extra]`. Mutating the array
	 * after the transport is constructed — which is how the codebase this
	 * derives from injected its dev mocks — makes the effective order depend on
	 * module evaluation order, and the resulting bug looks like an interceptor
	 * that "sometimes" runs.
	 */
	interceptors?: readonly Interceptor[];

	/** Escape hatch for tests: swap the fetch implementation. */
	fetch?: typeof globalThis.fetch;
};

/**
 * Build the app's Connect transport.
 *
 * One factory, so the interceptor chain and credentials policy cannot differ
 * between the app, its tests, and its mocks.
 */
export function createTransport({
	baseUrl = "/api",
	protocol = "connect",
	onUnauthenticated,
	interceptors = [],
	fetch: fetchImpl,
}: CreateTransportOptions = {}): Transport {
	const chain: Interceptor[] = [
		loggingInterceptor(),
		...(onUnauthenticated ? [authInterceptor(onUnauthenticated)] : []),
		...interceptors,
	];

	const options = {
		baseUrl,
		interceptors: chain,
		// Send cookies. An HttpOnly session cookie is the default auth mechanism
		// here precisely because it cannot be read by script; that also means
		// there is no Authorization header to attach, and omitting this makes
		// every request anonymous with no visible error.
		fetch: (input: RequestInfo | URL, init?: RequestInit) =>
			(fetchImpl ?? globalThis.fetch)(input, {
				...init,
				credentials: "include",
			}),
	};

	return protocol === "grpc-web"
		? createGrpcWebTransport(options)
		: createConnectTransport(options);
}
