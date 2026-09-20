import { useInvalidateQuery } from "@template/core/query";
import type { proto } from "@template/interfaces";
import { useState } from "react";
import { toast } from "sonner";

import { itemQueries, useCreateItem, useDeleteItem } from "@/entities/item";
import { confirm } from "@/shared/lib/confirm";
import { toastMutationError } from "@/shared/lib/toast";

import { itemsContent } from "./items.content";

/**
 * Delete, with a confirmation and an undo.
 *
 * Both halves matter and they are not redundant:
 *
 * - **Confirm** stops the accident before it happens. Destructive, so the
 *   affirmative button is destructive-styled and named "Delete" rather than
 *   "OK" — a user skimming should be able to tell the two buttons apart
 *   without reading the body.
 * - **Undo** handles the accident that happened anyway. A confirmation
 *   dialog's real-world hit rate is poor: people click through them. The undo
 *   toast is what actually saves the row.
 *
 * The undo here RECREATES rather than restoring, because the service has no
 * restore RPC — which means the new row has a new id, and anything holding
 * the old one (a detail route, an open dialog) will not find it. That is
 * stated in the toast's own copy rather than hidden. A real backend should
 * offer a soft delete; see docs/ux/mutations.md.
 */
export function useItemActions() {
	const del = useDeleteItem();
	const create = useCreateItem();
	const invalidate = useInvalidateQuery();

	// One piece of state, not a boolean per row: it names WHICH row is acting
	// so that row can show a spinner while its peers disable.
	const [pendingId, setPendingId] = useState<string | null>(null);

	const remove = async (item: proto.example_v1.Item) => {
		const ok = await confirm({
			title: itemsContent.confirmDeleteTitle,
			body: itemsContent.confirmDeleteBody(item.name),
			confirmLabel: itemsContent.confirmDelete,
			cancelLabel: itemsContent.cancel,
			destructive: true,
		});
		if (!ok) return;

		setPendingId(item.id);
		try {
			await del.mutateAsync({ id: item.id });
			await invalidate(itemQueries.lists());

			toast.success(itemsContent.deleted(item.name), {
				action: {
					label: itemsContent.undo,
					onClick: () => {
						void restore(item);
					},
				},
			});
		} catch (error) {
			toastMutationError(error, {
				definite: itemsContent.deleteFailed,
				indeterminate: itemsContent.unconfirmed,
			});
		} finally {
			// `finally`, so a failure does not leave the whole table disabled.
			setPendingId(null);
		}
	};

	const restore = async (item: proto.example_v1.Item) => {
		try {
			await create.mutateAsync({
				name: item.name,
				description: item.description,
				status: item.status,
			});
			await invalidate(itemQueries.lists());
			toast.success(itemsContent.restored(item.name));
		} catch (error) {
			// An undo that fails silently is worse than no undo: the user believes
			// the row is back.
			toastMutationError(error, {
				definite: itemsContent.restoreFailed,
				indeterminate: itemsContent.unconfirmed,
			});
		}
	};

	return { pendingId, remove };
}
