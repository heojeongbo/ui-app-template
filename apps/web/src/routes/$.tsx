import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "intlayer";

import { currentLocale, documentTitle } from "@/shared/lib/locale";
import { RouteNotFound } from "@/shared/ui/route-not-found";

/**
 * The catch-all.
 *
 * Without it, an unmatched path renders the router's built-in "not found"
 * outside the app's own layout, which looks like a crash rather than a 404.
 */
export const Route = createFileRoute("/$")({
	head: () => ({
		meta: [
			{
				title: documentTitle(
					getIntlayer("route-not-found", currentLocale()).title,
				),
			},
		],
	}),

	component: RouteNotFound,
});
