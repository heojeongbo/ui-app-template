import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Everything reachable without a session.
 *
 * A pathless group: `(public)` shapes the tree, not the URL. Sign-in stays at
 * `/signin`.
 *
 * Layout policy comes from the route tree and never from matching on the
 * pathname. A `location.pathname.startsWith("/signin")` check in a shell
 * component is the thing this replaces — it drifts the moment a second public
 * route exists.
 */
export const Route = createFileRoute("/(public)")({
	component: Outlet,
});
