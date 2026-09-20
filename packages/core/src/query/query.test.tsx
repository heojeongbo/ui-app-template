import { Code, ConnectError } from "@connectrpc/connect";
import {
	onlineManager,
	QueryClientProvider,
	useMutation,
} from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "./query-client";
import { useInvalidateQuery } from "./use-invalidate-query";

afterEach(() => {
	onlineManager.setOnline(true);
});

function wrapper(client = createQueryClient()) {
	return {
		client,
		Wrapper: ({ children }: { children: ReactNode }) => (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		),
	};
}

describe("createQueryClient", () => {
	it("merges an override into the defaults instead of replacing them", () => {
		const client = createQueryClient({
			defaultOptions: { queries: { staleTime: 0 } },
		});
		const queries = client.getDefaultOptions().queries;

		expect(queries?.staleTime).toBe(0);
		// The bug this guards: `config ?? DEFAULTS` drops every sibling option,
		// so changing staleTime silently loses retry and networkMode.
		expect(queries?.networkMode).toBe("always");
		expect(queries?.retry).toBeTypeOf("function");
		expect(queries?.refetchOnWindowFocus).toBe(false);
	});

	it("keeps mutation defaults when only query defaults are overridden", () => {
		const client = createQueryClient({
			defaultOptions: { queries: { staleTime: 0 } },
		});
		expect(client.getDefaultOptions().mutations?.networkMode).toBe("always");
	});

	it("settles a mutation even when the browser claims to be offline", async () => {
		// networkMode "online" PAUSES instead of attempting, so mutateAsync never
		// resolves or rejects: the spinner runs forever, no toast fires, and the
		// dialog cannot close. navigator.onLine is a guess that is wrong on
		// captive portals and VPNs, so "always" is the honest default.
		const { Wrapper } = wrapper();
		onlineManager.setOnline(false);

		const { result } = renderHook(
			() => useMutation({ mutationFn: async () => "done" }),
			{ wrapper: Wrapper },
		);

		await expect(result.current.mutateAsync()).resolves.toBe("done");
	});

	it("does not retry a definite failure", async () => {
		const { Wrapper } = wrapper();
		const queryFn = vi
			.fn()
			.mockRejectedValue(new ConnectError("bad input", Code.InvalidArgument));

		const { result } = renderHook(
			() =>
				useMutation({
					mutationFn: queryFn,
					// Mutations default to retry:false; opt into the query policy to
					// prove the predicate itself refuses.
					retry: createQueryClient().getDefaultOptions().queries?.retry,
				}),
			{ wrapper: Wrapper },
		);

		await expect(result.current.mutateAsync()).rejects.toThrow();
		expect(queryFn).toHaveBeenCalledTimes(1);
	});
});

describe("useInvalidateQuery", () => {
	it("accepts both a raw key and a queryOptions object", async () => {
		const { client, Wrapper } = wrapper();
		const spy = vi.spyOn(client, "invalidateQueries");

		const { result } = renderHook(() => useInvalidateQuery(), {
			wrapper: Wrapper,
		});
		await result.current(["item", "list"], { queryKey: ["item", "detail", 1] });

		expect(spy).toHaveBeenCalledWith({ queryKey: ["item", "list"] });
		expect(spy).toHaveBeenCalledWith({ queryKey: ["item", "detail", 1] });
	});

	it("is referentially stable across renders", () => {
		const { Wrapper } = wrapper();
		const { result, rerender } = renderHook(() => useInvalidateQuery(), {
			wrapper: Wrapper,
		});
		const first = result.current;
		rerender();

		// Unstable, it would re-run every effect that lists it as a dependency.
		expect(result.current).toBe(first);
	});

	it("refuses an empty key rather than invalidating the whole cache", async () => {
		const { client, Wrapper } = wrapper();
		const spy = vi.spyOn(client, "invalidateQueries");

		const { result } = renderHook(() => useInvalidateQuery(), {
			wrapper: Wrapper,
		});

		// `[]` matches every query. It always comes from a key factory that hit a
		// missing id, and it turns one stale list into a refetch of the whole app.
		await expect(result.current([])).rejects.toThrow(/empty query key/);
		expect(spy).not.toHaveBeenCalled();
	});

	it("waits for every invalidation before resolving", async () => {
		const { client, Wrapper } = wrapper();
		let resolved = false;
		vi.spyOn(client, "invalidateQueries").mockImplementation(async () => {
			await new Promise((r) => setTimeout(r, 10));
			resolved = true;
		});

		const { result } = renderHook(() => useInvalidateQuery(), {
			wrapper: Wrapper,
		});
		await result.current(["a"], ["b"]);

		// `await invalidate(...)` before a success toast has to mean "the screen
		// is refreshing", or the toast lands over stale data.
		await waitFor(() => expect(resolved).toBe(true));
	});
});
