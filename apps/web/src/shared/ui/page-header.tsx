import { cn } from "@template/design/lib/utils";
import type { ReactNode } from "react";

type PageHeaderProps = {
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	className?: string;
};

/**
 * The header every screen starts with.
 *
 * A component and not a convention: the same six-class `<header>` copy-pasted
 * onto twenty pages drifts — one gains a margin, another loses the gap — and
 * nothing catches it because each page looks fine alone. One component means
 * changing the page rhythm is one edit.
 *
 * `<h1>` and not a styled div: it is the page's heading, and a screen reader's
 * heading navigation is the main way a non-visual user orients in an app.
 */
export function PageHeader({
	title,
	description,
	actions,
	className,
}: PageHeaderProps) {
	return (
		<header
			className={cn(
				"flex flex-wrap items-start justify-between gap-4 p-6",
				className,
			)}
		>
			<div className="flex min-w-0 flex-col gap-1">
				<h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
				{description ? (
					<p className="text-muted-foreground text-sm">{description}</p>
				) : null}
			</div>
			{actions ? (
				<div className="flex shrink-0 items-center gap-2">{actions}</div>
			) : null}
		</header>
	);
}
