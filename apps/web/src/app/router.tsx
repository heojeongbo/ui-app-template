import type { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";

import type { Session } from "@/entities/session";
import { routeTree } from "@/routeTree.gen";
import { RouteError } from "@/shared/ui/route-error";
import { RouteNotFound } from "@/shared/ui/route-not-found";
import { RoutePending } from "@/shared/ui/route-pending";

/**
 * What every route's `beforeLoad` and `loader` can reach.
 *
 * `queryClient` lives here so a loader can prefetch with `ensureQueryData` —
 * that is what makes a page's data start loading while the route is still
 * resolving, instead of after its component mounts.
 *
 * `session` is supplied at RENDER time, not at router creation
 * (`<RouterProvider context={{ session }} />`), so that signing in or out
 * re-runs every guard without rebuilding the router.
 */
export type RouterContext = {
	queryClient: QueryClient;
	session: Session | null;
};

export function createAppRouter(queryClient: QueryClient) {
	return createRouter({
		routeTree,

		// `session` is filled in by RouterProvider; `queryClient` never changes.
		context: { queryClient, session: null },

		// Start loading on hover/focus. The single highest-impact perceived-speed
		// setting in the router, and it is free because `staleTime` stops it
		// re-fetching what the cache already has.
		defaultPreload: "intent",
		// Let the query cache decide freshness rather than having the router keep
		// a second, shorter-lived opinion about it.
		defaultPreloadStaleTime: 0,

		scrollRestoration: true,
		// Keeps object identity stable across navigations, so a component reading
		// search params does not re-render because a new-but-equal object arrived.
		defaultStructuralSharing: true,

		defaultPendingComponent: RoutePending,
		defaultErrorComponent: RouteError,
		defaultNotFoundComponent: RouteNotFound,

		// Don't flash a spinner for a load that resolves in 200ms, and if one
		// does appear, leave it up long enough to read. Without the pair, a
		// fast-but-not-instant navigation flickers.
		defaultPendingMs: 300,
		defaultPendingMinMs: 500,
	});
}

/**
 * Teaches every `Link`, `navigate` and `redirect` in the app about this route
 * tree. Without it they fall back to `string` paths and a typo'd route is a
 * runtime 404 instead of a compile error.
 */
declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createAppRouter>;
	}
}
