# Data fetching

TanStack Query, with one QueryClient and one key hierarchy per entity.

## One client

`createQueryClient()` in `@template/core/query` is the only sanctioned way to
build one. Overrides merge **per section**:

```ts
createQueryClient({ defaultOptions: { queries: { staleTime: 0 } } })
// keeps retry, networkMode and refetchOnWindowFocus
```

The naive `config ?? DEFAULTS` spelling silently drops every sibling option, so
an app that wanted to change `staleTime` loses `retry` and `networkMode` with
no signal.

### The defaults, and why

| Option | Value | Why |
| --- | --- | --- |
| `staleTime` | `60_000` | Navigating back to a list does not refetch it. A floor, not a policy — override per query. |
| `networkMode` | `"always"` | **Not** TanStack's `"online"`. See below. |
| `retry` | `shouldRetry` | Retries only what a retry could fix. |
| `refetchOnWindowFocus` | `false` | Refetching everything on alt-tab is a surprise cost. |

**`networkMode: "always"` is the one that matters.** In `"online"` mode a
request is *paused* rather than attempted whenever the browser believes it is
offline — and `navigator.onLine` is a guess that is wrong on captive portals,
VPNs and desktop webviews. A paused mutation never settles, so `await
mutateAsync(...)` never returns: the spinner runs forever, no toast fires, and
the dialog cannot be closed. Failing honestly is strictly better than a UI that
hangs. There is a regression test.

Mutations additionally default to `retry: false`. They are not assumed
idempotent; re-sending a create that may have landed is how duplicates appear.

## Keys

A hierarchy, so invalidation can target a level:

```ts
export const itemQueries = {
  all: () => ["item"] as const,
  lists: () => [...itemQueries.all(), "list"] as const,
  list: (params) => queryOptions({ queryKey: [...itemQueries.lists(), params], queryFn }),
  details: () => [...itemQueries.all(), "detail"] as const,
  detail: (id) => queryOptions({ queryKey: [...itemQueries.details(), id], queryFn }),
}
```

Each factory returns the **`queryOptions` object**, so one definition serves
both reading and invalidating:

```ts
useSuspenseQuery(itemQueries.list(params))
await invalidate(itemQueries.list(params))
```

A key defined here and options defined there is how a read and its invalidation
drift until a mutation stops refreshing the screen.

## Query functions

Thread the `signal` TanStack hands you. Without it a superseded request keeps
running and its response can land after the one that replaced it.

Resolve the client **inside** the function, via `getClient(Service)`. One built
at module scope captures a transport that `app` has not configured yet.

## Reading

`useSuspenseQuery` when a route loader has primed the key — the data is present
on first render and there is no `undefined` branch to write.

`useQuery` when the absence is a legitimate state (an optional panel, a
permission-gated section), or when you need `placeholderData: keepPreviousData`
to keep a paginated list from flashing back to a skeleton.

## Invalidation

`useInvalidateQuery()` — variadic, parallel, and referentially stable so it is
safe in a dependency list:

```ts
await invalidate(itemQueries.lists(), itemQueries.detail(id))
```

It **refuses an empty query key**. `[]` matches every query in the cache, always
arrives from a key factory that hit a missing id, and turns one stale list into
a refetch of the whole app.

Invalidation lives at the **call site**, never inside a mutation hook. See
[ux/mutations.md](ux/mutations.md).

## Errors

`@template/core/api` splits *the server refused* from *the answer was lost*.
They are indistinguishable at a `catch`, and treating them alike produces two
opposite bugs: telling a user a write failed when only the reply was dropped,
so they retry and duplicate it; and rolling back optimistic state the server
accepted.

| Helper | Use |
| --- | --- |
| `isDefiniteFailure(e)` | Toast tone, rollback, retry |
| `isAbortError(e)` | Never toast these |
| `isUnauthenticated(e)` | Handled globally by the transport |
| `shouldRetry(n, e)` | The QueryClient's retry predicate |
| `toUserMessage(e, fallback)` | Show the server's wording only when it wrote one |

Global handling happens in the **transport interceptors**, not in
`QueryCache.onError`, and both interceptors **return the call unchanged** — an
interceptor that swallows a rejection takes it away from the error boundary,
from retry, and from the call site's `catch`, and the screen spins forever.

`403 / PermissionDenied` is deliberately **not** global: the user is signed in
and simply may not do this thing.
