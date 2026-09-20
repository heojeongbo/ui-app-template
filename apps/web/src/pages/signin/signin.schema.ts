import { formOptions } from "@template/design/ui/form";
import { z } from "zod";

/**
 * Schema and defaults, colocated with the form that uses them.
 *
 * Colocated and not in a shared `schemas/` folder: a schema has exactly one
 * consumer, and the day it gains a second one is the day it should move. A
 * central folder makes every schema look shared when none of them are.
 *
 * The factory takes `copy` so the MESSAGES can be localised. A schema built at
 * module scope freezes whatever locale was active when the module first
 * evaluated — which is the bug this shape prevents, and why the page wraps the
 * call in `useMemo` keyed on its copy.
 */
export type SignInCopy = {
	usernameRequired: string;
	passwordRequired: string;
	passwordTooShort: string;
};

export function signInSchema(copy: SignInCopy) {
	return z.object({
		username: z.string().min(1, copy.usernameRequired),
		password: z
			.string()
			.min(8, copy.passwordTooShort)
			.min(1, copy.passwordRequired),
	});
}

export type SignInValues = z.infer<ReturnType<typeof signInSchema>>;

export function signInFormOptions(copy: SignInCopy) {
	return formOptions({
		// `satisfies` and not a cast: it checks the defaults against the schema's
		// inferred type without widening it, so adding a field to the schema and
		// forgetting it here is a compile error rather than an undefined value
		// that makes the input uncontrolled.
		defaultValues: { username: "", password: "" } satisfies SignInValues,
		validators: {
			// onSubmit only. Validating an auth form on every keystroke tells the
			// user their password is "too short" while they are still typing it,
			// which is noise, not help.
			onSubmit: signInSchema(copy),
		},
	});
}
