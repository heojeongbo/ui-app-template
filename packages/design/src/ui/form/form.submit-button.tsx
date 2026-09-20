import { Button } from "@template/design/ui/button";
import type { ComponentProps } from "react";

import { useFormContext } from "./form.context";

type FormSubmitButtonProps = ComponentProps<typeof Button>;

/**
 * Submit button wired to the form's own submitting state, so no page threads
 * `isSubmitting` down by hand — the usual source of buttons that stay clickable
 * through a slow request and fire it twice.
 *
 * Must be rendered inside `<form.AppForm>`. That wrapper is what supplies the
 * form context this reads; without it the button renders but never disables,
 * and nothing warns.
 */
export function FormSubmitButton({
	children,
	type = "submit",
	variant = "default",
	size = "default",
	disabled,
	...props
}: FormSubmitButtonProps) {
	const form = useFormContext();

	return (
		<form.Subscribe
			selector={(state) => [state.isSubmitting, state.canSubmit] as const}
		>
			{([isSubmitting, canSubmit]) => (
				<Button
					type={type}
					variant={variant}
					size={size}
					disabled={disabled || isSubmitting || !canSubmit}
					aria-busy={isSubmitting || undefined}
					{...props}
				>
					{children}
				</Button>
			)}
		</form.Subscribe>
	);
}
