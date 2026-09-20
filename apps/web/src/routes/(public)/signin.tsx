import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { SignInPage } from "@/pages/signin";
import { isSafeRedirect } from "@/shared/lib/router";

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
 * `.catch("/")` rather than an error: a malformed or hostile value should land
 * the user on the home page, not on a router crash screen.
 */
const signInSearchSchema = z.object({
	redirect: z.string().refine(isSafeRedirect).catch("/").default("/"),
});

export const Route = createFileRoute("/(public)/signin")({
	validateSearch: signInSearchSchema,

	// The inverse guard. Without it, an already-signed-in user can reach
	// /signin from history or a bookmark and sign in "again" over a live
	// session. `replace` keeps that non-page out of the back stack.
	beforeLoad: ({ context, search }) => {
		if (context.session) {
			throw redirect({ to: search.redirect, replace: true });
		}
	},

	component: SignInPage,
});
