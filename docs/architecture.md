# Architecture

## The workspace

```
apps/web/              the app — all six FSD layers
packages/design/       shadcn primitives + wrappers, tokens, the form layer
packages/core/         framework infrastructure (NOT an FSD layer)
packages/interfaces/   .proto, buf codegen, generated types
e2e/                   Playwright
```

`packages/core` is deliberately not an FSD layer. It holds what a consuming
project does not rewrite — the logger, the QueryClient factory, the transport,
the error taxonomy, `useInvalidateQuery`, the store factory — and the app's
`shared` layer wraps it. Keeping all six layers in one `src` root is also what
makes the boundary linter viable.

## Layers

Dependencies flow **downward only**.

```
app        routing, providers, entry point, mocks
  ↓
widgets    large self-contained blocks (the shell, a sidebar)
  ↓
pages      screens, one folder per route
  ↓
features   reusable capabilities that deliver user value
  ↓
entities   the things the product is about
  ↓
shared     reusable with no domain knowledge
```

| From ↓ To → | app | widgets | pages | features | entities | shared |
| :-- | :-: | :-: | :-: | :-: | :-: | :-: |
| **app** | – | ✅ | ✅ | ✅ | ✅ | ✅ |
| **widgets** | ❌ | – | ❌ | ✅ | ✅ | ✅ |
| **pages** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| **features** | ❌ | ❌ | ❌ | ✅* | ✅ | ✅ |
| **entities** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **shared** | ❌ | ❌ | ❌ | ❌ | ❌ | – |

\* Feature→feature only through the barrel, and only downward. Two features
importing each other means one of them is really an entity.

Cross-slice imports go through the slice's `index.ts`. A new file gets its
barrel export in the **same** change — otherwise every consumer is forced into
a deep import, and moving the file later breaks all of them.

**This is enforced**, by `pnpm fsd:check` (steiger) on pre-push and in CI, not
by review. It found four real violations the first time it ran.

### When a lower layer needs something an upper layer knows

It does not reach up. It gets it injected.

`shared/api/transport.ts` is the worked example: it needs to know how to sign
out (`app` owns the session) and which RPCs are mocked (`app` owns the mocks).
Rather than importing either, the transport is built **lazily** — `app` calls
`configureTransport()` at startup, and the first real RPC, which happens after
render, constructs it.

## Slice segments

| Segment | Holds |
| --- | --- |
| `api/` | Server requests — `*.queries.ts`, `*.mutations.ts` |
| `lib/` | Logic, utilities, hooks |
| `model/` | Types, constants, pure domain rules |
| `ui/` | Components |
| `config/` | Constants and flags |

Hooks live in `lib/`, components in `ui/`. No top-level `hooks/`,
`components/` or `utils/` inside a slice. **Exception:** a hook that *owns* an
RPC belongs in `api/` — it is the request, not a helper over one.

Pages are flat rather than segmented — see [page-triad.md](page-triad.md) —
and `fsd/no-segmentless-slices` is turned off for that reason, with the
rationale in `steiger.config.js`.

## State has three homes

| What | Where |
| --- | --- |
| Server data | TanStack Query. Never mirrored anywhere else. |
| Cross-cutting client state (auth, theme) | A zustand store via `createAppStore` |
| A continuously-tracked external value (a socket, a media element) | A module-scope source read through `useSyncExternalStore` |

**Server data never goes in a store.** A copy gives you two sources of truth
with no invalidation story, and it is stale the moment a mutation runs. A
`refetchInterval` used to keep a store in sync is the same smell.

Most state is none of the three and belongs in `useState` until a second
consumer appears.

**URL state is a fourth home, and the best one when it applies.** Filters,
pagination and sort live in zod-validated search params, so a view is
bookmarkable, shareable, and survives a reload — and the page needs no state of
its own. See [routing.md](routing.md).

## Aliases

Every alias must appear in **three places, together**:

1. `package.json` `exports`, if it crosses a package
2. `tsconfig.json` `paths`
3. `vite.config.ts` `resolve.alias`

A mismatch resolves in Vite and fails in `tsc`, so the dev server stays green
while CI goes red. Make it a checklist item.

`resolve.alias` is matched by **prefix and in order**, so a bare `"@"` listed
first also matches `"@template/core"`. Most specific first, catch-all last.

## Comment the non-obvious

**A non-obvious choice carries a comment naming the failure it prevents.**

Not what the code does — what goes wrong without it. `networkMode: "always"`
and the forever-spinner. `stopPropagation` and the parent form that submits.
`cancelQueries` before `setQueryData` and the stale response that reverts the
screen. Those comments are most of what separates this template from a folder
of files.

## Further reading

- [page-triad.md](page-triad.md) — how a screen is structured
- [routing.md](routing.md) — routes, guards, URL state
- [data-fetching.md](data-fetching.md) — queries, keys, invalidation
- [ux/mutations.md](ux/mutations.md) — the write contract
- [ux/states.md](ux/states.md) — the seven async states
- [ux/copy.md](ux/copy.md) — where strings live and how they read
- [design-system.md](design-system.md) — tokens, shadcn, component discipline
- [logging.md](logging.md) — the logger and why it is wrapped
- [proto-and-transport.md](proto-and-transport.md) — the data layer
- [testing.md](testing.md) — the four levels and what each is for
