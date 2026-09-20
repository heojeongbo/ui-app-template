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
};

/**
 * **A sign-in form validates presence, never policy.**
 *
 * This used to carry `.min(8, passwordTooShort)`, and it was wrong twice.
 *
 * Wrong in principle: a length minimum is a *registration* rule. Enforcing it
 * here locks out anyone whose password predates the current policy — the form
 * refuses before the server is ever asked, so the one account that most needs
 * to get in cannot, and no server-side migration can rescue it. It also states
 * the policy to anyone who loads the page.
 *
 * Wrong in fact: `.min(8).min(1)` made the second message unreachable. zod
 * does not short-circuit a chain, so `""` produced BOTH issues in chain order
 * and the field renders only the first — someone submitting an empty password
 * was told it was "too short", which is both unhelpful and untrue.
 *
 * Length, complexity and reuse belong to whatever screen CREATES a password,
 * where the rule is a promise to the user rather than a gate in front of them.
 */
export function signInSchema(copy: SignInCopy) {
	return z.object({
		username: z.string().min(1, copy.usernameRequired),
		password: z.string().min(1, copy.passwordRequired),
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
