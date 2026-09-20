import type { ReactNode } from "react";

import { useFieldContext } from "./form.context";
import { errorMessage } from "./form.field.lib";

type FormFieldErrorProps = {
	/** Must match the control's `aria-describedby`. See `useFormField`. */
	id: string;
	show?: boolean;
};

/**
 * The one error line every field renders.
 *
 * Shows the **first** error only: a field failing three rules is still one
 * thing to fix, and stacking them pushes the rest of the form down as the user
 * types.
 *
 * `role="alert"` on a node that mounts only when there is an error is what
 * makes assistive tech announce it. A permanently-mounted node with the role
 * would announce on every keystroke instead.
 */
export function FormFieldError({
	id,
	show = true,
}: FormFieldErrorProps): ReactNode {
	const field = useFieldContext<unknown>();

	if (!show || field.state.meta.errors.length === 0) return null;

	return (
		<span id={id} role="alert" className="text-danger text-xs">
			{errorMessage(field.state.meta.errors[0])}
		</span>
	);
}
