import { Skeleton } from "@template/design/ui/skeleton";

/**
 * Shown while a route's loader runs.
 *
 * A skeleton rather than a spinner, and one whose blocks are roughly the size
 * of a page header and a list: the layout does not jump when the real content
 * arrives. Paired with the router's `defaultPendingMs` / `defaultPendingMinMs`
 * so a fast navigation never flashes it.
 *
 * `role="status"` + `aria-busy` is what tells a screen reader that something is
 * happening; the visual skeleton says nothing to one.
 */
export function RoutePending() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Loading"
			className="flex flex-col gap-4 p-6"
		>
			<Skeleton className="h-8 w-48" />
			<Skeleton className="h-4 w-72" />
			<div className="flex flex-col gap-2 pt-4">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		</div>
	);
}
