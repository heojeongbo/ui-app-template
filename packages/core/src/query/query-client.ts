import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";

import { shouldRetry } from "../api/errors";

/**
 * The single sanctioned way to build a QueryClient.
 *
 * Two failure modes this shape exists to prevent, both observed in the
 * codebase it derives from:
 *
 * 1. **Apps bypassing the factory.** Three of four apps there constructed a
 *    bare `new QueryClient()` and silently ran on different defaults from the
 *    one that used the factory. One exported factory, used everywhere, is the
 *    whole fix.
 *
 * 2. **An override replacing the defaults instead of extending them.** The
 *    original spelled it `config ?? DEFAULTS`, so an app that wanted to change
 *    `staleTime` lost `retry` and `networkMode` without any signal. The merge
 *    below is per-section for exactly that reason.
 */

export const DEFAULT_QUERY_OPTIONS = {
	/**
	 * A minute. Long enough that navigating back to a list does not refetch it,
	 * short enough that a stale screen corrects itself without a reload.
	 * Per-query overrides are expected; this is the floor, not a policy.
	 */
	staleTime: 60_000,

	/**
	 * NOT TanStack's default of `"online"`.
	 *
	 * In `"online"` mode a request is *paused* rather than attempted whenever
	 * the browser believes it is offline — and `navigator.onLine` is a guess
	 * that is wrong on captive portals, VPNs, and any desktop webview. A paused
	 * mutation never settles, so `await mutateAsync(...)` never returns: the
	 * spinner runs forever, no toast fires, and the dialog cannot be closed.
	 *
	 * Letting the request fail honestly and surfacing the error is strictly
	 * better than a UI that hangs. See query-client.test.ts.
	 */
	networkMode: "always",

	/**
	 * Retries only what a retry could plausibly fix — see `shouldRetry`.
	 * TanStack's stock `retry: 3` re-sends validation failures three times,
	 * which just delays the message the user needs to read.
	 */
	retry: (failureCount: number, error: unknown) =>
		shouldRetry(failureCount, error),

	/**
	 * Off. Refetching everything whenever the user alt-tabs back is a surprise
	 * cost on a data-dense screen; `staleTime` plus explicit invalidation after
	 * mutations already keeps the cache honest.
	 */
	refetchOnWindowFocus: false,
} as const;

export const DEFAULT_MUTATION_OPTIONS = {
	/** Same reasoning as queries, and the consequence is worse: see above. */
	networkMode: "always",
	/**
	 * Mutations are not assumed idempotent. Re-sending a create that may have
	 * landed is how duplicates appear — the call site decides, per mutation.
	 */
	retry: false,
} as const;

/**
 * Build the app's QueryClient.
 *
 * `overrides` are merged per-section, so passing `{ queries: { staleTime: 0 } }`
 * keeps `retry`, `networkMode` and `refetchOnWindowFocus` intact.
 */
export function createQueryClient(overrides?: QueryClientConfig): QueryClient {
	return new QueryClient({
		...overrides,
		defaultOptions: {
			...overrides?.defaultOptions,
			queries: {
				...DEFAULT_QUERY_OPTIONS,
				...overrides?.defaultOptions?.queries,
			},
			mutations: {
				...DEFAULT_MUTATION_OPTIONS,
				...overrides?.defaultOptions?.mutations,
			},
		},
	});
}
