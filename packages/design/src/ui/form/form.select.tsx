import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@template/design/ui/select";

import { FormFieldError } from "./form.field-error";
import { type FormFieldLabelProps, FormFieldLayout } from "./form.field-layout";
import { useFormField } from "./use-form-field";

export type FormSelectItem = {
	value: string;
	label: string;
	disabled?: boolean;
};

type FormSelectProps = {
	items: FormSelectItem[];
	placeholder?: string;
	disabled?: boolean;
	size?: "sm" | "default";
	showErrorMessage?: boolean;
};

/**
 * `placeholder` has no default. A hardcoded "Select an option" would be copy
 * living in the design system, which cannot be translated by the app that
 * renders it — see docs/ux/copy.md.
 */
function useSelectParts({
	items,
	placeholder,
	disabled,
	size,
}: FormSelectProps) {
	const { field, id, errorId, controlProps } = useFormField<string>();

	const control = (
		<Select
			value={field.state.value}
			onValueChange={(value) => field.handleChange(value)}
			disabled={disabled}
		>
			<SelectTrigger
				{...controlProps}
				size={size}
				// Radix's trigger is a button, and blur fires on it, so the shared
				// `onBlur` still drives `validators.onBlur` here.
				className="w-full"
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{items.map((item) => (
					<SelectItem
						key={item.value}
						value={item.value}
						disabled={item.disabled}
					>
						{item.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);

	return { control, id, errorId };
}

export function FormSelect({
	showErrorMessage = true,
	...props
}: FormSelectProps) {
	const { control, errorId } = useSelectParts(props);

	return (
		<div className="flex flex-col gap-2">
			{control}
			<FormFieldError id={errorId} show={showErrorMessage} />
		</div>
	);
}

export function FormSelectWithLabel({
	label,
	labelProps,
	orientation,
	showErrorMessage,
	...props
}: FormSelectProps & FormFieldLabelProps) {
	const { control, id, errorId } = useSelectParts(props);

	return (
		<FormFieldLayout
			label={label}
			labelProps={labelProps}
			orientation={orientation}
			showErrorMessage={showErrorMessage}
			htmlFor={id}
			errorId={errorId}
		>
			{control}
		</FormFieldLayout>
	);
}
