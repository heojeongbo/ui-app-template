import { Button } from "@template/design/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useIntlayer } from "react-intlayer";

import { useFormatters } from "@/shared/lib/format";
import { lastPage } from "@/shared/lib/search";

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
	const c = useIntlayer("items");
	const common = useIntlayer("common");
	const f = useFormatters();
	const { from, to } = visibleRange(search, total);
	const last = lastPage(total, search.pageSize);

	return (
		<nav
			aria-label={common.pagination.value}
			className="flex flex-wrap items-center justify-between gap-3"
		>
			<p className="text-muted-foreground text-sm">
				{c.range({
					from: f.integer(from),
					to: f.integer(to),
					total: f.integer(total),
				})}
			</p>

			<div className="flex items-center gap-2">
				<span className="text-muted-foreground text-sm">
					{c.page({
						current: f.integer(search.page),
						last: f.integer(last),
					})}
				</span>
				<Button
					variant="outline"
					size="sm"
					disabled={search.page <= 1}
					onClick={() => onStep(-1)}
				>
					<ChevronLeftIcon aria-hidden="true" />
					{c.previous}
				</Button>
				<Button
					variant="outline"
					size="sm"
					disabled={search.page >= last}
					onClick={() => onStep(1)}
				>
					{c.next}
					<ChevronRightIcon aria-hidden="true" />
				</Button>
			</div>
		</nav>
	);
}
