import { cn } from "@template/design/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
	icon?: LucideIcon;
	title: ReactNode;
	description?: ReactNode;
	/** The one thing to do next. An empty state without one is a dead end. */
	action?: ReactNode;
	className?: string;
};

/**
 * What a list shows when it has nothing to show.
 *
 * A real component rather than an inline `<p>No data</p>`, because an empty
 * state has to answer two questions — *why* is this empty, and *what do I do
 * now* — and an inline paragraph answers neither. The distinction that matters
 * most is "nothing here yet" versus "nothing matches your filters": same
 * layout, different `title`, and crucially a different `action`.
 *
 * `role="status"` so the transition from loading to empty is announced. A
 * sighted user sees the skeleton disappear; a screen reader user gets silence
 * unless something says so.
 */
export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	className,
}: EmptyStateProps) {
	return (
		<div
			role="status"
			className={cn(
				"flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center",
				className,
			)}
		>
			{Icon ? (
				<Icon className="size-8 text-muted-foreground" aria-hidden="true" />
			) : null}
			<div className="flex flex-col gap-1">
				<p className="font-medium">{title}</p>
				{description ? (
					<p className="text-muted-foreground text-sm">{description}</p>
				) : null}
			</div>
			{action ? <div className="pt-1">{action}</div> : null}
		</div>
	);
}
