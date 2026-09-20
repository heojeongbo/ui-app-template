import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { isDefiniteFailure, toUserMessage } from "@template/core/api";
import { Button } from "@template/design/ui/button";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";

/**
 * What a route shows when its loader throws.
 *
 * It offers **retry**, which sounds obvious and is routinely missing: an error
 * screen with no way forward makes every transient network blip terminal, and
 * the user's only recourse is a full reload that loses their place.
 *
 * `router.invalidate()` re-runs the loader for the current match. That is the
 * right lever here rather than `reset()` alone — resetting the boundary
 * without re-fetching just re-renders the same failure.
 */
export function RouteError({ error }: ErrorComponentProps) {
	const router = useRouter();

	// A definite failure carries a message the server wrote for a human. An
	// indeterminate one carries transport detail ("fetch failed"), which tells
	// a user nothing and reads as a bug — so it gets our wording instead.
	const message = toUserMessage(
		error,
		"Something went wrong loading this page.",
	);

	return (
		<div role="alert" className="flex flex-col items-start gap-4 p-6">
			<div className="flex items-start gap-3">
				<AlertCircleIcon
					className="mt-0.5 size-5 shrink-0 text-danger"
					aria-hidden="true"
				/>
				<div className="flex flex-col gap-1">
					<h1 className="font-semibold text-lg">Could not load this page</h1>
					<p className="text-muted-foreground text-sm">{message}</p>
				</div>
			</div>

			<Button
				variant="outline"
				onClick={() => {
					void router.invalidate();
				}}
			>
				<RefreshCwIcon aria-hidden="true" />
				Try again
			</Button>

			{/*
				Retrying a definite failure just reproduces it — the server already
				gave its verdict — so say so rather than letting the user press the
				button three times to find out.
			*/}
			{isDefiniteFailure(error) ? (
				<p className="text-muted-foreground text-xs">
					This is unlikely to resolve on its own. If it persists, the request
					may no longer be valid.
				</p>
			) : null}
		</div>
	);
}
