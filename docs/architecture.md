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

## Validation boundaries

TypeScript is erased at runtime, so a type is a claim about data the compiler
saw the construction of. Anywhere else, the claim is unchecked — and the ones
that bite are never the obvious ones, because the obvious ones look untrusted.

**A boundary is anywhere data the app did not itself construct becomes a typed
value.** Each has exactly one place that validates it:

| Crossing in | Validated at |
| --- | --- |
| Search params | `validateSearch` — `shared/lib/search` helpers |
| Path params | `params: { parse }` on the route |
| `localStorage` (a persisted store) | `persistSchema` — required by `createAppStore` |
| `import.meta.env` | `packages/core/src/config/env.ts`, at module load |
| `window.__APP_CONFIG__` | `readRuntimeConfig`, per field |
| RPC responses | protobuf-es decoding — **not** zod, see below |
| `ConnectError` details / message | `packages/core/src/api/field-errors.ts` |

### The type is half the boundary

A schema that checks the right thing at runtime can still hand every consumer a
type that says nothing. That failure is quieter than no validation at all: the
schema `.catch()`es the bad value, the app keeps working, and the type never
stopped anyone from constructing the value in the first place.

**Where a schema exists, the type is `z.infer`'d from it — never written
alongside it.** Two declarations of one shape are two things that can disagree,
and they will: `ItemsSearch` was hand-written beside a schema whose `pageSize`
was `10 | 20 | 50 | 100`, declared it as `number`, and so let
`applyPageSize(search, 999)` compile, reach the URL, and get silently reset.

Two ways to lose the type without noticing:

- **`z.enum(values as [string, ...string[]])`** infers `string`. `z.enum`'s
  output is `T[number]`, so casting the tuple to `string` elements throws the
  union away while the runtime check still passes. Build the array as literals.
- **`.refine(fn)` narrows only when `fn` is a type predicate.** `(v: string) =>
  boolean` leaves the output `string`; `(v: string): v is Safe` makes it
  `Safe`. Same runtime behaviour, completely different type.

When a value's validity cannot be expressed structurally — a checked redirect
path, an ID that has been authorised — a brand (`string & { readonly __x:
unique symbol }`) is what stops it being interchangeable with any other string.
Discharge it in one named place rather than casting at each use.

Four rules, each one a bug that happened here:

1. **Degrade, never throw.** A URL, a `config.js` and a `localStorage` entry are
   all hand-editable and all outlive the code reading them. `?page=abc` shows
   page 1; a corrupt session signs you out; a bad `logLevel` is dropped. A
   router error screen is a worse answer than a default.

2. **Per field, not all-or-nothing.** One bad key must not discard the good
   ones. A typo'd `logLevel` used to throw away `apiBaseUrl`, and the app
   silently talked to the build-time backend — an outage that presents as a
   code bug.

3. **Falling back must be loud.** Every rule above is silent by construction,
   which is the trade that makes them safe. Pay for it with a `warn` naming
   what was dropped. A filter that vanishes with no console output is
   indistinguishable from a filter that was never applied.

4. **The value is not a string by the time zod sees it.** The router
   JSON-parses search params *before* `validateSearch` runs, so `?q=12345`
   arrives as a number and `?debug=true` as a boolean. A schema written for the
   spelling rejects the value, `.catch()` swallows it, and the param
   disappears. See the header of `shared/lib/search/search.ts`.

**Where zod does not belong.** Protobuf responses are already validated —
`fromJson` is a decoder with the schema compiled in, and a second zod pass
would duplicate the `.proto` in TypeScript where it can drift. The two things
protobuf does *not* give you are worth knowing instead: a proto3 `optional`
message field can be absent, and proto3 enums are **open**, so a number your
build has never heard of is a legal value. Handle both with a `default:` branch
that resolves to something real, not with a parser.

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

- [getting-started.md](getting-started.md) — replacing the demo with your own
- [page-triad.md](page-triad.md) — how a screen is structured
- [routing.md](routing.md) — routes, guards, URL state
- [data-fetching.md](data-fetching.md) — queries, keys, invalidation
- [ux/mutations.md](ux/mutations.md) — the write contract
- [ux/states.md](ux/states.md) — the seven async states
- [ux/forms.md](ux/forms.md) — validation timing, field masks, unsaved-changes guards
- [ux/copy.md](ux/copy.md) — where strings live and how they read
- [design-system.md](design-system.md) — tokens, shadcn, component discipline
- [logging.md](logging.md) — the logger and why it is wrapped
- [proto-and-transport.md](proto-and-transport.md) — the data layer
- [testing.md](testing.md) — the four levels and what each is for
