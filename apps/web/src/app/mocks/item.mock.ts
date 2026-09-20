import { create } from "@bufbuild/protobuf";
import { timestampNow } from "@bufbuild/protobuf/wkt";
import { Code, ConnectError, type Interceptor } from "@connectrpc/connect";
import { intercept } from "@template/core/api";
import { proto } from "@template/interfaces";

import { buildItems } from "./item.fixtures";
import { respond } from "./respond";

type Item = proto.example_v1.Item;
const { ItemService, ItemSchema, ItemStatus } = proto.example_v1;

/**
 * An in-memory ItemService.
 *
 * It behaves like a server, not like a stub: it filters, paginates, enforces
 * the uniqueness the schema declares, and rejects with the same `Code`s a real
 * backend would. That is what makes the UI built against it — empty states,
 * error toasts, field errors, optimistic rollback — correct on the day it is
 * pointed at a real one.
 */

let store: Item[] = buildItems();

/** Reset between tests. Module state is convenient, and it leaks without this. */
export function resetItemStore(): void {
	store = buildItems();
}

function matches(
	item: Item,
	request: proto.example_v1.ListItemsRequest,
): boolean {
	// UNSPECIFIED means "no filter". Treating it as a real status would make a
	// filter nobody chose exclude everything — the reason the enum reserves a
	// zero value for exactly this.
	if (
		request.status !== ItemStatus.UNSPECIFIED &&
		item.status !== request.status
	) {
		return false;
	}

	if (request.query) {
		const needle = request.query.toLowerCase();
		return (
			item.name.toLowerCase().includes(needle) ||
			item.description.toLowerCase().includes(needle)
		);
	}

	return true;
}

export const itemMocks: Interceptor[] = [
	intercept(
		ItemService.method.listItems,
		respond<
			typeof proto.example_v1.ListItemsRequestSchema,
			typeof proto.example_v1.ListItemsResponseSchema
		>((request) => {
			const filtered = store.filter((item) => matches(item, request));
			const page = Math.max(1, request.page || 1);
			const pageSize = Math.max(1, request.pageSize || 20);
			const start = (page - 1) * pageSize;

			return create(proto.example_v1.ListItemsResponseSchema, {
				items: filtered.slice(start, start + pageSize),
				// The TOTAL after filtering, not the page length. Returning the page
				// length makes the pager think there is always exactly one page.
				total: filtered.length,
			});
		}),
	),

	intercept(
		ItemService.method.getItem,
		respond<
			typeof proto.example_v1.GetItemRequestSchema,
			typeof proto.example_v1.GetItemResponseSchema
		>((request) => {
			const item = store.find((candidate) => candidate.id === request.id);
			if (!item) {
				throw new ConnectError(`No item with id ${request.id}`, Code.NotFound);
			}
			return create(proto.example_v1.GetItemResponseSchema, { item });
		}),
	),

	intercept(
		ItemService.method.createItem,
		respond<
			typeof proto.example_v1.CreateItemRequestSchema,
			typeof proto.example_v1.CreateItemResponseSchema
		>((request) => {
			const name = request.name.trim();

			// `AlreadyExists` with a `field: message` body, which is what
			// `extractFieldErrors` parses back onto the form field. A generic
			// failure here would leave the user guessing which of the fields to
			// change.
			if (
				store.some((item) => item.name.toLowerCase() === name.toLowerCase())
			) {
				throw new ConnectError(
					`name: An item called "${name}" already exists.`,
					Code.AlreadyExists,
				);
			}

			const item = create(ItemSchema, {
				id: `itm_${String(store.length + 1).padStart(4, "0")}`,
				// Note the server NORMALISES: it trims. That is why the client seeds
				// its cache from the response rather than from what it submitted.
				name,
				description: request.description.trim(),
				status: request.status || ItemStatus.DRAFT,
				createdAt: timestampNow(),
				updatedAt: timestampNow(),
			});

			store = [item, ...store];
			return create(proto.example_v1.CreateItemResponseSchema, { item });
		}),
	),

	intercept(
		ItemService.method.updateItem,
		respond<
			typeof proto.example_v1.UpdateItemRequestSchema,
			typeof proto.example_v1.UpdateItemResponseSchema
		>((request) => {
			const index = store.findIndex((item) => item.id === request.id);
			if (index < 0) {
				throw new ConnectError(`No item with id ${request.id}`, Code.NotFound);
			}

			const existing = store[index] as Item;
			const patch = request.item;

			// Honour the field mask. Without it a partial update is
			// indistinguishable from "clear everything else", and two people
			// editing different fields of the same row clobber each other.
			const paths = new Set(request.updateMask?.paths ?? []);
			const take = (path: string) => paths.size === 0 || paths.has(path);

			const updated = create(ItemSchema, {
				...existing,
				name: take("name") && patch ? patch.name : existing.name,
				description:
					take("description") && patch
						? patch.description
						: existing.description,
				status: take("status") && patch ? patch.status : existing.status,
				updatedAt: timestampNow(),
			});

			store = store.with(index, updated);
			return create(proto.example_v1.UpdateItemResponseSchema, {
				item: updated,
			});
		}),
	),

	intercept(
		ItemService.method.deleteItem,
		respond<
			typeof proto.example_v1.DeleteItemRequestSchema,
			typeof proto.example_v1.DeleteItemResponseSchema
		>((request) => {
			const exists = store.some((item) => item.id === request.id);
			if (!exists) {
				throw new ConnectError(`No item with id ${request.id}`, Code.NotFound);
			}
			store = store.filter((item) => item.id !== request.id);
			return create(proto.example_v1.DeleteItemResponseSchema, {});
		}),
	),
];
