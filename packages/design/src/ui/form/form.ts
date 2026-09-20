import { createFormHook } from "@tanstack/react-form";

import { FormCheckbox, FormCheckboxWithLabel } from "./form.checkbox";
import { fieldContext, formContext } from "./form.context";
import { FormInput, FormInputWithLabel } from "./form.input";
import { FormRoot } from "./form.root";
import { FormSelect, FormSelectWithLabel } from "./form.select";
import { FormSubmitButton } from "./form.submit-button";
import { FormSwitch, FormSwitchWithLabel } from "./form.switch";
import { FormTextarea, FormTextareaWithLabel } from "./form.textarea";

/**
 * The form system: TanStack Form + `createFormHook`.
 *
 * zod schemas go straight into `validators` — TanStack Form v1 speaks Standard
 * Schema natively, so `@tanstack/zod-form-adapter` is neither needed nor
 * maintained (it is abandoned at 0.42.1, pre-v1).
 *
 * shadcn's own `form` component is deliberately NOT installed: it is built on
 * react-hook-form, and two form libraries in one workspace means every schema,
 * resolver and field component exists twice.
 *
 * Adding a field is mechanical: write `form.<name>.tsx` exporting `Form<Name>`
 * (+ `Form<Name>WithLabel` where a caption makes sense) that calls
 * `useFormField()` and renders `<FormFieldError />`, then register it below.
 * Labelled variants should compose `FormFieldLayout` so orientation, label
 * association and error placement stay identical across the set — the two
 * exceptions, checkbox and switch, say why in their own files.
 */
export const { useAppForm, withForm, withFieldGroup } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		Input: FormInput,
		InputWithLabel: FormInputWithLabel,
		Textarea: FormTextarea,
		TextareaWithLabel: FormTextareaWithLabel,
		Select: FormSelect,
		SelectWithLabel: FormSelectWithLabel,
		Checkbox: FormCheckbox,
		CheckboxWithLabel: FormCheckboxWithLabel,
		Switch: FormSwitch,
		SwitchWithLabel: FormSwitchWithLabel,
	},
	formComponents: {
		Root: FormRoot,
		SubmitButton: FormSubmitButton,
	},
});
