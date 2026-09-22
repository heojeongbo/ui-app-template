import type { proto } from "@template/interfaces";

import { statusFromValue } from "@/entities/item";

import { changedPaths, type ItemEditorValues } from "./item-editor.schema";

/**
 * Exactly the copy a submit needs, and nothing else.
 *
 * Declared here rather than reusing `ItemEditorCopy`, which is the *schema's*
 * contract (validation messages). Two modules with different needs get two
 * contracts — that is the `<Name>Copy` discipline in docs/ux/copy.md, and it
 * is what lets a test supply five strings instead of the whole dictionary.
 */
export type SubmitCopy = {
	created: (name: string) => string;
	updated: (name: string) => string;
	createFailed: string;
	updateFailed: string;
	unconfirmed: string;
};

/**
 * Every decision the editor makes about a submit, with none of the doing.
 *
 * Extracted from `item-editor.dialog.tsx`, where it had grown to roughly
 * eighty lines inside an `onSubmit` handler. That is the shape this template
 * exists to prevent and it had it in the one file whose docblock calls itself
 * "the reference implementation of this codebase's mutation contract":
 * **a scenario test never renders**, so a rule living inside a `.tsx` handler
 * is a rule nothing can assert. The no-op guard, the field mask, and the
 * choice of success message were all unreachable.
 *
 * What stayed in the `.tsx` is the part that genuinely needs React and the
 * network: await the mutation, invalidate, toast, close. Ordering is
 * orchestration; everything below is a decision. See docs/page-triad.md.
 */

/** Absent = create. Present = edit. */
type Item = proto.example_v1.Item;

export type SubmitPlan =
	| { kind: "noop" }
	| {
			kind: "create";
			request: {
				name: string;
				description: string;
				status: proto.example_v1.ItemStatus;
			};
	  }
	| {
			kind: "update";
			request: {
				id: string;
				item: Partial<Item>;
				updatePaths: string[];
			};
	  };

/**
 * What this submit should actually do.
 *
 * Three outcomes, and the first one is the reason this is a function rather
 * than an `if` in the handler:
 *
 * - **`noop`** — an edit where nothing changed. Sending it anyway costs a
 *   round trip and produces an "Updated" toast for a change the user did not
 *   make, which teaches them the message means nothing.
 * - **`create`** — no item to edit.
 * - **`update`** — carries `updatePaths`, so the server is told which fields
 *   are meant. Omitting the mask says "this is the whole object", and a form
 *   that only touched `name` would blank `description` for everyone else.
 *
 * `statusFromValue` rather than a cast: the form's `status` is the `<select>`
 * string, and converting it is a lookup against the offered set.
 */
export function planSubmit(
	values: ItemEditorValues,
	initial: ItemEditorValues,
	item?: Item,
): SubmitPlan {
	const status = statusFromValue(values.status);

	if (!item) {
		return {
			kind: "create",
			request: {
				name: values.name,
				description: values.description,
				status,
			},
		};
	}

	const updatePaths = changedPaths(initial, values);
	if (updatePaths.length === 0) return { kind: "noop" };

	return {
		kind: "update",
		request: {
			id: item.id,
			item: {
				name: values.name,
				description: values.description,
				status,
			},
			updatePaths,
		},
	};
}

/**
 * The success message, and which name it names.
 *
 * **The server's value wins.** It normalises what it stores — this one trims —
 * so echoing the submitted name can announce a name the row does not actually
 * have. The submitted value is only a fallback for a server that returns
 * nothing.
 *
 * Here rather than inline because "report what was stored, not what was sent"
 * is a rule worth asserting, and a ternary inside a `toast.success(...)` call
 * is a rule nothing can reach.
 */
export function successMessage(
	copy: SubmitCopy,
	kind: "create" | "update",
	saved: Item | undefined,
	submittedName: string,
): string {
	const name = saved?.name ?? submittedName;
	return kind === "update" ? copy.updated(name) : copy.created(name);
}

/**
 * Which failure copy a submit should use if the error is not field-level.
 *
 * Paired here so the two halves cannot drift: a create that fails must not
 * report "Could not update", and the indeterminate message is deliberately
 * the same for both — "we could not confirm" is true regardless of which verb
 * was attempted.
 */
export function failureCopy(
	copy: SubmitCopy,
	kind: "create" | "update",
): { definite: string; indeterminate: string } {
	return {
		definite: kind === "update" ? copy.updateFailed : copy.createFailed,
		indeterminate: copy.unconfirmed,
	};
}
