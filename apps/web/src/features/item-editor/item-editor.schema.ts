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
		status: String(defaultStatus(item?.status)),
	};
}

/**
 * The status a form should start on, for any status the server might send.
 *
 * Extracted because the obvious one-liner is wrong in a way that reads as
 * correct: `item?.status ?? ItemStatus.DRAFT` cannot fire for the one value it
 * looks like it handles. `??` is nullish-only, and `UNSPECIFIED` is `0` — so
 * `0 ?? DRAFT` is `0`, the defaults carry `status: "0"`, and `"0"` is not in
 * `SELECTABLE_STATUSES` (`["1","2","3"]`). The select renders with nothing
 * chosen and the form is invalid on a field the user never touched.
 *
 * Two ways in, neither exotic. A proto3 scalar field is absent on the wire
 * when it holds the zero value, so any server that has not set a status sends
 * one that decodes to `UNSPECIFIED`. And proto3 enums are OPEN: a server that
 * adds a status this build has never heard of decodes to that raw number,
 * which is equally absent from the selectable set.
 *
 * The invariant worth carrying past this demo: **a form default must be a
 * member of the set the control offers.** Anything outside it — the zero
 * value, a newer server's value — resolves to a real option here rather than
 * reaching the schema.
 */
function defaultStatus(status: proto.example_v1.ItemStatus | undefined) {
	const selectable: readonly number[] = SELECTABLE_STATUSES;
	return status !== undefined && selectable.includes(status)
		? status
		: proto.example_v1.ItemStatus.DRAFT;
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
