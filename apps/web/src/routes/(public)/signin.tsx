import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { SignInPage } from "@/pages/signin";
import {
	HOME,
	isSafeRedirect,
	type SafeRedirect,
	toPath,
} from "@/shared/lib/router";

/**
 * The `?redirect=` parameter is validated **at the router boundary**, not
 * inside the form.
 *
 * An unvalidated redirect target is an open-redirect: `/signin?redirect=https://evil.example`
 * turns the app's own sign-in into a credible phishing hop. Folding the check
 * into the schema means every consumer of `search.redirect` — the form, a
 * `Link`, a future `beforeLoad` — gets the safe value, and there is no second
 * place to forget it.
 *
 * `.catch(HOME)` rather than an error: a malformed or hostile value should
 * land the user on the home page, not on a router crash screen.
 *
 * The explicit `z.ZodType<SafeRedirect, string>` annotation is a tripwire, not
 * decoration. `isSafeRedirect` is a type predicate, so `.refine` narrows the
 * output to `SafeRedirect` — and `.catch`/`.default` preserve it, because
 * `$ZodCatchInternals<T>` re-exports `core.output<T>`. If a zod upgrade ever
 * breaks that chain, the brand silently degrades to `string` and every
 * consumer goes back to holding an unproven value. Annotated, it fails to
 * compile instead.
 */
const signInSearchSchema = z.object({
	redirect: z.string().refine(isSafeRedirect).catch(HOME).default(HOME),
}) satisfies z.ZodType<{ redirect: SafeRedirect }, { redirect?: string }>;

export const Route = createFileRoute("/(public)/signin")({
	validateSearch: signInSearchSchema,

	// The inverse guard. Without it, an already-signed-in user can reach
	// /signin from history or a bookmark and sign in "again" over a live
	// session. `replace` keeps that non-page out of the back stack.
	beforeLoad: ({ context, search }) => {
		if (context.session) {
			throw redirect({ to: toPath(search.redirect), replace: true });
		}
	},

	component: SignInPage,
});
