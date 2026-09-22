import { Link } from "@tanstack/react-router";
import { Button } from "@template/design/ui/button";

import { PageHeader } from "@/shared/ui/page-header";

import { homeContent } from "./home.content";

/**
 * A page renders. It does not decide.
 *
 * Every screen in this app is a `pages/<name>/` folder with this shape —
 * `<name>.page.tsx` for rendering, `<name>.content.ts` for copy, pure `.ts`
 * siblings for anything a scenario test asserts. See docs/page-triad.md.
 *
 * This screen has no third file, and its spec says so under `## Scenarios`
 * rather than inventing one. A screen that makes no decisions has nothing for
 * a scenario to assert — the triad is a shape, not a quota.
 */
export function HomePage() {
	return (
		<div className="flex flex-col">
			<PageHeader
				title={homeContent.title}
				description={homeContent.description}
				actions={
					<Button asChild>
						<Link to="/items">{homeContent.browseItems}</Link>
					</Button>
				}
			/>
		</div>
	);
}
