import { Link } from "@tanstack/react-router";
import { Button } from "@template/design/ui/button";
import { useIntlayer } from "react-intlayer";

import { PageHeader } from "@/shared/ui/page-header";

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
	const c = useIntlayer("home");

	return (
		<div className="flex flex-col">
			<PageHeader
				title={c.title}
				description={c.description}
				actions={
					<Button asChild>
						<Link to="/items">{c.browseItems}</Link>
					</Button>
				}
			/>
		</div>
	);
}
