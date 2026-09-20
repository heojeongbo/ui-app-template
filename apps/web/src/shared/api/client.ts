import type { DescService } from "@bufbuild/protobuf";
import { type Client, createClient } from "@connectrpc/connect";

import { getTransport } from "./transport";

const cache = new Map<string, unknown>();

/**
 * A typed client for a service, built against the configured transport.
 *
 * Call this INSIDE a `queryFn` or a mutation, not at module scope. Module
 * scope would build the client while the module graph is still evaluating —
 * before `app` has called `configureTransport` — and freeze an unconfigured
 * transport into every request.
 *
 * Memoised per service because `createClient` walks every method on the
 * descriptor and closes over each one; rebuilding that on every keystroke of a
 * filtered list is real work for no benefit.
 */
export function getClient<T extends DescService>(service: T): Client<T> {
	const existing = cache.get(service.typeName);
	if (existing) return existing as Client<T>;

	const client = createClient(service, getTransport());
	cache.set(service.typeName, client);
	return client;
}

/**
 * Forget every memoised client.
 *
 * Called by `configureTransport`, because a cached client holds the transport
 * it was built with — without this, reconfiguring would have no effect on
 * anything already created.
 */
export function resetClients(): void {
	cache.clear();
}
