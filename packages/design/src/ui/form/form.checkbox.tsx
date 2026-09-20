import { Checkbox } from "@template/design/ui/checkbox";
import { Label } from "@template/design/ui/label";
import type { ComponentProps } from "react";

import { FormFieldError } from "./form.field-error";
import type { FormFieldLabelProps } from "./form.field-layout";
import { useFormField } from "./use-form-field";

type FormCheckboxProps = Omit<
	ComponentProps<typeof Checkbox>,
	"checked" | "onCheckedChange" | "name" | "id"
> & {
	showErrorMessage?: boolean;
};

export function FormCheckbox({
	showErrorMessage = true,
	...checkboxProps
}: FormCheckboxProps) {
	const { field, errorId, controlProps } = useFormField<boolean>();

	return (
		<div className="flex flex-col gap-2">
			<Checkbox
				{...controlProps}
				checked={field.state.value}
				// Radix reports an indeterminate state as "indeterminate"; a boolean
				// field has no room for it, so coerce rather than widen the schema.
				onCheckedChange={(checked) => field.handleChange(checked === true)}
				{...checkboxProps}
			/>
			<FormFieldError id={errorId} show={showErrorMessage} />
		</div>
	);
}

/**
 * Deliberately does NOT compose `FormFieldLayout`: a checkbox's label trails
 * the control and never stacks above it, so the shared orientation logic would
 * be dead weight plus a special case.
 */
export function FormCheckboxWithLabel({
	label,
	labelProps,
	showErrorMessage = true,
	...checkboxProps
}: FormCheckboxProps & Omit<FormFieldLabelProps, "orientation">) {
	const { field, id, errorId, controlProps } = useFormField<boolean>();

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-row items-center gap-2">
				<Checkbox
					{...controlProps}
					checked={field.state.value}
					onCheckedChange={(checked) => field.handleChange(checked === true)}
					{...checkboxProps}
				/>
				<Label htmlFor={id} {...labelProps}>
					{label}
				</Label>
			</div>
			<FormFieldError id={errorId} show={showErrorMessage} />
		</div>
	);
}
