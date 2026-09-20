import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

/**
 * The guard. Everything below this route requires a session.
 *
 * `beforeLoad` and not a `useEffect` in a component: an effect runs AFTER the
 * protected page has already rendered, so the user sees a flash of content
 * they are not entitled to before being bounced. Throwing a redirect here
 * means the page never mounts.
 *
 * `redirect` carries where they were going, so signing in returns them to it
 * instead of dumping them on the home page.
 */
export const Route = createFileRoute("/(auth)")({
	beforeLoad: ({ context, location }) => {
		if (!context.session) {
			throw redirect({
				to: "/signin",
				search: { redirect: location.href },
			});
		}
	},
	component: Outlet,
});
