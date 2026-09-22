import { createFileRoute, stripSearchParams } from "@tanstack/react-router";

import { itemQueries } from "@/entities/item";
import {
	ITEMS_SEARCH_DEFAULTS,
	ItemsPage,
	itemsListParams,
	itemsSearchSchema,
} from "@/pages/items";

/**
 * The route file stays thin: path, guard, search, loader, component.
 *
 * The search SCHEMA lives with the screen (`pages/items/items.search.ts`) and
 * is imported here, rather than being declared here and described again as a
 * hand-written type over there. That split is what let the two drift — see
 * the note in items.search.ts. Routes already depend on pages, so importing
 * this way keeps the FSD direction intact.
 */
export const Route = createFileRoute("/(auth)/(shell)/items/")({
	validateSearch: itemsSearchSchema,

	// Keeps `?page=1&pageSize=20&status=all` out of the URL. Without it every
	// link carries the defaults, the address bar is unreadable, and two URLs
	// that mean the same thing look different in history and analytics.
	search: { middlewares: [stripSearchParams(ITEMS_SEARCH_DEFAULTS)] },

	// Exactly what the query keys on — narrow by construction, so an unrelated
	// search param changing cannot re-run the loader. Sharing the function with
	// the page is what stops the two from priming and reading different cache
	// entries.
	loaderDeps: ({ search }) => itemsListParams(search),

	// The data starts loading while the route is still resolving, rather than
	// after the component mounts. Combined with `defaultPreload: "intent"`, a
	// hovered link has usually finished fetching before it is clicked.
	//
	// `ensureQueryData` and not `fetchQuery`: it reuses a fresh cache entry
	// instead of re-fetching, so navigating back to a list is instant.
	loader: ({ context, deps }) =>
		context.queryClient.ensureQueryData(itemQueries.list(deps)),

	component: ItemsPage,
});
