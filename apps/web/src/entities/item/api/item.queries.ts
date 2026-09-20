import { createClient } from "@connectrpc/connect";
import { queryOptions } from "@tanstack/react-query";
import { proto } from "@template/interfaces";

import { transport } from "@/app/providers/transport";

const client = createClient(proto.example_v1.ItemService, transport);

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
				const response = await client.listItems(
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
				const response = await client.getItem({ id }, { signal });
				return response.item;
			},
			// A detail page with no id is a bug in the caller, not a request to
			// fetch everything. Disabling beats sending `GET /items/undefined`.
			enabled: id.length > 0,
		}),
};

export { client as itemClient };
