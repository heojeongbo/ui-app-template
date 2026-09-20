/**
 * The router, exercised for real: memory history, the actual generated route
 * tree, the actual guards.
 *
 * These are the things unit tests cannot reach and a running app only tells
 * you about by misbehaving — a guard that lets an unauthenticated user through
 * for one frame, a search param that does not survive a round-trip, a default
 * that leaks into every URL.
 */
import { create } from "@bufbuild/protobuf";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { createQueryClient } from "@template/core/query";
import { proto } from "@template/interfaces";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { buildItems } from "@/app/mocks";
import { createAppRouter } from "@/app/router";
import { itemQueries, statusFromFilter } from "@/entities/item";
import type { Session } from "@/entities/session";

afterEach(cleanup);

const SESSION: Session = { userId: "u1", displayName: "Test" };

function mount({
	path,
	session = null,
	seed,
}: {
	path: string;
	session?: Session | null;
	seed?: (queryClient: ReturnType<typeof createQueryClient>) => void;
}) {
	const queryClient = createQueryClient({
		// Surface a loader failure as a test failure rather than as a retry loop
		// that times out with no explanation.
		defaultOptions: { queries: { retry: false } },
	});
	seed?.(queryClient);

	const router = createAppRouter(
		queryClient,
		createMemoryHistory({ initialEntries: [path] }),
	);

	render(
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} context={{ session }} />
		</QueryClientProvider>,
	);

	return { router, queryClient };
}

/** Pre-seed the list so the loader resolves without a transport. */
function seedItems(pageSize = 20, status = "all" as const, page = 1) {
	return (queryClient: ReturnType<typeof createQueryClient>) => {
		const options = itemQueries.list({
			page,
			pageSize,
			status: statusFromFilter(status),
			query: undefined,
		});
		// A real message, not a plain object: `setQueryData` is typed against
		// the generated response, and a structural stand-in would let the seed
		// drift from what the transport actually returns.
		queryClient.setQueryData(
			options.queryKey,
			create(proto.example_v1.ListItemsResponseSchema, {
				items: buildItems(5),
				total: 5,
			}),
		);
	};
}

describe("auth guard", () => {
	it("redirects an unauthenticated visit to sign-in", async () => {
		const { router } = mount({ path: "/items" });

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/signin");
		});
	});

	it("carries where they were going, so sign-in can return them", async () => {
		const { router } = mount({ path: "/items" });

		await waitFor(() => {
			// Without this the user lands on the home page after signing in and
			// has to navigate back to what they clicked.
			expect(router.state.location.search).toMatchObject({
				redirect: expect.stringContaining("/items"),
			});
		});
	});

	it("never renders the protected page first", async () => {
		mount({ path: "/items" });

		await waitFor(() => {
			// By role: "Sign in" is both the card's heading and the submit
			// button's label, and getByText finds two.
			expect(screen.getByRole("heading", { name: "Sign in" })).toBeTruthy();
		});
		// A `useEffect` redirect would have painted the items screen for a frame
		// before bouncing — which is why the guard is a `beforeLoad` throw.
		expect(screen.queryByText("Everything in the catalogue.")).toBeNull();
	});

	it("lets a signed-in visit through", async () => {
		const { router } = mount({
			path: "/items",
			session: SESSION,
			seed: seedItems(),
		});

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/items");
		});
	});

	it("bounces an already-signed-in user away from sign-in", async () => {
		const { router } = mount({ path: "/signin", session: SESSION });

		await waitFor(() => {
			expect(router.state.location.pathname).toBe("/");
		});
	});
});

describe("search params", () => {
	it("round-trips through zod", async () => {
		const { router } = mount({
			path: "/items?page=2&pageSize=50&status=active",
			session: SESSION,
			seed: seedItems(50, "all", 2),
		});

		await waitFor(() => {
			// Strings in the URL, numbers in the parsed search — the coercion is
			// the contract every consumer relies on.
			expect(router.state.location.search).toMatchObject({
				page: 2,
				pageSize: 50,
				status: "active",
			});
		});
	});

	it("falls back instead of erroring on a stale URL", async () => {
		const { router } = mount({
			// `page` and `status` are nonsense and fall back to their defaults;
			// `pageSize=50` is valid and is not a default, so it survives. That
			// combination is what makes the fallback observable — a value that
			// falls back to a default is then stripped from the URL, so asserting
			// on it alone would only prove the URL is empty.
			path: "/items?page=abc&status=deleted&pageSize=50",
			session: SESSION,
			seed: seedItems(50),
		});

		await waitFor(() => {
			// A bookmark outlives the code that produced it; the screen loads
			// rather than showing a router error.
			expect(router.state.location.search).toEqual({ pageSize: 50 });
		});
		expect(screen.queryByText("Could not load this page")).toBeNull();
	});

	it("keeps defaults out of the URL", async () => {
		const { router } = mount({
			path: "/items?page=1&pageSize=20&status=all",
			session: SESSION,
			seed: seedItems(),
		});

		await waitFor(() => {
			// `stripSearchParams`. Without it every link carries the defaults and
			// two URLs meaning the same thing look different in history.
			expect(router.state.location.searchStr).toBe("");
		});
	});
});

describe("not found", () => {
	it("renders the app's own 404 for an unmatched path", async () => {
		mount({ path: "/nope", session: SESSION });

		await waitFor(() => {
			expect(screen.getByText("Page not found")).toBeTruthy();
		});
	});
});
