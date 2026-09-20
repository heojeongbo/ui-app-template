import { Input } from "@template/design/ui/input";
import type { ChangeEvent, ComponentProps } from "react";

import { coerceInputValue } from "./form.field.lib";
import { FormFieldError } from "./form.field-error";
import { type FormFieldLabelProps, FormFieldLayout } from "./form.field-layout";
import { useFormField } from "./use-form-field";

type FormInputProps = Omit<
	ComponentProps<typeof Input>,
	"onChange" | "name" | "value" | "id"
> & {
	showErrorMessage?: boolean;
	containerClassName?: string;
};

export function FormInput({
	showErrorMessage = true,
	containerClassName,
	...inputProps
}: FormInputProps) {
	const { field, errorId, controlProps } = useFormField<string | number>();

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		field.handleChange(coerceInputValue(e.target.value, inputProps.type));
	};

	return (
		<div className={containerClassName}>
			<Input
				{...controlProps}
				value={field.state.value}
				onChange={handleChange}
				{...inputProps}
			/>
			<FormFieldError id={errorId} show={showErrorMessage} />
		</div>
	);
}

export function FormInputWithLabel({
	label,
	labelProps,
	orientation,
	showErrorMessage,
	// Destructured, not left in the rest: it is not a DOM attribute, and the
	// primitive spreads whatever it receives onto the element — so leaving it
	// in produces a React unknown-prop warning at runtime.
	containerClassName,
	...inputProps
}: FormInputProps & FormFieldLabelProps) {
	const { field, id, errorId, controlProps } = useFormField<string | number>();

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		field.handleChange(coerceInputValue(e.target.value, inputProps.type));
	};

	return (
		<FormFieldLayout
			label={label}
			labelProps={labelProps}
			orientation={orientation}
			showErrorMessage={showErrorMessage}
			htmlFor={id}
			errorId={errorId}
			className={containerClassName}
		>
			<Input
				{...controlProps}
				value={field.state.value}
				onChange={handleChange}
				className="w-full"
				{...inputProps}
			/>
		</FormFieldLayout>
	);
}
