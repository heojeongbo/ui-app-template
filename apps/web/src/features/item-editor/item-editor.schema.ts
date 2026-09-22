import { formOptions } from "@template/design/ui/form";
import type { proto } from "@template/interfaces";
import { z } from "zod";

import {
	defaultSelectableStatus,
	STATUS_VALUES,
	statusToValue,
} from "@/entities/item";

export type ItemEditorCopy = {
	nameRequired: string;
	nameTooLong: string;
	descriptionTooLong: string;
};

/**
 * The form shape is deliberately NOT the request shape.
 *
 * `status` crosses as a string because a `<select>` has no other kind of
 * value; it is converted back at the dialog's submit. So there is no
 * `satisfies z.ZodType<CreateItemRequest>` here and there cannot be one.
 *
 * What actually guards against proto drift is one line down: `itemEditorDefaults`
 * takes a generated `Item` and is annotated `: ItemEditorValues`, so a renamed
 * or retyped field is a compile error in this file. An ADDED required field is
 * not — that one is caught by the mutation's input type, which is derived from
 * the generated request rather than hand-written.
 */
export function itemEditorSchema(copy: ItemEditorCopy) {
	return z.object({
		name: z
			.string()
			.trim()
			.min(1, copy.nameRequired)
			.max(120, copy.nameTooLong),
		description: z.string().trim().max(2000, copy.descriptionTooLong),
		// `STATUS_VALUES` rather than `SELECTABLE_STATUSES.map(String) as
		// [string, ...string[]]`, which is what used to be here and is the
		// reason this comment exists.
		//
		// `z.enum` infers its output as `T[number]` (zod 4
		// v4/classic/schemas.d.ts:610), so a tuple cast to `[string,
		// ...string[]]` makes `T[number]` plain `string`. The runtime check
		// still only accepted "1" | "2" | "3" — but every consumer was handed a
		// `string`, and the dialog had to cast its way back with
		// `Number(value.status) as ItemStatus`, which is unchecked in exactly
		// the direction that matters.
		status: z.enum(STATUS_VALUES),
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
		// Two named steps rather than `String(item?.status ?? DRAFT)`.
		//
		// `defaultSelectableStatus` holds the invariant worth carrying past this
		// demo — **a form default must be a member of the set the control
		// offers** — and `statusToValue` is the only place the DOM's
		// string-shaped world is re-entered. Neither is inlineable without
		// giving up the type: `String()` returns `string`, and `ItemEditorValues
		// ["status"]` is now the union the schema actually accepts.
		status: statusToValue(defaultSelectableStatus(item?.status)),
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
