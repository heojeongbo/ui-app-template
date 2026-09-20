import { createFormHookContexts } from "@tanstack/react-form";

/**
 * The field/form contexts, in their own module so field components can read
 * them without importing `form.ts` — which imports the field components in
 * turn.
 *
 * Keeping them in `form.ts` happens to work (contexts are created at module
 * init, long before anything renders), but it makes the module graph depend on
 * evaluation order for no benefit. Splitting the file removes the cycle.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } =
	createFormHookContexts();
