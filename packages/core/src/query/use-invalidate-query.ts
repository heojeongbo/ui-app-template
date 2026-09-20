import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Anything that identifies a set of queries.
 *
 * The `{ queryKey }` shape is what `queryOptions()` returns, so a call site can
 * pass the very object it reads with:
 *
 *     const items = useSuspenseQuery(itemQueries.list(filters))
 *     await invalidate(itemQueries.list(filters), itemQueries.detail(id))
 *
 * That is the point of the union — one definition serves both reading and
 * invalidating, so the two cannot drift.
 */
export type Invalidatable = QueryKey | { queryKey: QueryKey };

function toQueryKey(target: Invalidatable): QueryKey {
	// `in` and not `Array.isArray`: the latter's guard is `arg is any[]`, which
	// does not narrow a `readonly unknown[]` branch back out of the union.
	return "queryKey" in target ? target.queryKey : target;
}

/**
 * Invalidate one or more query families.
 *
 * Variadic and parallel: the returned promise settles when every invalidation
 * has, which is what makes `await invalidate(...)` before a success toast
 * actually mean "the screen is refreshing".
 *
 * Referentially stable, so it is safe in a `useCallback`/`useEffect`
 * dependency list without re-running them on every render.
 *
 * Invalidation lives at the CALL SITE, not inside the mutation hook — see
 * docs/ux/mutations.md. A mutation hook that invalidates on its own cannot be
 * reused by a caller that needs different cache effects.
 */
export function useInvalidateQuery() {
	const queryClient = useQueryClient();

	return useCallback(
		async (...targets: Invalidatable[]) => {
			await Promise.all(
				targets.map((target) => {
					const queryKey = toQueryKey(target);

					// An empty key matches EVERY query in the cache. It is never what
					// the caller meant — it comes from a key factory returning `[]`
					// for a missing id — and it turns one stale list into a full
					// refetch of the app. Fail loudly instead.
					if (queryKey.length === 0) {
						throw new Error(
							"useInvalidateQuery: refusing an empty query key — it matches every query in the cache. Check the key factory that produced it.",
						);
					}

					return queryClient.invalidateQueries({ queryKey });
				}),
			);
		},
		[queryClient],
	);
}
