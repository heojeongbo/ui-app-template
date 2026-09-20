import { Label } from "@template/design/ui/label";
import { Switch } from "@template/design/ui/switch";
import type { ComponentProps } from "react";

import { FormFieldError } from "./form.field-error";
import type { FormFieldLabelProps } from "./form.field-layout";
import { useFormField } from "./use-form-field";

type FormSwitchProps = Omit<
	ComponentProps<typeof Switch>,
	"checked" | "onCheckedChange" | "name" | "id"
> & {
	showErrorMessage?: boolean;
};

export function FormSwitch({
	showErrorMessage = true,
	...switchProps
}: FormSwitchProps) {
	const { field, errorId, controlProps } = useFormField<boolean>();

	return (
		<div className="flex flex-col gap-2">
			<Switch
				{...controlProps}
				checked={field.state.value}
				onCheckedChange={(checked) => field.handleChange(checked)}
				{...switchProps}
			/>
			<FormFieldError id={errorId} show={showErrorMessage} />
		</div>
	);
}

/** Like the checkbox, the label trails the control — no `FormFieldLayout`. */
export function FormSwitchWithLabel({
	label,
	labelProps,
	showErrorMessage = true,
	...switchProps
}: FormSwitchProps & Omit<FormFieldLabelProps, "orientation">) {
	const { field, id, errorId, controlProps } = useFormField<boolean>();

	return (
		<div className="flex flex-col gap-2">
			<div className="flex flex-row items-center gap-2">
				<Switch
					{...controlProps}
					checked={field.state.value}
					onCheckedChange={(checked) => field.handleChange(checked)}
					{...switchProps}
				/>
				<Label htmlFor={id} {...labelProps}>
					{label}
				</Label>
			</div>
			<FormFieldError id={errorId} show={showErrorMessage} />
		</div>
	);
}
