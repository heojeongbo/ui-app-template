import { Link } from "@tanstack/react-router";
import { Button } from "@template/design/ui/button";

import { routeNotFoundContent } from "./route-not-found.content";

/**
 * The catch-all. Reached by the `$.tsx` route and by any `notFound()` a loader
 * throws.
 *
 * It offers a way out. A dead-end 404 is the single most common way a user
 * leaves an app, and the fix is one link.
 */
export function RouteNotFound() {
	return (
		<div className="flex flex-col items-start gap-4 p-6">
			<div className="flex flex-col gap-1">
				<h1 className="font-semibold text-2xl">{routeNotFoundContent.title}</h1>
				<p className="text-muted-foreground text-sm">
					{routeNotFoundContent.description}
				</p>
			</div>
			<Button asChild variant="outline">
				<Link to="/">{routeNotFoundContent.goHome}</Link>
			</Button>
		</div>
	);
}
