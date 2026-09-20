import { Textarea } from "@template/design/ui/textarea";
import type { ChangeEvent, ComponentProps } from "react";

import { FormFieldError } from "./form.field-error";
import { type FormFieldLabelProps, FormFieldLayout } from "./form.field-layout";
import { useFormField } from "./use-form-field";

type FormTextareaProps = Omit<
	ComponentProps<typeof Textarea>,
	"onChange" | "name" | "value" | "id"
> & {
	showErrorMessage?: boolean;
	containerClassName?: string;
};

export function FormTextarea({
	showErrorMessage = true,
	containerClassName,
	...textareaProps
}: FormTextareaProps) {
	const { field, errorId, controlProps } = useFormField<string>();

	const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		field.handleChange(e.target.value);
	};

	return (
		<div className={containerClassName}>
			<Textarea
				{...controlProps}
				// `?? ""` keeps the control controlled when the field is optional
				// and undefined — React warns and then switches the input to
				// uncontrolled, which loses every later programmatic reset.
				value={field.state.value ?? ""}
				onChange={handleChange}
				{...textareaProps}
			/>
			<FormFieldError id={errorId} show={showErrorMessage} />
		</div>
	);
}

export function FormTextareaWithLabel({
	label,
	labelProps,
	orientation,
	showErrorMessage,
	// Destructured, not left in the rest: it is not a DOM attribute, and the
	// primitive spreads whatever it receives onto the element — so leaving it
	// in produces a React unknown-prop warning at runtime.
	containerClassName,
	...textareaProps
}: FormTextareaProps & FormFieldLabelProps) {
	const { field, id, errorId, controlProps } = useFormField<string>();

	const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
		field.handleChange(e.target.value);
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
			<Textarea
				{...controlProps}
				value={field.state.value ?? ""}
				onChange={handleChange}
				className="w-full"
				{...textareaProps}
			/>
		</FormFieldLayout>
	);
}
