import { useMutation } from "@tanstack/react-query";
import type { proto } from "@template/interfaces";

import { itemClient } from "./item.queries";

/**
 * Mutation hooks. Transport and nothing else.
 *
 * **No toast. No invalidation. No navigation.** Those live at the call site —
 * see docs/ux/mutations.md — and the reason is reuse: the moment a hook
 * invalidates on its own, a second caller that needs different cache effects
 * has to either fight it or copy it. Keeping these thin is what lets the list
 * page and a detail page share one mutation and refresh different things.
 *
 * They also do not catch. A hook that swallows a rejection to log it leaves
 * the call site unable to tell the user anything, which is how a failed save
 * looks like a successful one.
 */

export function useCreateItem() {
	return useMutation({
		mutationFn: (input: {
			name: string;
			description: string;
			status: proto.example_v1.ItemStatus;
		}) => itemClient().createItem(input),
	});
}

export function useUpdateItem() {
	return useMutation({
		mutationFn: (input: {
			id: string;
			item: Partial<proto.example_v1.Item>;
			/**
			 * Which fields the caller actually means to change. Omitting the mask
			 * tells the server "this is the whole object", so a form that only
			 * edits `name` would blank out `description` for everyone else.
			 */
			updatePaths: string[];
		}) =>
			itemClient().updateItem({
				id: input.id,
				item: input.item as proto.example_v1.Item,
				updateMask: { paths: input.updatePaths },
			}),
	});
}

export function useDeleteItem() {
	return useMutation({
		mutationFn: (input: { id: string }) => itemClient().deleteItem(input),
	});
}
