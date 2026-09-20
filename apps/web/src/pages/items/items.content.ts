import type { StatusFilter } from "@/entities/item";

/**
 * Everything this screen says.
 *
 * Note the two different empty states. They are not a nicety: a user looking
 * at "No items yet" needs a create button, and a user looking at "Nothing
 * matches" needs a clear-filters button. One message for both sends half of
 * them to the wrong action.
 */
export const itemsContent = {
	title: "Items",
	description: "Everything in the catalogue.",

	create: "New item",
	edit: "Edit",
	delete: "Delete",

	searchPlaceholder: "Search items",
	statusLabel: "Status",
	statusOptions: {
		all: "All statuses",
		draft: "Draft",
		active: "Active",
		archived: "Archived",
	} satisfies Record<StatusFilter, string>,

	// Interpolating entries are functions, so a translation can reorder the
	// numbers. String concatenation at the call site cannot.
	range: (from: number, to: number, total: number) =>
		`${from}–${to} of ${total}`,
	page: (current: number, last: number) => `Page ${current} of ${last}`,
	previous: "Previous",
	next: "Next",

	emptyTitle: "No items yet",
	emptyDescription: "Create the first one to get started.",
	emptyFilteredTitle: "No items match these filters",
	emptyFilteredDescription: "Try a different status, or clear the search.",
	clearFilters: "Clear filters",

	refreshing: "Refreshing…",

	// --- mutation outcomes -------------------------------------------------
	// Each says what is true RIGHT NOW, and never claims a failure when the
	// answer was merely lost. See docs/ux/copy.md.
	created: (name: string) => `Created “${name}”.`,
	updated: (name: string) => `Updated “${name}”.`,
	deleted: (name: string) => `Deleted “${name}”.`,
	undo: "Undo",
	restored: (name: string) => `Restored “${name}”.`,

	createFailed: "Could not create the item.",
	updateFailed: "Could not update the item.",
	deleteFailed: "Could not delete the item.",
	// Indeterminate: the write may have landed.
	unconfirmed:
		"Could not confirm the change. Refresh to see the current state.",
	nothingChanged: "Nothing changed.",

	confirmDeleteTitle: "Delete this item?",
	confirmDeleteBody: (name: string) =>
		`“${name}” will be removed. This cannot be undone from here.`,
	confirmDelete: "Delete",
	cancel: "Cancel",
} as const;

export type ItemsContent = typeof itemsContent;
