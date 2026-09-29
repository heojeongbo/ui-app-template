import { Link } from "@tanstack/react-router";
import { Button } from "@template/design/ui/button";
import { useIntlayer } from "react-intlayer";

/**
 * The catch-all. Reached by the `$.tsx` route and by any `notFound()` a loader
 * throws.
 *
 * It offers a way out. A dead-end 404 is the single most common way a user
 * leaves an app, and the fix is one link.
 */
export function RouteNotFound() {
	const c = useIntlayer("route-not-found");

	return (
		<div className="flex flex-col items-start gap-4 p-6">
			<div className="flex flex-col gap-1">
				<h1 className="font-semibold text-2xl">{c.title}</h1>
				<p className="text-muted-foreground text-sm">{c.description}</p>
			</div>
			<Button asChild variant="outline">
				<Link to="/">{c.goHome}</Link>
			</Button>
		</div>
	);
}
