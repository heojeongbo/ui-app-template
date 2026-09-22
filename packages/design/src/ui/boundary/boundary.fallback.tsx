import { cn } from "@template/design/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

const boundaryFallbackVariants = cva(
	"flex flex-col items-start gap-3 rounded-md border border-dashed",
	{
		variants: {
			/**
			 * How much room the failed region occupied.
			 *
			 * A cva variant rather than a `className` at each call site, and that
			 * is the design-system rule rather than a preference: a recurring
			 * per-page tweak becomes a variant here so the third page does not
			 * invent a fourth spacing. See docs/design-system.md.
			 */
			size: {
				slot: "p-3 text-sm",
				card: "p-4",
				page: "p-6",
			},
		},
		defaultVariants: { size: "card" },
	},
);

type Props = VariantProps<typeof boundaryFallbackVariants> & {
	/**
	 * Copy comes from the consumer. This package ships none — a shared
	 * component with a hardcoded string is a component that cannot be
	 * localised and cannot say anything specific about what failed. See
	 * docs/ux/copy.md.
	 */
	title: ReactNode;
	description?: ReactNode;

	/**
	 * The way out, usually a button wired to the boundary's `reset`.
	 *
	 * Optional in the type and load-bearing in practice: a fallback with no
	 * action turns a transient failure into a dead end, and the user's only
	 * recourse is a reload that loses their place.
	 */
	action?: ReactNode;

	className?: string;
};

/**
 * The visual shell a `Boundary` fallback usually fills.
 *
 * Separate from `Boundary` because the two change for different reasons: the
 * boundary is failure *mechanics* and almost never changes, while this is
 * failure *presentation* and changes with the design system. Bundling them
 * would mean every palette tweak touched the component that catches errors.
 *
 * `role="alert"` so the failure is announced rather than only seen — the
 * region has just swapped its contents out, and a sighted user notices that
 * for free while a screen-reader user does not.
 */
export function BoundaryFallback({
	size,
	title,
	description,
	action,
	className,
}: Props) {
	return (
		<div
			role="alert"
			className={cn(boundaryFallbackVariants({ size }), className)}
		>
			<div className="flex flex-col gap-1">
				<p className="font-medium">{title}</p>
				{description ? (
					<p className="text-muted-foreground text-sm">{description}</p>
				) : null}
			</div>
			{action}
		</div>
	);
}
