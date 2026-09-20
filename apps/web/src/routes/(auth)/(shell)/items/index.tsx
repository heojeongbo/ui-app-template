import { createFileRoute, stripSearchParams } from "@tanstack/react-router";
import { z } from "zod";

import { itemQueries, STATUS_FILTERS } from "@/entities/item";
import { ItemsPage, itemsListParams } from "@/pages/items";
import { paginationSearchSchema, querySearchSchema } from "@/shared/lib/search";

const DEFAULTS = { page: 1, pageSize: 20, status: "all" } as const;

/**
 * The URL is the state.
 *
 * Every filter lives in the search params, so a filtered view is
 * bookmarkable, shareable, and survives a reload — and the page component
 * needs no state of its own.
 *
 * `.partial()` is deliberately NOT applied: every key has a `.default()`, so
 * the parsed result is always complete and a `<Link to="/items">` with no
 * search still type-checks. Without defaults it would have to supply all four.
 */
const itemsSearchSchema = z.object({
	...paginationSearchSchema(20),
	...querySearchSchema(),
	status: z.enum(STATUS_FILTERS).catch("all").default("all"),
});

export const Route = createFileRoute("/(auth)/(shell)/items/")({
	validateSearch: itemsSearchSchema,

	// Keeps `?page=1&pageSize=20&status=all` out of the URL. Without it every
	// link carries the defaults, the address bar is unreadable, and two URLs
	// that mean the same thing look different in history and analytics.
	search: { middlewares: [stripSearchParams(DEFAULTS)] },

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
