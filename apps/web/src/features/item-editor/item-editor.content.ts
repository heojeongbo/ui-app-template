import type { StatusDisplayKey } from "@/entities/item";

/**
 * Copy for the editor.
 *
 * The failure messages follow the tone rules in docs/ux/copy.md: a definite
 * refusal says what happened, an indeterminate one never claims the write
 * failed, because it may well have landed.
 */
export const itemEditorContent = {
	createTitle: "New item",
	createDescription: "Add an item to the catalogue.",
	editTitle: "Edit item",
	editDescription: "Change this item's details.",

	nameLabel: "Name",
	descriptionLabel: "Description",
	statusLabel: "Status",
	// No `all` entry: the editor picks ONE status, it does not filter. The dead
	// entry that used to be here is what made an unlabelled status render
	// cleanly as "All statuses" instead of showing up as undefined.
	statusOptions: {
		draft: "Draft",
		active: "Active",
		archived: "Archived",
		unknown: "Unknown",
	} satisfies Record<StatusDisplayKey, string>,

	create: "Create",
	save: "Save",
	cancel: "Cancel",

	// Fed to zod, so plain strings.
	nameRequired: "Enter a name.",
	nameTooLong: "Keep the name under 120 characters.",
	descriptionTooLong: "Keep the description under 2000 characters.",

	created: (name: string) => `Created “${name}”.`,
	updated: (name: string) => `Updated “${name}”.`,
	nothingChanged: "Nothing changed.",

	createFailed: "Could not create the item.",
	updateFailed: "Could not update the item.",
	// The write may have landed — say what is true, not what is convenient.
	unconfirmed:
		"Could not confirm the change. Refresh to see the current state.",
} as const;
