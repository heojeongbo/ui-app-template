import { formOptions } from "@template/design/ui/form";
import { proto } from "@template/interfaces";
import { z } from "zod";

import { SELECTABLE_STATUSES } from "@/entities/item";

export type ItemEditorCopy = {
	nameRequired: string;
	nameTooLong: string;
	descriptionTooLong: string;
};

/**
 * `satisfies z.ZodType<…>` pins the form's shape against the generated request
 * type.
 *
 * Without it the two drift silently: someone renames a proto field, the form
 * keeps submitting the old name, and the server quietly receives an empty
 * string for the new one. With it, regenerating the proto turns that into a
 * compile error in this file.
 */
export function itemEditorSchema(copy: ItemEditorCopy) {
	return z.object({
		name: z
			.string()
			.trim()
			.min(1, copy.nameRequired)
			.max(120, copy.nameTooLong),
		description: z.string().trim().max(2000, copy.descriptionTooLong),
		status: z.enum(SELECTABLE_STATUSES.map(String) as [string, ...string[]]),
	});
}

export type ItemEditorValues = z.infer<ReturnType<typeof itemEditorSchema>>;

/**
 * The values a form starts from.
 *
 * For an edit, these come from the row the user clicked — NOT from a fresh
 * fetch. Refetching on open makes the dialog flash empty, and the list already
 * holds the data.
 */
export function itemEditorDefaults(
	item?: proto.example_v1.Item,
): ItemEditorValues {
	return {
		name: item?.name ?? "",
		description: item?.description ?? "",
		status: String(item?.status ?? proto.example_v1.ItemStatus.DRAFT),
	};
}

export function itemEditorFormOptions(
	copy: ItemEditorCopy,
	item?: proto.example_v1.Item,
) {
	return formOptions({
		defaultValues: itemEditorDefaults(item),
		validators: {
			// onSubmit, not onChange. Validating as the user types tells them the
			// name is required before they have finished typing it.
			onSubmit: itemEditorSchema(copy),
		},
	});
}

/**
 * Which fields actually changed.
 *
 * Two things depend on this:
 *
 * 1. **The update mask.** Sending every field says "this is the whole object",
 *    so two people editing different fields of the same row clobber each
 *    other. Sending only what changed means they do not.
 * 2. **The no-op guard.** A save that changes nothing should not fire a
 *    request; the call site turns an empty result into "Nothing changed" and
 *    closes.
 */
export function changedPaths(
	before: ItemEditorValues,
	after: ItemEditorValues,
): string[] {
	return (Object.keys(after) as (keyof ItemEditorValues)[]).filter(
		(key) => before[key] !== after[key],
	);
}
