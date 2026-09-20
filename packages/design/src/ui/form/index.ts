/**
 * `formOptions` is re-exported so app code never imports
 * `@tanstack/react-form` directly. The form system is this package's to
 * own — the same reason the logger keeps log-palette behind one module —
 * and it means a version bump or a swap is a change here, not in every
 * `*.schema.ts` in the app.
 */

export type { AnyFormApi } from "@tanstack/react-form";
export { formOptions } from "@tanstack/react-form";

export { useAppForm, withFieldGroup, withForm } from "./form";
export { useFieldContext, useFormContext } from "./form.context";
export { coerceInputValue, errorMessage } from "./form.field.lib";
export { FormFieldError } from "./form.field-error";
export type {
	FieldOrientation,
	FormFieldLabelProps,
} from "./form.field-layout";
export { FormFieldLayout } from "./form.field-layout";
export type { FormSelectItem } from "./form.select";
export type {
	ApplyServerErrorsResult,
	ServerFieldError,
} from "./form.server-errors";
export {
	applyServerFieldErrors,
	clearServerFieldErrors,
} from "./form.server-errors";
export { useFormField } from "./use-form-field";
