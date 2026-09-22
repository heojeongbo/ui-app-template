import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
	children: ReactNode;

	/**
	 * What to show instead of `children` once something below has thrown.
	 *
	 * A render prop and not a `ReactNode`, because a fallback with no `reset`
	 * is a dead end — the user's only way out is a full reload that loses their
	 * place. See `BoundaryFallback` for the shell this is usually filled with.
	 */
	fallback: (error: unknown, reset: () => void) => ReactNode;

	/**
	 * Change this to clear a caught error automatically.
	 *
	 * Usually the id of whatever is being shown. Without it, navigating from a
	 * row that throws to a row that does not keeps showing the first row's
	 * failure: a boundary that has caught stays caught until something resets
	 * it, and React will not do that on its own.
	 */
	resetKey?: unknown;

	/** Report it. The boundary itself has no logger — this package owns none. */
	onError?: (error: unknown, info: ErrorInfo) => void;
};

type State = { error: unknown };

/**
 * An error boundary for an **island**: a part of a page that can fail while
 * the rest keeps working.
 *
 * This is the in-page counterpart to the router's `defaultErrorComponent`, and
 * the two answer different questions. A route-level error means the data the
 * whole page needs did not arrive, so there is no page to show. A boundary
 * means one region failed — a dialog, a panel, a chart — and blanking the
 * screen around it throws away work the user can still see and act on.
 *
 * A class, because `getDerivedStateFromError` has no hook equivalent; React
 * still offers no way to catch a render error from a function component. It is
 * deliberately not `react-error-boundary`: this is forty lines, and a
 * dependency that owns the failure path of every screen is a poor trade.
 *
 * **It catches rendering, not everything.** An error thrown from an event
 * handler or an async callback never reaches it — those are the mutation
 * contract's job (see docs/ux/mutations.md), and expecting a boundary to cover
 * them is the most common way one ends up doing nothing at all.
 */
export class Boundary extends Component<Props, State> {
	// `override` on every inherited member, because `noImplicitOverride` is on:
	// renaming a React lifecycle method would otherwise turn an override into a
	// new method nothing calls, and the boundary would silently stop catching.
	override state: State = { error: null };

	static getDerivedStateFromError(error: unknown): State {
		return { error };
	}

	override componentDidCatch(error: unknown, info: ErrorInfo) {
		this.props.onError?.(error, info);
	}

	override componentDidUpdate(prev: Props) {
		// Only when it actually changed, and only while holding an error —
		// otherwise every parent re-render would clear a failure the user has
		// not dealt with, and the region would flicker between broken and broken.
		if (this.state.error !== null && prev.resetKey !== this.props.resetKey) {
			this.reset();
		}
	}

	reset = () => {
		this.setState({ error: null });
	};

	override render() {
		if (this.state.error !== null) {
			return this.props.fallback(this.state.error, this.reset);
		}
		return this.props.children;
	}
}
