import { Button } from "@template/design/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { itemsContent } from "./items.content";
import { type ItemsSearch, visibleRange } from "./items.filters";

/**
 * Pagination controls and the range label.
 *
 * The label is computed by `visibleRange`, not inline: "41–47 of 47" on the
 * last page versus "41–60 of 47" is exactly the off-by-one that survives
 * review, because every page except the last one looks correct.
 */
export function ItemsPager({
	search,
	total,
	onStep,
}: {
	search: ItemsSearch;
	total: number;
	/**
	 * A direction, not a target page. The pager's `search` prop belongs to the
	 * render that produced it, so `page + 1` computed here is stale the moment
	 * a second click arrives before React re-renders.
	 */
	onStep: (delta: -1 | 1) => void;
}) {
	const { from, to } = visibleRange(search, total);
	const lastPage = Math.max(1, Math.ceil(total / search.pageSize));

	return (
		<nav
			aria-label="Pagination"
			className="flex flex-wrap items-center justify-between gap-3"
		>
			<p className="text-muted-foreground text-sm">
				{itemsContent.range(from, to, total)}
			</p>

			<div className="flex items-center gap-2">
				<span className="text-muted-foreground text-sm">
					{itemsContent.page(search.page, lastPage)}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={search.page <= 1}
					onClick={() => onStep(-1)}
				>
					<ChevronLeftIcon aria-hidden="true" />
					{itemsContent.previous}
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={search.page >= lastPage}
					onClick={() => onStep(1)}
				>
					{itemsContent.next}
					<ChevronRightIcon aria-hidden="true" />
				</Button>
			</div>
		</nav>
	);
}
