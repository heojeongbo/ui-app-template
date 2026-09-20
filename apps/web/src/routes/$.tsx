import { createFileRoute } from "@tanstack/react-router";

import { RouteNotFound } from "@/shared/ui/route-not-found";

/**
 * The catch-all.
 *
 * Without it, an unmatched path renders the router's built-in "not found"
 * outside the app's own layout, which looks like a crash rather than a 404.
 */
export const Route = createFileRoute("/$")({
	component: RouteNotFound,
});
