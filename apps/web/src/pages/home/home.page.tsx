import { Link } from "@tanstack/react-router";
import { Button } from "@template/design/ui/button";

import { PageHeader } from "@/shared/ui/page-header";

/**
 * A page renders. It does not decide.
 *
 * Every screen in this app is a `pages/<name>/` folder with this shape —
 * `<name>.page.tsx` for rendering, `<name>.content.ts` for copy, pure `.ts`
 * siblings for anything a scenario test asserts. See docs/page-triad.md.
 */
export function HomePage() {
	return (
		<div className="flex flex-col">
			<PageHeader
				title="Home"
				description="A starting point. Replace this screen with your own."
				actions={
					<Button asChild>
						<Link to="/items">Browse items</Link>
					</Button>
				}
			/>
		</div>
	);
}
