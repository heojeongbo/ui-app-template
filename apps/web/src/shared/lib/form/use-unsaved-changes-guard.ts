import { useBlocker } from "@tanstack/react-router";
import { useEffect } from "react";

import { type ConfirmOptions, confirm } from "@/shared/lib/confirm";

export type UnsavedChangesCopy = Pick<
	ConfirmOptions,
	"title" | "body" | "confirmLabel" | "cancelLabel"
>;

type Options = {
	/** Whether there is anything to lose. Usually `form.state.isDirty`. */
	when: boolean;
	copy: UnsavedChangesCopy;
};

/**
 * Stop a dirty form from being abandoned by accident — **both** ways it can be.
 *
 * There are two exits and they need different mechanisms, which is the whole
 * reason this is one hook rather than a line in a component:
 *
 * 1. **Leaving the site** — reload, back out of the app, close the tab. Only
 *    `beforeunload` sees this, and the browser shows its own wording; nothing
 *    can customise it.
 * 2. **Navigating inside the app** — a `<Link>`, a redirect, the back button
 *    within the SPA. `beforeunload` never fires for these, because the document
 *    is never unloaded. This is the half that is usually missing, and it is the
 *    common one: most work is lost to an in-app click, not to a tab close.
 *
 * The second half routes through the app's own `confirm()` dialog, so the
 * question is phrased in the app's voice and says what will be lost.
 *
 * Registered only `when` there is something to lose. A permanently-armed
 * `beforeunload` makes every reload prompt, which trains users to dismiss the
 * prompt without reading it — and then it protects nothing.
 */
export function useUnsavedChangesGuard({ when, copy }: Options): void {
	// In-app navigation. `withResolver` gives an async decision; without it the
	// blocker can only answer synchronously and a dialog is impossible.
	useBlocker({
		shouldBlockFn: () => confirm({ ...copy }).then((ok) => !ok),
		enableBeforeUnload: false,
		disabled: !when,
		withResolver: false,
	});

	// Leaving the site. Separate from the blocker above — `enableBeforeUnload`
	// is turned off there so this is the single place the handler is installed,
	// rather than two registrations racing to cancel each other.
	useEffect(() => {
		if (!when) return;

		const handler = (event: BeforeUnloadEvent) => {
			// `preventDefault` is the modern spelling; assigning `returnValue` is
			// what older Safari and Firefox still read. Both, because getting this
			// wrong fails silently — the page just closes.
			event.preventDefault();
			event.returnValue = "";
		};

		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [when]);
}
