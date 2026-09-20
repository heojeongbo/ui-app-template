# Routing

File-based TanStack Router, with every route's search params validated by zod.

## Why file-based

`autoCodeSplitting` only splits routes declared with `createFileRoute` —
verified in the plugin source (`splittableCreateRouteFns = ["createFileRoute"]`).
A code-based `createRoute()` tree is never split, and Vite only chunks at
`import()` boundaries, so it would need a manual `lazyRouteComponent` per route.
File-based gets route-level chunks for free.

**The cost is a version pin.** `routeTree.gen.ts` is generated against the
runtime's types, so `@tanstack/react-router`, `@tanstack/router-plugin` and
`@tanstack/react-router-devtools` must be pinned **exact and identical** — they
are, at `1.167.2`, via the workspace catalog. Upstream no longer publishes them
in lockstep, so bumping means finding the next version present in all three,
not bumping one.

`autoCodeSplitting` is off under Vitest: its virtual modules do not resolve in
the test runner, and it fails with `Cannot set properties of undefined (setting
'tsr-split-component:component')`.

## The tree

```
routes/
  __root.tsx                      root context + devtools (DEV only, lazy)
  (public)/route.tsx              no session required
  (public)/signin.tsx             inverse guard + ?redirect=
  (auth)/route.tsx                THE guard
  (auth)/(shell)/route.tsx        the signed-in chrome
  (auth)/(shell)/index.tsx        home
  (auth)/(shell)/items/index.tsx  a real route: search + loader
  $.tsx                           catch-all
  routeTree.gen.ts                generated, committed, Biome-excluded
```

**Route groups carry layout policy.** `(auth)`, `(shell)` and `(public)` shape
the tree, not the URL. No component ever asks which page it is on — a
`pathname.startsWith("/signin")` check in a shell component drifts the moment a
second public route exists.

## Guards

`beforeLoad` + `throw redirect(...)`. Never a `useEffect`: an effect runs
*after* the protected page has rendered, so the user sees a flash of content
they are not entitled to before being bounced.

The guard carries where they were going, so signing in returns them to it:

```tsx
throw redirect({ to: "/signin", search: { redirect: location.href } })
```

`/signin` has the inverse guard, or an already-signed-in user reaching it from
history signs in "again" over a live session.

## Search params are the state

Filters, pagination and sort live in the URL. A filtered view is bookmarkable,
shareable, and survives a reload — and the page needs no state of its own.

Three rules, each a bug that has happened:

1. **Every field `.catch()`es.** A URL is user-editable and outlives the code
   that produced it. `?page=abc` from a stale bookmark shows page 1, not a
   router error screen.
2. **Helpers return a SHAPE, not a `z.object`.** Routes need their own keys
   alongside pagination, and spreading a shape composes where `.merge()` does
   not.
3. **Never `z.coerce.boolean()`.** It applies JS truthiness, so `?debug=false`
   and `?debug=0` are both `true` — which is how a debug flag stays on for
   anyone who tried to turn it off. Use `boolParam()`, which is
   `z.stringbool()`.

```ts
validateSearch: z.object({
  ...paginationSearchSchema(20),
  ...querySearchSchema(),
  status: z.enum(STATUS_FILTERS).catch("all").default("all"),
}),
search: { middlewares: [stripSearchParams(DEFAULTS)] },
```

`stripSearchParams` keeps `?page=1&pageSize=20&status=all` out of every link.
Without it the address bar is unreadable and two URLs meaning the same thing
look different in history and analytics. It comes from
`@tanstack/react-router` itself — **do not install `@tanstack/zod-adapter`**,
which peer-depends on zod 3 in every published version.

Clear a param to `undefined`, never `""`. An empty `?q=` is noise and defeats
the strip.

### Writing search params

Parsing is above; writing has three rules of its own, and the first one is a
bug people hit before they hit the rule.

**1. Pass a FUNCTION to `navigate({ search })`, never a precomputed object.**

```ts
// ✅ derives from the search as it is right now
navigate({ search: (prev) => applyPage(prev, prev.page + 1), replace: true })

// ❌ reads `search` from the render that created the handler
navigate({ search: applyPage(search, search.page + 1), replace: true })
```

The object form is computed from the closure of the render that made the
handler. Two clicks before React re-renders both read the same stale page, so
clicking Next twice quickly lands on page 2 instead of 3 — silently skipping
one. That is why the items pager hands its parent a **direction** rather than a
target page: the pager's own `search` prop comes from the same stale render, so
it cannot compute the target correctly either.

**2. The same rule inside an effect.** An effect scheduled on one render can run
after the search has already moved on.

**3. `replace: true` for filter changes.** The back button should leave the
screen, not undo a filter one keystroke at a time. Page steps are a judgement
call — push is defensible there, which is one reason this stays a documented
rule rather than a shared hook.

## Loaders

The `queryClient` is in the router context, so a loader can prime the cache
while the route is still resolving — rather than after the component mounts.

```ts
loaderDeps: ({ search }) => itemsListParams(search),
loader: ({ context, deps }) => context.queryClient.ensureQueryData(itemQueries.list(deps)),
```

`itemsListParams` is a pure function in the screen's decision module. It exists
because `search` and the query input are **different vocabularies** — the URL
says `status: "all"` and `q`, the wire wants `UNSPECIFIED` and `query` — and
writing that mapping twice means the loader primes one cache entry while the
page subscribes to another. Query keys hash structurally, so that mismatch
renders stale rows under a correct-looking URL rather than throwing.

Sharing it with `loaderDeps` also makes the loader narrow by construction.

`ensureQueryData`, not `fetchQuery`: it reuses a fresh cache entry, so
navigating back to a list is instant. Narrow `loaderDeps` to what the query
actually keys on, or the loader re-runs when an unrelated param changes.

The page then uses `useSuspenseQuery` on the same options — the data is already
there, so there is no `data === undefined` branch to write.

Combined with `defaultPreload: "intent"`, a hovered link has usually finished
loading before it is clicked.

## Route-level states

`defaultPendingComponent`, `defaultErrorComponent`,
`defaultNotFoundComponent`, plus a `$.tsx` catch-all. `defaultPendingMs: 300`
and `defaultPendingMinMs: 500` stop a fast navigation from flashing a skeleton.
See [ux/states.md](ux/states.md).

## Open redirects

`?redirect=` is validated **in the schema**, at the router boundary:

```ts
redirect: z.string().refine(isSafeRedirect).catch("/").default("/")
```

An unvalidated target turns the app's own sign-in into a credible phishing hop.
Validating in the schema means every consumer — the form, a `Link`, a future
`beforeLoad` — gets the safe value, with no second place to forget it.

`isSafeRedirect` rejects protocol-relative `//host` and the backslash variants
browsers normalise to it. Those are the ones that survive review.

## Navigation

Use `linkOptions()` for nav tables. It type-checks each entry **at its
declaration** rather than where it is spread into a `<Link>`, so a removed
route fails on the line that names it instead of producing a link that compiles
and 404s.

Use `useMatchRoute` for active state, not a pathname comparison — it
understands the tree, so a nested child marks its parent active and a path that
merely shares a prefix does not.
