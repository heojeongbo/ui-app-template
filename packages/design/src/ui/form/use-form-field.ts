import { useId } from "react";

import { useFieldContext } from "./form.context";

/**
 * Everything a field component needs, derived once so no field has to get the
 * accessibility wiring right on its own.
 *
 * Three things here are the difference between a form that merely looks
 * validated and one a screen reader can use:
 *
 * - **`id` is namespaced with `useId()`**, not the bare field name. Two forms
 *   can be mounted at once — a dialog over a page form is the common case —
 *   and duplicate ids silently point every label at the first match.
 * - **`aria-invalid` is `true` or absent**, never `"false"`. Tailwind's
 *   `aria-invalid:` variant matches `[aria-invalid="true"]`, so rendering the
 *   attribute with a falsy value styles nothing while still claiming a state.
 * - **`aria-describedby` links the control to its error node**, which is what
 *   makes the message reach a screen reader at all. The visual red text is not
 *   an announcement.
 */
export function useFormField<TValue>() {
	const field = useFieldContext<TValue>();
	const uid = useId();

	const id = `${uid}-${field.name}`;
	const errorId = `${id}-error`;
	const hasError = field.state.meta.errors.length > 0;

	return {
		field,
		id,
		errorId,
		hasError,
		/**
		 * Spread onto the interactive element. `onBlur` is included because
		 * `validators.onBlur` never runs unless the control calls
		 * `field.handleBlur` — a validator configured and silently dead is worse
		 * than one that was never configured.
		 */
		controlProps: {
			id,
			name: field.name,
			onBlur: field.handleBlur,
			"aria-invalid": hasError ? (true as const) : undefined,
			"aria-describedby": hasError ? errorId : undefined,
		},
	};
}
