import { Code, ConnectError } from "@connectrpc/connect";
import { queryOptions } from "@tanstack/react-query";
import { proto } from "@template/interfaces";

import { getClient } from "@/shared/api";

/**
 * Resolved per call, not at module scope: the transport is configured by `app`
 * at startup, and a client built while this module is still evaluating would
 * capture an unconfigured one. `getClient` memoises, so this is a map lookup.
 */
const client = () => getClient(proto.example_v1.ItemService);

export type ItemListParams = {
	page: number;
	pageSize: number;
	status: proto.example_v1.ItemStatus;
	query?: string;
};

/**
 * Query keys and options, defined once.
 *
 * The key is a hierarchy — `["item"]` → `["item","list"]` → `["item","list",
 * params]` — so invalidation can target a level:
 *
 *     invalidate(itemQueries.lists())       // every list, any filter
 *     invalidate(itemQueries.detail(id))    // one row
 *     invalidate(itemQueries.all())         // everything item-shaped
 *
 * Each factory returns the `queryOptions` object itself, which means ONE
 * definition serves both reading and invalidating:
 *
 *     useSuspenseQuery(itemQueries.list(params))
 *     await invalidate(itemQueries.list(params))
 *
 * Two separate definitions — a key here and options there — is how a read and
 * its invalidation drift until a mutation stops refreshing the screen.
 */
export const itemQueries = {
	all: () => ["item"] as const,

	lists: () => [...itemQueries.all(), "list"] as const,
	list: (params: ItemListParams) =>
		queryOptions({
			queryKey: [...itemQueries.lists(), params] as const,
			queryFn: async ({ signal }) => {
				const response = await client().listItems(
					{
						page: params.page,
						pageSize: params.pageSize,
						status: params.status,
						query: params.query ?? "",
					},
					// Thread the signal TanStack hands us. Without it a superseded
					// request keeps running and its response can land after the one
					// that replaced it.
					{ signal },
				);
				return response;
			},
		}),

	details: () => [...itemQueries.all(), "detail"] as const,
	detail: (id: string) =>
		queryOptions({
			queryKey: [...itemQueries.details(), id] as const,
			queryFn: async ({ signal }) => {
				const response = await client().getItem({ id }, { signal });

				// Not defensive padding. `GetItemResponse.item` is a proto3
				// message field, so it is ALWAYS optional on the wire regardless
				// of what the service means — `response.item` is `Item |
				// undefined` and a server that answers OK with an empty body
				// type-checks fine.
				//
				// Returning it unguarded hands `undefined` to TanStack Query,
				// which refuses it: "Query data cannot be undefined." That error
				// names the query key and nothing else, so the screen shows a
				// generic failure for what is really a missing row.
				//
				// Raised as `NotFound` so it flows through the same taxonomy as a
				// server-sent one — `isDefiniteFailure` classifies it, and the
				// caller's not-found branch handles both without a special case.
				if (!response.item) {
					throw new ConnectError(`item ${id} not found`, Code.NotFound);
				}

				return response.item;
			},
			// A detail page with no id is a bug in the caller, not a request to
			// fetch everything. Disabling beats sending `GET /items/undefined`.
			enabled: id.length > 0,
		}),
};

export { client as itemClient };
