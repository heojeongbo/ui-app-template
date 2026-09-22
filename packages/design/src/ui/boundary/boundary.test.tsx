import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Boundary } from "./boundary";
import { BoundaryFallback } from "./boundary.fallback";

function Bomb({ armed }: { armed: boolean }) {
	if (armed) throw new Error("boom");
	return <p>island contents</p>;
}

const fallback = (_error: unknown, reset: () => void) => (
	<BoundaryFallback
		size="card"
		title="Island failed"
		action={
			<button type="button" onClick={reset}>
				Retry
			</button>
		}
	/>
);

describe("Boundary", () => {
	beforeEach(() => {
		// React logs every caught render error. Silenced so a passing suite is
		// not full of stack traces that look like failures.
		vi.spyOn(console, "error").mockImplementation(() => {});
	});
	afterEach(() => {
		// Explicit because `globals` is off in this package's vitest config, so
		// Testing Library's auto-cleanup never registers. Without it every
		// `getBy*` after the first test finds the previous test's DOM too.
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders its children when nothing throws", () => {
		render(
			<Boundary fallback={fallback}>
				<Bomb armed={false} />
			</Boundary>,
		);
		expect(screen.getByText("island contents")).toBeTruthy();
	});

	it("shows the fallback instead of taking down its siblings", () => {
		// The whole point. Without a boundary this error reaches the route's
		// error component and replaces the entire screen, including the list the
		// user was working through.
		render(
			<div>
				<p>sibling survives</p>
				<Boundary fallback={fallback}>
					<Bomb armed={true} />
				</Boundary>
			</div>,
		);

		expect(screen.getByText("Island failed")).toBeTruthy();
		expect(screen.getByText("sibling survives")).toBeTruthy();
	});

	it("announces the failure rather than only showing it", () => {
		render(
			<Boundary fallback={fallback}>
				<Bomb armed={true} />
			</Boundary>,
		);
		// The region just swapped its contents out. A sighted user notices that
		// for free; a screen-reader user does not.
		expect(screen.getByRole("alert")).toBeTruthy();
	});

	it("reports the error to its owner", () => {
		const onError = vi.fn();
		render(
			<Boundary fallback={fallback} onError={onError}>
				<Bomb armed={true} />
			</Boundary>,
		);
		// The boundary has no logger of its own — this package ships none — so a
		// failure nobody is told about is a failure nobody can fix.
		expect(onError).toHaveBeenCalled();
	});

	it("recovers when reset and the cause is gone", () => {
		function Harness() {
			const [armed, setArmed] = useState(true);
			return (
				<Boundary
					fallback={(_e, reset) => (
						<button
							type="button"
							onClick={() => {
								setArmed(false);
								reset();
							}}
						>
							Retry
						</button>
					)}
				>
					<Bomb armed={armed} />
				</Boundary>
			);
		}

		render(<Harness />);
		fireEvent.click(screen.getByRole("button", { name: "Retry" }));
		expect(screen.getByText("island contents")).toBeTruthy();
	});

	it("clears a caught error when resetKey changes", () => {
		// Navigating from a row that throws to one that does not must not keep
		// showing the first row's failure: a boundary that has caught stays
		// caught until something resets it, and React will not do that on its
		// own.
		function Harness() {
			const [id, setId] = useState("bad");
			return (
				<div>
					<button type="button" onClick={() => setId("good")}>
						Open another
					</button>
					<Boundary resetKey={id} fallback={fallback}>
						<Bomb armed={id === "bad"} />
					</Boundary>
				</div>
			);
		}

		render(<Harness />);
		expect(screen.getByText("Island failed")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Open another" }));
		expect(screen.getByText("island contents")).toBeTruthy();
	});

	it("keeps showing the failure while resetKey is unchanged", () => {
		// The inverse, and the reason the reset is conditional: clearing on every
		// parent re-render would flicker between broken and broken, and hide that
		// the user still has an unresolved failure.
		function Harness() {
			const [, bump] = useState(0);
			return (
				<div>
					<button type="button" onClick={() => bump((n) => n + 1)}>
						Re-render
					</button>
					<Boundary resetKey="same" fallback={fallback}>
						<Bomb armed={true} />
					</Boundary>
				</div>
			);
		}

		render(<Harness />);
		fireEvent.click(screen.getByRole("button", { name: "Re-render" }));
		expect(screen.getByText("Island failed")).toBeTruthy();
	});
});
