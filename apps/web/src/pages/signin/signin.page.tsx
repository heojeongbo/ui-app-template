import { getRouteApi } from "@tanstack/react-router";
import { isDefiniteFailure } from "@template/core/api";
import { createScopedLogger } from "@template/core/logger";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@template/design/ui/card";
import { useAppForm } from "@template/design/ui/form";
import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";
import { toast } from "sonner";

import { useSessionStore } from "@/entities/session";
import { toPath } from "@/shared/lib/router";
import { LocaleToggle } from "@/shared/ui/locale-toggle";

import { signInFormOptions } from "./signin.schema";

const log = createScopedLogger("Auth");

/**
 * `getRouteApi` rather than importing the Route object.
 *
 * The route imports this page; this page importing the route back would be a
 * cycle. `getRouteApi` resolves by path at call time and keeps the arrow going
 * one way — routes know about pages, pages do not know about routes.
 */
const route = getRouteApi("/(public)/signin");

export function SignInPage() {
	const c = useIntlayer("signin");
	const { redirect } = route.useSearch();
	const navigate = route.useNavigate();
	const signIn = useSessionStore((s) => s.signIn);

	// Keyed on the MESSAGES, not on `c`. Two reasons, and both bite:
	//
	// `useIntlayer` may hand back a fresh object each render, so `[c]` would
	// rebuild `formOptions` — and therefore `defaultValues` — on every render,
	// which is the classic way a form resets while someone is typing in it.
	//
	// And `[]` is what was here before, which was harmless only while the copy
	// was a module constant. Now that it changes with the locale, an empty dep
	// array freezes the boot language into the validation messages — exactly
	// the bug docs/ux/forms.md warns about and the reason the schema is a
	// factory in the first place.
	const options = useMemo(
		() =>
			signInFormOptions({
				// Field by field, never a spread: a dictionary leaf is a node, not a
				// string, so `{...c}` satisfies neither field and the zod message
				// renders as "[object Object]" on the one surface — a form error —
				// where the user is already stuck.
				usernameRequired: c.usernameRequired.value,
				passwordRequired: c.passwordRequired.value,
			}),
		[c.usernameRequired.value, c.passwordRequired.value],
	);

	const form = useAppForm({
		...options,
		onSubmit: async ({ value }) => {
			try {
				// Stand-in for a real RPC. Replace with a mutation; the surrounding
				// shape — validate, call, report BOTH outcomes, navigate on success
				// only — is what the template is demonstrating.
				await new Promise((resolve) => setTimeout(resolve, 400));

				signIn({ userId: value.username, displayName: value.username });
				log.info("signed in", { username: value.username });

				// `redirect` is already validated by the route's zod schema — and
				// now says so in its type: it is a `SafeRedirect`, not a `string`.
				// `toPath` is where that brand is discharged for the router, which
				// wants a plain path. Nothing is re-checked here, which is the
				// point of validating at the boundary.
				await navigate({ to: toPath(redirect), replace: true });
			} catch (error) {
				log.error("sign-in failed", error);

				// Tone follows the error taxonomy. A refusal is `error`; a lost
				// answer is `warning`, because the request may have succeeded and
				// telling the user it failed is a claim we cannot support.
				if (isDefiniteFailure(error)) {
					toast.error(c.rejected.value);
				} else {
					toast.warning(c.unreachable.value);
				}

				// Deliberately NOT re-thrown and NOT resetting the form: the user's
				// input stays exactly where it was so they can fix one field and
				// retry.
			}
		},
	});

	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-3 p-6">
			{/*
				The switcher is on THIS screen, not only in the signed-in shell.
				Someone who cannot read English cannot sign in to reach a control
				that only appears after signing in — which is where it was.
			*/}
			<LocaleToggle className="self-end sm:self-auto" />

			<Card className="w-full max-w-sm">
				<CardHeader>
					{/*
						An `<h1>`, not a bare CardTitle. shadcn's CardTitle renders a
						`<div>`, so a page whose only title is one has NO heading at
						all — and heading navigation is the main way a screen-reader
						user orients on a page. `asChild` is not available here, so
						the element is supplied directly and CardTitle contributes
						its styling.
					*/}
					<CardTitle>
						<h1>{c.title}</h1>
					</CardTitle>
					<CardDescription>{c.description}</CardDescription>
				</CardHeader>
				<CardContent>
					{/*
						`form.AppForm` is REQUIRED around anything from formComponents.
						It supplies the context `SubmitButton` reads to disable itself
						while submitting — without it the button renders, never
						disables, and nothing warns.
					*/}
					<form.AppForm>
						<form.Root
							className="flex flex-col gap-4"
							onSubmit={() => form.handleSubmit()}
						>
							<form.AppField name="username">
								{(field) => (
									<field.InputWithLabel
										label={c.usernameLabel.value}
										autoComplete="username"
										autoFocus
									/>
								)}
							</form.AppField>

							<form.AppField name="password">
								{(field) => (
									<field.InputWithLabel
										label={c.passwordLabel.value}
										type="password"
										autoComplete="current-password"
									/>
								)}
							</form.AppField>

							<form.Subscribe selector={(state) => state.isSubmitting}>
								{(isSubmitting) => (
									<form.SubmitButton className="mt-2">
										{isSubmitting ? c.submitting : c.submit}
									</form.SubmitButton>
								)}
							</form.Subscribe>
						</form.Root>
					</form.AppForm>
				</CardContent>
			</Card>
		</div>
	);
}
